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
