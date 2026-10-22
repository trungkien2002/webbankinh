import React, {useEffect,useRef,useState} from 'react';
import {Text,View} from 'react-native';
import JsBarcode from 'jsbarcode';
import {createPortal} from 'react-dom';
import {db} from '../services/database';
import {assignBarcode,staff} from '../services/kien-service';
import {Button,Field,ui,money} from './ui';
import {Toast} from './toast';

export function BarcodeLabel({actorId,productId,onSaved}:{actorId:string;productId:string;onSaved:()=>void}) {
  const product=db.products.find(p=>p.id===productId&&!p.isDeleted);
  const [code,setCode]=useState(product?.barcode||''),[count,setCount]=useState('1'),[error,setError]=useState('');
  const svg=useRef<SVGSVGElement>(null);
  const [preview,setPreview]=useState(0);
  useEffect(()=>{if(svg.current&&product) { try {JsBarcode(svg.current,product.barcode||product.sku,{format:'CODE128',width:2,height:55,fontSize:16,margin:12});}catch{setError('Mã sản phẩm không hỗ trợ in CODE128.');}}},[product?.barcode,product?.sku]);
  if(!product) return <Text style={ui.error}>Sản phẩm không tồn tại.</Text>;
  const print=()=>{
    try {
      staff(actorId,true);const copies=Number(count);
      if(!Number.isInteger(copies)||copies<1||copies>100) throw new Error('Số tem từ 1 đến 100.');
      if(!svg.current?.querySelector('rect')) throw new Error('Chưa tạo được mã vạch.');
      setPreview(copies);
    }catch(e){setError((e as Error).message);}
  };
  return <View style={{gap:14}}>{preview>0&&createPortal(<div id="elan-label-print" role="dialog" aria-label="Bản in tem sản phẩm" aria-modal="true" style={{position:'fixed',inset:0,zIndex:100000,background:'#faf9f6',overflow:'auto',padding:20}}><style>{`@media print{@page{size:A4;margin:10mm}body> *{display:none!important}body>#elan-label-print{display:block!important;position:static!important;overflow:visible!important;padding:0!important;background:#fff!important}.elan-tem-controls{display:none!important}.elan-label{border:0!important}}`}</style><div className="elan-tem-controls" style={{display:'flex',gap:12,paddingBottom:20}}><Button onPress={()=>setPreview(0)}>Đóng</Button><Button primary onPress={()=>window.print()}>In / Lưu PDF</Button></div><div style={{display:'flex',flexWrap:'wrap',gap:'3mm'}}>{Array.from({length:preview},(_,i)=><section key={i} className="elan-label" style={{width:'68mm',minHeight:'35mm',padding:'3mm',boxSizing:'border-box',border:'1px solid #ddd',background:'#fff',textAlign:'center',breakInside:'avoid',font:'12px Arial'}}><p>ÉLAN / STUDIO</p><p>{product.name}</p><p>{product.sku} · {money(product.price)}</p><LabelSvg value={product.barcode||product.sku}/></section>)}</div></div>,document.body)}<Text style={ui.h2}>{product.name}</Text><Field label="Mã vạch" value={code} onChange={setCode}/><Text style={ui.muted}>Mã duy nhất cho mỗi sản phẩm. Nếu chưa gán mã vạch, tem dùng SKU hiện có.</Text><Button primary onPress={()=>{try{assignBarcode(actorId,productId,code);onSaved();}catch(e){setError((e as Error).message);}}}>Lưu mã vạch</Button><View style={{alignItems:'center',backgroundColor:'#fff'}}><svg ref={svg} role="img" aria-label={`Mã vạch ${product.barcode||product.sku}`} style={{maxWidth:'100%',height:'auto'}}/></View><Field label="Số tem" value={count} onChange={setCount}/><Button onPress={print}>Xem bản in tem</Button><Toast message={error} onClose={()=>setError('')}/></View>;
}

function LabelSvg({value}:{value:string}) {
  const ref=useRef<SVGSVGElement>(null);
  useEffect(()=>{if(ref.current) JsBarcode(ref.current,value,{format:'CODE128',width:2,height:55,fontSize:16,margin:12});},[value]);
  return <svg ref={ref} role="img" aria-label={`Mã vạch ${value}`} style={{width:'100%',height:'20mm'}}/>;
}
