import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/types';
import { isUniqueViolation } from '../common/db-errors';
import { generateSequentialNumber } from '../common/sequential-number';
import { QuotationStatus, RfqStatus, UserRole } from '../database/entities/enums';
import { QuotationItem } from '../database/entities/quotation-item.entity';
import { Quotation } from '../database/entities/quotation.entity';
import { Rfq } from '../database/entities/rfq.entity';
import { RfqItem } from '../database/entities/rfq-item.entity';
import { EventsService } from '../events/events.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { CreateRfqDto } from './dto/create-rfq.dto';
import { SubmitQuoteDto } from './dto/submit-quote.dto';
import { EVALUATION_WEIGHT_PRESETS } from './evaluation-weights';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class RfqsService {
  constructor(
    @InjectRepository(Rfq)
    private readonly rfqsRepository: Repository<Rfq>,
    @InjectRepository(Quotation)
    private readonly quotationsRepository: Repository<Quotation>,
    private readonly suppliersService: SuppliersService,
    private readonly eventsService: EventsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateRfqDto): Promise<Rfq> {
    const suppliers = await this.suppliersService.findByIds(dto.invitedSupplierIds);
    if (suppliers.length !== new Set(dto.invitedSupplierIds).size) {
      throw new BadRequestException('One or more invited supplier IDs do not exist');
    }

    const rfq = await this.dataSource.transaction(async (manager) => {
      const rfqRepo = manager.getRepository(Rfq);
      const rfqItemRepo = manager.getRepository(RfqItem);

      // Globally unique platform-wide filing code (not per-tenant) — see common/reference-codes.ts.
      const rfqNumber = await generateSequentialNumber(
        'RFQ',
        () => rfqRepo.count(),
        (candidate) => rfqRepo.findOne({ where: { rfqNumber: candidate } }).then((r) => !!r),
      );

      const created = await rfqRepo.save(
        rfqRepo.create({
          organizationId: user.organizationId,
          rfqNumber,
          title: dto.title,
          categoryPreset: dto.categoryPreset,
          requirementId: dto.requirementId ?? null,
          status: RfqStatus.DRAFT,
          closeDate: dto.closeDate ? new Date(dto.closeDate) : null,
          invitedSuppliers: suppliers,
        }),
      );

      await rfqItemRepo.save(
        dto.items.map((item) =>
          rfqItemRepo.create({
            organizationId: user.organizationId,
            rfqId: created.id,
            description: item.description,
            quantity: item.quantity.toString(),
            unit: item.unit,
          }),
        ),
      );

      return created;
    });

    await this.eventsService.record('rfq.created', {
      organizationId: user.organizationId,
      entityType: 'Rfq',
      entityId: rfq.id,
      actorId: user.userId,
      note: `${rfq.rfqNumber} ${dto.title} created`,
    });

    return this.loadRfqOrThrow(rfq.id);
  }

  async publish(user: AuthenticatedUser, rfqId: string): Promise<Rfq> {
    const rfq = await this.loadRfqOrThrow(rfqId);
    if (rfq.organizationId !== user.organizationId) {
      throw new NotFoundException('RFQ not found');
    }
    if (rfq.status !== RfqStatus.DRAFT) {
      throw new BadRequestException('Only a draft RFQ can be published');
    }
    if (rfq.items.length === 0 || rfq.invitedSuppliers.length === 0) {
      throw new BadRequestException(
        'RFQ needs at least one line item and one invited supplier before publishing',
      );
    }

    rfq.weightsLocked = EVALUATION_WEIGHT_PRESETS[rfq.categoryPreset];
    rfq.publishedAt = new Date();
    rfq.status = RfqStatus.OPEN;
    await this.rfqsRepository.save(rfq);

    await this.eventsService.record('rfq.published', {
      organizationId: rfq.organizationId,
      entityType: 'Rfq',
      entityId: rfq.id,
      actorId: user.userId,
      note: `${rfq.title} published`,
      payload: { weightsLocked: rfq.weightsLocked },
    });

    return rfq;
  }

  async findAllForUser(user: AuthenticatedUser): Promise<Array<Rfq & { myQuoteTotal?: string | null }>> {
    if (user.role === UserRole.SUPPLIER_USER) {
      const supplier = await this.suppliersService.findByOrganizationId(user.organizationId);
      if (!supplier) {
        return [];
      }
      const rfqs = await this.rfqsRepository
        .createQueryBuilder('rfq')
        .innerJoin('rfq.invitedSuppliers', 'filterSupplier', 'filterSupplier.id = :supplierId', {
          supplierId: supplier.id,
        })
        .leftJoinAndSelect('rfq.items', 'items')
        .leftJoinAndSelect('rfq.invitedSuppliers', 'invitedSuppliers')
        .andWhere('rfq.status != :draft', { draft: RfqStatus.DRAFT })
        .orderBy('rfq.createdAt', 'DESC')
        .getMany();

      // Inbox needs each card's submission state up front — fetch this
      // supplier's quotes for all listed RFQs in one query rather than
      // making the frontend call GET /rfqs/:id/my-quote per card (N+1).
      const quotes = rfqs.length
        ? await this.quotationsRepository.find({
            where: { supplierId: supplier.id, rfqId: In(rfqs.map((r) => r.id)) },
          })
        : [];
      const totalByRfqId = new Map(quotes.map((q) => [q.rfqId, q.totalAmount]));

      return rfqs.map((rfq) => Object.assign(rfq, { myQuoteTotal: totalByRfqId.get(rfq.id) ?? null }));
    }

    return this.rfqsRepository.find({
      where: { organizationId: user.organizationId },
      relations: ['items', 'invitedSuppliers'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneForUser(user: AuthenticatedUser, rfqId: string): Promise<Rfq> {
    const rfq = await this.loadRfqOrThrow(rfqId);
    await this.assertVisible(user, rfq);
    return rfq;
  }

  async submitQuote(user: AuthenticatedUser, rfqId: string, dto: SubmitQuoteDto): Promise<Quotation> {
    const rfq = await this.loadRfqOrThrow(rfqId);

    const supplier = await this.suppliersService.findByOrganizationId(user.organizationId);
    if (!supplier) {
      throw new BadRequestException('No supplier profile found for this organization');
    }
    if (!rfq.invitedSuppliers.some((s) => s.id === supplier.id)) {
      throw new NotFoundException('RFQ not found');
    }
    if (rfq.status !== RfqStatus.OPEN) {
      throw new BadRequestException('RFQ is not open for quotes');
    }

    const rfqItemIds = new Set(rfq.items.map((i) => i.id));
    const submittedIds = dto.items.map((i) => i.rfqItemId);
    const submittedIdSet = new Set(submittedIds);
    if (submittedIds.length !== submittedIdSet.size) {
      throw new BadRequestException('Duplicate line items in quote');
    }
    if (submittedIdSet.size !== rfqItemIds.size || [...submittedIdSet].some((id) => !rfqItemIds.has(id))) {
      throw new BadRequestException('Quote must price every RFQ line item, no more and no fewer');
    }

    const existing = await this.quotationsRepository.findOne({
      where: { rfqId: rfq.id, supplierId: supplier.id },
    });
    if (existing) {
      throw new ConflictException('A quote has already been submitted for this RFQ');
    }

    const rfqItemsById = new Map(rfq.items.map((i) => [i.id, i]));
    let totalAmount = 0;
    const lineInputs = dto.items.map((line) => {
      const rfqItem = rfqItemsById.get(line.rfqItemId)!;
      const quantity = parseFloat(rfqItem.quantity);
      const lineTotal = round2(quantity * line.unitPrice);
      totalAmount += lineTotal;
      return { rfqItemId: line.rfqItemId, unitPrice: round2(line.unitPrice), lineTotal };
    });
    totalAmount = round2(totalAmount);

    let quotation: Quotation;
    try {
      quotation = await this.dataSource.transaction(async (manager) => {
        const quotationsRepo = manager.getRepository(Quotation);
        const quotationItemsRepo = manager.getRepository(QuotationItem);

        const created = await quotationsRepo.save(
          quotationsRepo.create({
            organizationId: rfq.organizationId,
            rfqId: rfq.id,
            supplierId: supplier.id,
            totalAmount: totalAmount.toFixed(2),
            status: QuotationStatus.SUBMITTED,
            submittedAt: new Date(),
          }),
        );

        await quotationItemsRepo.save(
          lineInputs.map((line) =>
            quotationItemsRepo.create({
              organizationId: rfq.organizationId,
              quotationId: created.id,
              rfqItemId: line.rfqItemId,
              unitPrice: line.unitPrice.toFixed(2),
              lineTotal: line.lineTotal.toFixed(2),
            }),
          ),
        );

        return created;
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('A quote has already been submitted for this RFQ');
      }
      throw err;
    }

    await this.eventsService.record('quote.submitted', {
      organizationId: rfq.organizationId,
      entityType: 'Quotation',
      entityId: quotation.id,
      actorId: user.userId,
      note: `Quote submitted by ${supplier.displayName}`,
      payload: { totalAmount: quotation.totalAmount },
    });

    return this.quotationsRepository.findOneOrFail({
      where: { id: quotation.id },
      relations: ['items'],
    });
  }

  async listQuotesForRfq(user: AuthenticatedUser, rfqId: string): Promise<Quotation[]> {
    if (user.role === UserRole.SUPPLIER_USER) {
      throw new ForbiddenException('Suppliers cannot list all quotes for an RFQ');
    }

    const rfq = await this.loadRfqOrThrow(rfqId);
    if (rfq.organizationId !== user.organizationId) {
      throw new NotFoundException('RFQ not found');
    }

    return this.quotationsRepository.find({
      where: { rfqId },
      relations: ['items', 'supplier'],
      order: { createdAt: 'ASC' },
    });
  }

  async getMyQuote(user: AuthenticatedUser, rfqId: string): Promise<Quotation | null> {
    const supplier = await this.suppliersService.findByOrganizationId(user.organizationId);
    if (!supplier) {
      return null;
    }
    // loadRfqOrThrow (not just an existence check) also 404s for RFQs this
    // supplier was never invited to, matching the rest of the module's
    // don't-leak-existence rule.
    await this.findOneForUser(user, rfqId);
    return this.quotationsRepository.findOne({
      where: { rfqId, supplierId: supplier.id },
      relations: ['items'],
    });
  }

  private async loadRfqOrThrow(rfqId: string): Promise<Rfq> {
    const rfq = await this.rfqsRepository.findOne({
      where: { id: rfqId },
      relations: ['items', 'invitedSuppliers'],
    });
    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }
    return rfq;
  }

  private async assertVisible(user: AuthenticatedUser, rfq: Rfq): Promise<void> {
    if (user.role === UserRole.SUPPLIER_USER) {
      const supplier = await this.suppliersService.findByOrganizationId(user.organizationId);
      const invited = !!supplier && rfq.invitedSuppliers.some((s) => s.id === supplier.id);
      if (rfq.status === RfqStatus.DRAFT || !invited) {
        throw new NotFoundException('RFQ not found');
      }
      return;
    }

    if (rfq.organizationId !== user.organizationId) {
      throw new NotFoundException('RFQ not found');
    }
  }
}
