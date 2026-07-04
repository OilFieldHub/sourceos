# Handoff: OilfieldHub SourceOS — Procure-to-Pay OS

## Overview
OilfieldHub SourceOS is a procurement operating system for the African oil & gas sector: Requirement → RFQ → Quotation → Evaluation (weighted, explainable) → Purchase Order → GRN → Inspection → Invoice → Payment, with a supplier portal, SourceOS intelligence (supplier scoring 0–100, price-anomaly detection), a programmatic SEO engine, and an append-only Event log as source of truth.

**Start here:** implement `phase_specs/Phase_1_Database.txt` through `Phase_10_Deploy_Test.txt` in order, using `OilfieldHub SourceOS.dc.html` (open it in a browser) as the visual/behavioral spec and this README as the contract. The Red-Team V1 Amendments section below is binding and overrides anything that conflicts in the phase specs.

This package hands the design to a developer (e.g. Claude Code) to implement against the 10-phase build spec supplied by the product owner (included in `phase_specs/`), as amended by the Executive Red Team Review (`phase_specs/RedTeam_Review.txt`).

## Red Team Review — binding directives (v3)
- **Do not redesign. Do not expand scope.** Approved V1 scope only: Auth; Organizations; Users & Roles; Requirements; RFQs; RFQ Items; Quotations; Evaluation; POs; GRN; Inspection; Invoicing; Payments; Documents; Notifications; Audit/Event Log; Buyer Portal; Supplier Portal; SourceOS (ranking, price benchmarking, risk — nothing more); SEO Foundation. **Excluded:** ERP, inventory, CRM, HR, accounting, logistics optimization, advanced AI agents, predictive analytics.
- Strict module boundaries; thin controllers; business logic in services; event-driven communication. No architectural redesign.
- UX: guide users through the workflow — don't expose every capability at once (progressive disclosure per stage).
- Homepage was under-specified (7.5/10) → now designed: `OilfieldHub Homepage.dc.html` (see below). Homepage is the SEO authority page linking to supplier/category/template/guide/comparison page families.
- Definition of Done: every approved module implemented; workflow executes end-to-end; both portals functional; SourceOS explainable; SEO pages generated; homepage communicates the value proposition; deployable with no manual workarounds; e2e tests pass.

## About the Design Files
The `.dc.html` files in this bundle are **design references created in HTML** — interactive prototypes showing intended look and behavior. They are NOT production code. The task is to **recreate these designs in the target stack** — per the phase specs: **Next.js (SSR) frontend + NestJS backend + PostgreSQL (TypeORM/Prisma)** — using established patterns (React Query, Zustand, React Hook Form + Zod, Tailwind).

