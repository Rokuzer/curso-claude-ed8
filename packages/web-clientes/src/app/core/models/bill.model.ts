export interface PointsRule {
  id: string
  restaurantId: string
  points: number
  discountAmount: number
}

export interface PointsBalance {
  restaurantId: string
  balance: number
}

export interface BillRequest {
  discountCode?: string
  pointsRuleId?: string
}

export interface Bill {
  orderId: string
  subtotal: number
  discountCode: string | null
  codeDiscount: number
  pointsUsed: number
  pointsDiscount: number
  total: number
  createdAt: string
}

export const BILL_ERROR_MESSAGES: Record<string, string> = {
  DiscountCodeNotFoundError: 'El código de descuento no existe.',
  DiscountCodeInvalidError: 'El código no es válido: está inactivo, ha caducado o se ha agotado.',
  InsufficientPointsError: 'No tienes puntos suficientes para ese canje.',
  PointsRuleNotFoundError: 'El tramo de puntos seleccionado ya no existe.',
  BillAlreadyRequestedError: 'La cuenta de este pedido ya se ha pedido.',
  OrderNotFoundError: 'El pedido no existe.'
}

export function billErrorMessage(err: unknown, fallback: string): string {
  const code = (err as { error?: { error?: string } })?.error?.error
  return (code && BILL_ERROR_MESSAGES[code]) || fallback
}
