export type UserRole = "BUYER_ADMIN" | "BUYER_USER" | "SUPPLIER_USER" | "ADMIN";
export type OrganizationType = "BUYER" | "SUPPLIER" | "PLATFORM";
export type RfqCategoryPreset = "RIG_CHARTER" | "GENERAL_SUPPLY";
export type RfqStatus = "DRAFT" | "OPEN" | "EVALUATION" | "AWARDED" | "CLOSED";
export type PoStage = "ISSUED" | "ACKNOWLEDGED" | "GRN_RECEIVED" | "INSPECTED" | "INVOICED" | "PAID";
export type DisputeStatus = "NONE" | "OPEN" | "MEDIATION" | "RESOLVED";
export type GrnStatus = "FULL" | "PARTIAL";
export type InspectionResult = "PASSED" | "FAILED";
export type InvoiceStatus = "SUBMITTED" | "MATCHED" | "DISPUTED" | "PAID";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface AuthOrganization {
  id: string;
  name: string;
  type: OrganizationType;
}

export interface AuthSupplier {
  id: string;
  displayName: string;
}

export interface AuthResult {
  accessToken: string;
  user: AuthUser;
  organization: AuthOrganization;
  supplier?: AuthSupplier;
}

export interface RfqItem {
  id: string;
  rfqId: string;
  description: string;
  quantity: string;
  unit: string;
}

export interface EvaluationWeights {
  price: number;
  reliability: number;
  risk: number;
}

export interface Supplier {
  id: string;
  organizationId: string;
  displayName: string;
  score: number | null;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | null;
  onTimeRate: string | null;
  completedContracts: number;
  disputesCount: number;
  certifications: string[];
  scoreDrivers: string[] | null;
}

export interface Rfq {
  id: string;
  organizationId: string;
  /** Null only for RFQs created before this field existed. */
  rfqNumber: string | null;
  title: string;
  requirementId: string | null;
  categoryPreset: RfqCategoryPreset;
  status: RfqStatus;
  weightsLocked: EvaluationWeights | null;
  publishedAt: string | null;
  closeDate: string | null;
  createdAt: string;
  items: RfqItem[];
  invitedSuppliers: Supplier[];
  myQuoteTotal?: string | null;
}

export interface QuotationItem {
  id: string;
  quotationId: string;
  rfqItemId: string;
  unitPrice: string;
  lineTotal: string;
}

export interface Quotation {
  id: string;
  rfqId: string;
  supplierId: string;
  totalAmount: string;
  status: "SUBMITTED" | "WITHDRAWN";
  submittedAt: string | null;
  items: QuotationItem[];
  supplier?: Supplier;
}

export interface Evaluation {
  id: string;
  rfqId: string;
  quotationId: string;
  supplierId: string;
  priceScore: string;
  reliabilityScore: string;
  riskScore: string;
  compositeScore: string;
  rank: number;
  weightsUsed: EvaluationWeights;
  reasons: string[];
  anomalyFlag: boolean;
  anomalyDetail: string | null;
  supplier?: Supplier;
}

export interface PurchaseOrder {
  id: string;
  organizationId: string;
  poNumber: string;
  rfqId: string;
  quotationId: string;
  supplierId: string;
  stage: PoStage;
  totalValue: string;
  escrowFunded: boolean;
  escrowFundedAt: string | null;
  disputeStatus: DisputeStatus;
  requiresApproval: boolean;
  approvedById: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface GrnLine {
  rfqItemId: string;
  qtyOk: boolean;
  receivedQty: number;
  photoUrls: string[];
}

export interface Grn {
  id: string;
  grnNumber: string;
  purchaseOrderId: string;
  receivedById: string;
  receivedAt: string;
  status: GrnStatus;
  lines: GrnLine[];
}

export interface Inspection {
  id: string;
  purchaseOrderId: string;
  grnId: string;
  reportId: string;
  conditionCheck: boolean;
  certsCheck: boolean;
  quantityCheck: boolean;
  result: InspectionResult;
  inspectedAt: string;
}

export interface ThreeWayMatchLine {
  rfqItemId: string;
  poQty: string;
  grnQty: string;
  invoiceQty: string;
  matched: boolean;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  purchaseOrderId: string;
  amount: string;
  threeWayMatch: ThreeWayMatchLine[];
  status: InvoiceStatus;
  submittedAt: string | null;
}

export interface Payment {
  id: string;
  /** Null only for payments released before this field existed. */
  paymentNumber: string | null;
  invoiceId: string;
  purchaseOrderId: string;
  amount: string;
  status: "PENDING" | "RELEASED" | "FROZEN";
  releasedAt: string | null;
}

export type DocumentType = "MTC" | "CERTIFICATE" | "PHOTO" | "KYB_DOC" | "OTHER";

export interface FiledDocument {
  id: string;
  code: string;
  entityType: string;
  entityId: string;
  documentType: DocumentType;
  fileName: string;
  url: string;
  uploadedById: string;
  archivedAt: string | null;
  createdAt: string;
}

export interface Event {
  id: string;
  organizationId: string;
  createdAt: string;
  sequence: string;
  type: string;
  entityType: string;
  entityId: string;
  actorId: string | null;
  note: string | null;
  payload: Record<string, unknown> | null;
  prevHash: string | null;
  hash: string;
}

export interface ChainVerification {
  valid: boolean;
  brokenAtSequence: string | null;
}

export interface SupplierHistory {
  score: number | null;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | null;
  onTimeRate: string | null;
  completedContracts: number;
  disputesCount: number;
  scoreDrivers: string[] | null;
  quotesSubmitted: number;
  rfqsWon: number;
  winRate: number;
  totalRevenuePaid: string;
}

export interface PublicSupplierSummary {
  slug: string;
  displayName: string;
  score: number | null;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | null;
  onTimeRate: string | null;
  completedContracts: number;
  certifications: string[];
  /** Real KYB verification status — not just "has a score." */
  kybVerified: boolean;
}

export interface PublicCategorySummary {
  slug: string;
  preset: RfqCategoryPreset;
  label: string;
  publishedSupplierCount: number;
}

export interface PublicCategoryDetail extends PublicCategorySummary {
  suppliers: PublicSupplierSummary[];
}

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  kybStatus: "PENDING" | "VERIFIED" | "REJECTED";
  createdAt: string;
  country: string | null;
}
