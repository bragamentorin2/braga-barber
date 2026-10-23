export interface ServiceItem {
  id: string;
  name: string;
  price: number;
  durationMinutes?: number;
  category?: string;
  description?: string;
}

export interface ProductItem {
  id: string;
  name: string;
  salePrice: number;
  costPrice?: number;
  stockQuantity?: number;
  category?: string;
  description?: string;
}
