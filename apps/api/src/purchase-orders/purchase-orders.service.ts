import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/types';
import { generateSequentialNumber } from '../common/sequential-number';
import { DisputeStatus, PoStage, RfqStatus, UserRole } from '../database/entities/enums';
import { Evaluation } from '../database/entities/evaluation.entity';
import { PurchaseOrder } from '../database/entities/purchase-order.entity';
import { Quotation } from '../database/entities/quotation.entity';
import { Rfq } from '../database/entities/rfq.entity';
import { EventsService } from '../events/events.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { AwardDto } from './dto/award.dto';

/** Segregation-of-duties threshold (amendment #6) — platform default, overridable per-org via Organization.approvalThreshold. */
const DEFAULT_APPROVAL_THRESHOLD = 250_000;

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(Rfq)
    private readonly rfqsRepository: Repository<Rfq>,
    @InjectRepository(Evaluation)
    private readonly evaluationsRepository: Repository<Evaluation>,
    @InjectRepository(Quotation)
    private readonly quotationsRepository: Repository<Quotation>,
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrdersRepository: Repository<PurchaseOrder>,
    private readonly suppliersService: SuppliersService,
    private readonly eventsService: EventsService,
    private readonly organizationsService: OrganizationsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async award(user: AuthenticatedUser, rfqId: string, dto: AwardDto): Promise<PurchaseOrder> {
    const rfq = await this.rfqsRepository.findOne({ where: { id: rfqId } });
    if (!rfq || rfq.organizationId !== user.organizationId) {
      throw new NotFoundException('RFQ not found');
    }
    if (rfq.status !== RfqStatus.EVALUATION) {
      throw new BadRequestException('RFQ must be evaluated before it can be awarded');
    }

    const evaluation = await this.evaluationsRepository.findOne({
      where: { rfqId, supplierId: dto.supplierId },
    });
    if (!evaluation) {
      throw new BadRequestException('No evaluation found for this supplier on this RFQ');
    }

    const quotation = await this.quotationsRepository.findOne({ where: { id: evaluation.quotationId } });
    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    const buyerOrg = await this.organizationsService.findById(rfq.organizationId);
    const approvalThreshold = buyerOrg.approvalThreshold ?? DEFAULT_APPROVAL_THRESHOLD;
    const totalValue = parseFloat(quotation.totalAmount);
    const requiresApproval = totalValue > approvalThreshold;

    const po = await this.dataSource.transaction(async (manager) => {
      const poRepo = manager.getRepository(PurchaseOrder);
      // Globally unique platform-wide filing code (not per-tenant) — see common/reference-codes.ts.
      const poNumber = await generateSequentialNumber(
        'PO',
        () => poRepo.count(),
        (candidate) => poRepo.findOne({ where: { poNumber: candidate } }).then((r) => !!r),
      );

      const created = await poRepo.save(
        poRepo.create({
          organizationId: rfq.organizationId,
          poNumber,
          rfqId: rfq.id,
          quotationId: quotation.id,
          supplierId: evaluation.supplierId,
          stage: PoStage.ISSUED,
          totalValue: totalValue.toFixed(2),
          escrowFunded: false,
          disputeStatus: DisputeStatus.NONE,
          requiresApproval,
        }),
      );

      await manager.getRepository(Rfq).update(rfq.id, { status: RfqStatus.AWARDED });
      return created;
    });

    await this.eventsService.record('rfq.awarded', {
      organizationId: rfq.organizationId,
      entityType: 'Rfq',
      entityId: rfq.id,
      actorId: user.userId,
      note: `${rfq.title} awarded to supplier ${evaluation.supplierId}`,
    });

    await this.eventsService.record('po.generated', {
      organizationId: rfq.organizationId,
      entityType: 'PurchaseOrder',
      entityId: po.id,
      actorId: user.userId,
      note: `${po.poNumber} generated ($${totalValue.toLocaleString()})`,
    });

    if (requiresApproval) {
      // No approve/reject workflow exists yet — that arrives with the full
      // PO lifecycle follow-up. This just records that the gate was hit and
      // persists `requiresApproval` on the row so it's enforceable later.
      await this.eventsService.record('approval.requested', {
        organizationId: rfq.organizationId,
        entityType: 'PurchaseOrder',
        entityId: po.id,
        actorId: user.userId,
        note: `${po.poNumber} exceeds $${approvalThreshold.toLocaleString()} — segregation-of-duties approval required (amendment #6, approver must differ from requester ${user.userId})`,
      });
    }

    return po;
  }

  async findAllForUser(user: AuthenticatedUser): Promise<PurchaseOrder[]> {
    if (user.role === UserRole.SUPPLIER_USER) {
      const supplier = await this.suppliersService.findByOrganizationId(user.organizationId);
      if (!supplier) {
        return [];
      }
      return this.purchaseOrdersRepository.find({
        where: { supplierId: supplier.id },
        order: { createdAt: 'DESC' },
      });
    }

    // Disputes are a platform-wide admin queue (see PurchaseOrderLifecycleService's
    // mediate/resolve) — ADMIN needs to see every org's POs, not just their own.
    if (user.role === UserRole.ADMIN) {
      return this.purchaseOrdersRepository.find({ order: { createdAt: 'DESC' } });
    }

    return this.purchaseOrdersRepository.find({
      where: { organizationId: user.organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneForUser(user: AuthenticatedUser, id: string): Promise<PurchaseOrder> {
    const po = await this.purchaseOrdersRepository.findOne({ where: { id } });
    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (user.role === UserRole.SUPPLIER_USER) {
      const supplier = await this.suppliersService.findByOrganizationId(user.organizationId);
      if (!supplier || po.supplierId !== supplier.id) {
        throw new NotFoundException('Purchase order not found');
      }
      return po;
    }

    if (user.role === UserRole.ADMIN) {
      return po;
    }

    if (po.organizationId !== user.organizationId) {
      throw new NotFoundException('Purchase order not found');
    }
    return po;
  }
}
