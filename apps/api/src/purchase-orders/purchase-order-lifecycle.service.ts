import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/types';
import { generateSequentialNumber } from '../common/sequential-number';
import { DisputeStatus, GrnStatus, InspectionResult, InvoiceStatus, PaymentStatus, PoStage } from '../database/entities/enums';
import { Grn, GrnLine } from '../database/entities/grn.entity';
import { Inspection } from '../database/entities/inspection.entity';
import { Invoice, ThreeWayMatchLine } from '../database/entities/invoice.entity';
import { Payment } from '../database/entities/payment.entity';
import { PurchaseOrder } from '../database/entities/purchase-order.entity';
import { Rfq } from '../database/entities/rfq.entity';
import { EventsService } from '../events/events.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { OpenDisputeDto } from './dto/open-dispute.dto';
import { SubmitGrnDto } from './dto/submit-grn.dto';
import { SubmitInspectionDto } from './dto/submit-inspection.dto';
import { PurchaseOrdersService } from './purchase-orders.service';

const DISPUTABLE_STAGES = [PoStage.GRN_RECEIVED, PoStage.INSPECTED, PoStage.INVOICED];

export interface Fulfillment {
  grn: Grn | null;
  inspection: Inspection | null;
  invoice: Invoice | null;
  payment: Payment | null;
}

