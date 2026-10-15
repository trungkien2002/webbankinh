// src/services/database.ts
// Local Database & State Persistence cho hệ thống quản lý bán kính thời trang

import { User, Employee, Category, Product, Voucher, Customer, Invoice, PaymentRecord, StockMovement } from '../contracts/domain';
import sharedDatabase from '../../data/local-database.json';

interface DatabaseSchema {
  importKeys: string[];
  payments: PaymentRecord[];
  stockMovements: StockMovement[];
  users: User[];
  employees: Employee[];
  categories: Category[];
  products: Product[];
  vouchers: Voucher[];
  customers: Customer[];
  invoices: Invoice[];
}

const initialDatabase: DatabaseSchema = {
  importKeys: [], payments: [], stockMovements: [],
  users: [
    {
      id: 'USR001',
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'USR002',
      username: 'hoan_nv',
      email: 'hoan@example.com',
      role: 'employee',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  employees: [
    {
      id: 'EMP001',
      userId: 'USR001',
      fullName: 'Trần Trung Kiên',
      phone: '0901234567',
      email: 'admin@example.com',
      position: 'Quản trị viên',
      hireDate: '2026-01-01',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'EMP002',
      userId: 'USR002',
      fullName: 'Nguyễn Văn Hoan',
      phone: '0909876543',
      email: 'hoan@example.com',
      position: 'Nhân viên bán kính',
      hireDate: '2026-02-15',
      createdAt: new Date().toISOString(),
    },
  ],
  categories: [
    {
      id: 'CAT001',
      name: 'Gọng kính',
      description: 'Gọng thời trang và cổ điển',
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'CAT002',
      name: 'Tròng kính',
      description: 'Tròng cận, loạn, chống ánh sáng xanh theo thông số đo',
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'CAT003',
      name: 'Kính râm',
      description: 'Kính chống tia UV thời trang',
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'CAT004',
      name: 'Phụ kiện',
      description: 'Hộp kính, khăn lau chuyên dụng, dung dịch vệ sinh',
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  products: [
    {
      id: 'PRD001',
      sku: 'GK001',
      name: 'Gọng kính Céleste',
      categoryId: 'CAT001',
      productType: 'Gọng kính',
      brand: 'Élan',
      material: 'Acetate',
      color: 'Nâu hổ phách',
      shape: 'Vuông bo viền',
      barcode: '893000000001',
      price: 850000,
      stock: 12,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'PRD002',
      sku: 'TR001',
      name: 'Tròng kính BlueCut 1.60',
      categoryId: 'CAT002',
      productType: 'Tròng kính',
      brand: 'Chemi',
      material: 'Resin',
      color: 'Trong suốt',
      barcode: '893000000002',
      price: 300000,
      stock: 28,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  vouchers: [
    {
      id: 'VOU001',
      code: 'KINH10',
      name: 'Ưu đãi kính mới',
      discountType: 'percentage',
      discountValue: 10,
      minOrderValue: 500000,
      maxDiscountAmount: 100000,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      isActive: true,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'VOU002',
      code: 'GIAM50K',
      name: 'Giảm trực tiếp 50k',
      discountType: 'fixed',
      discountValue: 50000,
      minOrderValue: 400000,
      startDate: '2026-10-01',
      endDate: '2026-10-30',
      isActive: true,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  customers: [
    {
      id: 'CUS001',
      customerCode: 'KH0001',
      fullName: 'Nguyễn Văn An',
      phone: '0900000001',
      email: 'an.nguyen@example.com',
      address: 'Hà Nội',
      prescriptions: [
        {
          sphereRight: -1.5,
          cylinderRight: -0.5,
          axisRight: 90,
          sphereLeft: -1.25,
          cylinderLeft: -0.25,
          axisLeft: 85,
          pupillaryDistance: 62,
          measuredAt: '2026-10-10',
          notes: 'Mắt kính làm việc văn phòng',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'CUS002',
      customerCode: 'KH0002',
      fullName: 'Trần Thị Bình',
      phone: '0900000002',
      email: 'binh.tran@example.com',
      address: 'TP. Hồ Chí Minh',
      prescriptions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  invoices: [],
};

class Database {
  private data: DatabaseSchema;
  private storageKey = 'webbankinh_db';

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        try {
          return this.normalize(JSON.parse(stored));
        } catch (e) {
          console.error('Error parsing stored database, using fallback', e);
        }
      }
    }
    // Deep clone initialDatabase
    return this.normalize(JSON.parse(JSON.stringify(sharedDatabase)));
  }

  private normalize(data: Partial<DatabaseSchema>): DatabaseSchema {
    return { ...data, importKeys: data.importKeys || [], payments: data.payments || [], stockMovements: data.stockMovements || [] } as DatabaseSchema;
  }

  private save() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }
  }

  // One localStorage write for related changes; retain memory on storage failure.
  public transaction(update: (draft: DatabaseSchema) => void) {
    const next: DatabaseSchema = JSON.parse(JSON.stringify(this.data));
    update(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(next));
    }
    this.data = next;
  }

  public reset() {
    this.data = JSON.parse(JSON.stringify(initialDatabase));
    this.save();
  }
  public get importKeys() { return this.data.importKeys; }
  public get payments() { return this.data.payments; }
  public get stockMovements() { return this.data.stockMovements; }

  public get users(): User[] {
    return this.data.users;
  }
  public setUsers(users: User[]) {
    this.data.users = users;
    this.save();
  }

  public get employees(): Employee[] {
    return this.data.employees;
  }
  public setEmployees(employees: Employee[]) {
    this.data.employees = employees;
    this.save();
  }

  public get categories(): Category[] {
    return this.data.categories;
  }
  public setCategories(categories: Category[]) {
    this.data.categories = categories;
    this.save();
  }

  public get products(): Product[] {
    return this.data.products;
  }
  public setProducts(products: Product[]) {
    this.data.products = products;
    this.save();
  }

  public get vouchers(): Voucher[] {
    return this.data.vouchers;
  }
  public setVouchers(vouchers: Voucher[]) {
    this.data.vouchers = vouchers;
    this.save();
  }

  public get customers(): Customer[] {
    return this.data.customers;
  }
  public setCustomers(customers: Customer[]) {
    this.data.customers = customers;
    this.save();
  }

  public get invoices(): Invoice[] {
    return this.data.invoices;
  }
  public setInvoices(invoices: Invoice[]) {
    this.data.invoices = invoices;
    this.save();
  }
}

export const db = new Database();
