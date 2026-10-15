import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { ui, palette as p } from './ui';
export function SearchPicker({label,value,options,onChange}:{label:string;value:string;options:{value:string;label:string;search?:string}[];onChange:(v:string)=>void}) {
  const [query,setQuery]=useState(''),[open,setOpen]=useState(false);
  const chosen=options.find(v=>v.value===value);
  const matches=options.filter(v=>(v.label+' '+(v.search||'')).toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')));
  return <View style={{gap:8,marginBottom:16}}><Text style={ui.label}>{label}</Text><TextInput accessibilityLabel={label} value={open?query:chosen?.label||'Khách vãng lai'} placeholder="Tìm tên, số điện thoại, mã khách…" onFocus={()=>{setQuery('');setOpen(true);}} onChangeText={setQuery} style={{borderWidth:1,borderColor:p.line,borderRadius:8,padding:12,fontSize:14,minHeight:44,backgroundColor:'#fff'}}/>{open&&<View style={{borderWidth:1,borderColor:p.line,borderRadius:8,overflow:'hidden',backgroundColor:'#fff'}}>{matches.slice(0,6).map(v=><Pressable key={v.value} accessibilityRole="button" onPress={()=>{onChange(v.value);setOpen(false);}} style={{padding:12,borderBottomWidth:1,borderColor:p.line,backgroundColor:v.value===value?'#eaf1e5':'#fff'}}><Text style={{fontSize:13,color:p.green}}>{v.label}</Text></Pressable>)}{!matches.length&&<Text style={[ui.muted,{padding:12}]}>Không tìm thấy khách hàng.</Text>}{matches.length>6&&<Text style={[ui.muted,{padding:10,fontSize:12}]}>Nhập thêm để thu hẹp {matches.length} kết quả.</Text>}<Pressable accessibilityRole="button" onPress={()=>setOpen(false)} style={{padding:10}}><Text style={{fontSize:12,color:p.green}}>Thu gọn</Text></Pressable></View>}</View>;
}
