import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { revenueReport, revenueRows, vnDay } from '../services/kien-service';
import { downloadWorkbook } from '../services/spreadsheet-export';
import { Button, Choice, Table, money, ui, palette } from './ui';
import { Toast } from './toast';

export function RevenueReport({actorId}:{actorId:string}) {
  const today=vnDay(new Date().toISOString());
  const [from,setFrom]=useState(today.slice(0,7)+'-01'),[to,setTo]=useState(today),[period,setPeriod]=useState<'day'|'month'|'year'>('day');
  const [error,setError]=useState('');
  let report:ReturnType<typeof revenueReport>|undefined, filterError='';
  try {report=revenueReport(actorId,from,to,period);} catch(e) {filterError=(e as Error).message;}
  const bars=report?.timeline||[], max=Math.max(1,...bars.map(b=>b.value));
  return <View style={{gap:20,minWidth:0}}>
    <View style={[ui.card,{gap:12}]}><Text style={ui.h2}>Doanh thu theo thời gian</Text><View style={ui.row}>{[['Từ ngày',from,setFrom],['Đến ngày',to,setTo]].map(([label,value,set])=><View key={label as string} style={{flexGrow:1,minWidth:160}}><Text style={ui.label}>{label as string}</Text><input type="date" aria-label={label as string} value={value as string} onChange={e=>(set as (v:string)=>void)(e.target.value)} style={{width:'100%',boxSizing:'border-box',minHeight:44,padding:10,border:'1px solid #c9d2c7',borderRadius:5,background:'#fff',color:palette.ink}}/></View>)}</View>
      <Choice label="Gộp theo" value={period} onChange={v=>setPeriod(v as typeof period)} options={[{label:'Ngày',value:'day'},{label:'Tháng',value:'month'},{label:'Năm',value:'year'}]}/>
      <Text style={ui.muted}>Chỉ đơn đã thanh toán; lọc theo ngày tạo hóa đơn, giờ Việt Nam, cùng cơ sở với danh sách hóa đơn. Giảm giá phân bổ theo tiền hàng; công mài thuộc Combo. Đơn cũ dùng loại sản phẩm hiện có nếu chưa có snapshot.</Text>
      {!!filterError&&<Text accessibilityRole="alert" style={ui.error}>{filterError}</Text>}
      <Text style={ui.h2}>{report ? money(report.total) : '—'} · {report?.invoices.length||0} hóa đơn</Text>
      <Button disabled={!report} onPress={()=>{try {downloadWorkbook(revenueRows(report!),`doanh-thu-${from}-${to}.xlsx`);}catch(e){setError((e as Error).message);}}}>Xuất Excel</Button>
    </View>
    {report&&<><View style={[ui.card,{gap:16}]}><Text style={ui.h2}>Biểu đồ doanh thu</Text>{!bars.length&&<Text style={ui.muted}>Chưa có hóa đơn đã thanh toán trong khoảng này.</Text>}{bars.map(b=><View key={b.label} accessibilityLabel={`${b.label}: ${money(b.value)}`} style={{gap:6}}><View style={[ui.row,{justifyContent:'space-between'}]}><Text style={ui.text}>{b.label}</Text><Text style={ui.label}>{money(b.value)}</Text></View><View style={{height:14,backgroundColor:'#edf2e9',borderRadius:5,overflow:'hidden'}}><View style={{width:`${b.value/max*100}%`,height:14,backgroundColor:palette.green}}/></View></View>)}</View>
      <View style={[ui.card,{gap:14}]}><Text style={ui.h2}>Doanh thu theo nhóm</Text>{Object.entries(report.groups).map(([label,value])=><View key={label} accessibilityLabel={`${label}: ${money(value)}`} style={{gap:6}}><View style={[ui.row,{justifyContent:'space-between'}]}><Text style={ui.text}>{label}</Text><Text style={ui.label}>{money(value)}</Text></View><View style={{height:12,backgroundColor:'#edf2e9',borderRadius:5,overflow:'hidden'}}><View style={{height:12,width:`${report.total ? value/report.total*100 : 0}%`,backgroundColor:palette.green}}/></View></View>)}</View>
      <Table headings={['Nhóm sản phẩm','Doanh thu']} rows={Object.entries(report.groups).map(([label,value])=>[label,money(value)])}/>
      <Table headings={['Hóa đơn','Ngày tạo (VN)','Thành tiền']} rows={report.invoices.map(i=>[i.invoiceCode,vnDay(i.createdAt),money(i.totalAmount)])}/></>}
    <Toast message={error} onClose={()=>setError('')}/>
  </View>;
}
