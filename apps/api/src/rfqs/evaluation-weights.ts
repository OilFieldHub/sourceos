import { RfqCategoryPreset } from '../database/entities/enums';
import { EvaluationWeights } from '../database/entities/rfq.entity';

/**
 * Per-category weight presets (Red-Team amendment #1). Frozen onto the RFQ
 * row at publish and never adjustable afterwards.
 */
export const EVALUATION_WEIGHT_PRESETS: Record<RfqCategoryPreset, EvaluationWeights> = {
  [RfqCategoryPreset.RIG_CHARTER]: { price: 30, reliability: 30, risk: 40 },
  [RfqCategoryPreset.GENERAL_SUPPLY]: { price: 40, reliability: 30, risk: 30 },
};
