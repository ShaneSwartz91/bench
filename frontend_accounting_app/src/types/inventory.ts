// Corresponds to the 'products' table
export interface Product {
  id: string; // uuid
  user_id: string; // uuid
  sku?: string | null;
  name: string;
  description?: string | null;
  purchase_price?: number | null;
  sale_price: number;
  unit_of_measure?: string | null;
  current_stock_level: number;
  reorder_point?: number | null;
  category?: string | null;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

// For creating new products
export type NewProduct = Omit<Product, 'id' | 'user_id' | 'current_stock_level' | 'created_at' | 'updated_at'> & {
  initial_stock_level?: number; // Optional: To create an 'initial' movement
};

// For updating products
export type ProductUpdate = Partial<Omit<Product, 'id' | 'user_id' | 'current_stock_level'| 'created_at' | 'updated_at'>>;


// Corresponds to the 'inventory_movements' table
export const MOVEMENT_TYPES = [
  'initial',
  'purchase',
  'sale',
  'adjustment_in', // e.g., stock take increase, found items
  'adjustment_out',// e.g., stock take decrease, damaged goods
  'return_customer', // Goods returned by a customer
  'return_supplier'  // Goods returned to a supplier
] as const;

export type MovementType = typeof MOVEMENT_TYPES[number];

export interface InventoryMovement {
  id: string; // uuid
  user_id: string; // uuid
  product_id: string; // uuid
  movement_type: MovementType;
  quantity_changed: number; // Positive for stock in, negative for stock out
  movement_date: string; // timestamptz
  reference_id?: string | null; // e.g., Invoice ID, Purchase Order ID
  notes?: string | null;
  created_at: string; // timestamptz
}

// For creating new inventory movements
export type NewInventoryMovement = Omit<InventoryMovement, 'id' | 'user_id' | 'created_at' | 'movement_date'> & {
  movement_date?: string; // Optional, will default to now() in DB if not provided by client
};
