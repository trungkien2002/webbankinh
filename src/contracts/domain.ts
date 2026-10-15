// src/contracts/domain.ts
// Hợp đồng dữ liệu chung cho hệ thống quản lý bán kính thời trang

export type UserRole = 'admin' | 'employee';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  email: string;
  position: string; // 'Nhân viên bán kính', 'Kỹ thuật viên khúc xạ', 'Quản lý cửa hàng'
  hireDate: string;
  createdAt: string;
  shift?: string;
  branch?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  material?: string;
  isDeleted: boolean; // Xóa mềm theo policy chung (LSP004)
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ProductType = 'Gọng kính' | 'Tròng kính' | 'Kính râm' | 'Phụ kiện';

export interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  productType: ProductType;
  brand?: string;
  material?: string;
  color?: string;
  shape?: string; // Ví dụ: 'Tròn', 'Vuông', 'Chữ nhật', 'Mắt mèo'
  barcode?: string;
  price: number;
  stock: number;
  imageUrl?: string;
  imageOverride?: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EyePrescription {
  sphereRight: number; // Cầu phải (SPH)
  cylinderRight: number; // Trụ phải (CYL)
  axisRight: number; // Trục phải (AXIS)
  sphereLeft: number; // Cầu trái (SPH)
  cylinderLeft: number; // Trụ trái (CYL)
  axisLeft: number; // Trục trái (AXIS)
  pupillaryDistance: number; // Khoảng cách đồng tử (PD) mm
  measuredAt: string;
  notes?: string;
}

export interface Customer {
  id: string;
  customerCode: string; // Ví dụ: KH0001
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  prescriptions: EyePrescription[];
  createdAt: string;
  updatedAt: string;
}

export type VoucherDiscountType = 'percentage' | 'fixed';

export interface Voucher {
  id: string;
  code: string; // Duy nhất, viết hoa, ví dụ: KINH10
  name: string;
  discountType: VoucherDiscountType;
  discountValue: number; // % (0-100) hoặc số tiền cố định (đ)
  minOrderValue: number; // Đơn tối thiểu
  maxDiscountAmount?: number; // Giảm tối đa khi dùng %
  startDate: string; // ISO String (YYYY-MM-DD)
  endDate: string; // ISO String (YYYY-MM-DD)
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export type InvoicePaymentStatus = 'draft' | 'pending' | 'paid' | 'cancelled';
export type InvoiceProductionStatus = 'none' | 'cutting_lens' | 'completed' | 'delivered';

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  invoiceCode: string; // HD0001
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  employeeId: string;
  employeeName: string;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  voucherCode?: string;
  voucherDiscountSnapshot?: number;
  totalAmount: number;
  paymentMethod: InvoicePaymentMethod;
  paymentStatus: InvoicePaymentStatus; // draft -> pending (treo đơn) -> paid (đã thanh toán)
  productionStatus: InvoiceProductionStatus; // Trạng thái mài lắp tròng kính
  prescription?: EyePrescription;
  notes?: string;
  createdAt: string;
  paidAt?: string;
  updatedAt: string;
}

export type InvoicePaymentMethod = 'cash' | 'transfer' | 'card' | 'qr';
export interface PaymentRecord { id: string; invoiceId: string; idempotencyKey: string; method: InvoicePaymentMethod; amount: number; createdAt: string; }
export interface StockMovement { id: string; productId: string; quantity: number; reason: 'import'; importKey: string; lot?: string; createdAt: string; }
