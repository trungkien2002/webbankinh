import React,{useEffect,useRef,useState} from 'react';
import {Text,View} from 'react-native';
import {readExcel} from '../services/excel-reader';
import {commitCategoryImport,commitProductImport,previewCategoryImport,previewProductImport,importKeyFor} from '../services/hoan-service';
import {downloadWorkbook} from '../services/spreadsheet-export';
import {getDemoSession} from '../services/demoSession';
import {Button,Table,ui} from './ui';
import {Toast} from './toast';

export function ExcelImport({kind,actorId,onChanged}:{kind:'category'|'product';actorId:string;onChanged:()=>void}){
  const [sheet,setSheet]=useState<unknown[][]>(),[name,setName]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const request=useRef(0),lock=useRef(false);useEffect(()=>()=>{request.current++;},[]);
  const headers=kind==='category'?['Tên','Mô tả','Chất liệu']:['SKU','Barcode','Số lượng','Lô'];
  let preview:ReturnType<typeof previewCategoryImport>|ReturnType<typeof previewProductImport>|undefined;
  try{if(sheet)preview=kind==='category'?previewCategoryImport(actorId,sheet):previewProductImport(actorId,sheet);}catch{}
  const load=async(file?:File)=>{if(!file||lock.current)return;const ticket=++request.current;setSheet(undefined);setBusy(true);setError('');setName(file.name);
    try{const rows=await readExcel(file);if(ticket!==request.current)return;kind==='category'?previewCategoryImport(actorId,rows):previewProductImport(actorId,rows);setSheet(rows);}
    catch(e){if(ticket===request.current)setError((e as Error).message);}finally{if(ticket===request.current)setBusy(false);}};
  return <View style={[ui.card,{gap:12,marginBottom:18}]}><Text style={ui.h2}>Nhập {kind==='category'?'phân loại':'tồn kho / mã vạch'} từ Excel</Text>
    <Text style={ui.muted}>File .xlsx tối đa 10 MB, 10.000 dòng. {kind==='product'?'SKU phải có sẵn; số lượng được cộng vào tồn kho theo từng lô.':'Tên phân loại không trùng.'} Sửa hết lỗi trước khi xác nhận.</Text>
    <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void load(e.dataTransfer.files[0]);}} style={{padding:16,border:'1px dashed #9cafa0',borderRadius:8}}>
      <label>Kéo thả hoặc chọn file Excel <input aria-label={`File Excel ${kind==='category'?'phân loại':'tồn kho'}`} type="file" accept=".xlsx" disabled={busy} onChange={e=>{void load(e.target.files?.[0]);e.target.value='';}} style={{maxWidth:'100%'}}/></label>
    </div>
    <Button onPress={()=>downloadWorkbook([headers],kind==='category'?'mau-phan-loai.xlsx':'mau-nhap-ton.xlsx')}>Tải file mẫu</Button>
    {busy&&<Text style={ui.muted}>Đang đọc file…</Text>}{!!name&&<Text style={ui.muted}>{name}</Text>}
    {preview&&<><Text style={ui.label}>{preview.valid.length} dòng hợp lệ · {preview.errors.length} lỗi</Text>
      {!!preview.errors.length&&<Table headings={['Dòng','Lỗi']} rows={preview.errors.map(e=>[String(e.line),e.message])}/>}
      <Table headings={headers} rows={preview.valid.map(row=>'name' in row?[row.name,row.description,row.material||'']:[row.sku,row.barcode||'',String(row.quantity),row.lot||''])}/>
      <Button primary disabled={busy||!preview.valid.length||!!preview.errors.length} onPress={()=>{if(lock.current)return;lock.current=true;setBusy(true);try{
        if(getDemoSession()?.id!==actorId)throw new Error('Phiên đã hết hạn. Hãy đăng nhập lại.');
        const current=kind==='category'?previewCategoryImport(actorId,sheet!):previewProductImport(actorId,sheet!);if(current.errors.length)throw new Error('Dữ liệu đã thay đổi. Hãy kiểm tra lại file.');
        const key=importKeyFor(kind,current.valid);
        const result=kind==='category'?commitCategoryImport(actorId,current.valid as Parameters<typeof commitCategoryImport>[1],key):commitProductImport(actorId,current.valid as Parameters<typeof commitProductImport>[1],key);
        setMessage(result.duplicate?'File này đã được nhập, không ghi lặp.':`Đã nhập ${result.imported} dòng.`);setSheet(undefined);onChanged();
      }catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}}}>Xác nhận nhập</Button></>}
    <Toast message={error||message} onClose={()=>{setError('');setMessage('');}}/>
  </View>;
}
