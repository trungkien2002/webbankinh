import {Toast} from './toast';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { db } from '../services/database';
import { queryEmployees } from '../services/employeeService';
import { setUserLocked } from '../services/hoan-service';
import { Button, Field, Sheet, Table, ui } from './ui';
import { IconButton } from './icons';

export function EmployeeManagement({ actorId, query, onEdit, onChanged }: {
  actorId: string; query: string; onEdit: (employeeId: string) => void; onChanged: () => void;
}) {
  const [shift, setShift] = useState('');
  const [targetId, setTargetId] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [working, setWorking] = useState(false);
  const isAdmin = db.users.some(u => u.id === actorId && u.role === 'admin' && u.isActive);
  if (!isAdmin) return <Text accessibilityRole="alert" style={ui.error}>Chỉ quản trị viên được quản lý tài khoản nhân viên.</Text>;
  const rows = queryEmployees(actorId, { query, shift });
  const target = db.users.find(u => u.id === targetId);
  return <View style={{ gap: 12 }}>
    <Field label="Lọc ca làm" value={shift} onChange={setShift} />
    <Toast message={saved} onClose={()=>setSaved('')}/>
    <Table key={JSON.stringify([query, shift])} headings={['Nhân viên', 'Email', 'Số điện thoại', 'Ca / vị trí', 'Quyền / tài khoản', 'Thao tác']}
      rows={rows.map(employee => [employee.fullName, employee.email, employee.phone,
        `${employee.shift || 'Chưa phân ca'} · ${employee.position}`,
        employee.accountActive === undefined ? 'Chưa có tài khoản' : `${employee.accountRole === 'admin' ? 'Admin' : 'Nhân viên'} · ${employee.accountActive ? 'Đang hoạt động' : 'Đã khóa'}`,
        <View style={ui.row}><Button onPress={() => onEdit(employee.id)}>Sửa</Button>
          {employee.accountActive !== undefined && <IconButton name={employee.accountActive ? 'pause' : 'play'} label={employee.accountActive ? 'Khóa tài khoản' : 'Mở khóa'} onPress={() => { setError(''); setTargetId(employee.userId); }} />}
        </View>,
      ])} />
    {!!target && <Sheet title={target.isActive ? 'Khóa tài khoản nhân viên?' : 'Mở khóa tài khoản nhân viên?'} onClose={() => { if (!working) setTargetId(''); }}>
      <Text selectable style={ui.text}>{target.username} · {target.email}</Text>
      <Text style={ui.muted}>{target.isActive ? 'Tài khoản không đăng nhập được và phiên hiện có sẽ mất hiệu lực. Hồ sơ và hóa đơn được giữ nguyên.' : 'Tài khoản được phép đăng nhập lại. Phiên đã thu hồi không tự khôi phục.'}</Text>
      <Toast message={error} onClose={()=>setError('')}/>
      <Button primary disabled={working} onPress={() => {
        if (working) return;
        setWorking(true); setError('');
        try { const locked = target.isActive; setUserLocked(actorId, target.id, locked); setTargetId(''); setSaved(locked ? 'Đã khóa tài khoản và thu hồi phiên.' : 'Đã mở khóa tài khoản.'); onChanged(); }
        catch (e) { setError((e as Error).message); }
        finally { setWorking(false); }
      }}>Xác nhận</Button>
    </Sheet>}
  </View>;
}
