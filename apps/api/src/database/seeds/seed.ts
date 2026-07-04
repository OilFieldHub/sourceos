import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { AuthenticatedUser } from '../../auth/types';
import { AuthService } from '../../auth/auth.service';
import { EvaluationsService } from '../../evaluations/evaluations.service';
import { OrganizationsService } from '../../organizations/organizations.service';
import { PurchaseOrderLifecycleService } from '../../purchase-orders/purchase-order-lifecycle.service';
import { PurchaseOrdersService } from '../../purchase-orders/purchase-orders.service';
import { CreateRfqItemDto } from '../../rfqs/dto/create-rfq.dto';
import { RfqsService } from '../../rfqs/rfqs.service';
import { UsersService } from '../../users/users.service';
import { OrganizationType, RfqCategoryPreset, UserRole } from '../entities/enums';

/**
 * Phase 10 reference seed — README's reference dataset: buyer org Sahara
 * Energy E&P, 3 named suppliers (Deepwater Assets Ltd, GulfTech Fabrication,
 * Bonny Marine Services), running real RFQ -> quote -> evaluation -> PO ->
 * GRN -> inspection -> invoice -> payment lifecycles end to end with no
 * manual intervention (calls the real service layer, not raw inserts, so
 * every score/code/event is genuinely computed, not hardcoded).
 *
 * Also solves the previously-open "no self-serve way to create an
 * ADMIN/PLATFORM user" gap (every earlier phase used a throwaway one-off
 * script) — this is now the canonical, permanent way to provision one.
 *
 * Run with: npm run seed   (inside apps/api)
 * Safe to run against a fresh/empty database only — it always creates new
 * organizations, so re-running against a non-empty database produces
 * duplicates rather than upserting.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

  const authService = app.get(AuthService);
  const organizationsService = app.get(OrganizationsService);
  const usersService = app.get(UsersService);
  const rfqsService = app.get(RfqsService);
  const evaluationsService = app.get(EvaluationsService);
  const purchaseOrdersService = app.get(PurchaseOrdersService);
  const lifecycleService = app.get(PurchaseOrderLifecycleService);

  console.log('Seeding OilfieldHub SourceOS reference dataset...\n');

  // ---- Platform admin (solves the long-open "no self-serve ADMIN" gap) ----
  const platformOrg = await organizationsService.create({ name: 'OilfieldHub Platform', type: OrganizationType.PLATFORM });
  const adminUserRow = await usersService.create({
    organizationId: platformOrg.id,
    email: 'admin@oilfieldhub.platform',
    password: 'AdminSeed123!',
    firstName: 'Platform',
    lastName: 'Admin',
    role: UserRole.ADMIN,
  });
  const adminUser: AuthenticatedUser = {
    userId: adminUserRow.id,
    organizationId: platformOrg.id,
    role: UserRole.ADMIN,
    email: adminUserRow.email,
  };
  console.log(`Platform admin: admin@oilfieldhub.platform / AdminSeed123!`);

  // ---- Buyer org: Sahara Energy E&P, with a second BUYER_ADMIN so the
  // $250k segregation-of-duties approval gate (amendment #6) has someone
  // other than the awarder available to approve. ----
  const buyerAuth = await authService.register({
    organizationName: 'Sahara Energy E&P',
    organizationType: OrganizationType.BUYER,
    firstName: 'Kenechukwu',
    lastName: 'Adeyemi',
    email: 'buyer@sahara-energy.example',
    password: 'SeedBuyer123!',
  });
  const buyer: AuthenticatedUser = {
    userId: buyerAuth.user.id,
    organizationId: buyerAuth.organization.id,
    role: buyerAuth.user.role,
    email: buyerAuth.user.email,
  };
  const approverRow = await usersService.create({
    organizationId: buyerAuth.organization.id,
    email: 'approvals@sahara-energy.example',
    password: 'SeedApprover123!',
    firstName: 'Amaka',
    lastName: 'Nwosu',
    role: UserRole.BUYER_ADMIN,
  });
  const approver: AuthenticatedUser = {
    userId: approverRow.id,
    organizationId: buyerAuth.organization.id,
    role: UserRole.BUYER_ADMIN,
    email: approverRow.email,
  };
  console.log(`Buyer: buyer@sahara-energy.example / SeedBuyer123! (org: Sahara Energy E&P)`);
  console.log(`Buyer approver (segregation of duties): approvals@sahara-energy.example / SeedApprover123!`);

  // ---- 3 named reference suppliers ----
  async function registerSupplier(name: string, email: string) {
    const auth = await authService.register({
      organizationName: name,
      organizationType: OrganizationType.SUPPLIER,
      firstName: 'Supplier',
      lastName: 'Ops',
      email,
      password: 'SeedSupplier123!',
    });
    const user: AuthenticatedUser = {
      userId: auth.user.id,
      organizationId: auth.organization.id,
      role: auth.user.role,
      email: auth.user.email,
    };
    console.log(`Supplier: ${email} / SeedSupplier123! (org: ${name})`);
    return { auth, user };
  }

  const deepwater = await registerSupplier('Deepwater Assets Ltd', 'ops@deepwater-assets.example');
  const gulftech = await registerSupplier('GulfTech Fabrication', 'ops@gulftech-fabrication.example');
  const bonny = await registerSupplier('Bonny Marine Services', 'ops@bonny-marine.example');

  console.log('\nRunning reference contracts...\n');

  // ---- Full clean contract: RFQ -> quote -> evaluate -> award -> (approve
  // if >$250k) -> escrow -> acknowledge -> GRN -> inspection -> invoice ->
  // payment. Every step goes through the real service layer. ----
  async function runCleanContract(
    title: string,
    categoryPreset: RfqCategoryPreset,
    items: CreateRfqItemDto[],
    unitPrices: number[],
    supplier: { auth: Awaited<ReturnType<typeof registerSupplier>>['auth']; user: AuthenticatedUser },
  ) {
    const rfq = await rfqsService.create(buyer, {
      title,
      categoryPreset,
      items,
      invitedSupplierIds: [supplier.auth.supplier!.id],
    });
    await rfqsService.publish(buyer, rfq.id);
    await rfqsService.submitQuote(supplier.user, rfq.id, {
      items: rfq.items.map((item, i) => ({ rfqItemId: item.id, unitPrice: unitPrices[i] })),
    });
    await evaluationsService.evaluate(buyer, rfq.id);
    const po = await purchaseOrdersService.award(buyer, rfq.id, { supplierId: supplier.auth.supplier!.id });

    if (po.requiresApproval) {
      await lifecycleService.approve(approver, po.id);
      console.log(`  ${po.poNumber} exceeded $250,000 — approved by segregation-of-duties approver`);
    }
    await lifecycleService.fundEscrow(buyer, po.id);
    await lifecycleService.acknowledge(supplier.user, po.id);
    await lifecycleService.submitGrn(buyer, po.id, {
      lines: rfq.items.map((item) => ({ rfqItemId: item.id, receivedQty: Number(item.quantity) })),
    });
    await lifecycleService.submitInspection(buyer, po.id, { conditionCheck: true, certsCheck: true, quantityCheck: true });
    await lifecycleService.submitInvoice(supplier.user, po.id);
    await lifecycleService.releasePayment(buyer, po.id);
    console.log(`  ${rfq.rfqNumber} "${title}" -> ${po.poNumber} PAID ($${po.totalValue})`);
    return { rfq, po };
  }

  // RFQ-2214-equivalent: rig charter, awarded to Deepwater (score -> LOW risk, high score)
  await runCleanContract(
    'Jack-up drilling campaign — OML 120',
    RfqCategoryPreset.RIG_CHARTER,
    [
      { description: '90-day charter day-rate', quantity: 90, unit: 'days' },
      { description: 'Mobilization / demobilization', quantity: 1, unit: 'lot' },
      { description: 'Standby rate (est. 10 days)', quantity: 10, unit: 'days' },
    ],
    [66500, 1200000, 41000],
    deepwater,
  );

  // A clean contract for GulfTech so it earns a real (non-cold-start) score too
  await runCleanContract(
    'Structural fabrication — jacket support brackets',
    RfqCategoryPreset.GENERAL_SUPPLY,
    [{ description: 'Fabricated steel jacket support bracket', quantity: 4, unit: 'units' }],
    [18500],
    gulftech,
  );

  // Two clean contracts for Bonny *before* its disputed one below — without
  // these, a supplier's very first-ever contract having a dispute drives
  // onTimeRate to 0% (their only data point was disputed) and lands them at
  // HIGH risk / score 0, which reads as "always been terrible" rather than
  // "one blemish on an otherwise decent record." A same-org dispute should
  // dent a score, not zero it out.
  await runCleanContract(
    'Marine support vessel charter — 30-day',
    RfqCategoryPreset.GENERAL_SUPPLY,
    [{ description: 'Marine support vessel, day-rate', quantity: 30, unit: 'days' }],
    [3200],
    bonny,
  );
  await runCleanContract(
    'Offshore supply run — consumables',
    RfqCategoryPreset.GENERAL_SUPPLY,
    [{ description: 'Offshore supply run, round trip', quantity: 2, unit: 'trips' }],
    [9500],
    bonny,
  );

  // RFQ-2215-equivalent: FR coveralls, awarded to Bonny, with a dispute
  // (opened -> mediated -> resolved) so Bonny lands at MEDIUM risk with a
  // real disputesCount, matching the README's reference dataset.
  const rfq2215 = await rfqsService.create(buyer, {
    title: 'FR coveralls resupply — 4,000 sets',
    categoryPreset: RfqCategoryPreset.GENERAL_SUPPLY,
    items: [
      { description: 'FR coveralls', quantity: 4000, unit: 'sets' },
      { description: 'Insulated work gloves', quantity: 8000, unit: 'pairs' },
    ],
    invitedSupplierIds: [bonny.auth.supplier!.id],
  });
  await rfqsService.publish(buyer, rfq2215.id);
  await rfqsService.submitQuote(bonny.user, rfq2215.id, {
    items: [
      { rfqItemId: rfq2215.items[0].id, unitPrice: 38.5 },
      { rfqItemId: rfq2215.items[1].id, unitPrice: 4.2 },
    ],
  });
  await evaluationsService.evaluate(buyer, rfq2215.id);
  const po2215 = await purchaseOrdersService.award(buyer, rfq2215.id, { supplierId: bonny.auth.supplier!.id });
  await lifecycleService.fundEscrow(buyer, po2215.id);
  await lifecycleService.acknowledge(bonny.user, po2215.id);
  await lifecycleService.submitGrn(buyer, po2215.id, {
    lines: rfq2215.items.map((item) => ({ rfqItemId: item.id, receivedQty: Number(item.quantity) })),
  });
  await lifecycleService.submitInspection(buyer, po2215.id, { conditionCheck: true, certsCheck: true, quantityCheck: true });
  await lifecycleService.submitInvoice(bonny.user, po2215.id);
  await lifecycleService.openDispute(buyer, po2215.id, { note: 'Sizing mismatch reported on coverall batch 3' });
  await lifecycleService.mediateDispute(adminUser, po2215.id);
  await lifecycleService.resolveDispute(adminUser, po2215.id);
  await lifecycleService.releasePayment(buyer, po2215.id);
  console.log(`  ${rfq2215.rfqNumber} "FR coveralls resupply" -> ${po2215.poNumber} PAID after dispute resolved ($${po2215.totalValue})`);

  // A PO deliberately left mid-lifecycle (GRN_RECEIVED, not yet paid) — a
  // realistic snapshot rather than every contract being neatly closed out,
  // matching the README's "PO-0071 HVAC units (at GRN/inspection)" example.
  const rfqMidway = await rfqsService.create(buyer, {
    title: 'HVAC units — onshore facility retrofit',
    categoryPreset: RfqCategoryPreset.GENERAL_SUPPLY,
    items: [{ description: 'Packaged HVAC unit, 15-ton', quantity: 6, unit: 'units' }],
    invitedSupplierIds: [deepwater.auth.supplier!.id],
  });
  await rfqsService.publish(buyer, rfqMidway.id);
  await rfqsService.submitQuote(deepwater.user, rfqMidway.id, {
    items: [{ rfqItemId: rfqMidway.items[0].id, unitPrice: 41000 }],
  });
  await evaluationsService.evaluate(buyer, rfqMidway.id);
  const poMidway = await purchaseOrdersService.award(buyer, rfqMidway.id, { supplierId: deepwater.auth.supplier!.id });
  await lifecycleService.fundEscrow(buyer, poMidway.id);
  await lifecycleService.acknowledge(deepwater.user, poMidway.id);
  await lifecycleService.submitGrn(buyer, poMidway.id, {
    lines: [{ rfqItemId: rfqMidway.items[0].id, receivedQty: 6 }],
  });
  console.log(`  ${rfqMidway.rfqNumber} "HVAC units" -> ${poMidway.poNumber} left at GRN_RECEIVED (in progress, not paid)`);

  console.log('\nSeed complete.');
  await app.close();
}

bootstrap().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
