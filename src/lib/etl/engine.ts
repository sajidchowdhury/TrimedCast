// ============================================
// TrimedCast ETL - Main Engine Orchestrator
// Uses file-based storage for data persistence
// between API calls in serverless environment
// ============================================

import { db } from '@/lib/db'
import { writeFile, readFile, mkdir, rm } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import {
  type ColumnMapping,
  type ValidationError,
  type HarmonizationStep,
  type ImportResult,
  type ImportTypeSchema,
  ImportType,
  ImportStatus,
  getImportTypeSchema,
  getAllFields,
} from './import-types'
import { parseExcelFile, type ParseResult } from './excel-parser'
import { autoMapColumns, applyMappingToRows, validateMapping } from './column-mapper'
import { runAllValidations, type ValidationResult } from './validator'
import { runHarmonization, type HarmonizationResult } from './harmonizer'
import { batchInsert, type InsertionResult } from './batch-inserter'
import { calculateQualityScore, type QualityStats } from './quality-score'

// ============================================
// File-based storage for ETL pipeline data
// ============================================

const TEMP_DIR = path.join(process.cwd(), '.etl-temp')

async function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true })
  }
}

async function storeData(importId: string, step: string, data: unknown): Promise<void> {
  await ensureTempDir()
  const filePath = path.join(TEMP_DIR, `${importId}-${step}.json`)
  await writeFile(filePath, JSON.stringify(data), 'utf-8')
}

async function loadData<T>(importId: string, step: string): Promise<T | null> {
  const filePath = path.join(TEMP_DIR, `${importId}-${step}.json`)
  if (!existsSync(filePath)) return null
  const content = await readFile(filePath, 'utf-8')
  return JSON.parse(content) as T
}

async function cleanupData(importId: string): Promise<void> {
  const steps = ['parsed', 'mapped', 'validated', 'harmonized']
  for (const step of steps) {
    const filePath = path.join(TEMP_DIR, `${importId}-${step}.json`)
    if (existsSync(filePath)) {
      await rm(filePath).catch(() => {})
    }
  }
}

// ============================================
// ETL Engine Class
// ============================================

export class ETLEngine {
  /**
   * Upload a file and create an import record
   */
  async upload(
    fileBuffer: Buffer,
    fileName: string,
    fileSize: number,
    tenantId: string,
    importType: string,
    createdBy?: string
  ): Promise<{ id: string; headers: string[]; preview: Record<string, unknown>[] }> {
    const typeKey = importType as ImportType
    const schema = getImportTypeSchema(typeKey)

    // Create import record
    const dataImport = await db.dataImport.create({
      data: {
        tenantId,
        importType: typeKey,
        fileName,
        fileSize,
        status: ImportStatus.PARSING,
        createdBy,
        startedAt: new Date(),
      },
    })

    try {
      // Parse the file
      const parseResult: ParseResult = parseExcelFile(fileBuffer)

      // Store parsed data to disk
      await storeData(dataImport.id, 'parsed', {
        headers: parseResult.headers,
        rows: parseResult.rows,
      })

      // Update import record with parsed data
      await db.dataImport.update({
        where: { id: dataImport.id },
        data: {
          rowsTotal: parseResult.totalRows,
          rawPreview: JSON.stringify(parseResult.preview),
          status: ImportStatus.MAPPING,
        },
      })

      return {
        id: dataImport.id,
        headers: parseResult.headers,
        preview: parseResult.preview,
      }
    } catch (error) {
      await db.dataImport.update({
        where: { id: dataImport.id },
        data: {
          status: ImportStatus.FAILED,
          errorDetails: JSON.stringify({
            step: 'parsing',
            error: error instanceof Error ? error.message : 'Unknown parsing error',
          }),
        },
      })
      throw error
    }
  }

