import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Category } from '../contracts/domain';
import { listCategories, CategorySort } from '../services/kien-service';
import { Button, Choice, Table, ui, palette } from './ui';

export function CategoryList({ actorId, query, revision, onDetail, onEdit, onDelete, admin }: {
  actorId: string; query: string; revision: number; admin: boolean;
  onDetail: (id: string) => void; onEdit: (id: string) => void; onDelete: (category: Category) => void;
}) {
  const [sort,setSort] = useState<CategorySort>('name-asc');
  const [rows,setRows] = useState<Category[]>([]), [loading,setLoading] = useState(true), [error,setError] = useState(''), [retry,setRetry] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    listCategories(actorId,query,sort).then(data => { if (active) setRows(data); })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  },[actorId,query,sort,revision,retry]);
  return <View style={{gap:12}}>
    <Choice label="Sắp xếp phân loại" value={sort} onChange={v=>setSort(v as CategorySort)} options={[
      {label:'Tên A–Z',value:'name-asc'},{label:'Tên Z–A',value:'name-desc'},{label:'Mới nhất',value:'newest'}]} />
    {loading ? <View accessibilityRole="progressbar"><ActivityIndicator color={palette.green}/><Text style={ui.muted}>Đang tải phân loại…</Text></View>
      : error ? <View><Text style={ui.error}>{error}</Text><Button onPress={()=>setRetry(n=>n+1)}>Thử lại</Button></View>
      : <Table key={`${query}|${sort}`} headings={['Phân loại','Mô tả','Thao tác']} rows={rows.map(c=>[c.name,c.description,
        <View style={ui.row}><Button onPress={()=>onDetail(c.id)}>Chi tiết</Button>{admin&&<><Button onPress={()=>onEdit(c.id)}>Sửa</Button><Button onPress={()=>onDelete(c)}>Xóa</Button></>}</View>])}/>}
  </View>;
}
