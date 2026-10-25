import React from 'react';
import {createPortal} from 'react-dom';
import {Invoice} from '../contracts/domain';
import {vietnamInvoiceDate} from '../services/invoice-list';
import {money,Button} from './ui';
export function ThermalReceipt({invoice,onClose}:{invoice:Invoice;onClose:()=>void}){
  return createPortal(<div id="elan-thermal" role="dialog" aria-label="Hóa đơn in 80mm" aria-modal="true" style={{position:'fixed',inset:0,zIndex:100001,overflow:'auto',background:'#e9e9e9',padding:16}}>
    <style>{`#elan-thermal article{width:80mm;max-width:100%;box-sizing:border-box;background:white;margin:16px auto;padding:3mm;font:12px Arial;color:#111;overflow-wrap:anywhere}#elan-thermal table{width:100%;border-collapse:collapse}#elan-thermal td{padding:5px 2px;border-bottom:1px dashed #aaa}#elan-thermal h2{font-size:16px}#elan-thermal p{line-height:1.5}@media print{@page{size:80mm 297mm;margin:3mm}body>*{display:none!important}body>#elan-thermal{display:block!important;position:static!important;background:#fff!important;padding:0!important;overflow:visible!important}#elan-thermal article{width:74mm;max-width:none;margin:0;padding:0}.thermal-controls{display:none!important}}`}</style>
    <div className="thermal-controls" style={{display:'flex',gap:12,justifyContent:'center'}}><Button onPress={onClose}>Đóng</Button><Button primary onPress={()=>window.print()}>In / Lưu PDF</Button></div>
    <article><h2>ÉLAN / STUDIO</h2><h3>{invoice.invoiceCode}</h3><p>{vietnamInvoiceDate(invoice.createdAt)}<br/>{invoice.paymentStatus==='paid'?'Đã thanh toán':'Chưa thanh toán'}<br/>Khách: {invoice.customerName||'Khách vãng lai'}<br/>Nhân viên: {invoice.employeeName}</p>
      <table><thead><tr><th>Sản phẩm</th><th>SL</th><th>Tiền</th></tr></thead><tbody>{invoice.items.map(i=><tr key={i.id}><td>{i.productName}<br/>{i.sku}{i.comboId?' · Combo':''}</td><td>{i.quantity}</td><td style={{textAlign:'right'}}>{money(i.lineTotal)}</td></tr>)}</tbody></table>
      <p>Tiền hàng: {money(invoice.subtotal)}<br/>Giảm giá: {money(invoice.discountAmount)}<br/>Công mài: {money(invoice.assemblyFee||0)}<br/>Thuế {invoice.taxRate||0}%: {money(invoice.taxAmount||0)}</p><h2>Tổng: {money(invoice.totalAmount)}</h2><p>Phương thức: {({cash:'Tiền mặt',transfer:'Chuyển khoản',qr:'QR mô phỏng',card:'Thẻ mô phỏng'})[invoice.paymentMethod]}</p>
      {invoice.prescription&&<p>Số đo {invoice.prescription.measuredAt}<br/>Phải: {invoice.prescription.sphereRight} / {invoice.prescription.cylinderRight} / {invoice.prescription.axisRight}°<br/>Trái: {invoice.prescription.sphereLeft} / {invoice.prescription.cylinderLeft} / {invoice.prescription.axisLeft}°<br/>PD: {invoice.prescription.pupillaryDistance} mm</p>}
      <p>Cảm ơn bạn đã chọn Élan.</p>
    </article>
  </div>,document.body);
}
