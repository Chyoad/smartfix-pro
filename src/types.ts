export type UserRole = 'admin' | 'cashier' | 'technician';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export type ServiceStatus = 'waiting' | 'checking' | 'on_progress' | 'pending_sparepart' | 'finished' | 'delivered' | 'cancel';

export interface ServiceTicket {
  id: string;
  customerId: string;
  customerName?: string;
  deviceModel: string;
  imei: string;
  problem: string;
  diagnosis?: string;
  status: ServiceStatus;
  technicianId?: string;
  technicianName?: string;
  estimatedCost: number;
  finalCost?: number;
  partsUsed?: any[];
  conditionPhotos?: string[];
  resultPhotos?: string[];
  warrantyExpiry?: string;
  warrantyDuration?: number; // In days
  isWarrantyClaim?: boolean;
  originalTicketId?: string; // If this is a return/retur, link to original
  repairHistory?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  stockLevel: number;
  minStockAlert: number;
  buyPrice: number;
  sellPrice: number;
  warehouse: string;
}

export interface Transaction {
  id: string;
  type: 'sale' | 'service' | 'expense';
  description: string;
  amount: number;
  totalAmount: number;
  category: string;
  paymentMethod: 'cash' | 'transfer' | 'qris';
  items?: any[];
  ticketId?: string;
  createdAt: string;
}
