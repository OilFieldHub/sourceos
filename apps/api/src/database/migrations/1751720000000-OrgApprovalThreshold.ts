import { MigrationInterface, QueryRunner } from 'typeorm';

/** Per-organization override for the segregation-of-duties PO approval gate (amendment #6) — see Organization.approvalThreshold. */
export class OrgApprovalThreshold1751720000000 implements MigrationInterface {
  name = 'OrgApprovalThreshold1751720000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "organizations" ADD COLUMN "approvalThreshold" integer`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN "approvalThreshold"`);
  }
}
