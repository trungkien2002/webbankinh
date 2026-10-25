import React from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { db } from '../services/database';
import { SearchPicker } from './searchPicker';
import { Choice, Field, ui, palette as p } from './ui';
import { Icon } from './icons';
import {DateField} from './filter-controls';

export function MeasurementForm({form,set,showCustomer=true}:{form:Record<string,string>;set:(key:string,value:string)=>void;showCustomer?:boolean}) {
  const {width}=useWindowDimensions();
  const customer=db.customers.find(c=>c.id===form.customerId);
  const field=(key:string,label:string)=><Field label={label} value={form[key]||''} onChange={v=>set(key,v)}/>;
  return <View style={{gap:18}}>
    {showCustomer&&<View style={[ui.card,{padding:18,gap:8}]}><View style={{flexDirection:'row',alignItems:'center',gap:9}}><Icon name="user"/><Text style={ui.h2}>Khách hàng của đơn</Text></View><SearchPicker label="Tìm khách hàng" value={form.customerId} onChange={v=>set('customerId',v)} options={[{label:'Khách vãng lai',value:''},...db.customers.map(c=>({label:`${c.fullName} · ${c.phone}`,value:c.id,search:c.customerCode}))]}/>{customer&&<View style={{backgroundColor:'#edf3e9',padding:12,borderRadius:8,gap:5}}><Text style={ui.label}>{customer.fullName} · {customer.customerCode}</Text><Text style={ui.muted}>{customer.phone}{customer.email?` · ${customer.email}`:''}</Text>{!!customer.address&&<Text style={ui.muted}>{customer.address}</Text>}</View>}</View>}
    <View style={{gap:10}}><View style={{flexDirection:'row',gap:9,alignItems:'center'}}><Icon name="eye"/><Text style={ui.h2}>Thông số cho đơn hàng</Text></View><Choice value={form.required||'no'} onChange={v=>set('required',v)} options={[{label:'Không kèm thông số',value:'no'},{label:'Nhập thông số đo mắt',value:'yes'}]}/></View>
    {form.required==='yes'&&<>
      <View style={{flexDirection:width<600?'column':'row',gap:14}}>{[{title:'Mắt phải (OD)',suffix:'Right'},{title:'Mắt trái (OS)',suffix:'Left'}].map(eye=><View key={eye.suffix} style={[ui.card,{flex:width<600?undefined:1,padding:16,gap:12}]}><Text style={[ui.h2,{fontSize:18,color:p.green}]}>{eye.title}</Text><View style={{flexDirection:'row',gap:8}}>{[['sphere','SPH'],['cylinder','CYL'],['axis','AXIS']].map(([key,label])=><View key={key} style={{flex:1,minWidth:0}}>{field(key+eye.suffix,label+(eye.suffix==='Right'?' phải':' trái'))}</View>)}</View></View>)}</View>
      <View style={[ui.card,{padding:16,gap:10}]}><Text style={[ui.h2,{fontSize:18}]}>Thông tin lần đo</Text><View style={{flexDirection:width<600?'column':'row',gap:14}}><View style={{flex:width<600?undefined:1}}>{field('pupillaryDistance','PD · Khoảng cách đồng tử (mm)')}</View><View style={{flex:width<600?undefined:1}}><DateField label="Ngày đo" value={form.measuredAt||''} onChange={v=>set('measuredAt',v)}/></View></View>{field('notes','Ghi chú lần đo')}</View>
      <Text style={[ui.muted,{fontSize:12}]}>SPH: độ cầu · CYL: độ trụ · AXIS: trục. Giới hạn nhập: SPH −30…30 · CYL −10…10 · AXIS 0…180° · PD 40…80 mm.</Text>
    </>}
  </View>;
}
