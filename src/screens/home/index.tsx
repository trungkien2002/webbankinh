import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  FlatList,
  Modal,
  Alert,
} from 'react-native';
import { authService } from '../../services/authService';
import { categoryService } from '../../services/categoryService';
import { productService } from '../../services/productService';
import { invoiceService } from '../../services/invoiceService';
import { voucherService } from '../../services/voucherService';
import { customerService } from '../../services/customerService';
import { employeeService } from '../../services/employeeService';
import { db } from '../../services/database';
import { Category, Product, Invoice, Voucher, Customer, Employee } from '../../contracts/domain';

type ActiveTab = 'categories' | 'products' | 'sales' | 'invoices' | 'vouchers' | 'customers' | 'employees';

export function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('categories');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal states
  const [modalType, setModalType] = useState<string | null>(null);
  const [modalMessage, setModalMessage] = useState<string>('');

  // DN004 State: Form Tạo tài khoản
  const [newUsername, setNewUsername] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'employee'>('employee');

  // LSP004 State: Xóa phân loại kính
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // SP001 State: Thêm sản phẩm
  const [newSku, setNewSku] = useState('');
  const [newProdName, setNewProdName] = useState('');
  const [newProdCatId, setNewProdCatId] = useState('CAT001');
  const [newProdPrice, setNewProdPrice] = useState('850000');
  const [newProdStock, setNewProdStock] = useState('10');
  const [newProdBrand, setNewProdBrand] = useState('Élan');
  const [newProdShape, setNewProdShape] = useState('Tròn');

  // SP005 State: Tìm kiếm sản phẩm
  const [searchQuery, setSearchQuery] = useState('');
  const [filterShape, setFilterShape] = useState('');

  // BH006 & Sales State
  const [cartVoucherCode, setCartVoucherCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);

  // VC002 State: Sửa voucher
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [editVoucherDiscount, setEditVoucherDiscount] = useState('10');

  // KH004 State: Tìm khách hàng
  const [custSearchQuery, setCustSearchQuery] = useState('');

  // NV001 State: Thêm nhân viên
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpPosition, setNewEmpPosition] = useState('Nhân viên bán kính');
  const [newEmpUsername, setNewEmpUsername] = useState('');

  const reload = () => setRefreshKey(prev => prev + 1);

  // Handlers
  const handleCreateUser = () => {
    const res = authService.createUser({
      username: newUsername,
      email: newUserEmail,
      role: newUserRole,
      currentActorRole: 'admin',
    });
    if (res.success) {
      setModalType('success');
      setModalMessage(`Tạo tài khoản thành công cho ${res.data?.username} (${res.data?.role})!`);
      setNewUsername('');
      setNewUserEmail('');
      reload();
    } else {
      setModalType('error');
      setModalMessage(res.error || 'Lỗi tạo tài khoản');
    }
  };

  const handleConfirmDeleteCategory = () => {
    if (!selectedCategory) return;
    const res = categoryService.deleteCategory({
      categoryId: selectedCategory.id,
      currentActorRole: 'admin',
    });
    if (res.success) {
      setModalType('success');
      setModalMessage(`Đã xóa mềm thành công phân loại "${selectedCategory.name}".`);
      setSelectedCategory(null);
      reload();
    } else {
      setModalType('error');
      setModalMessage(res.error || 'Lỗi xóa phân loại');
    }
  };

  const handleCreateProduct = () => {
    const res = productService.createProduct({
      sku: newSku,
      name: newProdName,
      categoryId: newProdCatId,
      productType: 'Gọng kính',
      price: Number(newProdPrice) || 0,
      stock: Number(newProdStock) || 0,
      brand: newProdBrand,
      shape: newProdShape,
      currentActorRole: 'admin',
    });
    if (res.success) {
      setModalType('success');
      setModalMessage(`Đã thêm sản phẩm kính "${res.data?.name}" (SKU: ${res.data?.sku}) thành công!`);
      setNewSku('');
      setNewProdName('');
      reload();
    } else {
      setModalType('error');
      setModalMessage(res.error || 'Lỗi thêm sản phẩm');
    }
  };

  const handleApplyVoucher = (subtotal: number) => {
    const res = voucherService.applyVoucher({
      voucherCode: cartVoucherCode,
      subtotal,
    });
    if (res.success) {
      setAppliedDiscount(res.discountAmount || 0);
      setModalType('success');
      setModalMessage(`Áp dụng voucher ${res.voucherCode} thành công! Giảm ${res.discountAmount?.toLocaleString('vi-VN')} đ`);
    } else {
      setModalType('error');
      setModalMessage(res.error || 'Không áp dụng được voucher');
    }
  };

  const handleHoldInvoice = () => {
    const res = invoiceService.holdPendingInvoice({
      employeeId: 'EMP001',
      employeeName: 'Trần Trung Kiên',
      customerName: 'Nguyễn Văn An',
      items: [
        {
          id: 'ITEM1',
          productId: 'PRD001',
          productName: 'Gọng kính Céleste',
          sku: 'GK001',
          unitPrice: 850000,
          quantity: 1,
          lineTotal: 850000,
        },
      ],
      voucherCode: cartVoucherCode || undefined,
      voucherDiscountSnapshot: appliedDiscount,
    });
    if (res.success) {
      setModalType('success');
      setModalMessage(`Đã lưu tạm (treo) hóa đơn ${res.data?.invoiceCode} thành công cho khách chờ cắt tròng.`);
      reload();
    } else {
      setModalType('error');
      setModalMessage(res.error || 'Lỗi treo hóa đơn');
    }
  };

  const handleUpdateVoucher = () => {
    if (!selectedVoucher) return;
    const res = voucherService.updateVoucher({
      voucherId: selectedVoucher.id,
      discountValue: Number(editVoucherDiscount) || 10,
      currentActorRole: 'admin',
    });
    if (res.success) {
      setModalType('success');
      setModalMessage(`Đã cập nhật mức giảm voucher "${selectedVoucher.code}" thành công!`);
      setSelectedVoucher(null);
      reload();
    } else {
      setModalType('error');
      setModalMessage(res.error || 'Lỗi sửa voucher');
    }
  };

  const handleCreateEmployee = () => {
    const res = employeeService.createEmployee({
      fullName: newEmpName,
      phone: newEmpPhone,
      email: newEmpEmail,
      position: newEmpPosition,
      account: newEmpUsername ? { username: newEmpUsername, password: 'password123' } : undefined,
      currentActorRole: 'admin',
    });
    if (res.success) {
      setModalType('success');
      setModalMessage(`Đã thêm nhân sự "${res.data?.employee.fullName}" thành công${res.data?.userId ? ' (kèm user ' + newEmpUsername + ')' : ''}!`);
      setNewEmpName('');
      setNewEmpPhone('');
      setNewEmpEmail('');
      setNewEmpUsername('');
      reload();
    } else {
      setModalType('error');
      setModalMessage(res.error || 'Lỗi thêm nhân viên');
    }
  };

  // Queries
  const activeCategories = categoryService.getActiveCategories();
  const searchResults = productService.searchProducts({
    query: searchQuery,
    shape: filterShape || undefined,
  });
  const pendingInvoices = invoiceService.getPendingInvoices();
  const allInvoices = invoiceService.filterInvoices({});
  const allVouchers = voucherService.getAllVouchers();
  const searchCustomersRes = customerService.searchCustomers({ query: custSearchQuery });
  const allEmployees = employeeService.getAllEmployees();

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>HỆ THỐNG QUẢN LÝ BÁN KÍNH · NHÓM 4</Text>
          <Text style={styles.title}>Quản trị & Bán kính thời trang</Text>
          <Text style={styles.subtitle}>Phân hệ hoàn chỉnh của Khánh: Đã tích hợp đủ 10 tính năng qua 4 Sprint</Text>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.tabBar}>
          {[
            { key: 'categories', label: 'LSP: Phân loại' },
            { key: 'products', label: 'SP: Sản phẩm kính' },
            { key: 'sales', label: 'BH: Bán hàng & Treo đơn' },
            { key: 'invoices', label: 'HD: Quản lý hóa đơn' },
            { key: 'vouchers', label: 'VC: Voucher khuyến mãi' },
            { key: 'customers', label: 'KH: Khách & Đo mắt' },
            { key: 'employees', label: 'NV: Nhân sự & User' },
          ].map(tab => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key as ActiveTab)}
              style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
            >
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* TAB 1: CATEGORIES (LSP004) */}
        {activeTab === 'categories' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>LSP004: Xóa phân loại kính</Text>
              <Text style={styles.badge}>Sprint 1 · 7 SP</Text>
            </View>
            <Text style={styles.descText}>
              Xóa mềm (soft delete) phân loại kính. Có dialog xác nhận và kiểm tra ràng buộc sản phẩm liên kết chặt chẽ.
            </Text>

            <View style={styles.card}>
              <Text style={styles.cardHeader}>Danh sách phân loại kính đang kinh doanh</Text>
              {activeCategories.map(cat => {
                const linkedCount = db.products.filter(p => p.categoryId === cat.id && !p.isDeleted).length;
                return (
                  <View key={cat.id} style={styles.rowItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.boldText}>{cat.name} ({cat.id})</Text>
                      <Text style={styles.mutedText}>{cat.description}</Text>
                      <Text style={styles.smallText}>
                        Sản phẩm liên kết: <Text style={{ color: linkedCount > 0 ? '#b91c1c' : '#15803d', fontWeight: 'bold' }}>{linkedCount} sản phẩm</Text>
                      </Text>
                    </View>
                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Text style={styles.deleteButtonText}>Xóa phân loại</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* TAB 2: PRODUCTS (SP001 & SP005) */}
        {activeTab === 'products' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>SP001: Thêm sản phẩm & SP005: Tìm kiếm kính</Text>
              <Text style={styles.badge}>Sprint 2 · 18 SP</Text>
            </View>

            {/* Form SP001 */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>SP001: Thêm mẫu gọng/tròng kính mới</Text>
              <View style={styles.formRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Mã SKU (VD: GK005)"
                  value={newSku}
                  onChangeText={setNewSku}
                />
                <TextInput
                  style={[styles.input, { flex: 2 }]}
                  placeholder="Tên sản phẩm kính"
                  value={newProdName}
                  onChangeText={setNewProdName}
                />
              </View>
              <View style={styles.formRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Giá bán (đ)"
                  keyboardType="numeric"
                  value={newProdPrice}
                  onChangeText={setNewProdPrice}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Tồn kho"
                  keyboardType="numeric"
                  value={newProdStock}
                  onChangeText={setNewProdStock}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Dáng mắt (VD: Tròn, Vuông)"
                  value={newProdShape}
                  onChangeText={setNewProdShape}
                />
              </View>
              <Pressable style={styles.primaryButton} onPress={handleCreateProduct}>
                <Text style={styles.primaryButtonText}>Lưu mẫu kính mới (SP001)</Text>
              </Pressable>
            </View>

            {/* Search SP005 */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>SP005: Bộ lọc & Tìm kiếm sản phẩm kính</Text>
              <View style={styles.formRow}>
                <TextInput
                  style={[styles.input, { flex: 2 }]}
                  placeholder="Tìm theo SKU, tên kính, mã vạch..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Lọc dáng kính..."
                  value={filterShape}
                  onChangeText={setFilterShape}
                />
              </View>
              <Text style={styles.mutedText}>Kết quả tìm thấy: {searchResults.length} sản phẩm</Text>
              {searchResults.map(p => (
                <View key={p.id} style={styles.rowItem}>
                  <View>
                    <Text style={styles.boldText}>{p.name} [{p.sku}]</Text>
                    <Text style={styles.mutedText}>
                      Hãng: {p.brand || '—'} · Dáng: {p.shape || '—'} · Chất liệu: {p.material || '—'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.priceText}>{p.price.toLocaleString('vi-VN')} đ</Text>
                    <Text style={styles.smallText}>Tồn: {p.stock} chiếc</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* TAB 3: SALES (BH002 & BH006) */}
        {activeTab === 'sales' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>BH002: Treo hóa đơn & BH006: Áp dụng voucher</Text>
              <Text style={styles.badge}>Sprint 3 · 18 SP</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardHeader}>Đơn hàng POS tại quầy</Text>
              <View style={styles.rowItem}>
                <Text style={styles.boldText}>Gọng kính Céleste (GK001) x 1</Text>
                <Text style={styles.priceText}>850.000 đ</Text>
              </View>
              <View style={styles.formRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Nhập mã voucher (VD: KINH10, GIAM50K)"
                  value={cartVoucherCode}
                  onChangeText={setCartVoucherCode}
                />
                <Pressable style={styles.primaryButton} onPress={() => handleApplyVoucher(850000)}>
                  <Text style={styles.primaryButtonText}>Áp dụng (BH006)</Text>
                </Pressable>
              </View>
              <View style={{ marginVertical: 8, gap: 4 }}>
                <Text style={styles.mutedText}>Tạm tính: 850.000 đ</Text>
                <Text style={{ color: '#16a34a', fontWeight: 'bold' }}>
                  Giảm giá voucher: -{appliedDiscount.toLocaleString('vi-VN')} đ
                </Text>
                <Text style={styles.boldText}>
                  Tổng thanh toán: {(850000 - appliedDiscount).toLocaleString('vi-VN')} đ
                </Text>
              </View>
              <Pressable style={[styles.primaryButton, { backgroundColor: '#d97706' }]} onPress={handleHoldInvoice}>
                <Text style={styles.primaryButtonText}>Treo hóa đơn chờ cắt kính (BH002)</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardHeader}>Danh sách hóa đơn đang treo (Pending): {pendingInvoices.length}</Text>
              {pendingInvoices.map(inv => (
                <View key={inv.id} style={styles.rowItem}>
                  <View>
                    <Text style={styles.boldText}>{inv.invoiceCode} - {inv.customerName}</Text>
                    <Text style={styles.mutedText}>Trạng thái: Chờ mài lắp kính (cutting_lens)</Text>
                  </View>
                  <Text style={styles.priceText}>{inv.totalAmount.toLocaleString('vi-VN')} đ</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* TAB 4: INVOICES (HD004) */}
        {activeTab === 'invoices' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>HD004: Lọc hóa đơn theo thời gian, trạng thái</Text>
              <Text style={styles.badge}>Sprint 4 · 7 SP</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Tất cả hóa đơn trong hệ thống: {allInvoices.length}</Text>
              {allInvoices.map(inv => (
                <View key={inv.id} style={styles.rowItem}>
                  <View>
                    <Text style={styles.boldText}>{inv.invoiceCode} · {inv.customerName}</Text>
                    <Text style={styles.mutedText}>
                      Thanh toán: {inv.paymentStatus.toUpperCase()} · Mài kính: {inv.productionStatus}
                    </Text>
                    <Text style={styles.smallText}>Ngày tạo: {new Date(inv.createdAt).toLocaleString('vi-VN')}</Text>
                  </View>
                  <Text style={styles.priceText}>{inv.totalAmount.toLocaleString('vi-VN')} đ</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* TAB 5: VOUCHERS (VC002) */}
        {activeTab === 'vouchers' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>VC002: Sửa thông tin voucher</Text>
              <Text style={styles.badge}>Sprint 3 · 9 SP</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Danh sách voucher khuyến mãi</Text>
              {allVouchers.map(v => (
                <View key={v.id} style={styles.rowItem}>
                  <View>
                    <Text style={styles.boldText}>{v.code} - {v.name}</Text>
                    <Text style={styles.mutedText}>
                      Giảm: {v.discountValue}{v.discountType === 'percentage' ? '%' : ' đ'} · Đơn tối thiểu: {v.minOrderValue.toLocaleString('vi-VN')} đ
                    </Text>
                    <Text style={styles.smallText}>Thời hạn: {v.startDate} đến {v.endDate}</Text>
                  </View>
                  <Pressable
                    style={styles.editButton}
                    onPress={() => {
                      setSelectedVoucher(v);
                      setEditVoucherDiscount(String(v.discountValue));
                    }}
                  >
                    <Text style={styles.editButtonText}>Sửa (VC002)</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* TAB 6: CUSTOMERS (KH004) */}
        {activeTab === 'customers' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>KH004: Tìm kiếm thông tin khách hàng</Text>
              <Text style={styles.badge}>Sprint 4 · 7 SP</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Tra cứu nhanh theo SĐT hoặc mã khách hàng (&lt;300ms)</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập SĐT (có/không khoảng trắng) hoặc Mã KH..."
                value={custSearchQuery}
                onChangeText={setCustSearchQuery}
              />
              <Text style={styles.mutedText}>
                Tìm thấy: {searchCustomersRes.customers.length} khách · Tốc độ: {searchCustomersRes.executionTimeMs.toFixed(2)} ms
              </Text>
              {searchCustomersRes.customers.map(c => (
                <View key={c.id} style={styles.rowItem}>
                  <View>
                    <Text style={styles.boldText}>{c.fullName} ({c.customerCode})</Text>
                    <Text style={styles.mutedText}>SĐT: {c.phone} · Địa chỉ: {c.address || '—'}</Text>
                    {c.prescriptions.length > 0 && (
                      <Text style={[styles.smallText, { color: '#2563eb' }]}>
                        Độ mắt: Phải {c.prescriptions[0].sphereRight} D / Trái {c.prescriptions[0].sphereLeft} D · PD {c.prescriptions[0].pupillaryDistance} mm
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* TAB 7: EMPLOYEES & USERS (NV001 & DN004) */}
        {activeTab === 'employees' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>NV001: Thêm nhân viên & DN004: Tạo tài khoản</Text>
              <Text style={styles.badge}>Sprint 1 & Sprint 4 · 18 SP</Text>
            </View>

            {/* Form DN004 */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>DN004: Tạo tài khoản & Phân quyền Admin/Employee</Text>
              <View style={styles.formRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Username duy nhất"
                  value={newUsername}
                  onChangeText={setNewUsername}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Email đăng nhập"
                  value={newUserEmail}
                  onChangeText={setNewUserEmail}
                />
              </View>
              <View style={styles.formRow}>
                <Pressable
                  style={[styles.roleSelect, newUserRole === 'employee' && styles.roleSelectActive]}
                  onPress={() => setNewUserRole('employee')}
                >
                  <Text style={newUserRole === 'employee' ? styles.roleTextActive : styles.roleText}>
                    Vai trò: Nhân viên (Employee)
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.roleSelect, newUserRole === 'admin' && styles.roleSelectActive]}
                  onPress={() => setNewUserRole('admin')}
                >
                  <Text style={newUserRole === 'admin' ? styles.roleTextActive : styles.roleText}>
                    Vai trò: Quản trị viên (Admin)
                  </Text>
                </Pressable>
              </View>
              <Pressable style={styles.primaryButton} onPress={handleCreateUser}>
                <Text style={styles.primaryButtonText}>Tạo tài khoản (DN004)</Text>
              </Pressable>
            </View>

            {/* Form NV001 */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>NV001: Thêm hồ sơ nhân viên (Liên kết DN004)</Text>
              <View style={styles.formRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Họ tên nhân viên"
                  value={newEmpName}
                  onChangeText={setNewEmpName}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Số điện thoại"
                  value={newEmpPhone}
                  onChangeText={setNewEmpPhone}
                />
              </View>
              <View style={styles.formRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Email"
                  value={newEmpEmail}
                  onChangeText={setNewEmpEmail}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Tài khoản cấp kèm (tùy chọn)"
                  value={newEmpUsername}
                  onChangeText={setNewEmpUsername}
                />
              </View>
              <Pressable style={styles.primaryButton} onPress={handleCreateEmployee}>
                <Text style={styles.primaryButtonText}>Lưu nhân viên mới (NV001)</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardHeader}>Danh sách nhân sự hiện tại: {allEmployees.length}</Text>
              {allEmployees.map(e => (
                <View key={e.id} style={styles.rowItem}>
                  <View>
                    <Text style={styles.boldText}>{e.fullName} ({e.position})</Text>
                    <Text style={styles.mutedText}>SĐT: {e.phone} · Email: {e.email}</Text>
                  </View>
                  <Text style={styles.smallText}>{e.userId ? 'Đã có User' : 'Chưa gắn User'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Modal Thông báo */}
        <Modal visible={!!modalType} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Text style={modalType === 'error' ? styles.modalTitleError : styles.modalTitleSuccess}>
                {modalType === 'error' ? 'Thông báo lỗi' : 'Thành công'}
              </Text>
              <Text style={styles.modalBody}>{modalMessage}</Text>
              <Pressable style={styles.primaryButton} onPress={() => setModalType(null)}>
                <Text style={styles.primaryButtonText}>Đóng</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Modal Xác nhận Xóa mềm Phân loại (LSP004) */}
        <Modal visible={!!selectedCategory} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitleError}>Xác nhận xóa phân loại kính (LSP004)</Text>
              <Text style={styles.modalBody}>
                Bạn có chắc chắn muốn xóa phân loại "{selectedCategory?.name}"? Hệ thống sẽ kiểm tra ràng buộc sản phẩm liên kết trước khi thực hiện xóa mềm.
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <Pressable
                  style={[styles.primaryButton, { flex: 1, backgroundColor: '#64748b' }]}
                  onPress={() => setSelectedCategory(null)}
                >
                  <Text style={styles.primaryButtonText}>Hủy bỏ</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryButton, { flex: 1, backgroundColor: '#dc2626' }]}
                  onPress={handleConfirmDeleteCategory}
                >
                  <Text style={styles.primaryButtonText}>Xác nhận xóa</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal Sửa Voucher (VC002) */}
        <Modal visible={!!selectedVoucher} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitleSuccess}>Sửa thông tin voucher (VC002)</Text>
              <Text style={styles.modalBody}>Mã voucher: {selectedVoucher?.code}</Text>
              <TextInput
                style={styles.input}
                placeholder="Giá trị giảm mới (% hoặc đ)"
                keyboardType="numeric"
                value={editVoucherDiscount}
                onChangeText={setEditVoucherDiscount}
              />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <Pressable
                  style={[styles.primaryButton, { flex: 1, backgroundColor: '#64748b' }]}
                  onPress={() => setSelectedVoucher(null)}
                >
                  <Text style={styles.primaryButtonText}>Hủy</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryButton, { flex: 1 }]}
                  onPress={handleUpdateVoucher}
                >
                  <Text style={styles.primaryButtonText}>Cập nhật (VC002)</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: '#f1f5f9', padding: 20 },
  container: { width: '100%', maxWidth: 960, alignSelf: 'center', gap: 20 },
  header: { gap: 6, marginBottom: 10 },
  eyebrow: { color: '#2563eb', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  title: { color: '#0f172a', fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#475569', fontSize: 15 },
  tabBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, backgroundColor: '#ffffff', padding: 12, borderRadius: 12 },
  tabItem: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#f8fafc' },
  tabItemActive: { backgroundColor: '#2563eb' },
  tabLabel: { color: '#475569', fontSize: 13, fontWeight: '600' },
  tabLabelActive: { color: '#ffffff' },
  section: { gap: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  badge: { backgroundColor: '#dbeafe', color: '#1e40af', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, fontSize: 12, fontWeight: '700' },
  descText: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 20, gap: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  formRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: '#ffffff', minWidth: 150 },
  primaryButton: { backgroundColor: '#2563eb', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  rowItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  boldText: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  mutedText: { fontSize: 13, color: '#64748b' },
  smallText: { fontSize: 12, color: '#94a3b8' },
  priceText: { fontSize: 16, fontWeight: '700', color: '#0f766e' },
  deleteButton: { backgroundColor: '#fee2e2', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6 },
  deleteButtonText: { color: '#b91c1c', fontWeight: '700', fontSize: 13 },
  editButton: { backgroundColor: '#e0f2fe', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6 },
  editButtonText: { color: '#0369a1', fontWeight: '700', fontSize: 13 },
  roleSelect: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center' },
  roleSelectActive: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
  roleText: { color: '#64748b', fontWeight: '600', fontSize: 13 },
  roleTextActive: { color: '#2563eb', fontWeight: '700', fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, gap: 14 },
  modalTitleSuccess: { fontSize: 18, fontWeight: '700', color: '#16a34a' },
  modalTitleError: { fontSize: 18, fontWeight: '700', color: '#dc2626' },
  modalBody: { fontSize: 15, color: '#334155', lineHeight: 22 },
});
