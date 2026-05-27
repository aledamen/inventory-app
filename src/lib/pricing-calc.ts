export interface PricingConfig {
  costPerGram: number
  stickerCost: number
  bagChica: number
  bagMediana: number
  bagGrande: number
  defaultMarginCash: number
  defaultMarginTransfer: number
  defaultMarginList: number
}

export function configFromMap(map: Record<string, string>): PricingConfig {
  return {
    costPerGram: Number(map.costo_abastancemiento_por_gramo ?? 1.53),
    stickerCost: Number(map.precio_sticker_unidad ?? 23.75),
    bagChica: Number(map.precio_bolsa_chica_unidad ?? 85),
    // handle the typo in the DB key (prcio vs precio)
    bagMediana: Number(map.prcio_bolsa_mediana_unidad ?? map.precio_bolsa_mediana_unidad ?? 100),
    bagGrande: Number(map.precio_bolsa_grande_unidad ?? 138),
    defaultMarginCash: Number(map.margen_estandar_efectivo ?? 0.25),
    defaultMarginTransfer: Number(map.margen_estandar_transferencia ?? 0.29),
    defaultMarginList: Number(map.margen_estandar_lista ?? 0.45),
  }
}

export function getBagPrice(bagAssigned: string | null | undefined, cfg: PricingConfig): number {
  if (!bagAssigned) return 0
  if (bagAssigned === '25x35') return cfg.bagChica
  if (bagAssigned === '30x40') return cfg.bagMediana
  if (bagAssigned === '40x50') return cfg.bagGrande
  return 0
}

export const roundUp = (n: number) => Math.ceil(n / 10) * 10

export const PRICING_CONFIG_KEYS = new Set([
  'costo_abastancemiento_por_gramo',
  'precio_bolsa_chica_unidad',
  'prcio_bolsa_mediana_unidad',
  'precio_bolsa_mediana_unidad',
  'precio_bolsa_grande_unidad',
  'precio_sticker_unidad',
  'margen_estandar_efectivo',
  'margen_estandar_transferencia',
  'margen_estandar_lista',
])
