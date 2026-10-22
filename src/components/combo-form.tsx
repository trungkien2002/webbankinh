import React,{useState} from 'react';
import {Text,View} from 'react-native';
import {db} from '../services/database';
import {addDraftCombo} from '../services/bao-service';
import {ASSEMBLY_UNIT_FEE} from '../services/combo';
import {Button,Field,ui,money,palette} from './ui';
import {Toast} from './toast';

export function ComboForm({actorId,invoiceId,onSaved}:{actorId:string;invoiceId:string;onSaved:()=>void}) {
  const [frame,setFrame]=useState(''),[lens,setLens]=useState(''),[quantity,setQuantity]=useState('1'),[error,setError]=useState('');
  const invoice=db.invoices.find(i=>i.id===invoiceId);
  const frameProduct=db.products.find(p=>p.id===frame),lensProduct=db.products.find(p=>p.id===lens);
  return <View style={{gap:16}}>
    <Text style={ui.muted}>Một combo = một gọng + một đôi tròng. Công mài cố định {money(ASSEMBLY_UNIT_FEE)}/combo; voucher chỉ giảm tiền hàng.</Text>
    <View style={[ui.card,{gap:8}]}><Text style={ui.label}>Số đo của đơn</Text><Text style={ui.text}>{invoice?.prescription?`Phải: SPH ${invoice.prescription.sphereRight} / CYL ${invoice.prescription.cylinderRight} / AXIS ${invoice.prescription.axisRight}°\nTrái: SPH ${invoice.prescription.sphereLeft} / CYL ${invoice.prescription.cylinderLeft} / AXIS ${invoice.prescription.axisLeft}°\nPD ${invoice.prescription.pupillaryDistance} mm · ${invoice.prescription.measuredAt}`:'Chưa có số đo. Đóng form và lưu khách hàng / thông số đo mắt trước.'}</Text></View>
    {(['Gọng kính','Tròng kính'] as const).map((type,index)=><View key={type} style={{gap:7}}><Text style={ui.label}>{type}{index===1?' (giá/đôi)':''}</Text><select aria-label={index===0?'Gọng cho combo':'Tròng cho combo'} value={index===0?frame:lens} onChange={e=>(index===0?setFrame:setLens)(e.target.value)} style={{width:'100%',minHeight:46,padding:10,border:'1px solid #c9d2c7',borderRadius:5,background:'#fff',color:palette.ink}}><option value="">Chọn {type.toLowerCase()}</option>{db.products.filter(p=>!p.isDeleted&&p.productType===type).map(p=><option key={p.id} value={p.id} disabled={p.stock<1}>{p.sku} · {p.name} · {money(p.price)} · Tồn {p.stock}</option>)}</select></View>)}
    <Field label="Số combo" value={quantity} onChange={setQuantity}/>
    {frameProduct&&lensProduct&&Number.isInteger(Number(quantity))&&Number(quantity)>0&&<Text style={ui.h2}>Tạm tính: {money((frameProduct.price+lensProduct.price+ASSEMBLY_UNIT_FEE)*Number(quantity))}</Text>}
    <Button primary iconOnly={false} disabled={!invoice?.prescription} onPress={()=>{try{addDraftCombo(actorId,invoiceId,frame,lens,Number(quantity));onSaved();}catch(e){setError((e as Error).message);}}}>Thêm combo vào đơn</Button>
    <Toast message={error} onClose={()=>setError('')}/>
  </View>;
}
