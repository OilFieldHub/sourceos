export enum OrganizationType {
  BUYER = 'BUYER',
  SUPPLIER = 'SUPPLIER',
  PLATFORM = 'PLATFORM',
}

export enum KybStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum UserRole {
  BUYER_ADMIN = 'BUYER_ADMIN',
  BUYER_USER = 'BUYER_USER',
  SUPPLIER_USER = 'SUPPLIER_USER',
  ADMIN = 'ADMIN',
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum RequirementStatus {
  DRAFT = 'DRAFT',
  CONVERTED = 'CONVERTED',
  CANCELLED = 'CANCELLED',
}

export enum RfqCategoryPreset {
  RIG_CHARTER = 'RIG_CHARTER',
  GENERAL_SUPPLY = 'GENERAL_SUPPLY',
}

export enum RfqStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  EVALUATION = 'EVALUATION',
  AWARDED = 'AWARDED',
  CLOSED = 'CLOSED',
}

export enum QuotationStatus {
  SUBMITTED = 'SUBMITTED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum PoStage {
  ISSUED = 'ISSUED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  GRN_RECEIVED = 'GRN_RECEIVED',
  INSPECTED = 'INSPECTED',
  INVOICED = 'INVOICED',
  PAID = 'PAID',
}

export enum DisputeStatus {
  NONE = 'NONE',
  OPEN = 'OPEN',
  MEDIATION = 'MEDIATION',
  RESOLVED = 'RESOLVED',
}

export enum GrnStatus {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
}

export enum InspectionResult {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
}

export enum InvoiceStatus {
  SUBMITTED = 'SUBMITTED',
  MATCHED = 'MATCHED',
  DISPUTED = 'DISPUTED',
  PAID = 'PAID',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  RELEASED = 'RELEASED',
  FROZEN = 'FROZEN',
}

export enum DocumentType {
  MTC = 'MTC',
  CERTIFICATE = 'CERTIFICATE',
  PHOTO = 'PHOTO',
  KYB_DOC = 'KYB_DOC',
  OTHER = 'OTHER',
}
