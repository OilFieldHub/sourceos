export * from './tenant-base.entity';
export * from './organization.entity';
export * from './user.entity';
export * from './supplier.entity';
export * from './requirement.entity';
export * from './rfq.entity';
export * from './rfq-item.entity';
export * from './quotation.entity';
export * from './quotation-item.entity';
export * from './evaluation.entity';
export * from './purchase-order.entity';
export * from './grn.entity';
export * from './inspection.entity';
export * from './invoice.entity';
export * from './payment.entity';
export * from './document.entity';
export * from './event.entity';

import { Organization } from './organization.entity';
import { User } from './user.entity';
import { Supplier } from './supplier.entity';
import { Requirement } from './requirement.entity';
import { Rfq } from './rfq.entity';
import { RfqItem } from './rfq-item.entity';
import { Quotation } from './quotation.entity';
import { QuotationItem } from './quotation-item.entity';
import { Evaluation } from './evaluation.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { Grn } from './grn.entity';
import { Inspection } from './inspection.entity';
import { Invoice } from './invoice.entity';
import { Payment } from './payment.entity';
import { Document } from './document.entity';
import { Event } from './event.entity';

export const entities = [
  Organization,
  User,
  Supplier,
  Requirement,
  Rfq,
  RfqItem,
  Quotation,
  QuotationItem,
  Evaluation,
  PurchaseOrder,
  Grn,
  Inspection,
  Invoice,
  Payment,
  Document,
  Event,
];
