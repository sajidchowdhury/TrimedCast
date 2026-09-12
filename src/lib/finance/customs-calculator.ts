// ============================================
// TrimedCast LEAN — BD Customs Duty / Landed Cost calculator
// Implements the Bangladesh import tax structure:
//   CIF = unit_cost + freight + insurance
//   customs_duty = CIF * duty_rate
//   supplementary_duty = CIF * sd_rate
//   vat = (CIF + customs_duty + supplementary_duty) * 0.15   (tax-on-tax)
//   ait = CIF * ait_rate
//   landed_cost_per_unit = CIF + customs_duty + sd + vat + ait
// ============================================

export interface HsCodeRate {
  hsCode: string;
  description: string;
  customsDuty: number;       // 0.05 – 0.25
  supplementaryDuty: number; // 0 – 0.20
  vat: number;               // 0.15 (BD standard)
  ait: number;               // 0.01 – 0.05
}

/** The client's automotive accessories (signal lights, flashers) → HS 8512. */
export const HS_CODE_RATES: Record<string, HsCodeRate> = {
  '8512': {
    hsCode: '8512',
    description: 'Electrical lighting/signalling equipment for vehicles',
    customsDuty: 0.25,
    supplementaryDuty: 0.0,
    vat: 0.15,
    ait: 0.05,
  },
  '8511': {
    hsCode: '8511',
    description: 'Ignition/starter equipment for vehicles',
    customsDuty: 0.25,
    supplementaryDuty: 0.0,
    vat: 0.15,
    ait: 0.05,
  },
  '8421': {
    hsCode: '8421',
    description: 'Filters (oil/air filters)',
    customsDuty: 0.15,
    supplementaryDuty: 0.0,
    vat: 0.15,
    ait: 0.05,
  },
};

export interface LandedCostInput {
  unitCostBdt: number;
  freightPerUnitBdt: number;  // sea or air freight apportioned
  insurancePerUnitBdt?: number;
  hsCode?: string;
}

export interface LandedCostBreakdown {
  cif: number;
  customsDuty: number;
  supplementaryDuty: number;
  vat: number;
  ait: number;
  landedCostPerUnit: number;
  totalDutyPerUnit: number;
  effectiveDutyRate: number;
  rate: HsCodeRate;
}

export function calculateLandedCost(input: LandedCostInput): LandedCostBreakdown {
  const rate = HS_CODE_RATES[input.hsCode || '8512'] || HS_CODE_RATES['8512'];
  const insurance = input.insurancePerUnitBdt ?? input.unitCostBdt * 0.01; // ~1% default
  const cif = input.unitCostBdt + input.freightPerUnitBdt + insurance;

  const customsDuty = cif * rate.customsDuty;
  const supplementaryDuty = cif * rate.supplementaryDuty;
  // BD VAT is a tax-on-tax: levied on (CIF + CD + SD)
  const vat = (cif + customsDuty + supplementaryDuty) * rate.vat;
  const ait = cif * rate.ait;

  const totalDutyPerUnit = customsDuty + supplementaryDuty + vat + ait;
  const landedCostPerUnit = cif + totalDutyPerUnit;
  const effectiveDutyRate = cif > 0 ? totalDutyPerUnit / cif : 0;

  return {
    cif,
    customsDuty,
    supplementaryDuty,
    vat,
    ait,
    landedCostPerUnit,
    totalDutyPerUnit,
    effectiveDutyRate,
    rate,
  };
}

/** Approximate per-unit freight. Sea ~5 BDT/unit, Air ~35 BDT/unit (BD defaults). */
export const DEFAULT_FREIGHT = {
  seaPerUnitBdt: 5,
  airPerUnitBdt: 35,
};

/** Compute margin % given selling price and landed cost. */
export function marginPct(sellingPrice: number, landedCost: number): number {
  if (sellingPrice <= 0) return 0;
  return ((sellingPrice - landedCost) / sellingPrice) * 100;
}
