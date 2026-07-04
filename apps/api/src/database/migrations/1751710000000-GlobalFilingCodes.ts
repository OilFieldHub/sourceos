import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Corrects the filing-code scheme to be genuinely global/platform-wide
 * (see common/reference-codes.ts) rather than per-tenant. `poNumber`/
 * `grnNumber`/`invoiceNumber` were already globally unique from
 * InitSchema — this migration only needed to catch up the newer columns
 * that weren't: `rfqNumber` and `paymentNumber` had no uniqueness
 * constraint at all yet, `reportId` (Inspection) never had one, and
 * `documents.code` was wrongly scoped per-organization
 * (`uq_documents_organizationId_code`) instead of globally.
 */
export class GlobalFilingCodes1751710000000 implements MigrationInterface {
  name = 'GlobalFilingCodes1751710000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "rfqs" ADD CONSTRAINT "UQ_rfqs_rfqNumber" UNIQUE ("rfqNumber")`);
    await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "UQ_payments_paymentNumber" UNIQUE ("paymentNumber")`);
    await queryRunner.query(`ALTER TABLE "inspections" ADD CONSTRAINT "UQ_inspections_reportId" UNIQUE ("reportId")`);
    await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "uq_documents_organizationId_code"`);
    await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "UQ_documents_code" UNIQUE ("code")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "UQ_documents_code"`);
    await queryRunner.query(
      `ALTER TABLE "documents" ADD CONSTRAINT "uq_documents_organizationId_code" UNIQUE ("organizationId", "code")`,
    );
    await queryRunner.query(`ALTER TABLE "inspections" DROP CONSTRAINT "UQ_inspections_reportId"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "UQ_payments_paymentNumber"`);
    await queryRunner.query(`ALTER TABLE "rfqs" DROP CONSTRAINT "UQ_rfqs_rfqNumber"`);
  }
}
