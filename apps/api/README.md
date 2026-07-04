# OilfieldHub SourceOS — API (Phase 1: Database)

NestJS + TypeORM + PostgreSQL backend for OilfieldHub SourceOS. This phase delivers the
schema only: 16 entities (Organization, User, Supplier, Requirement, RFQ, RFQItem, Quotation,
QuotationItem, Evaluation, PurchaseOrder, GRN, Inspection, Invoice, Payment, Document, Event)
plus the `rfq_invited_suppliers` join table, wired for later phases to build on.

## Schema notes

- Every table has `id` (uuid), `organizationId`, `createdAt`, `updatedAt` — except
  `organizations` itself, which is the tenant root.
- `suppliers` is a 1:1 SourceOS profile on a `SUPPLIER`-type organization (`score` is
  nullable so cold-start suppliers render UNRATED, never 0 — amendment #3).
- `rfqs.weightsLocked` snapshots the evaluation weight preset at `rfq.published` and must
  never be mutated after quotes arrive — enforce in the Phase 3/5 service layer.
- `purchase_orders` carries `escrowFunded`, `disputeStatus`, and `requiresApproval` to
  support the escrow, dispute-freeze and segregation-of-duties amendments; PO stage
  ordering (ISSUED → ACKNOWLEDGED → GRN_RECEIVED → INSPECTED → INVOICED → PAID) must be
  enforced strictly server-side in Phase 5, not by the schema.
- `events` is append-only: the initial migration adds Postgres rules that reject UPDATE
  and DELETE outright. `sequence` + `hash`/`prevHash` support the per-organization
  hash-chained event log (amendment #8); assigning `sequence` and computing the hash is a
  Phase 2 event-bus concern, not enforced by the schema itself.
- Notifications, disputes-as-cases, approvals-as-a-queue and RFQ negotiation messages are
  intentionally **not** separate tables — per the README's event-driven architecture they
  are derived views over `events` (e.g. a message is an event of type `message.sent` with
  the body in `note`; pending approvals are derived from RFQ/PO state, not stored).

## Local setup

Requires a reachable PostgreSQL 13+ instance (a `docker-compose.yml` with a `postgres`
service is provided at the repo root — run `docker compose up -d` if you have Docker).

```bash
cd apps/api
npm install
cp .env.example .env   # adjust DB_* if not using the provided docker-compose
npm run migration:run
```

## Scripts

- `npm run migration:run` / `migration:revert` — apply/roll back migrations against `DB_*` env vars.
- `npm run migration:generate -- src/database/migrations/<Name>` — generate a new migration from entity diffs (Phase 2+).
- `npm run typecheck` — `tsc --noEmit`.
- `npm run start:dev` — boots the (currently empty) Nest app; real modules land in Phase 2.

## Not yet run in this environment

This sandbox has no local PostgreSQL and no Docker, so the migration has not been executed
against a live database here — only type-checked. Run `npm run migration:run` yourself
against a real Postgres instance to confirm it applies cleanly.
