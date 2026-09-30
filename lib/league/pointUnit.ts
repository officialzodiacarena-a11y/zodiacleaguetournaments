export type PointUnit = 'ZP' | 'VLP';

export function pointUnitLabel(unit: string | null | undefined): PointUnit {
  return unit === 'VLP' ? 'VLP' : 'ZP';
}

export function isVlpUnit(unit: string | null | undefined): boolean {
  return unit === 'VLP';
}
