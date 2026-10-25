import React from 'react';
import {Text,View} from 'react-native';
import {Invoice} from '../contracts/domain';
import {saleTrace,saleTime,paymentNames} from '../services/sale-trace';
import {ui} from './ui';
export function SaleDetails({invoice,internal=false}:{invoice:Invoice;internal?:boolean}){
 const trace=saleTrace(invoice);
 const fields=[['Khách hàng',trace.customer],['Điện thoại',trace.phone],['Kênh bán',trace.channel],['Nhân viên lập đơn',trace.seller],
 ...(internal?[['Tài khoản lập đơn',trace.account]]:[]),['Nhân viên thu tiền',invoice.paymentStatus==='paid'?trace.collector:'Chưa thanh toán'],
 ...(internal?[['Tài khoản thu tiền',invoice.paymentStatus==='paid'?trace.collectorAccount:'Chưa thanh toán']]:[]),['Phương thức',paymentNames[invoice.paymentMethod]]];
 return <View style={{gap:16}}><View style={[ui.card,{backgroundColor:'#f0f4ee',gap:12}]}><Text style={ui.h2}>Thông tin bán hàng</Text><View style={[ui.row,{alignItems:'flex-start'}]}>{fields.map(([label,value])=><View key={label} style={{flexGrow:1,flexBasis:220,minWidth:0,gap:4}}><Text style={ui.muted}>{label}</Text><Text selectable style={ui.label}>{value}</Text></View>)}</View></View>
 <View style={{gap:9}}><Text style={ui.label}>Nhật ký hóa đơn · Giờ Việt Nam</Text><Text selectable style={ui.text}>● Tạo đơn: {saleTime(invoice.createdAt)}</Text><Text selectable style={ui.text}>{invoice.paymentStatus==='paid'?'● Thanh toán: '+saleTime(invoice.paidAt):'○ Chưa thanh toán'}</Text></View></View>;
}