@Injectable()
export class PurchaseOrderLifecycleService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrdersRepository: Repository<PurchaseOrder>,
    @InjectRepository(Rfq)
    private readonly rfqsRepository: Repository<Rfq>,
    @InjectRepository(Grn)
    private readonly grnsRepository: Repository<Grn>,
    @InjectRepository(Inspection)
    private readonly inspectionsRepository: Repository<Inspection>,
    @InjectRepository(Invoice)
    private readonly invoicesRepository: Repository<Invoice>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    private readonly suppliersService: SuppliersService,
    private readonly eventsService: EventsService,
    private readonly purchaseOrdersService: PurchaseOrdersService,
  ) {}

  /** Read-only bundle backing the PO detail page's fulfillment cards. */
  async getFulfillment(user: AuthenticatedUser, poId: string): Promise<Fulfillment> {
    const po = await this.purchaseOrdersService.findOneForUser(user, poId);
    const [grn, inspection, invoice, payment] = await Promise.all([
      this.grnsRepository.findOne({ where: { purchaseOrderId: po.id } }),
      this.inspectionsRepository.findOne({ where: { purchaseOrderId: po.id } }),
      this.invoicesRepository.findOne({ where: { purchaseOrderId: po.id } }),
      this.paymentsRepository.findOne({ where: { purchaseOrderId: po.id } }),
    ]);
    return { grn, inspection, invoice, payment };
  }

  // ---- approval (amendment #6) ----

  async approve(user: AuthenticatedUser, poId: string): Promise<PurchaseOrder> {
    const po = await this.loadOwnedPo(user, poId);
    if (!po.requiresApproval) {
      throw new BadRequestException('This PO does not require approval');
    }
    if (po.approvedById) {
      throw new BadRequestException('This PO has already been approved');
    }

    const requesterId = await this.eventsService.getActorId(po.organizationId, 'po.generated', po.id);
    if (requesterId && requesterId === user.userId) {
      throw new ForbiddenException(
        'Approver must be different from the person who requested the award (segregation of duties, amendment #6)',
      );
    }

    po.approvedById = user.userId;
    po.approvedAt = new Date();
    await this.purchaseOrdersRepository.save(po);

    await this.eventsService.record('approval.granted', {
      organizationId: po.organizationId,
      entityType: 'PurchaseOrder',
      entityId: po.id,
      actorId: user.userId,
      note: `${po.poNumber} approved`,
    });

    return po;
  }

  // ---- escrow + acknowledge (amendment #5) ----

  async fundEscrow(user: AuthenticatedUser, poId: string): Promise<PurchaseOrder> {
    const po = await this.loadOwnedPo(user, poId);
    this.assertApprovalSatisfied(po);
    if (po.stage !== PoStage.ISSUED) {
      throw new BadRequestException('Escrow can only be funded while the PO is ISSUED');
    }
    if (po.escrowFunded) {
      throw new BadRequestException('Escrow has already been funded for this PO');
    }

    po.escrowFunded = true;
    po.escrowFundedAt = new Date();
    await this.purchaseOrdersRepository.save(po);

    await this.eventsService.record('escrow.funded', {
      organizationId: po.organizationId,
      entityType: 'PurchaseOrder',
      entityId: po.id,
      actorId: user.userId,
      note: `Escrow funded for ${po.poNumber}`,
    });

    return po;
  }

  async acknowledge(user: AuthenticatedUser, poId: string): Promise<PurchaseOrder> {
    const po = await this.loadSupplierPo(user, poId);
    this.assertApprovalSatisfied(po);
    if (po.stage !== PoStage.ISSUED) {
      throw new BadRequestException('PO must be ISSUED to be acknowledged');
    }
    if (!po.escrowFunded) {
      throw new BadRequestException('Escrow must be funded before the PO can be acknowledged (amendment #5)');
    }

    po.stage = PoStage.ACKNOWLEDGED;
    await this.purchaseOrdersRepository.save(po);

    await this.eventsService.record('po.acknowledged', {
      organizationId: po.organizationId,
      entityType: 'PurchaseOrder',
      entityId: po.id,
      actorId: user.userId,
      note: `${po.poNumber} acknowledged by supplier`,
    });

    return po;
  }

  // ---- GRN (amendment #4) ----

  async submitGrn(user: AuthenticatedUser, poId: string, dto: SubmitGrnDto): Promise<Grn> {
    const po = await this.loadOwnedPo(user, poId);
    this.assertApprovalSatisfied(po);
    if (po.stage !== PoStage.ACKNOWLEDGED) {
      throw new BadRequestException('PO must be ACKNOWLEDGED before a GRN can be recorded');
    }

    const existing = await this.grnsRepository.findOne({ where: { purchaseOrderId: po.id } });
    if (existing) {
      throw new ConflictException('A GRN has already been recorded for this PO');
    }

    const rfq = await this.rfqsRepository.findOne({ where: { id: po.rfqId }, relations: ['items'] });
    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }

    const rfqItemsById = new Map(rfq.items.map((i) => [i.id, i]));
    const rfqItemIds = new Set(rfq.items.map((i) => i.id));
    const submittedIds = dto.lines.map((l) => l.rfqItemId);
    const submittedIdSet = new Set(submittedIds);
    if (submittedIds.length !== submittedIdSet.size) {
      throw new BadRequestException('Duplicate line items in GRN');
    }
    if (submittedIdSet.size !== rfqItemIds.size || [...submittedIdSet].some((id) => !rfqItemIds.has(id))) {
      throw new BadRequestException('GRN must cover every RFQ line item, no more and no fewer');
    }

    const lines: GrnLine[] = dto.lines.map((line) => {
      const rfqItem = rfqItemsById.get(line.rfqItemId)!;
      const orderedQty = parseFloat(rfqItem.quantity);
      return {
        rfqItemId: line.rfqItemId,
        receivedQty: line.receivedQty,
        qtyOk: line.receivedQty === orderedQty,
        photoUrls: line.photoUrls ?? [],
      };
    });

    const status = lines.every((l) => l.qtyOk) ? GrnStatus.FULL : GrnStatus.PARTIAL;
    const grnNumber = await generateSequentialNumber(
      'GRN',
      () => this.grnsRepository.count({ where: { organizationId: po.organizationId } }),
      (candidate) =>
        this.grnsRepository
          .findOne({ where: { organizationId: po.organizationId, grnNumber: candidate } })
          .then((r) => !!r),
    );

    const grn = await this.grnsRepository.save(
      this.grnsRepository.create({
        organizationId: po.organizationId,
        grnNumber,
        purchaseOrderId: po.id,
        receivedById: user.userId,
        receivedAt: new Date(),
        status,
        lines,
      }),
    );

    if (status === GrnStatus.FULL) {
      po.stage = PoStage.GRN_RECEIVED;
      await this.purchaseOrdersRepository.save(po);
      await this.eventsService.record('grn.received', {
        organizationId: po.organizationId,
        entityType: 'PurchaseOrder',
        entityId: po.id,
        actorId: user.userId,
        note: `${grnNumber} received in full`,
      });
    } else {
      await this.eventsService.record('grn.partial', {
        organizationId: po.organizationId,
        entityType: 'PurchaseOrder',
        entityId: po.id,
        actorId: user.userId,
        note: `${grnNumber} received partially — lifecycle held pending exception.resolved (amendment #4)`,
      });
    }

    return grn;
  }

  // ---- inspection (amendment #4) ----

  async submitInspection(user: AuthenticatedUser, poId: string, dto: SubmitInspectionDto): Promise<Inspection> {
    const po = await this.loadOwnedPo(user, poId);
    this.assertApprovalSatisfied(po);
    if (po.stage !== PoStage.GRN_RECEIVED) {
      throw new BadRequestException('PO must be GRN_RECEIVED before inspection');
    }

    const existing = await this.inspectionsRepository.findOne({ where: { purchaseOrderId: po.id } });
    if (existing) {
      throw new ConflictException('An inspection has already been recorded for this PO');
    }

    const grn = await this.grnsRepository.findOne({ where: { purchaseOrderId: po.id } });
    if (!grn) {
      throw new BadRequestException('No GRN on file for this PO');
    }

    const result =
      dto.conditionCheck && dto.certsCheck && dto.quantityCheck ? InspectionResult.PASSED : InspectionResult.FAILED;

    const reportId =
      dto.reportId ??
      (await generateSequentialNumber(
        'INSP',
        () => this.inspectionsRepository.count({ where: { organizationId: po.organizationId } }),
        (candidate) =>
          this.inspectionsRepository
            .findOne({ where: { organizationId: po.organizationId, reportId: candidate } })
            .then((r) => !!r),
      ));

    const inspection = await this.inspectionsRepository.save(
      this.inspectionsRepository.create({
        organizationId: po.organizationId,
        purchaseOrderId: po.id,
        grnId: grn.id,
        reportId,
        conditionCheck: dto.conditionCheck,
        certsCheck: dto.certsCheck,
        quantityCheck: dto.quantityCheck,
        result,
        inspectedAt: new Date(),
      }),
    );

    if (result === InspectionResult.PASSED) {
      po.stage = PoStage.INSPECTED;
      await this.purchaseOrdersRepository.save(po);
      await this.eventsService.record('inspection.passed', {
        organizationId: po.organizationId,
        entityType: 'PurchaseOrder',
        entityId: po.id,
        actorId: user.userId,
        note: `${reportId} passed`,
      });
    } else {
      await this.eventsService.record('inspection.failed', {
        organizationId: po.organizationId,
        entityType: 'PurchaseOrder',
        entityId: po.id,
        actorId: user.userId,
        note: `${reportId} failed — lifecycle held pending exception.resolved (amendment #4)`,
      });
    }

    return inspection;
  }

  // ---- exception resolution (amendment #4), one endpoint covering GRN/inspection/invoice ----

  async resolveException(user: AuthenticatedUser, poId: string): Promise<PurchaseOrder> {
    const po = await this.loadOwnedPo(user, poId);
    this.assertApprovalSatisfied(po);

    if (po.stage === PoStage.ACKNOWLEDGED) {
      const grn = await this.grnsRepository.findOne({ where: { purchaseOrderId: po.id } });
      if (!grn || grn.status !== GrnStatus.PARTIAL) {
        throw new BadRequestException('No open GRN exception to resolve');
      }
      po.stage = PoStage.GRN_RECEIVED;
      await this.purchaseOrdersRepository.save(po);
      await this.eventsService.record('exception.resolved', {
        organizationId: po.organizationId,
        entityType: 'PurchaseOrder',
        entityId: po.id,
        actorId: user.userId,
        note: `${grn.grnNumber} partial-receipt exception resolved`,
      });
      return po;
    }

    if (po.stage === PoStage.GRN_RECEIVED) {
      const inspection = await this.inspectionsRepository.findOne({
        where: { purchaseOrderId: po.id },
        order: { createdAt: 'DESC' },
      });
      if (!inspection || inspection.result !== InspectionResult.FAILED) {
        throw new BadRequestException('No open inspection exception to resolve');
      }
      po.stage = PoStage.INSPECTED;
      await this.purchaseOrdersRepository.save(po);
      await this.eventsService.record('exception.resolved', {
        organizationId: po.organizationId,
        entityType: 'PurchaseOrder',
        entityId: po.id,
        actorId: user.userId,
        note: `${inspection.reportId} failed-inspection exception resolved`,
      });
      return po;
    }

    if (po.stage === PoStage.INSPECTED) {
      const invoice = await this.invoicesRepository.findOne({
        where: { purchaseOrderId: po.id },
        order: { createdAt: 'DESC' },
      });
      if (!invoice || invoice.status === InvoiceStatus.MATCHED) {
        throw new BadRequestException('No open invoice exception to resolve');
      }
      invoice.status = InvoiceStatus.MATCHED;
      await this.invoicesRepository.save(invoice);
      po.stage = PoStage.INVOICED;
      await this.purchaseOrdersRepository.save(po);
      await this.eventsService.record('exception.resolved', {
        organizationId: po.organizationId,
        entityType: 'PurchaseOrder',
        entityId: po.id,
        actorId: user.userId,
        note: `${invoice.invoiceNumber} 3-way-match exception resolved`,
      });
      return po;
    }

    throw new BadRequestException('No open exception to resolve for this PO at its current stage');
  }

  // ---- invoice / 3-way match ----

  async submitInvoice(user: AuthenticatedUser, poId: string): Promise<Invoice> {
    const po = await this.loadSupplierPo(user, poId);
    this.assertApprovalSatisfied(po);
    if (po.stage !== PoStage.INSPECTED) {
      throw new BadRequestException('PO must be INSPECTED before invoicing');
    }

    const existing = await this.invoicesRepository.findOne({ where: { purchaseOrderId: po.id } });
    if (existing) {
      throw new ConflictException('An invoice has already been submitted for this PO');
    }

    const rfq = await this.rfqsRepository.findOne({ where: { id: po.rfqId }, relations: ['items'] });
    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }
    const grn = await this.grnsRepository.findOne({ where: { purchaseOrderId: po.id } });
    if (!grn) {
      throw new BadRequestException('No GRN on file for this PO');
    }

    const grnLinesByItem = new Map(grn.lines.map((l) => [l.rfqItemId, l]));
    // V1 simplification: one full invoice per PO — invoiced qty always equals
    // ordered qty (no partial invoicing modeled).
    const threeWayMatch: ThreeWayMatchLine[] = rfq.items.map((item) => {
      const grnLine = grnLinesByItem.get(item.id);
      const poQty = parseFloat(item.quantity);
      const grnQty = grnLine ? grnLine.receivedQty : 0;
      return {
        rfqItemId: item.id,
        poQty: item.quantity,
        grnQty: grnQty.toString(),
        invoiceQty: item.quantity,
        matched: grnQty === poQty,
      };
    });
    const allMatched = threeWayMatch.every((l) => l.matched);

    const invoiceNumber = await generateSequentialNumber(
      'INV',
      () => this.invoicesRepository.count({ where: { organizationId: po.organizationId } }),
      (candidate) =>
        this.invoicesRepository
          .findOne({ where: { organizationId: po.organizationId, invoiceNumber: candidate } })
          .then((r) => !!r),
    );

    const invoice = await this.invoicesRepository.save(
      this.invoicesRepository.create({
        organizationId: po.organizationId,
        invoiceNumber,
        purchaseOrderId: po.id,
        amount: po.totalValue,
        threeWayMatch,
        status: allMatched ? InvoiceStatus.MATCHED : InvoiceStatus.SUBMITTED,
        submittedAt: new Date(),
      }),
    );

    if (allMatched) {
      po.stage = PoStage.INVOICED;
      await this.purchaseOrdersRepository.save(po);
      await this.eventsService.record('invoice.matched', {
        organizationId: po.organizationId,
        entityType: 'PurchaseOrder',
        entityId: po.id,
        actorId: user.userId,
        note: `${invoiceNumber} matched 3-way`,
      });
    } else {
      await this.eventsService.record('invoice.submitted', {
        organizationId: po.organizationId,
        entityType: 'PurchaseOrder',
        entityId: po.id,
        actorId: user.userId,
        note: `${invoiceNumber} submitted — 3-way match failed, lifecycle held pending exception.resolved (amendment #4)`,
      });
    }

    return invoice;
  }

  // ---- payment release (amendments #6, #7) ----

  async releasePayment(user: AuthenticatedUser, poId: string): Promise<Payment> {
    const po = await this.loadOwnedPo(user, poId);
    this.assertApprovalSatisfied(po);
    if (po.stage !== PoStage.INVOICED) {
      throw new BadRequestException('PO must be INVOICED before payment can be released');
    }
    if (po.disputeStatus === DisputeStatus.OPEN || po.disputeStatus === DisputeStatus.MEDIATION) {
      throw new BadRequestException('Cannot release payment while a dispute is open (amendment #7)');
    }

    const existing = await this.paymentsRepository.findOne({ where: { purchaseOrderId: po.id } });
    if (existing) {
      throw new ConflictException('Payment has already been released for this PO');
    }

    const invoice = await this.invoicesRepository.findOne({ where: { purchaseOrderId: po.id } });
    if (!invoice) {
      throw new BadRequestException('No invoice on file for this PO');
    }

    const paymentNumber = await generateSequentialNumber(
      'PAY',
      () => this.paymentsRepository.count({ where: { organizationId: po.organizationId } }),
      (candidate) =>
        this.paymentsRepository
          .findOne({ where: { organizationId: po.organizationId, paymentNumber: candidate } })
          .then((r) => !!r),
    );

    const payment = await this.paymentsRepository.save(
      this.paymentsRepository.create({
        organizationId: po.organizationId,
        paymentNumber,
        invoiceId: invoice.id,
        purchaseOrderId: po.id,
        amount: po.totalValue,
        status: PaymentStatus.RELEASED,
        releasedAt: new Date(),
        escrowReleaseNote: null,
      }),
    );

    po.stage = PoStage.PAID;
    await this.purchaseOrdersRepository.save(po);

    await this.eventsService.record('payment.released', {
      organizationId: po.organizationId,
      entityType: 'PurchaseOrder',
      entityId: po.id,
      actorId: user.userId,
      note: `${po.poNumber} paid in full (${paymentNumber})`,
    });

    // Contract completed — refresh the supplier's SourceOS profile (Phase 8).
    await this.suppliersService.recomputeScore(po.supplierId);

    return payment;
  }

  // ---- disputes (amendment #7) ----

  async openDispute(user: AuthenticatedUser, poId: string, dto: OpenDisputeDto): Promise<PurchaseOrder> {
    const po = await this.loadOwnedPo(user, poId);
    if (!DISPUTABLE_STAGES.includes(po.stage)) {
      throw new BadRequestException('Disputes can only be raised between GRN receipt and payment');
    }
    if (po.disputeStatus !== DisputeStatus.NONE) {
      throw new ConflictException('A dispute already exists for this PO');
    }

    po.disputeStatus = DisputeStatus.OPEN;
    await this.purchaseOrdersRepository.save(po);

    await this.eventsService.record('dispute.opened', {
      organizationId: po.organizationId,
      entityType: 'PurchaseOrder',
      entityId: po.id,
      actorId: user.userId,
      note: dto.note ?? `Dispute opened on ${po.poNumber}`,
    });

    // A dispute is an immediate risk signal — don't wait for payment to
    // refresh the supplier's SourceOS profile (Phase 8).
    await this.suppliersService.recomputeScore(po.supplierId);

    return po;
  }

  /**
   * Disputes are a platform-wide admin queue (README's Admin console), so
   * these two actions load by id across organizations rather than scoping to
   * the caller's own org like every other method here — a deliberate, narrow
   * exception for this pair of ADMIN-only actions.
   */
  async mediateDispute(user: AuthenticatedUser, poId: string): Promise<PurchaseOrder> {
    const po = await this.loadAnyPo(poId);
    if (po.disputeStatus !== DisputeStatus.OPEN) {
      throw new BadRequestException('Dispute must be OPEN to move to MEDIATION');
    }
    po.disputeStatus = DisputeStatus.MEDIATION;
    await this.purchaseOrdersRepository.save(po);
    await this.eventsService.record('dispute.mediation', {
      organizationId: po.organizationId,
      entityType: 'PurchaseOrder',
      entityId: po.id,
      actorId: user.userId,
      note: `${po.poNumber} dispute moved to mediation`,
    });
    return po;
  }

  async resolveDispute(user: AuthenticatedUser, poId: string): Promise<PurchaseOrder> {
    const po = await this.loadAnyPo(poId);
    if (po.disputeStatus !== DisputeStatus.OPEN && po.disputeStatus !== DisputeStatus.MEDIATION) {
      throw new BadRequestException('No active dispute to resolve');
    }
    po.disputeStatus = DisputeStatus.RESOLVED;
    await this.purchaseOrdersRepository.save(po);
    await this.eventsService.record('dispute.resolved', {
      organizationId: po.organizationId,
      entityType: 'PurchaseOrder',
      entityId: po.id,
      actorId: user.userId,
      note: `${po.poNumber} dispute resolved`,
    });
    return po;
  }

  // ---- loaders ----

  private assertApprovalSatisfied(po: PurchaseOrder): void {
    if (po.requiresApproval && !po.approvedById) {
      throw new BadRequestException(
        'This PO requires segregation-of-duties approval before it can proceed (amendment #6)',
      );
    }
  }

  private async loadOwnedPo(user: AuthenticatedUser, poId: string): Promise<PurchaseOrder> {
    const po = await this.purchaseOrdersRepository.findOne({ where: { id: poId } });
    if (!po || po.organizationId !== user.organizationId) {
      throw new NotFoundException('Purchase order not found');
    }
    return po;
  }

  private async loadSupplierPo(user: AuthenticatedUser, poId: string): Promise<PurchaseOrder> {
    const po = await this.purchaseOrdersRepository.findOne({ where: { id: poId } });
    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }
    const supplier = await this.suppliersService.findByOrganizationId(user.organizationId);
    if (!supplier || po.supplierId !== supplier.id) {
      throw new NotFoundException('Purchase order not found');
    }
    return po;
  }

  private async loadAnyPo(poId: string): Promise<PurchaseOrder> {
    const po = await this.purchaseOrdersRepository.findOne({ where: { id: poId } });
    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }
    return po;
  }
}
