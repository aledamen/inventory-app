export type ProductWithRelations = {
  id: number
  sku: string
  name: string
  flavor: string | null
  weightG: number | null
  size: string | null
  cost: string
  stock: number
  stockMin: number | null
  imageUrl: string | null
  visible: boolean | null
  notes: string | null
  type: string | null
  bagAssigned: string | null
  description: string | null
  badge: string | null
  featured: boolean
  category: string | null
  brand: string | null
  updatedAt: Date | null
  bannerName: string | null
  bannerColor: string | null
  bannerId: number | null
  priceCashRounded: number | null
  totalCost: string | null
}

export type StockMovementWithProduct = {
  id: number
  movementNumber: number
  date: Date
  productId: number
  productSku: string | null
  productName: string | null
  productFlavor: string | null
  quantity: number
  unitCost: string | null
  total: string | null
  paymentMethodId: number | null
  paymentMethod: string | null
  note: string | null
}

export type SaleWithProduct = {
  id: number
  saleNumber: number
  date: Date
  productId: number
  productSku: string | null
  productName: string | null
  productFlavor: string | null
  quantity: number
  effectivePrice: string | null
  totalSale: string | null
  netProfit: string | null
  paymentMethodId: number | null
  paymentMethod: string | null
  notes: string | null
  clientId: number | null
  clientName: string | null
}