  /**
   * Auto-map columns for an import
   */
  async autoMap(importId: string): Promise<ColumnMapping[]> {
    const dataImport = await this.getImport(importId)
    const schema = getImportTypeSchema(dataImport.importType as ImportType)
    const parsed = await loadData<{ headers: string[]; rows: Record<string, unknown>[] }>(importId, 'parsed')

    if (!parsed) {
      throw new Error('No parsed data found. Please upload the file first.')
    }

    const mappings = autoMapColumns(parsed.headers, schema)

    // Save mapping to DB
    await db.dataImport.update({
      where: { id: importId },
      data: {
        columnMapping: JSON.stringify(mappings),
        status: ImportStatus.VALIDATING,
      },
    })

    return mappings
  }

  /**
   * Save manual column mapping adjustments
   */
  async saveMapping(importId: string, mapping: ColumnMapping[]): Promise<void> {
    const dataImport = await this.getImport(importId)
    const schema = getImportTypeSchema(dataImport.importType as ImportType)

    const mappingValidation = validateMapping(mapping, schema)

    await db.dataImport.update({
      where: { id: importId },
      data: {
        columnMapping: JSON.stringify(mapping),
        status: mappingValidation.isValid ? ImportStatus.VALIDATING : ImportStatus.MAPPING,
        errorDetails: mappingValidation.isValid ? null : JSON.stringify({
          missingRequired: mappingValidation.missingRequired,
          warnings: mappingValidation.warnings,
        }),
      },
    })
  }

  /**
   * Run 3-phase validation
   */
  async validate(importId: string): Promise<ValidationResult> {
    const dataImport = await this.getImport(importId)
    const schema = getImportTypeSchema(dataImport.importType as ImportType)
    const parsed = await loadData<{ headers: string[]; rows: Record<string, unknown>[] }>(importId, 'parsed')
    const mappingStr = dataImport.columnMapping

    if (!parsed || !mappingStr) {
      throw new Error('No parsed data or mapping found. Please upload and map first.')
    }

    const mapping: ColumnMapping[] = JSON.parse(mappingStr)

    // Apply mapping to rows
    const mappedRows = applyMappingToRows(parsed.rows, mapping)

    // Store mapped data
    await storeData(importId, 'mapped', mappedRows)

    // Run all validations
    const validationResult = runAllValidations(mappedRows, mapping, schema, dataImport.tenantId)

    // Update import record
    await db.dataImport.update({
      where: { id: importId },
      data: {
        rowsValid: validationResult.stats.valid,
        rowsInvalid: validationResult.stats.invalid,
        validationErrors: JSON.stringify(
          validationResult.errors.slice(0, 1000)
        ),
        status: ImportStatus.HARMONIZING,
      },
    })

    // Store validated rows (exclude invalid rows)
    const errorRows = new Set(
      validationResult.errors
        .filter((e) => e.severity === 'error')
        .map((e) => e.row)
    )
    const validRows = mappedRows.filter((_, idx) => !errorRows.has(idx + 1))
    await storeData(importId, 'validated', validRows)

    return validationResult
  }

  /**
   * Run 6-step harmonization
   */
  async harmonize(importId: string): Promise<HarmonizationResult> {
    const dataImport = await this.getImport(importId)
    const schema = getImportTypeSchema(dataImport.importType as ImportType)
    const mappingStr = dataImport.columnMapping

    if (!mappingStr) {
      throw new Error('No mapping found. Please map columns first.')
    }

    const mapping: ColumnMapping[] = JSON.parse(mappingStr)
    const rows = await loadData<Record<string, unknown>[]>(importId, 'validated') ||
      await loadData<Record<string, unknown>[]>(importId, 'mapped')

    if (!rows) {
      throw new Error('No validated data found. Please validate first.')
    }

    // Run harmonization
    const harmonizationResult = runHarmonization(rows, mapping, schema)

    // Store harmonized data
    await storeData(importId, 'harmonized', harmonizationResult.harmonizedRows)

    // Update import record
    await db.dataImport.update({
      where: { id: importId },
      data: {
        harmonizationLog: JSON.stringify(harmonizationResult.log),
        rowsDuplicate: harmonizationResult.stats.duplicatesRemoved,
        mappedPreview: JSON.stringify(harmonizationResult.harmonizedRows.slice(0, 5)),
        status: ImportStatus.INSERTING,
      },
    })

    return harmonizationResult
  }

