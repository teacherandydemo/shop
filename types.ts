
export interface Product {
  p_id: string;
  p_name: string;
  p_category: string;
  p_price: number;
  p_stock: number;
  p_image: string;
  p_desc: string;
  p_ingredients: string;
  p_usage: string;
  p_expiry: string;
  p_report: string;
  p_status: 'Active' | 'Inactive';
}

export interface Member {
  m_id: string;
  m_email: string;
  m_name: string;
  m_phone: string;
  m_address: string;
  m_birthday: string;
  m_level: string;
  m_created_at: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  o_id: string;
  m_id: string;
  o_items: string; // JSON string of CartItem[]
  o_total: number;
  o_payment: string;
  o_status: string;
  o_shipping_addr: string;
  o_tracking: string;
  o_created_at: string;
}

export type ViewState = 'HOME' | 'SHOP' | 'PRODUCT_DETAIL' | 'CART' | 'LOGIN' | 'MEMBER' | 'CHECKOUT' | 'ORDER_SUCCESS';
