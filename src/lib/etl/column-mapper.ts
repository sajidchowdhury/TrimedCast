// ============================================
// TrimedCast ETL - Fuzzy Column Mapper
// Uses Levenshtein distance for smart mapping
// ============================================

import { IMPORT_TYPE_SCHEMAS, type ImportType, type ImportTypeSchema, type ColumnMapping, type FieldDef } from './import-types';

/**
 * Classic Levenshtein distance algorithm
 * Returns the minimum number of single-character edits to transform a into b
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity score between two strings (0-1, 1 = exact match)
 */
export function calculateSimilarity(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  return 1 - distance / maxLen;
}

/**
 * Normalize a string for comparison
 * Preserves Unicode characters (Bengali, etc.) for direct matching
 */
function normalizeForCompare(s: string): string {
  return s
    .toLowerCase()
    .replace(/[_\-\s]+/g, ' ')
    .trim();
}

/**
 * Normalize for Levenshtein comparison (strips non-ASCII for distance calc)
 */
function normalizeForLevenshtein(s: string): string {
  return s
    .toLowerCase()
    .replace(/[_\-\s]+/g, ' ')
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .trim();
}

/**
 * Find the best match for a source column among target fields
 */
export function findBestMatch(
  sourceColumn: string,
  schema: ImportTypeSchema
): ColumnMapping | null {
  const normalizedSource = normalizeForCompare(sourceColumn);
  let bestMatch: ColumnMapping | null = null;
  let bestScore = 0;
  const allFields = [...schema.requiredFields, ...schema.optionalFields];

  for (const fieldDef of allFields) {
    // 1. Exact match (case-insensitive)
    if (normalizedSource === normalizeForCompare(fieldDef.field)) {
      return {
        sourceColumn,
        targetField: fieldDef.field,
        confidence: 1.0,
        isRequired: fieldDef.required,
      };
    }

    // 2. Exact match on label
    if (normalizedSource === normalizeForCompare(fieldDef.label)) {
      const score = 0.95;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          sourceColumn,
          targetField: fieldDef.field,
          confidence: score,
          isRequired: fieldDef.required,
        };
      }
      continue;
    }

    // 3. Check aliases
    const aliases = schema.sampleAliases[fieldDef.field] || [];
    for (const alias of aliases) {
      const normalizedAlias = normalizeForCompare(alias);
      if (normalizedSource === normalizedAlias) {
        const score = 0.9;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = {
            sourceColumn,
            targetField: fieldDef.field,
            confidence: score,
            isRequired: fieldDef.required,
          };
        }
        break;
      }
    }

    // 4. Levenshtein similarity (threshold 0.6)
    const levSource = normalizeForLevenshtein(normalizedSource);
    const similarity = calculateSimilarity(levSource, normalizeForLevenshtein(fieldDef.field));
    const labelSimilarity = calculateSimilarity(levSource, normalizeForLevenshtein(fieldDef.label));
    const maxSimilarity = Math.max(similarity, labelSimilarity);

    if (maxSimilarity >= 0.6 && maxSimilarity > bestScore) {
      bestScore = maxSimilarity;
      bestMatch = {
        sourceColumn,
        targetField: fieldDef.field,
        confidence: Math.round(maxSimilarity * 100) / 100,
        isRequired: fieldDef.required,
      };
    }

    // 5. Check alias similarity
    for (const alias of aliases) {
      const aliasSim = calculateSimilarity(levSource, normalizeForLevenshtein(alias));
      if (aliasSim >= 0.6 && aliasSim > bestScore) {
        bestScore = aliasSim;
        bestMatch = {
          sourceColumn,
          targetField: fieldDef.field,
          confidence: Math.round(aliasSim * 100) / 100,
          isRequired: fieldDef.required,
        };
      }
    }

    // 6. Substring containment
    if (normalizedSource.includes(normalizeForCompare(fieldDef.field)) ||
        normalizeForCompare(fieldDef.field).includes(normalizedSource)) {
      const score = 0.7;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          sourceColumn,
          targetField: fieldDef.field,
          confidence: score,
          isRequired: fieldDef.required,
        };
      }
    }

    // Also check label substring
    if (normalizedSource.includes(normalizeForCompare(fieldDef.label)) ||
        normalizeForCompare(fieldDef.label).includes(normalizedSource)) {
      const score = 0.65;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          sourceColumn,
          targetField: fieldDef.field,
          confidence: score,
          isRequired: fieldDef.required,
        };
      }
    }
  }

  return bestMatch;
}

/**
 * Auto-map all source columns to target fields
 */
export function autoMapColumns(
  sourceHeaders: string[],
  importType: ImportType
): ColumnMapping[] {
  const schema = IMPORT_TYPE_SCHEMAS[importType];
  const mappings: ColumnMapping[] = [];
  const usedTargets = new Set<string>();

  // First pass: high confidence matches (>= 0.9)
  for (const header of sourceHeaders) {
    const match = findBestMatch(header, schema);
    if (match && match.confidence >= 0.9 && !usedTargets.has(match.targetField)) {
      mappings.push(match);
      usedTargets.add(match.targetField);
    }
  }

  // Second pass: lower confidence matches
  for (const header of sourceHeaders) {
    if (mappings.some(m => m.sourceColumn === header)) continue;

    const match = findBestMatch(header, schema);
    if (match && !usedTargets.has(match.targetField)) {
      mappings.push(match);
      usedTargets.add(match.targetField);
    } else {
      // Unmapped column
      mappings.push({
        sourceColumn: header,
        targetField: '',
        confidence: 0,
        isRequired: false,
      });
    }
  }

  return mappings;
}

/**
 * Validate that all required fields are mapped
 */
export function validateMapping(
  mappings: ColumnMapping[],
  schema: ImportTypeSchema
): { isValid: boolean; missingRequired: string[]; warnings: string[] } {
  const mappedFields = new Set(
    mappings
      .filter(m => m.targetField && m.confidence > 0)
      .map(m => m.targetField)
  );

  const missingRequired = schema.requiredFields
    .filter(f => !mappedFields.has(f.field))
    .map(f => f.label);

  const warnings: string[] = [];

  // Warn about low confidence mappings
  for (const mapping of mappings) {
    if (mapping.targetField && mapping.confidence > 0 && mapping.confidence < 0.7) {
      warnings.push(
        `"${mapping.sourceColumn}" → "${mapping.targetField}" has low confidence (${Math.round(mapping.confidence * 100)}%). Please verify.`
      );
    }
  }

  // Warn about unmapped columns
  const unmapped = mappings.filter(m => !m.targetField || m.confidence === 0);
  if (unmapped.length > 0) {
    warnings.push(
      `${unmapped.length} column(s) could not be auto-mapped: ${unmapped.map(m => `"${m.sourceColumn}"`).join(', ')}`
    );
  }

  return {
    isValid: missingRequired.length === 0,
    missingRequired,
    warnings,
  };
}

/**
 * Apply column mapping to a row of data
 * Transforms from source column names to target field names
 */
export function applyMapping(
  row: Record<string, unknown>,
  mappings: ColumnMapping[]
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};

  for (const mapping of mappings) {
    if (!mapping.targetField || mapping.confidence === 0) continue;
    const value = row[mapping.sourceColumn];
    if (value !== null && value !== undefined) {
      mapped[mapping.targetField] = value;
    }
  }

  return mapped;
}