  /**
   * Run batch insertion
   */
  async insert(importId: string): Promise<InsertionResult> {
    const dataImport = await this.getImport(importId)
    const mappingStr = dataImport.columnMapping

    if (!mappingStr) {
      throw new Error('No mapping found. Please map columns first.')
    }

    const mapping: ColumnMapping[] = JSON.parse(mappingStr)
    const rows = await loadData<Record<string, unknown>[]>(importId, 'harmonized')

    if (!rows) {
      throw new Error('No harmonized data found. Please harmonize first.')
    }

    // Run batch insertion
    const insertionResult = await batchInsert(
      rows,
      dataImport.importType as ImportType,
      dataImport.tenantId,
      mapping
    )

    // Calculate and store quality score
    const qualityScore = await this.computeAndStoreQualityScore(importId, insertionResult)

    // Update import record
    await db.dataImport.update({
      where: { id: importId },
      data: {
        rowsInserted: insertionResult.inserted,
        rowsSkipped: insertionResult.skipped,
        qualityScore,
        status: ImportStatus.COMPLETED,
        completedAt: new Date(),
        durationMs: dataImport.startedAt
          ? Date.now() - dataImport.startedAt.getTime()
          : null,
      },
    })

    // Cleanup temp files
    await cleanupData(importId)

    return insertionResult
  }

