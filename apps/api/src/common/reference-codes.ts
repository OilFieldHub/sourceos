import { BadRequestException } from '@nestjs/common';
import { DocumentType } from '../database/entities/enums';

/**
 * Canonical acronym registry — the single source of truth for every
 * human-readable reference code the system generates. Two code families,
 * both built on the same `{PREFIX}-{4-digit-seq}` mechanics
 * (`generateSequentialNumber`, org-scoped):
 *
 *  - **Lifecycle codes** (`{ENTITY}-{seq}`, e.g. `PO-0001`, `RFQ-0001`,
 *    `PAY-0001`): one per core procurement entity, assigned once at
 *    creation. Every entity in the RFQ→PO→GRN→Inspection→Invoice→Payment
 *    chain gets one — no silent gaps for a red-team reviewer to find.
 *  - **Filing codes** (`{DOCTYPE}-{ENTITY}-{seq}`, e.g. `MTC-PO-0001`,
 *    `KYB-ORG-0002`): one per filed Document attachment. The prefix
 *    doubles as its own audit trail — read left-to-right it says
 *    "a Mill Test Certificate, filed against Purchase Order 0001."
 */
export const ENTITY_ACRONYMS: Record<string, string> = {
  Rfq: 'RFQ',
  PurchaseOrder: 'PO',
  Grn: 'GRN',
  Inspection: 'INSP',
  Invoice: 'INV',
  Payment: 'PAY',
  Organization: 'ORG',
  Supplier: 'SUP',
  Requirement: 'REQ',
};

/** Mill Test Certificate / Certificate / Photo / Know-Your-Business doc / Other. */
export const DOCUMENT_TYPE_ACRONYMS: Record<DocumentType, string> = {
  [DocumentType.MTC]: 'MTC',
  [DocumentType.CERTIFICATE]: 'CRT',
  [DocumentType.PHOTO]: 'PHO',
  [DocumentType.KYB_DOC]: 'KYB',
  [DocumentType.OTHER]: 'OTH',
};

export function entityAcronym(entityType: string): string {
  const acronym = ENTITY_ACRONYMS[entityType];
  if (!acronym) {
    throw new BadRequestException(
      `Unknown entityType "${entityType}" — not in the reference-code registry (see common/reference-codes.ts)`,
    );
  }
  return acronym;
}

export function filingCodePrefix(documentType: DocumentType, entityType: string): string {
  return `${DOCUMENT_TYPE_ACRONYMS[documentType]}-${entityAcronym(entityType)}`;
}
