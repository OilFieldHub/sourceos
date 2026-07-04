import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reference-code / filing-system follow-up (common/reference-codes.ts):
 * RFQ and Payment previously had no human-readable code at all (unlike
 * PO/GRN/Inspection/Invoice, which already had one each) — a red-team-level
 * inconsistency. Documents also got a `code` (the actual filing-system
 * reference, e.g. "MTC-PO-0001") and an `archivedAt` soft-archive column.
 *
 * Backfill strategy: `rfqs`/`payments` may already have rows (this isn't a
 * fresh table), so `rfqNumber`/`paymentNumber` are added nullable — a
 * zero-downtime add-then-backfill migration, not a design gap. Every row
 * created going forward always gets one (`RfqsService.create`,
 * `PurchaseOrderLifecycleService.releasePayment`). `documents` is a brand
 * new table with no prior rows (Document had no service/controller before
 * this change), so `code` is safely NOT NULL from day one.
 */
export class AddReferenceCodes1751700000000 implements MigrationInterface {
  name = 'AddReferenceCodes1751700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "rfqs" ADD COLUMN "rfqNumber" varchar(20)`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN "paymentNumber" varchar(20)`);

    await queryRunner.query(`ALTER TABLE "documents" ADD COLUMN "code" varchar(30) NOT NULL`);
    await queryRunner.query(`ALTER TABLE "documents" ADD COLUMN "archivedAt" timestamptz`);
    await queryRunner.query(
      `ALTER TABLE "documents" ADD CONSTRAINT "uq_documents_organizationId_code" UNIQUE ("organizationId", "code")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "uq_documents_organizationId_code"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "archivedAt"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "code"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "paymentNumber"`);
    await queryRunner.query(`ALTER TABLE "rfqs" DROP COLUMN "rfqNumber"`);
  }
}
