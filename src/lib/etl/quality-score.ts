// ============================================
// TrimedCast ETL - Quality Score Calculator
// Formula:
// qualityScore = (rowsValid/rowsTotal) * 40
//              + (rowsInserted/rowsValid) * 30
//              + (1 - rowsDuplicate/rowsTotal) * 20
//              + (requiredMapped/requiredTotal) * 10
// Max score: 100
// ============================================

import { type QualityStats } from './import-types';

/**
 * Calculate the quality score for an import
 * Returns a value between 0 and 100
 */
export function calculateQualityScore(stats: QualityStats): number {
  // Component 1: Data quality (40%)
  const dataQuality = stats.rowsTotal > 0
    ? (stats.rowsValid / stats.rowsTotal) * 40
    : 0;

  // Component 2: Insertion success (30%)
  const insertionSuccess = stats.rowsValid > 0
    ? (stats.rowsInserted / stats.rowsValid) * 30
    : 0;

  // Component 3: Dedup quality (20%)
  const dedupQuality = stats.rowsTotal > 0
    ? (1 - Math.min(stats.rowsDuplicate / stats.rowsTotal, 1)) * 20
    : 0;

  // Component 4: Mapping completeness (10%)
  const mappingCompleteness = stats.requiredTotal > 0
    ? (stats.requiredMapped / stats.requiredTotal) * 10
    : 0;

  const total = dataQuality + insertionSuccess + dedupQuality + mappingCompleteness;

  // Round to 1 decimal place
  return Math.round(total * 10) / 10;
}

/**
 * Get a quality score label
 */
export function getQualityLabel(score: number): { label: string; color: string; description: string } {
  if (score >= 90) return { label: 'Excellent', color: 'emerald', description: 'Data is clean and ready for use' };
  if (score >= 75) return { label: 'Good', color: 'green', description: 'Minor issues that can be resolved' };
  if (score >= 60) return { label: 'Fair', color: 'amber', description: 'Some data quality concerns' };
  if (score >= 40) return { label: 'Poor', color: 'orange', description: 'Significant data quality issues' };
  return { label: 'Critical', color: 'red', description: 'Data quality too low for reliable use' };
}

/**
 * Get quality score breakdown for display
 */
export function getQualityBreakdown(stats: QualityStats): {
  dataQuality: number;
  insertionSuccess: number;
  dedupQuality: number;
  mappingCompleteness: number;
  total: number;
} {
  const dataQuality = stats.rowsTotal > 0
    ? Math.round((stats.rowsValid / stats.rowsTotal) * 40 * 10) / 10
    : 0;

  const insertionSuccess = stats.rowsValid > 0
    ? Math.round((stats.rowsInserted / stats.rowsValid) * 30 * 10) / 10
    : 0;

  const dedupQuality = stats.rowsTotal > 0
    ? Math.round((1 - Math.min(stats.rowsDuplicate / stats.rowsTotal, 1)) * 20 * 10) / 10
    : 0;

  const mappingCompleteness = stats.requiredTotal > 0
    ? Math.round((stats.requiredMapped / stats.requiredTotal) * 10 * 10) / 10
    : 0;

  return {
    dataQuality,
    insertionSuccess,
    dedupQuality,
    mappingCompleteness,
    total: calculateQualityScore(stats),
  };
}
