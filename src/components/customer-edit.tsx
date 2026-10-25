import {Toast} from './toast';
import React, { useRef, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { EyePrescription } from '../contracts/domain';
import { db } from '../services/database';
import { updateCustomer } from '../services/hoan-service';
import { Button, Choice, Field, ui } from './ui';

export function CustomerEdit({ actorId, customerId, onSaved }: {
  actorId: string; customerId: string; onSaved: () => void;
}) {
  const customer = db.customers.find(c => c.id === customerId);
  const { width } = useWindowDimensions();
  const [form, setForm] = useState<Record<string, string>>({
    fullName: customer?.fullName || '', phone: customer?.phone || '',
    email: customer?.email || '', address: customer?.address || '',
    measuredAt: new Date().toISOString().slice(0, 10), measurement: 'no',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const guard = useRef(false);
  const field = (key: string, label: string) => <Field key={key} label={label} value={form[key] || ''}
    onChange={value => setForm(old => ({ ...old, [key]: value }))} />;
  if (!customer) return <Text selectable style={ui.error}>Khách hàng không tồn tại.</Text>;
  const save = async () => {
    if (guard.current) return;
    guard.current = true; setSaving(true); setError('');
    try {
      let measurement: EyePrescription | undefined;
      if (form.measurement === 'yes') {
        const keys = ['sphereRight', 'cylinderRight', 'axisRight', 'sphereLeft', 'cylinderLeft', 'axisLeft', 'pupillaryDistance'] as const;
        if (keys.some(key => !form[key]?.trim())) throw new Error('Nhập đầy đủ thông số hai mắt và PD.');
        measurement = { ...Object.fromEntries(keys.map(key => [key, Number(form[key])])), measuredAt: form.measuredAt, notes: form.notes } as unknown as EyePrescription;
      }
      updateCustomer(actorId, customerId, { fullName: form.fullName, phone: form.phone, email: form.email, address: form.address }, measurement);
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể lưu khách hàng.'); }
    finally { guard.current = false; setSaving(false); }
  };
  return <View style={{ gap: 12, minWidth: 0 }}>
    <Text selectable style={ui.muted}>Mã hồ sơ: {customer.customerCode}</Text>
    {field('fullName', 'Họ tên khách hàng')}{field('phone', 'Số điện thoại khách hàng')}
    {field('email', 'Email khách hàng')}{field('address', 'Địa chỉ khách hàng')}
    <Choice label="Bổ sung lần đo" value={form.measurement} onChange={value => setForm(old => ({ ...old, measurement: value }))}
      options={[{ label: 'Giữ lịch sử hiện có', value: 'no' }, { label: 'Thêm lần đo mới', value: 'yes' }]} />
    {form.measurement === 'yes' && <>
      <Text style={ui.muted}>Lần đo mới được thêm vào lịch sử; không sửa thông số trên hóa đơn cũ.</Text>
      <View style={{ flexDirection: width < 600 ? 'column' : 'row', gap: 16 }}>
        {(['Right', 'Left'] as const).map(side => <View key={side} style={{ flex: width < 600 ? undefined : 1, minWidth: 0 }}>
          <Text style={ui.h2}>{side === 'Right' ? 'Mắt phải' : 'Mắt trái'}</Text>
          {field(`sphere${side}`, `SPH ${side === 'Right' ? 'phải' : 'trái'}`)}
          {field(`cylinder${side}`, `CYL ${side === 'Right' ? 'phải' : 'trái'}`)}
          {field(`axis${side}`, `AXIS ${side === 'Right' ? 'phải' : 'trái'}`)}
        </View>)}
      </View>
      {field('pupillaryDistance', 'PD (mm)')}{field('measuredAt', 'Ngày đo (YYYY-MM-DD)')}{field('notes', 'Ghi chú lần đo')}
      <Text style={ui.muted}>Giới hạn nhập demo: SPH −30…30; CYL −10…10; AXIS 0…180; PD 40…80 mm.</Text>
    </>}
    <Toast message={error} onClose={()=>setError('')}/>
    <Button primary disabled={saving} onPress={save}>{saving ? 'Đang lưu…' : 'Lưu khách hàng'}</Button>
  </View>;
}
