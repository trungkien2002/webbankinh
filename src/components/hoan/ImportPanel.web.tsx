import React, {useState} from 'react';
import {View, Text} from 'react-native';
import {Button, ui} from '../ui';
import {downloadExcelTemplate, readExcel} from './excel.web';
import {previewCategoryImport, previewProductImport, commitCategoryImport, commitProductImport, importKeyFor} from '../../services/hoan-service';

type Props = {userId: string; kind: 'category'|'product'; onCommitted: () => void};
type Preview = {valid: any[]; errors: {line:number; message:string}[]; totalRows:number};
export function ImportPanel({userId,kind,onCommitted}:Props) {
  const [preview,setPreview] = useState<Preview|null>(null);
  const [key,setKey] = useState('');
  const [message,setMessage] = useState('');
  const [busy,setBusy] = useState(false);
  const [filename,setFilename] = useState('');
  async function selected(file?: File) {
    setPreview(null);setKey('');setMessage('');setFilename(file?.name||'');
    if (!file) return;
    setBusy(true);
    try {
      const sheet = await readExcel(file);
      const p = kind==='category'?previewCategoryImport(userId,sheet):previewProductImport(userId,sheet);
      setPreview(p);setKey(importKeyFor(kind,p.valid));
      if (p.errors.length) setMessage('Có dòng lỗi. Hãy sửa file rồi chọn lại trước khi xác nhận.');
    } catch(e) {setMessage((e as Error).message);}
    finally {setBusy(false);}
  }
  return <View style={{gap:9,padding:12,borderWidth:1,borderColor:'#cad5c5',borderRadius:10,backgroundColor:'#fff'}}>
    <Text style={ui.label}>{kind==='category'?'Nhập phân loại Excel':'Nhập tồn kho theo lô (.xlsx)'}</Text>
    <Text style={ui.muted}>{kind==='category'?'Tên bắt buộc; Mô tả, Chất liệu tùy chọn.':'SKU và Số lượng bắt buộc; Barcode, Lô tùy chọn. Chỉ nhập SKU đã tồn tại.'}</Text>
    <View style={ui.row}><Button onPress={()=>downloadExcelTemplate(kind)}>Tải file mẫu .xlsx</Button></View>
    <input aria-label="Chọn file Excel" type="file" accept=".xlsx" disabled={busy} onChange={e=>{void selected(e.currentTarget.files?.[0]);e.currentTarget.value='';}} style={{maxWidth:'100%'}} />
    <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void selected(e.dataTransfer.files[0]);}} style={{border:'1px dashed #cad5c5',borderRadius:8,padding:12,color:'#284e43',fontSize:13}}>Hoặc kéo thả file .xlsx vào đây</div>
    {filename && <Text style={ui.muted}>File: {filename}</Text>}
    {preview && <View style={{gap:6}}><Text style={ui.text}>Tổng: {preview.totalRows} dòng · Hợp lệ: {preview.valid.length} · Lỗi: {preview.errors.length}</Text>
      {preview.errors.map((err,i)=><Text key={i} style={{color:'#a23932',fontSize:13}}>Dòng Excel {err.line}: {err.message}</Text>)}
      {preview.valid.slice(0,30).map((v,i)=><Text key={i} style={ui.muted}>{i+1}. {kind==='category'?`${v.name} · ${v.material||'—'}`:`${v.sku} · ${v.barcode||'—'} · +${v.quantity} · lô ${v.lot||'—'}`}</Text>)}
      {preview.valid.length>30&&<Text style={ui.muted}>Đang hiển thị 30 dòng hợp lệ đầu tiên.</Text>}
      <View style={ui.row}><Button onPress={()=>{setPreview(null);setKey('');setFilename('');setMessage('Đã hủy, chưa ghi dữ liệu.');}}>Hủy preview</Button>
      <Button primary disabled={busy||!!preview.errors.length||!preview.valid.length} onPress={()=>{
        setBusy(true);
        try {const result=kind==='category'?commitCategoryImport(userId,preview.valid,key):commitProductImport(userId,preview.valid,key);
          setMessage(result.duplicate?'Dữ liệu đã được nhập, không nhập lại.':`Đã nhập ${result.imported} dòng.`);setPreview(null);onCommitted();}
        catch(e){setMessage((e as Error).message);}finally{setBusy(false);}
      }}>Xác nhận nhập</Button></View>
    </View>}
    {!!message&&<Text style={{color:preview?.errors.length?'#a23932':'#284e43'}}>{message}</Text>}
  </View>;
}