  /**
   * Run full pipeline (map → validate → harmonize → insert)
   */
  async processAll(importId: string): Promise<ImportResult> {
    const startTime = Date.now()
    const dataImport = await this.getImport(importId)
    const schema = getImportTypeSchema(dataImport.importType as ImportType)
    const parsed = await loadData<{ headers: string[]; rows: Record<string, unknown>[] }>(importId, 'parsed')

    if (!parsed) {
      throw new Error('No parsed data found. Please upload the file first.')
    }

    try {
      // Step 1: Auto-map
      const mapping = autoMapColumns(parsed.headers, schema)
      const mappingValidation = validateMapping(mapping, schema)

      await db.dataImport.update({
        where: { id: importId },
        data: {
          columnMapping: JSON.stringify(mapping),
          status: ImportStatus.VALIDATING,
        },
      })

      // Apply mapping
      const mappedRows = applyMappingToRows(parsed.rows, mapping)
      await storeData(importId, 'mapped', mappedRows)

      // Step 2: Validate
      const validationResult = runAllValidations(mappedRows, mapping, schema, dataImport.tenantId)

      const errorRows = new Set(
        validationResult.errors
          .filter((e) => e.severity === 'error')
          .map((e) => e.row)
      )
      const validRows = mappedRows.filter((_, idx) => !errorRows.has(idx + 1))
      await storeData(importId, 'validated', validRows)

      await db.dataImport.update({
        where: { id: importId },
        data: {
          rowsValid: validationResult.stats.valid,
          rowsInvalid: validationResult.stats.invalid,
          validationErrors: JSON.stringify(validationResult.errors.slice(0, 1000)),
          status: ImportStatus.HARMONIZING,
        },
      })

      // Step 3: Harmonize
      const harmonizationResult = runHarmonization(validRows, mapping, schema)
      await storeData(importId, 'harmonized', harmonizationResult.harmonizedRows)

      await db.dataImport.update({
        where: { id: importId },
        data: {
          harmonizationLog: JSON.stringify(harmonizationResult.log),
          rowsDuplicate: harmonizationResult.stats.duplicatesRemoved,
          status: ImportStatus.INSERTING,
        },
      })

      // Step 4: Insert
      const insertionResult = await batchInsert(
        harmonizationResult.harmonizedRows,
        dataImport.importType as ImportType,
        dataImport.tenantId,
        mapping
      )

      // Calculate quality score
      const requiredFields = schema.requiredFields
      const mappedRequired = mapping.filter(
        (m) => m.targetField && m.confidence > 0 && requiredFields.some((rf) => rf.field === m.targetField)
      ).length

      const qualityStats: QualityStats = {
        rowsTotal: parsed.rows.length,
        rowsValid: validationResult.stats.valid,
        rowsInserted: insertionResult.inserted,
        rowsDuplicate: harmonizationResult.stats.duplicatesRemoved,
        requiredMapped: mappedRequired,
        requiredTotal: requiredFields.length,
      }
      const qualityScore = calculateQualityScore(qualityStats)

      // Final update
      const durationMs = Date.now() - startTime
      await db.dataImport.update({
        where: { id: importId },
        data: {
          rowsInserted: insertionResult.inserted,
          rowsSkipped: insertionResult.skipped,
          qualityScore,
          status: ImportStatus.COMPLETED,
          completedAt: new Date(),
          durationMs,
        },
      })

      // Cleanup temp files
      await cleanupData(importId)

      return {
        success: true,
        rowsTotal: parsed.rows.length,
        rowsValid: validationResult.stats.valid,
        rowsInvalid: validationResult.stats.invalid,
        rowsSkipped: insertionResult.skipped,
        rowsInserted: insertionResult.inserted,
        rowsDuplicate: harmonizationResult.stats.duplicatesRemoved,
        qualityScore,
        validationErrors: validationResult.errors,
        harmonizationLog: harmonizationResult.log,
      }
    } catch (error) {
      await db.dataImport.update({
        where: { id: importId },
        data: {
          status: ImportStatus.FAILED,
          errorDetails: JSON.stringify({
            step: 'processAll',
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
        },
      })

      return {
        success: false,
        rowsTotal: 0,
        rowsValid: 0,
        rowsInvalid: 0,
        rowsSkipped: 0,
        rowsInserted: 0,
        rowsDuplicate: 0,
        qualityScore: 0,
        validationErrors: [{
          row: 0,
          field: '_pipeline',
          value: null,
          error: error instanceof Error ? error.message : 'Pipeline failed',
          severity: 'error',
        }],
        harmonizationLog: [],
      }
    }
  }

  /**
   * Compute and store quality score for step-by-step flow
   */
  private async computeAndStoreQualityScore(
    importId: string,
    insertionResult: InsertionResult
  ): Promise<number> {
    const dataImport = await this.getImport(importId)
    const schema = getImportTypeSchema(dataImport.importType as ImportType)
    const mappingStr = dataImport.columnMapping

    if (!mappingStr) return 0

    const mapping: ColumnMapping[] = JSON.parse(mappingStr)
    const requiredFields = schema.requiredFields
    const mappedRequired = mapping.filter(
      (m) => m.targetField && m.confidence > 0 && requiredFields.some((rf) => rf.field === m.targetField)
    ).length

    const qualityStats: QualityStats = {
      rowsTotal: dataImport.rowsTotal,
      rowsValid: dataImport.rowsValid,
      rowsInserted: insertionResult.inserted,
      rowsDuplicate: dataImport.rowsDuplicate,
      requiredMapped: mappedRequired,
      requiredTotal: requiredFields.length,
    }

    return calculateQualityScore(qualityStats)
  }

  /**
   * Get import record
   */
  async getImport(importId: string) {
    const dataImport = await db.dataImport.findUnique({
      where: { id: importId },
    })

    if (!dataImport) {
      throw new Error(`Import not found: ${importId}`)
    }

    return dataImport
  }

  /**
   * List all imports for a tenant
   */
  async listImports(tenantId: string, options?: {
    type?: string
    status?: string
    page?: number
    limit?: number
  }) {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 20
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { tenantId }
    if (options?.type) where.importType = options.type
    if (options?.status) where.status = options.status

    const [imports, total] = await Promise.all([
      db.dataImport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.dataImport.count({ where }),
    ])

    return { imports, total, page, limit }
  }
}

// Singleton instance
export const etlEngine = new ETLEngine()
