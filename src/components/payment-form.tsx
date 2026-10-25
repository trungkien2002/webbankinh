import React,{useEffect,useRef,useState} from 'react';
import {Image,Text,View} from 'react-native';
import QRCode from 'qrcode';
import {db} from '../services/database';
import {payInvoice} from '../services/hoan-service';
import {getDemoSession} from '../services/demoSession';
import {Button,Choice,Field,ui,money} from './ui';
import {Toast} from './toast';

export function PaymentForm({actorId,invoiceId,onPaid}:{actorId:string;invoiceId:string;onPaid:()=>void}){
  const [method,setMethod]=useState<'cash'|'transfer'|'qr'|'card'>('cash'),[cash,setCash]=useState(''),[reference,setReference]=useState(''),[qr,setQr]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const locked=useRef(false),key=useRef(`PAY-${crypto.randomUUID()}`),invoice=db.invoices.find(i=>i.id===invoiceId);
  useEffect(()=>{let active=true;setQr('');if(invoice&&method==='qr')QRCode.toDataURL(`ELAN-DEMO|${invoice.invoiceCode}|${invoice.totalAmount}|VND`,{width:240,margin:2,errorCorrectionLevel:'M'}).then(data=>{if(active)setQr(data);}).catch(()=>{if(active)setError('Không tạo được QR. Hãy thử lại.');});return()=>{active=false;};},[method,invoice?.totalAmount,invoiceId]);
  if(!invoice)return <Text style={ui.error}>Hóa đơn không tồn tại.</Text>;
  return <View style={{gap:16}}><Text style={ui.h2}>{invoice.invoiceCode} · {money(invoice.totalAmount)}</Text><Text style={ui.muted}>Tiền hàng {money(invoice.subtotal)} · Giảm {money(invoice.discountAmount)} · Công mài {money(invoice.assemblyFee||0)} · Thuế {invoice.taxRate||0}%: {money(invoice.taxAmount||0)}</Text>
    <Choice label="Phương thức thanh toán" value={method} onChange={v=>{setMethod(v as typeof method);setReference('');}} options={[{label:'Tiền mặt',value:'cash'},{label:'Chuyển khoản',value:'transfer'},{label:'QR',value:'qr'},{label:'Thẻ',value:'card'}]}/>
    {method==='cash'?<><Field label="Tiền khách đưa" value={cash} onChange={setCash}/><Text style={ui.label}>Tiền trả lại: {money(Math.max(0,Number(cash||0)-invoice.totalAmount))}</Text></>:<>
      <Text style={ui.muted}>Xác nhận thanh toán mô phỏng. Không kết nối ngân hàng và không nhập số thẻ, CVV hay thông tin thẻ thật.</Text>
      {method==='qr'&&(qr?<Image source={{uri:qr}} accessibilityLabel="QR thanh toán mô phỏng" style={{width:240,height:240,alignSelf:'center'}}/>:<Text>Đang tạo QR…</Text>)}
      <Field label="Mã tham chiếu mô phỏng" value={reference} onChange={setReference}/>
    </>}
    <Button primary disabled={busy||!['draft','pending'].includes(invoice.paymentStatus)||(method==='qr'&&!qr)} onPress={()=>{if(locked.current)return;locked.current=true;setBusy(true);try{
      if(getDemoSession()?.id!==actorId)throw new Error('Phiên đã hết hạn. Hãy đăng nhập lại.');
      if(method!=='cash'&&!reference.trim())throw new Error('Nhập mã tham chiếu mô phỏng để xác nhận.');
      payInvoice(actorId,invoiceId,{method,cashReceived:method==='cash'?Number(cash):undefined,idempotencyKey:key.current,reference:method==='cash'?undefined:reference.trim()});onPaid();
    }catch(e){setError((e as Error).message);}finally{locked.current=false;setBusy(false);}}}>Xác nhận thanh toán</Button>
    <Toast message={error} onClose={()=>setError('')}/>
  </View>;
}
