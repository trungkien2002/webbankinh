import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Product } from '../contracts/domain';
import { db } from '../services/database';
import { productService } from '../services/productService';
import { Button, Choice, Field, Table, money, ui } from './ui';
import { vietnamInvoiceDate } from '../services/invoice-list';
import { SearchPicker } from './searchPicker';
import { ImageUpload } from './imageUpload';

/** SP002 edits attributes and records real price changes in the shared local data. */
export function ProductEdit({ actorId, productId, onSaved }: {
  actorId: string; productId: string; onSaved: () => void;
}) {
  const product = db.products.find(p => p.id === productId && !p.isDeleted);
  const [form, setForm] = useState<Record<string, string>>(() => Object.fromEntries(
    ['sku', 'name', 'categoryId', 'productType', 'brand', 'color', 'material', 'shape', 'price', 'stock', 'imageUrl']
      .map(key => [key, String(product?.[key as keyof Product] ?? '')])));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const guard = useRef(false);
  const set = (key: string, value: string) => setForm(old => ({ ...old, [key]: value }));
  const field = (key: string, label: string) => <Field key={key} label={label} value={form[key]} onChange={value => set(key, value)} />;
  if (!product) return <Text style={ui.error}>Sản phẩm không tồn tại.</Text>;
  const actor = db.users.find(u => u.id === actorId && u.isActive && u.role === 'admin');
  if (!actor) return <Text style={ui.error}>Chỉ quản trị viên được sửa sản phẩm.</Text>;
  return <View style={{ gap: 12, minWidth: 0 }}>
    {field('sku', 'Mã sản phẩm')}{field('name', 'Tên kính')}
    <SearchPicker label="Phân loại" value={form.categoryId} onChange={value => set('categoryId', value)}
      options={db.categories.filter(c => !c.isDeleted).map(c => ({ label: c.name, value: c.id }))} />
    <Choice label="Loại sản phẩm" value={form.productType} onChange={value => set('productType', value)}
      options={['Gọng kính', 'Tròng kính', 'Kính râm', 'Phụ kiện'].map(value => ({ label: value, value }))} />
    {field('brand', 'Thương hiệu')}{field('color', 'Màu sắc')}{field('material', 'Chất liệu')}{field('shape', 'Dáng kính')}
    {field('price', 'Giá bán')}{field('stock', 'Tồn kho')}
    <ImageUpload value={form.imageUrl} onChange={value => set('imageUrl', value)} />
    <Text style={ui.h2}>Lịch sử thay đổi giá</Text>
    <Text style={ui.muted}>Chỉ ghi các lần đổi giá từ thao tác sửa. Dữ liệu có sẵn không được tạo lịch sử giả.</Text>
    <Table headings={['Thời điểm (giờ VN)', 'Giá cũ', 'Giá mới', 'Người sửa']} rows={[...db.productPriceChanges].filter(change => change.productId === productId)
      .reverse()
      .map(change => [vietnamInvoiceDate(change.changedAt), money(change.oldPrice), money(change.newPrice), `${db.users.find(user => user.id === change.changedBy)?.username || change.changedBy} · ${change.changedBy}`])} />
    {!!error && <Text selectable accessibilityRole="alert" style={ui.error}>{error}</Text>}
    <Button primary disabled={saving} onPress={() => {
      if (guard.current) return;
      guard.current = true; setSaving(true); setError('');
      try {
        if (!form.price.trim() || !form.stock.trim()) throw new Error('Nhập đầy đủ giá và tồn kho.');
        if (!db.users.some(u => u.id === actorId && u.isActive && u.role === 'admin')) throw new Error('Không đủ quyền sửa sản phẩm.');
        const result = productService.updateProduct(productId, { actorId, sku: form.sku, name: form.name, categoryId: form.categoryId,
          productType: form.productType as Product['productType'], brand: form.brand, color: form.color,
          material: form.material, shape: form.shape, price: Number(form.price), stock: Number(form.stock),
          imageUrl: form.imageUrl, currentActorRole: 'admin' });
        if (!result.success) throw new Error(result.error);
        onSaved();
      } catch (e) { setError((e as Error).message); }
      finally { guard.current = false; setSaving(false); }
    }}>{saving ? 'Đang lưu…' : 'Lưu sản phẩm'}</Button>
  </View>;
}
