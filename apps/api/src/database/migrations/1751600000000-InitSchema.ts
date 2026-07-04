import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 1 — initial schema. Creates every entity required by the phase spec
 * (Organization, User, Supplier, Requirement, RFQ, RFQItem, Quotation,
 * QuotationItem, Evaluation, PurchaseOrder, GRN, Inspection, Invoice,
 * Payment, Document, Event) plus the rfq_invited_suppliers join table.
 *
 * The `events` table gets a DB-level rule rejecting UPDATE/DELETE so the
 * append-only guarantee (amendment #8) holds even against a raw SQL client,
 * not just the service layer.
 */
export class InitSchema1751600000000 implements MigrationInterface {
  name = 'InitSchema1751600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    // ---- enum types ----
    await queryRunner.query(`CREATE TYPE "organizations_type_enum" AS ENUM ('BUYER','SUPPLIER','PLATFORM')`);
    await queryRunner.query(`CREATE TYPE "organizations_kybstatus_enum" AS ENUM ('PENDING','VERIFIED','REJECTED')`);
    await queryRunner.query(`CREATE TYPE "users_role_enum" AS ENUM ('BUYER_ADMIN','BUYER_USER','SUPPLIER_USER','ADMIN')`);
    await queryRunner.query(`CREATE TYPE "suppliers_risklevel_enum" AS ENUM ('LOW','MEDIUM','HIGH')`);
    await queryRunner.query(`CREATE TYPE "requirements_status_enum" AS ENUM ('DRAFT','CONVERTED','CANCELLED')`);
    await queryRunner.query(`CREATE TYPE "rfqs_categorypreset_enum" AS ENUM ('RIG_CHARTER','GENERAL_SUPPLY')`);
    await queryRunner.query(`CREATE TYPE "rfqs_status_enum" AS ENUM ('DRAFT','OPEN','EVALUATION','AWARDED','CLOSED')`);
    await queryRunner.query(`CREATE TYPE "quotations_status_enum" AS ENUM ('SUBMITTED','WITHDRAWN')`);
    await queryRunner.query(`CREATE TYPE "purchase_orders_stage_enum" AS ENUM ('ISSUED','ACKNOWLEDGED','GRN_RECEIVED','INSPECTED','INVOICED','PAID')`);
    await queryRunner.query(`CREATE TYPE "purchase_orders_disputestatus_enum" AS ENUM ('NONE','OPEN','MEDIATION','RESOLVED')`);
    await queryRunner.query(`CREATE TYPE "grns_status_enum" AS ENUM ('FULL','PARTIAL')`);
    await queryRunner.query(`CREATE TYPE "inspections_result_enum" AS ENUM ('PASSED','FAILED')`);
    await queryRunner.query(`CREATE TYPE "invoices_status_enum" AS ENUM ('SUBMITTED','MATCHED','DISPUTED','PAID')`);
    await queryRunner.query(`CREATE TYPE "payments_status_enum" AS ENUM ('PENDING','RELEASED','FROZEN')`);
    await queryRunner.query(`CREATE TYPE "documents_documenttype_enum" AS ENUM ('MTC','CERTIFICATE','PHOTO','KYB_DOC','OTHER')`);

    // ---- organizations (tenant root — no organizationId column) ----
    await queryRunner.query(`
      CREATE TABLE "organizations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "type" "organizations_type_enum" NOT NULL,
        "kybStatus" "organizations_kybstatus_enum" NOT NULL DEFAULT 'PENDING',
        "country" varchar(255),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_organizations_type" ON "organizations" ("type")`);

    // ---- users ----
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organizationId" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "email" varchar(255) NOT NULL,
        "passwordHash" varchar(255) NOT NULL,
        "firstName" varchar(120) NOT NULL,
        "lastName" varchar(120) NOT NULL,
        "role" "users_role_enum" NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_users_organizationId" ON "users" ("organizationId")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_users_org_email" ON "users" ("organizationId","email")`);

    // ---- suppliers (1:1 with a SUPPLIER-type organization) ----
    await queryRunner.query(`
      CREATE TABLE "suppliers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organizationId" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "displayName" varchar(255) NOT NULL,
        "score" smallint,
        "riskLevel" "suppliers_risklevel_enum",
        "onTimeRate" numeric(5,2),
        "completedContracts" int NOT NULL DEFAULT 0,
        "disputesCount" int NOT NULL DEFAULT 0,
        "certifications" jsonb NOT NULL DEFAULT '[]',
        "scoreDrivers" jsonb,
        "contentCompletenessScore" smallint NOT NULL DEFAULT 0,
        "seoPublished" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_suppliers_organizationId" ON "suppliers" ("organizationId")`);

    // ---- requirements ----
    await queryRunner.query(`
      CREATE TABLE "requirements" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organizationId" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "title" varchar(255) NOT NULL,
        "description" text,
        "category" varchar(120),
        "status" "requirements_status_enum" NOT NULL DEFAULT 'DRAFT',
        "createdById" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_requirements_organizationId" ON "requirements" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX "idx_requirements_status" ON "requirements" ("status")`);

    // ---- rfqs ----
    await queryRunner.query(`
      CREATE TABLE "rfqs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organizationId" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "title" varchar(255) NOT NULL,
        "requirementId" uuid REFERENCES "requirements"("id") ON DELETE SET NULL,
        "categoryPreset" "rfqs_categorypreset_enum" NOT NULL,
        "status" "rfqs_status_enum" NOT NULL DEFAULT 'DRAFT',
        "weightsLocked" jsonb,
        "publishedAt" timestamptz,
        "closeDate" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_rfqs_organizationId" ON "rfqs" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX "idx_rfqs_status" ON "rfqs" ("status")`);

    // ---- rfq_items ----
    await queryRunner.query(`
      CREATE TABLE "rfq_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organizationId" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "rfqId" uuid NOT NULL REFERENCES "rfqs"("id") ON DELETE CASCADE,
        "description" varchar(255) NOT NULL,
        "quantity" numeric(14,3) NOT NULL,
        "unit" varchar(40) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_rfq_items_organizationId" ON "rfq_items" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX "idx_rfq_items_rfqId" ON "rfq_items" ("rfqId")`);

    // ---- rfq_invited_suppliers (join table) ----
    await queryRunner.query(`
      CREATE TABLE "rfq_invited_suppliers" (
        "rfqId" uuid NOT NULL REFERENCES "rfqs"("id") ON DELETE CASCADE,
        "supplierId" uuid NOT NULL REFERENCES "suppliers"("id") ON DELETE CASCADE,
        PRIMARY KEY ("rfqId","supplierId")
      )
    `);

    // ---- quotations ----
    await queryRunner.query(`
      CREATE TABLE "quotations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organizationId" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "rfqId" uuid NOT NULL REFERENCES "rfqs"("id") ON DELETE CASCADE,
        "supplierId" uuid NOT NULL REFERENCES "suppliers"("id") ON DELETE CASCADE,
        "totalAmount" numeric(16,2) NOT NULL,
        "status" "quotations_status_enum" NOT NULL DEFAULT 'SUBMITTED',
        "submittedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_quotations_organizationId" ON "quotations" ("organizationId")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_quotations_rfq_supplier" ON "quotations" ("rfqId","supplierId")`);

    // ---- quotation_items ----
    await queryRunner.query(`
      CREATE TABLE "quotation_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organizationId" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "quotationId" uuid NOT NULL REFERENCES "quotations"("id") ON DELETE CASCADE,
        "rfqItemId" uuid NOT NULL REFERENCES "rfq_items"("id") ON DELETE CASCADE,
        "unitPrice" numeric(16,2) NOT NULL,
        "lineTotal" numeric(16,2) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_quotation_items_organizationId" ON "quotation_items" ("organizationId")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_quotation_items_quotation_item" ON "quotation_items" ("quotationId","rfqItemId")`);

    // ---- evaluations ----
    await queryRunner.query(`
      CREATE TABLE "evaluations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organizationId" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "rfqId" uuid NOT NULL REFERENCES "rfqs"("id") ON DELETE CASCADE,
        "quotationId" uuid NOT NULL REFERENCES "quotations"("id") ON DELETE CASCADE,
        "supplierId" uuid NOT NULL REFERENCES "suppliers"("id") ON DELETE CASCADE,
        "priceScore" numeric(5,2) NOT NULL,
        "reliabilityScore" numeric(5,2) NOT NULL,
        "riskScore" numeric(5,2) NOT NULL,
        "compositeScore" numeric(5,2) NOT NULL,
        "rank" int NOT NULL,
        "weightsUsed" jsonb NOT NULL,
        "reasons" jsonb NOT NULL DEFAULT '[]',
        "anomalyFlag" boolean NOT NULL DEFAULT false,
        "anomalyDetail" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_evaluations_organizationId" ON "evaluations" ("organizationId")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_evaluations_rfq_supplier" ON "evaluations" ("rfqId","supplierId")`);

    // ---- purchase_orders ----
    await queryRunner.query(`
      CREATE TABLE "purchase_orders" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organizationId" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "poNumber" varchar(40) NOT NULL UNIQUE,
        "rfqId" uuid NOT NULL REFERENCES "rfqs"("id") ON DELETE RESTRICT,
        "quotationId" uuid NOT NULL REFERENCES "quotations"("id") ON DELETE RESTRICT,
        "supplierId" uuid NOT NULL REFERENCES "suppliers"("id") ON DELETE RESTRICT,
        "stage" "purchase_orders_stage_enum" NOT NULL DEFAULT 'ISSUED',
        "totalValue" numeric(16,2) NOT NULL,
        "escrowFunded" boolean NOT NULL DEFAULT false,
        "escrowFundedAt" timestamptz,
        "disputeStatus" "purchase_orders_disputestatus_enum" NOT NULL DEFAULT 'NONE',
        "requiresApproval" boolean NOT NULL DEFAULT false,
        "approvedById" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "approvedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_purchase_orders_organizationId" ON "purchase_orders" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX "idx_purchase_orders_stage" ON "purchase_orders" ("stage")`);

    // ---- grns ----
    await queryRunner.query(`
      CREATE TABLE "grns" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organizationId" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "grnNumber" varchar(40) NOT NULL UNIQUE,
        "purchaseOrderId" uuid NOT NULL REFERENCES "purchase_orders"("id") ON DELETE CASCADE,
        "receivedById" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "receivedAt" timestamptz NOT NULL,
        "status" "grns_status_enum" NOT NULL,
        "lines" jsonb NOT NULL DEFAULT '[]',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_grns_organizationId" ON "grns" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX "idx_grns_purchaseOrderId" ON "grns" ("purchaseOrderId")`);

    // ---- inspections ----
    await queryRunner.query(`
      CREATE TABLE "inspections" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organizationId" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "purchaseOrderId" uuid NOT NULL REFERENCES "purchase_orders"("id") ON DELETE CASCADE,
        "grnId" uuid NOT NULL REFERENCES "grns"("id") ON DELETE CASCADE,
        "reportId" varchar(60) NOT NULL,
        "conditionCheck" boolean NOT NULL DEFAULT false,
        "certsCheck" boolean NOT NULL DEFAULT false,
        "quantityCheck" boolean NOT NULL DEFAULT false,
        "result" "inspections_result_enum" NOT NULL,
        "inspectedAt" timestamptz NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_inspections_organizationId" ON "inspections" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX "idx_inspections_purchaseOrderId" ON "inspections" ("purchaseOrderId")`);

    // ---- invoices ----
    await queryRunner.query(`
      CREATE TABLE "invoices" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organizationId" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "invoiceNumber" varchar(40) NOT NULL UNIQUE,
        "purchaseOrderId" uuid NOT NULL REFERENCES "purchase_orders"("id") ON DELETE CASCADE,
        "amount" numeric(16,2) NOT NULL,
        "threeWayMatch" jsonb NOT NULL DEFAULT '[]',
        "status" "invoices_status_enum" NOT NULL DEFAULT 'SUBMITTED',
        "submittedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_invoices_organizationId" ON "invoices" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX "idx_invoices_purchaseOrderId" ON "invoices" ("purchaseOrderId")`);

    // ---- payments ----
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organizationId" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "invoiceId" uuid NOT NULL REFERENCES "invoices"("id") ON DELETE RESTRICT,
        "purchaseOrderId" uuid NOT NULL REFERENCES "purchase_orders"("id") ON DELETE RESTRICT,
        "amount" numeric(16,2) NOT NULL,
        "status" "payments_status_enum" NOT NULL DEFAULT 'PENDING',
        "releasedAt" timestamptz,
        "escrowReleaseNote" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_payments_organizationId" ON "payments" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX "idx_payments_purchaseOrderId" ON "payments" ("purchaseOrderId")`);

    // ---- documents (polymorphic) ----
    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organizationId" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "entityType" varchar(60) NOT NULL,
        "entityId" uuid NOT NULL,
        "documentType" "documents_documenttype_enum" NOT NULL,
        "fileName" varchar(255) NOT NULL,
        "url" text NOT NULL,
        "uploadedById" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_documents_organizationId" ON "documents" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX "idx_documents_entity" ON "documents" ("entityType","entityId")`);

    // ---- events (append-only) ----
    await queryRunner.query(`
      CREATE TABLE "events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organizationId" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "sequence" bigint NOT NULL,
        "type" varchar(80) NOT NULL,
        "entityType" varchar(60) NOT NULL,
        "entityId" uuid NOT NULL,
        "actorId" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "note" text,
        "payload" jsonb,
        "prevHash" char(64),
        "hash" char(64) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_events_organizationId" ON "events" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX "idx_events_type" ON "events" ("type")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_events_org_sequence" ON "events" ("organizationId","sequence")`);

    // Append-only enforcement at the DB level: reject UPDATE/DELETE outright.
    await queryRunner.query(`
      CREATE RULE "events_no_update" AS ON UPDATE TO "events" DO INSTEAD NOTHING
    `);
    await queryRunner.query(`
      CREATE RULE "events_no_delete" AS ON DELETE TO "events" DO INSTEAD NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP RULE IF EXISTS "events_no_delete" ON "events"`);
    await queryRunner.query(`DROP RULE IF EXISTS "events_no_update" ON "events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invoices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inspections"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "grns"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "evaluations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "quotation_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "quotations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rfq_invited_suppliers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rfq_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rfqs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "requirements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "suppliers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organizations"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "documents_documenttype_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payments_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "invoices_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "inspections_result_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "grns_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "purchase_orders_disputestatus_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "purchase_orders_stage_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "quotations_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rfqs_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rfqs_categorypreset_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "requirements_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "suppliers_risklevel_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "organizations_kybstatus_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "organizations_type_enum"`);
  }
}
