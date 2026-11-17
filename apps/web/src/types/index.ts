export interface Tenant {
  id: string;
  name: string;
  slug: string;
  subtitle?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radius_meters: number;
  active: boolean;
  has_geofencing?: boolean;
}

export interface Table {
  id: string;
  label: string;
  nfc_token: string;
  active: boolean;
  nfc_url?: string;
  hasActiveSession?: boolean;
  activeSession?: {
    id: string;
    opened_at: string;
    pendingOrdersCount: number;
    pendingCallsCount: number;
    hasBillRequest: boolean;
  } | null;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price_cents: number;
  image_url: string;
  is_best_seller: boolean;
  is_story_highlight: boolean;
  is_available: boolean;
  category?: Category;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  items: MenuItem[];
}

export interface OrderItem {
  id: string;
  menu_item_id: string;
  quantity: number;
  unit_price_cents: number;
  menu_item: MenuItem;
}

export interface Order {
  id: string;
  session_id: string;
  table_id: string;
  status: 'PENDING' | 'PREPARING' | 'DELIVERED';
  total_cents: number;
  location_verified: boolean;
  created_at: string;
  table?: Table;
  items: OrderItem[];
}

export interface TableCall {
  id: string;
  session_id: string;
  table_id: string;
  type: 'WAITER' | 'BILL';
  reason?: string | null;
  payment_method?: 'CREDIT' | 'DEBIT' | 'PIX' | 'CASH' | null;
  include_tip: boolean;
  estimated_total_cents?: number | null;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'COMPLETED';
  created_at: string;
  table?: Table;
  session?: {
    orders: Order[];
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'RESTAURANT_OWNER' | 'STAFF';
  tenantId: string | null;
  tenant?: Tenant | null;
}
