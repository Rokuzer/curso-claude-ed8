export type DiscountType = 'percent' | 'fixed'

export interface DiscountCode {
  id: string
  restaurantId: string
  code: string
  type: DiscountType
  value: number
  active: boolean
  expiresAt: string | null
  maxUses: number | null
  usedCount: number
}

export interface DiscountInputDto {
  code: string
  type: DiscountType
  value: number
  active: boolean
  expiresAt: string | null
  maxUses: number | null
}

export interface PointsRule {
  id: string
  restaurantId: string
  points: number
  discountAmount: number
}

export interface PointsRuleInputDto {
  points: number
  discountAmount: number
}

export const DISCOUNT_TYPES: readonly DiscountType[] = ['percent', 'fixed']

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  percent: 'Porcentaje (%)',
  fixed: 'Importe fijo (€)'
}

export const DISCOUNT_ERROR_MESSAGES: Record<string, string> = {
  DuplicatedDiscountCodeError: 'Ya existe un código igual en el restaurante.',
  DiscountCodeRequiredError: 'El código es obligatorio.',
  InvalidDiscountTypeError: 'Tipo de descuento no válido.',
  InvalidDiscountValueError: 'El valor debe ser mayor que 0 (y como máximo 100 si es un porcentaje).',
  InvalidDiscountExpirationError: 'La fecha de caducidad no es válida.',
  InvalidDiscountMaxUsesError: 'Los usos máximos deben ser un entero mayor o igual que 1.',
  DiscountCodeNotFoundError: 'El código de descuento no existe.',
  DuplicatedPointsRuleError: 'Ya existe un tramo con esos puntos en el restaurante.',
  InvalidPointsRuleError: 'Los puntos deben ser un entero ≥ 1 y el descuento mayor que 0.',
  PointsRuleNotFoundError: 'El tramo de puntos no existe.',
  RestaurantNotFoundError: 'El restaurante no existe.'
}

export function discountErrorMessage(err: unknown, fallback: string): string {
  const code = (err as { error?: { error?: string } })?.error?.error
  return (code && DISCOUNT_ERROR_MESSAGES[code]) || fallback
}

export function discountValueLabel(discount: Pick<DiscountCode, 'type' | 'value'>): string {
  return discount.type === 'percent' ? `${discount.value} %` : `${discount.value} €`
}

/** Converts an ISO date-time to the `yyyy-mm-dd` value of a date input (local time). */
export function toDateInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Converts a `yyyy-mm-dd` date input to the ISO date-time of the end of that local day. */
export function fromDateInput(value: string): string | null {
  return value ? new Date(`${value}T23:59:59`).toISOString() : null
}
