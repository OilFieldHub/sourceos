export interface StaticPage {
  slug: string;
  title: string;
  summary: string;
  body: string[];
}

/**
 * PLACEHOLDER CONTENT (Phase 9 scoping decision, 2026-07-04): no
 * `RfqTemplate` or `Guide` entity exists anywhere in the schema, so these
 * two route families have nothing real to be "programmatic" over. Shipped
 * as a small hand-written set instead of skipping the route family
 * entirely — replace with a real content model + CMS/admin authoring flow
 * whenever that gets prioritized.
 */
export const RFQ_TEMPLATES: StaticPage[] = [
  {
    slug: "rig-charter",
    title: "Rig Charter RFQ Template",
    summary: "A starting-point RFQ structure for offshore/onshore rig charter procurement.",
    body: [
      "Use this template as a starting point when sourcing a drilling rig charter.",
      "Typical line items: day-rate charter, mobilization/demobilization, standby rate.",
      "SourceOS evaluation weights for this category: Price 30 · Reliability 30 · Risk 40.",
    ],
  },
  {
    slug: "general-supply",
    title: "General Supply RFQ Template",
    summary: "A starting-point RFQ structure for general oilfield equipment and materials procurement.",
    body: [
      "Use this template for routine equipment, materials, and consumables sourcing.",
      "Typical line items: unit price per item, quantity, delivery location.",
      "SourceOS evaluation weights for this category: Price 40 · Reliability 30 · Risk 30.",
    ],
  },
];

export const GUIDES: StaticPage[] = [
  {
    slug: "how-sourceos-scoring-works",
    title: "How SourceOS Supplier Scoring Works",
    summary: "An overview of how OilfieldHub scores supplier reliability and risk.",
    body: [
      "Every supplier on OilfieldHub gets a SourceOS score from 0 to 100.",
      "New suppliers with no completed contracts show as UNRATED, never a low number.",
      "Scores update automatically as contracts complete or disputes arise.",
    ],
  },
  {
    slug: "evaluating-rfq-quotes",
    title: "How to Evaluate RFQ Quotes",
    summary: "A guide to comparing supplier quotes using price, reliability, and risk.",
    body: [
      "When quotes come in, OilfieldHub locks the evaluation weights at RFQ publish time.",
      "Price competitiveness, supplier reliability, and risk combine into one composite score.",
      "Anomalously priced line items are automatically flagged for review.",
    ],
  },
];