- `OilfieldHub Homepage.dc.html` — the public landing page (v2 rebrand, JUL 2026: green & gold palette, warm neutrals, "Field wire" live asset ticker, people section with image-slot photo cards, ligature logo). Structure: woven accent band, sticky nav, field-wire ticker, hero (stats + SourceOS evidence cards + live rig card), people cards, problem→fixed strip, 9-step workflow, SourceOS band (dark green), industry focus, trust grid, CTA band, SEO footer. Requires sibling `image-slot.js`, `support.js` and `uploads/` photo. Copy is USD-only by owner directive.
- `OilfieldHub SourceOS.dc.html` — the working OS prototype (buyer console, supplier portal, evaluation, PO lifecycle, event log, SEO engine map). Open in a browser; state is wired end-to-end (award → PO generation → stage advancement → events appended).
- `OilfieldHub Explorations.dc.html` — the design-exploration canvas (marketplace-era screens; turns 2a/3a/3b/4a/4b/5a/5b/6a–6d). Useful for visual DNA, marketplace/search surfaces, mobile and dark-mode treatments.
- `phase_specs/*.txt` — the 10 deterministic build-phase requirements (extracted from the owner's PDFs). **Follow these meticulously**; the prototype is the visual/behavioral spec for phases 5–9.
- `screenshots/` — pixel ground-truth captures of the live prototypes: `01-sourceos` buyer dashboard · `02` RFQ-2214 evaluation (locked weights, anomaly) · `03` approvals queue · `04` PO-0071 detail/lifecycle · `05` SourceOS intel (incl. UNRATED cold-start row) · `06` SEO engine (content gate) · `07` hash-chained event log · `08` supplier portal · `01–03-homepage` hero / mid-page / SourceOS band. Compare implementation against these.

## Red-Team V1 Amendments (04 JUL 2026) — implemented in the prototype, binding for the build
1. **Weights locked at publish** — per-category presets (rig charter 30/30/40; general supply 40/30/30); immutable once the RFQ is published; the weight-set is recorded on `rfq.published`. Never adjustable after quotes arrive.
2. **Anomaly detection is two-sided** — flags LOW and HIGH outliers; benchmark = line-item median, falling back to the category price index when the quote pool is n < 5; the basis is always disclosed in the flag text.
3. **Cold-start protection** — suppliers with zero completed contracts display UNRATED (never a low number) and sort separately; evaluation treats missing reliability as neutral, not zero.
4. **Lifecycle failure paths** — `grn.partial` and `inspection.failed` exceptions hold the lifecycle (advance blocked, escrow untouched) until `exception.resolved`. Every gate must be failable; enforce server-side.
5. **Escrow funding is explicit** — `escrow.funded` is an event and a precondition for the Acknowledged stage; PO detail surfaces funded / not-funded state.
6. **Segregation of duties** — awards and escrow releases above $250k route to the Approvals queue via `approval.requested`; approver ≠ requester is a hard rule (A. Bello persona in the demo). Enforce in the API, not just UI.
7. **Line-level dispute freeze** — a dispute freezes escrow for the disputed line only; undisputed lines release on schedule.
8. **Hash-chained event log** — each event stores hash(prev hash + ts + type + entity + note); UI shows per-event hash and chain-verified status. Verify the chain server-side on read.
9. **Alerts = obligations** — the alerts panel lists items awaiting the current user (evaluate / approve / closing soon / quote due), not raw event history.
10. **SEO thin-content gate** — supplier pages publish only above a content-completeness threshold (score + history + certs present); held pages are noindex (`/suppliers/*` card shows published vs held counts).

## Fidelity
**High-fidelity.** Colors, typography, spacing and copy are final intent. Recreate pixel-faithfully using Tailwind tokens mapped from the Design Tokens section below.

## Architecture Requirements (from phase specs — binding)
1. **Database (Phase 1)**: PostgreSQL. Entities: Organization, User, Supplier, Requirement, RFQ, RFQItem, Quotation, QuotationItem, Evaluation, PurchaseOrder, GRN, Inspection, Invoice, Payment, Document, Event. Every table: `id` (UUID), `organizationId`, `createdAt`, `updatedAt`. Strict FKs. **Event table is append-only source of truth.**
2. **Backend core (Phase 2)**: NestJS, JWT auth, Organization module, event-bus system, no business logic in controllers.
3. **RFQ module (Phase 3)**: create → publish → supplier visibility → quote submission; persist all events; must function end-to-end.
4. **Quotation (Phase 4)**: line-item pricing, RFQ-linked, storage + retrieval.
5. **Evaluation + PO (Phase 5)**: scoring engine (price/risk/reliability), rank suppliers, generate PO from winning quote, **PO lifecycle enforced** (Issued → Acknowledged → GRN received → Inspection → Invoiced → Paid; no skipping).
6. **Supplier portal (Phase 6)**: RFQ inbox, quote submission UI/API, history tracking.
7. **Buyer frontend (Phase 7)**: Next.js; RFQ creation UI, quote comparison view, PO tracking dashboard, SSR for SEO pages.
8. **SourceOS intelligence (Phase 8)**: supplier scoring 0–100, price anomaly detection, risk scoring — **explainable outputs required** (every score ships with human-readable reasons, as shown in the prototype).
9. **SEO engine (Phase 9)**: programmatic pages `/suppliers/*`, `/categories/*`, `/rfq-template/*`, `/guide/*`, `/compare/*`; every entity maps to an indexable page (Schema.org Organization/Product/Offer/FAQPage/BreadcrumbList; canonical + hreflang en/fr/pt; auto sitemaps).
10. **Deploy + test (Phase 10)**: Docker compose; seed script (1 org, 3 suppliers) running RFQ → quotes → evaluation → PO → GRN → payment with no manual intervention. The prototype's seeded data (below) is the reference dataset.

## Screens / Views (all in `OilfieldHub SourceOS.dc.html`)
Global chrome: sticky top bar (navy #0A192F, 52px): OH logo block (32px, #F5A623 bg, radius 7), product name "OilfieldHub SOURCEOS", market ticker (IBM Plex Mono 10.5px, rgba(255,255,255,.5)), **role switcher** (segmented control, active = amber bg, navy text), avatar chip. Body: 216px white side nav + fluid content on #F1F2F5.

Side nav item: 9px 18px padding, 13px Archivo 600, #4B5563; active = #FFF7E8 bg, 3px #F5A623 left border, navy text, weight 700; count badges in mono 10px pill (#FFE9C4 / #FDECEC for warnings).

### Buyer role
1. **Dashboard** — H1 21px/800 + mono context label. 4 KPI cards (white, 1px #E5E7EB border, radius 12, 16px padding: mono 9.5px uppercase label → 24px/800 value → 11px note). Below: PO pipeline table (grid: id/title/stage-pill/value; rows clickable → PO detail) + Latest events card (type in amber mono, timestamp right-aligned).
2. **RFQ list** — table grid `.9fr 2fr .9fr .8fr .8fr .9fr` (RFQ / TITLE / STATUS / ITEMS / QUOTES / CLOSES). Status pills: EVALUATION (#FFF7E8/#B45309), AWARDED (#E8F8EE/#00692B), OPEN (#EEF1F6/navy). Row click → RFQ detail. "+ New RFQ" amber button.
3. **RFQ detail / evaluation** — back button, title + status pill. (a) Quote-comparison table: line items × 3 suppliers, mono values; anomalous cell rendered red (#C62828) with ⚠. (b) Evaluation: heading + "WEIGHTS LOCKED AT PUBLISH · CATEGORY PRESET: RIG CHARTER — PRICE 30 · RELIABILITY 30 · RISK 40". 3 ranked cards: rank chip (rank 1 = amber), supplier name, composite score 19px mono; three score bars (price=navy, reliability=#00C853, risk=amber or #C62828 when <60); bullet "why" reasons; anomaly callout (#FDECEC bg, #F1B5B5 border, #8E2323 text); rank-1 card gets amber 1.5px border + `0 4px 14px rgba(245,166,35,.15)` shadow and the **"Award & generate PO →"** button.
4. **PO list** — same table pattern, stage pill colors: early=#EEF1F6, mid=#FFF7E8, PAID=#E8F8EE.
5. **PO detail / lifecycle** — 6-step horizontal stepper (22px dots: done=#00C853 with ✓, current=amber, future=white/1.5px #D1D5DB border; connectors green when passed). Stage-note bar with **"Advance → <next stage> (demo)"** action (in production: stage transitions come from real GRN/inspection/invoice/payment events; enforce ordering server-side). Escrow notice (#FFF7E8/#F5D9A0). Supplier + line-items card.
6. **SourceOS intel** — supplier scoring table (SUPPLIER incl. certs sub-line / SCORE colored by band ≥85 green, ≥75 amber, else red / ON-TIME / DISPUTES / RISK / WHY THIS SCORE). Price-anomaly panel: red callout for flagged item, green all-clear callout. Flag threshold is configurable (default ±30% vs line-item median).
7. **SEO engine** — 5 route-family cards (route in amber mono, page count 20px/800, note) + example Google SERP preview for a supplier entity page.
8. **Event log** — dark terminal (navy card): grid TS / TYPE (amber) / ENTITY (green) / NOTE (white 75%), mono 11px, newest first. Every user action appends here.

### Supplier role (role switcher → "Supplier · Deepwater")
9. **RFQ inbox** — cards per invited RFQ with meta line; state = "Submit quote →" (amber) or "✓ QUOTE SUBMITTED — <total>" pill.
10. **Submit quote** — line-item grid: item / unit-price text input (mono, 1.5px #D1D5DB border, radius 7) / computed line total; live quote total (20px mono); submit button. After submit: green confirmation; quote count updates on the buyer's RFQ list; `quote.submitted` event appended.
11. **History** — 4 KPI cards (SourceOS score, win rate, on-time, revenue via hub) + score-driver explanation card.

### Added in v2 (all wired in the prototype)
12. **RFQ creation** (buyer, "+ New RFQ") — title + close date; dynamic line items (add/remove rows: description + qty/unit inputs); supplier-invite chips ranked by SourceOS score (toggle, navy when selected); publish button disabled (grey #EEF1F6/#9CA3AF) until title ≥3 chars + ≥1 named item + ≥1 invitee. Publish → RFQ prepended to list (status OPEN), `rfq.created` + `rfq.published` events, invited suppliers get a highlighted (amber #FFF7E8 bg) "● NEW INVITATION" card in their inbox.
13. **PO detail — fulfillment cards** (appear as lifecycle advances): **GRN card** (stage ≥ GRN received): GRN-id, receiver sign-off meta, per-line "QTY OK" + photo attachments, "✓ RECEIVED IN FULL" pill. **Inspection card** (≥ Inspection): SGS report id, 3-point checklist (condition / certs / quantity), "✓ PASSED". **Invoice 3-way match** (≥ Invoiced): grid LINE / PO / GRN / INVOICE / STATUS with ✓ MATCH per line; green escrow-release banner when Paid.
14. **Alerts** (top bar, all roles): button with amber unread-count badge (events since last open); dropdown panel (360px, shadow `0 12px 32px rgba(10,25,47,.22)`) listing latest 6 events + "Open event log →" footer.
15. **Messages** (buyer + supplier nav) — single negotiation thread per RFQ. Bubbles: sender-right (navy bg, white text), other-left (#F3F4F6); mono meta line (party · timestamp). Composer input + amber Send. Sending appends `message.sent` event; thread is shared state visible from both roles.
16. **Dispute flow** — "⚠ Raise dispute" button on PO detail (buyer, stage GRN…pre-Paid, one per PO; red outline #F1B5B5/#8E2323). Raising freezes escrow (red banner on PO) and appends `dispute.opened`. Admin → Disputes: case cards with escalation OPEN → MEDIATION → RESOLVED, stage-specific guidance copy, advance actions appending `dispute.mediation` / `dispute.resolved`.
17. **Approvals** (buyer nav, badge = pending count) — exec sign-off queue per mobile exploration 7c, desktop surface. Pending cards (amber 1.5px border + amber shadow, max-width 680px): mono kicker (`AWARD APPROVAL · RFQ-2214` / `PAYMENT RELEASE · PO-xxxx`), bold title, explainable "why" line, two buttons — primary green (#00C853) **Approve & generate PO** / **Release funds**, secondary outline **Review evaluation →** / **Review PO →**. Award approval pending until RFQ-2214 awarded (either here or on the evaluation screen); payment-release approval appears for any PO at stage Invoiced (3-way match done) with no open dispute. Approving appends `approval.granted` (with approver identity) + the domain events (`rfq.awarded`+`po.generated`, or `payment.released` advancing the PO to Paid). Decided log card lists past decisions (green ✓, kicker, note, timestamp). Empty state: dashed-border card. In production decisions are biometric-confirmed on mobile.
18. **Admin console** (third role in switcher) — **Overview**: GMV, verified orgs, pending KYB, open disputes (red when >0) + platform activity feed. **Verification queue**: pending orgs with docs meta, Verify (green #00C853) / Reject actions → status pill + `supplier.verified`/`supplier.rejected` events. **Disputes** (above). **Event log** (shared with buyer).

## Interactions & Behavior
- Client routing via app state (`route`, `role`); no page reloads. Recreate as Next.js routes: `/dashboard`, `/rfqs`, `/rfqs/[id]`, `/approvals`, `/pos`, `/pos/[id]`, `/intel`, `/seo`, `/events`, `/supplier/inbox`, `/supplier/quote/[rfqId]`, `/supplier/history`.
- **Award flow**: click Award on rank-1 card → RFQ status AWARDED, PO generated from winning quote (line items copied), navigate to PO detail, two events appended (`rfq.awarded`, `po.generated`).
- **Lifecycle advancement**: each stage transition appends the matching event (`po.acknowledged`, `grn.received`, `inspection.passed`, `invoice.matched`, `payment.released`). Enforce strictly sequential transitions in the API.
- **Quote submission**: numeric inputs recompute totals on change; submit is idempotent (one quote per supplier per RFQ in v1).
- Hover: rows lighten (#FAFBFC); buttons darken ~6%. Buttons are real `<button>`s; keyboard accessible.
- Loading/error states not designed yet — use skeleton rows matching table grids.

## State Management
- Entities per Phase 1 schema; frontend state via React Query (server) + Zustand (role/UI).
- Additional state (v2): `msgs[]` (shared thread), `disputes[]` (id, po, stage 0–2), `verifQueue[]` (org, docs, status), notification `seenCount`, RFQ-creation draft (`cTitle`, `cItems[]`, `cInvited{}`), `customRfqs[]`, `apDecided[]` (approval decisions: kicker, note, ts). Pending approvals are derived, not stored: award approval ⇔ `!awarded`; payment approval ⇔ PO stage === Invoiced ∧ no open dispute on that PO.
- Reference seed (Phase 10): org **Sahara Energy E&P**; suppliers **Deepwater Assets Ltd** (score 92, LOW risk), **GulfTech Fabrication** (81, LOW), **Bonny Marine Services** (74, MEDIUM, 1 dispute).
- **RFQ-2214** "Jack-up drilling campaign — OML 120", 3 items (90-day charter day-rate; mob/demob; standby est. 10d). Quotes: Deepwater $7.60M ($66,500/d, $1.20M mob, $41k standby), GulfTech $8.07M, Bonny $6.52M with mob $650k → anomaly (47% below $1.28M median). Evaluation (30/30/40, locked at publish — rig-charter preset): Deepwater 92.2 (price 86/rel 96/risk 94) → rank 1; GulfTech 82.3; Bonny 71.8.
- **RFQ-2215** "FR coveralls resupply — 4,000 sets": 2 items (coveralls ×4,000 @ ~$38.50; gloves ×8,000 @ ~$4.20).
- POs: PO-0071 HVAC units $246k (at GRN/inspection), PO-0064 coveralls $74.2k (Paid); award generates PO-0093 $7.60M.

## Design Tokens
- **Colors (rebrand, JUL 2026)**: deep green `#123626` (primary text/surfaces-dark; replaces former navy `#0A192F` everywhere), band green `#0A3B27` / `#062418` (dark sections, terminal), brand green `#0B5D3B` (logo on light, chips), amber `#F5A623` (primary CTA; text on amber = deep green), amber-deep `#B45309`, safety green `#00C853` / `#00A344` / dark `#00692B`, green-bg `#E8F8EE` / `#E9F3EC`, red `#C62828` / `#8E2323`, red-bg `#FDECEC` (border `#F1B5B5`), amber-bg `#FFF7E8` (border `#F5D9A0`), warm neutrals (homepage) `#FBFAF6` bg / `#EDEAE0`,`#E3E0D4` borders / `#7A776C`,`#5A574B` text, app neutrals (warm, matching homepage) `#F2F1EC` bg / `#FAF9F5` panels, borders `#E7E4DB` / row `#F1EFE8`, chip-bg `#EDEBE2`.
- **Type**: Archivo (400–800) for UI; IBM Plex Mono (400–600) for IDs, money, timestamps, spec values, uppercase micro-labels (9.5–11px, letter-spacing 1–1.5px). H1 21px/800/-0.4px; section 13.5px/700; body 12.5–13px; KPI value 24px/800.
- **Spacing**: 4px base; cards 16–20px padding; page 22–26px; table cells 11–13px vertical / 18px horizontal.
- **Radius**: cards 12, buttons 7–9, pills 99. **Shadow**: default none (border-defined); emphasis `0 4px 14px rgba(245,166,35,.15)`.

## Assets
**Logo (final, JUL 2026)**: "OH" ligature mark — a thick ring with two cuts on its upper-left and lower-left (isolating a left arc segment), no center dot, and a crossbar running from the ring's right edge into a single vertical stem (the ring doubles as the H's left stem). Canonical inline SVG (viewBox `0 0 128 96`): circle cx48 cy48 r30, stroke-width 16, `pathLength="360" stroke-dasharray="246 24 66 24" transform="rotate(237 48 48)"`; rect x78 y40 w34 h16 (crossbar); rect x108 y16 w16 h64 (stem). One color per instance: brand green `#0B5D3B` on light backgrounds, amber `#F5A623` on dark. Wordmark: "OILFIELDHUB" Archivo 900 caps; tagline "Procurement. Connected." Reference renders supplied by the owner. Homepage people-section photos are drop-in `<image-slot>` placeholders (one prefilled with owner-supplied photography in `uploads/`); do not ship stock placeholders.

## Files
- `OilfieldHub SourceOS.dc.html` — primary spec (open in browser)
- `OilfieldHub Explorations.dc.html` — marketplace-era visual explorations
- `phase_specs/Phase_1…10.txt` — binding build requirements
