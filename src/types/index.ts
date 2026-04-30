export interface Category {
  id: string
  name: string
  created_at: string
}

export interface Product {
  id: string
  name: string
  brand: string
  model: string
  part_type: string
  category_id: string
  purchase_price: number
  selling_price: number
  quantity: number
  created_at: string
}

export interface Sale {
  id: string
  product_id: string
  quantity: number
  selling_price: number
  total_amount: number
  sold_at: string
  product?: Product
}

export interface Purchase {
  id: string
  product_id: string
  quantity: number
  purchase_price: number
  total_amount: number
  purchased_at: string
  product?: Product
}

export interface ZakatCalculation {
  total_inventory_value: number
  zakat_amount: number
  nisab_value: number
  is_zakat_applicable: boolean
}