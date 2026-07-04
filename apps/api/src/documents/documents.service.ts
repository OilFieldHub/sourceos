import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/types';
import { filingCodePrefix } from '../common/reference-codes';
import { generateSequentialNumber } from '../common/sequential-number';
import { Document } from '../database/entities/document.entity';
import { EventsService } from '../events/events.service';
import { FileDocumentDto } from './dto/file-document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentsRepository: Repository<Document>,
    private readonly eventsService: EventsService,
  ) {}

  /**
   * Files a document into the archive and assigns its code (e.g.
   * "MTC-PO-0001") — see common/reference-codes.ts for the full scheme.
   * The code is a globally unique platform-wide filing reference (one
   * sequence per (docType, entityType) pair, shared across every
   * organization) — not a per-tenant label. Visibility of the filed
   * document itself is still org-scoped (see findForEntity/findByCode/
   * archive below); only the code's uniqueness is global.
   */
  async file(user: AuthenticatedUser, dto: FileDocumentDto): Promise<Document> {
    const prefix = filingCodePrefix(dto.documentType, dto.entityType);

    const code = await generateSequentialNumber(
      prefix,
      () => this.documentsRepository.count({ where: { documentType: dto.documentType, entityType: dto.entityType } }),
      (candidate) => this.documentsRepository.findOne({ where: { code: candidate } }).then((r) => !!r),
    );

    const document = await this.documentsRepository.save(
      this.documentsRepository.create({
        organizationId: user.organizationId,
        code,
        entityType: dto.entityType,
        entityId: dto.entityId,
        documentType: dto.documentType,
        fileName: dto.fileName,
        url: dto.url,
        uploadedById: user.userId,
        archivedAt: null,
      }),
    );

    await this.eventsService.record('document.filed', {
      organizationId: user.organizationId,
      entityType: 'Document',
      entityId: document.id,
      actorId: user.userId,
      note: `${code} filed (${dto.fileName}) against ${dto.entityType} ${dto.entityId}`,
    });

    return document;
  }

  /** The filing-cabinet browse view: every non-archived document filed against one entity. */
  async findForEntity(user: AuthenticatedUser, entityType: string, entityId: string): Promise<Document[]> {
    return this.documentsRepository.find({
      where: { organizationId: user.organizationId, entityType, entityId, archivedAt: IsNull() },
      order: { createdAt: 'ASC' },
    });
  }

  async findByCode(user: AuthenticatedUser, code: string): Promise<Document> {
    const document = await this.documentsRepository.findOne({ where: { organizationId: user.organizationId, code } });
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  async archive(user: AuthenticatedUser, id: string): Promise<Document> {
    const document = await this.documentsRepository.findOne({ where: { id, organizationId: user.organizationId } });
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    if (document.archivedAt) {
      throw new BadRequestException('Document is already archived');
    }

    document.archivedAt = new Date();
    await this.documentsRepository.save(document);

    await this.eventsService.record('document.archived', {
      organizationId: user.organizationId,
      entityType: 'Document',
      entityId: document.id,
      actorId: user.userId,
      note: `${document.code} archived`,
    });

    return document;
  }
}
