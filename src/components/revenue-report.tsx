import React, {useState} from 'react';
import {Text,View} from 'react-native';
import {revenueReport,revenueRows,vnDay} from '../services/kien-service';
import {saleTrace,saleTime,paymentNames} from '../services/sale-trace';
import {downloadWorkbook} from '../services/spreadsheet-export';
import {Button,Choice,Field,Table,money,ui,palette} from './ui';
import {Toast} from './toast';
import {DateField,useDebounced} from './filter-controls';
const cell=(title:string,detail:string)=><View style={{gap:6,minWidth:0}}><Text selectable style={ui.label}>{title}</Text><Text selectable style={ui.muted}>{detail}</Text></View>;
export function RevenueReport({actorId,onDetail}:{actorId:string;onDetail:(id:string)=>void}){
 const today=vnDay(new Date().toISOString());
 const [from,setFrom]=useState(today.slice(0,7)+'-01'),[to,setTo]=useState(today),[period,setPeriod]=useState<'day'|'month'|'year'>('day'),[query,setQuery]=useState(''),[error,setError]=useState('');
 const search=useDebounced(query);let report:ReturnType<typeof revenueReport>|undefined,filterError='';
 try{report=revenueReport(actorId,from,to,period,search);}catch(e){filterError=(e as Error).message;}
 const bars=report?.timeline||[],max=Math.max(1,...bars.map(b=>b.value)),tax=report?.invoices.reduce((s,i)=>s+(i.taxAmount||0),0)||0,net=(report?.total||0)-tax;
 const groups=Object.entries(report?.groups||{}).filter(([label,value])=>label!=='Thuế'&&value>0);
 const periodLabel=(label:string)=>period==='day'?label.split('-').reverse().join('/'):period==='month'?label.split('-').reverse().join('/'):label;
 return <View style={{gap:22,minWidth:0}}>
  <View style={[ui.card,{gap:14}]}><Text style={ui.h2}>Báo cáo bán hàng</Text><Text style={ui.muted}>Chỉ hóa đơn đã thanh toán. Khoảng lọc theo ngày tạo đơn, giờ Việt Nam; giờ thu tiền được ghi riêng ở từng giao dịch.</Text>
   <View style={ui.row}><DateField label="Từ ngày" value={from} onChange={setFrom}/><DateField label="Đến ngày" value={to} onChange={setTo}/></View>
   <Field label="Tìm hóa đơn, khách hàng hoặc tài khoản" value={query} onChange={setQuery}/>
   <Choice label="Xem theo" value={period} onChange={v=>setPeriod(v as typeof period)} options={[{label:'Ngày',value:'day'},{label:'Tháng',value:'month'},{label:'Năm',value:'year'}]}/>
   <View style={ui.row}><Button onPress={()=>{setFrom(today.slice(0,7)+'-01');setTo(today);setQuery('');setPeriod('day');}}>Đặt lại bộ lọc</Button><Button disabled={!report} onPress={()=>{try{downloadWorkbook(revenueRows(report!),`bao-cao-ban-hang-${from}-${to}.xlsx`);}catch(e){setError((e as Error).message);}}}>Xuất Excel</Button></View>
   {!!filterError&&<Text accessibilityRole="alert" style={ui.error}>{filterError}</Text>}
  </View>
  {report&&<>
   <View style={[ui.row,{alignItems:'stretch'}]}>{[['Doanh thu chưa thuế',money(net),'Đã trừ giảm giá, gồm công mài'],['Thuế đã thu',money(tax),'Tách riêng khỏi doanh thu nhóm'],['Tổng tiền đã thu',money(report.total),`${report.invoices.length} hóa đơn đã thanh toán`]].map(([label,value,hint])=><View key={label} style={[ui.card,{flexGrow:1,flexBasis:230,gap:8}]}><Text style={ui.muted}>{label}</Text><Text style={[ui.h2,{color:palette.green}]}>{value}</Text><Text style={ui.muted}>{hint}</Text></View>)}</View>
   <View style={[ui.card,{gap:16}]}><Text style={ui.h2}>Tiền thu theo thời gian</Text><Text style={ui.muted}>Gồm thuế · {period==='day'?'Từng ngày':period==='month'?'Từng tháng':'Từng năm'} tạo hóa đơn</Text>{!bars.length&&<Text style={ui.muted}>Không có giao dịch phù hợp.</Text>}{bars.map(b=><View key={b.label} style={{gap:7}}><View style={[ui.row,{justifyContent:'space-between'}]}><Text style={ui.text}>{periodLabel(b.label)}</Text><Text style={ui.label}>{money(b.value)}</Text></View><View style={{height:12,backgroundColor:'#edf2e9',borderRadius:5,overflow:'hidden'}}><View style={{width:`${b.value/max*100}%`,height:12,backgroundColor:palette.green}}/></View></View>)}</View>
   <View style={[ui.card,{gap:15}]}><Text style={ui.h2}>Phân bổ doanh thu chưa thuế</Text><Text style={ui.muted}>Chỉ hiển thị nhóm có doanh thu. Giảm giá phân bổ theo tiền hàng; công mài thuộc Combo.</Text>{!groups.length&&<Text style={ui.muted}>Chưa có doanh thu theo nhóm.</Text>}{groups.map(([label,value])=><View key={label} style={{gap:7}}><View style={[ui.row,{justifyContent:'space-between'}]}><Text style={ui.text}>{label}</Text><Text style={ui.label}>{money(value)} · {net?Math.round(value/net*100):0}%</Text></View><View style={{height:10,backgroundColor:'#edf2e9',borderRadius:5,overflow:'hidden'}}><View style={{height:10,width:`${net?value/net*100:0}%`,backgroundColor:palette.green}}/></View></View>)}</View>
   <View style={{gap:12}}><Text style={ui.h2}>Nhật ký bán hàng · {report.invoices.length} hóa đơn</Text><Text style={ui.muted}>Người lập đơn và người thu tiền có thể khác nhau. Đơn cũ thiếu dữ liệu được ghi rõ, không suy đoán tài khoản.</Text>
    <Table key={`${from}|${to}|${search}`} headings={['Hóa đơn / thời gian','Người bán / tài khoản','Khách hàng','Thanh toán','Chi tiết']} rows={report.invoices.map(i=>{const t=saleTrace(i);return [<View style={{gap:7}}>{cell(i.invoiceCode,t.channel)}<Text style={ui.muted}>Tạo: {saleTime(i.createdAt)}</Text><Text style={ui.muted}>Thu tiền: {saleTime(i.paidAt)}</Text></View>,<View style={{gap:12}}>{cell(`Lập: ${t.seller}`,t.account)}{cell(`Thu: ${t.collector}`,t.collectorAccount)}</View>,cell(t.customer,t.phone),cell(money(i.totalAmount),`${paymentNames[i.paymentMethod]} · Thuế ${money(i.taxAmount||0)}`),<Button onPress={()=>onDetail(i.id)}>Chi tiết</Button>];})}/>
   </View>
  </>}
  <Toast message={error} onClose={()=>setError('')}/>
 </View>;
}
