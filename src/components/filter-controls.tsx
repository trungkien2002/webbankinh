import React,{useEffect,useState} from 'react';
import {Text,View} from 'react-native';
import {db} from '../services/database';
import {Button,ui,palette} from './ui';
export function useDebounced(value:string,delay=300){const [result,setResult]=useState(value);useEffect(()=>{const timer=setTimeout(()=>setResult(value),delay);return()=>clearTimeout(timer);},[value,delay]);return result;}
export function SelectField({label,value,options,onChange}:{label:string;value:string;options:{value:string;label:string}[];onChange:(v:string)=>void}){
  return <View style={{flexGrow:1,flexShrink:1,minWidth:160,gap:6}}><Text style={ui.label}>{label}</Text><select aria-label={label} value={value} onInput={e=>onChange(e.currentTarget.value)} onChange={e=>onChange(e.target.value)} style={{width:'100%',boxSizing:'border-box',minHeight:44,padding:10,border:'1px solid #c9d2c7',borderRadius:5,background:'#fff',color:palette.ink}}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></View>;
}
export function DateField({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){
  return <View style={{flexGrow:1,flexShrink:1,minWidth:160,gap:6,marginBottom:16}}><Text style={ui.label}>{label}</Text><input type="date" aria-label={label} value={value} onInput={e=>onChange(e.currentTarget.value)} onChange={e=>onChange(e.target.value)} style={{width:'100%',boxSizing:'border-box',minHeight:46,padding:10,border:'1px solid #c9d2c7',borderRadius:5,background:'#fff',color:palette.ink}}/></View>;
}
export type ProductFiltersValue={brand:string;shape:string;material:string};
export const emptyProductFilters:ProductFiltersValue={brand:'',shape:'',material:''};
export function ProductFilters({value,onChange,onReset}:{value:ProductFiltersValue;onChange:(v:ProductFiltersValue)=>void;onReset:()=>void}){
  return <View style={[ui.row,{alignItems:'flex-end',marginBottom:18}]}>{([['brand','Thương hiệu'],['shape','Dáng kính'],['material','Chất liệu']] as const).map(([field,label])=>{
    const options=[...new Set(db.products.filter(p=>!p.isDeleted).map(p=>p[field]?.trim()).filter((v):v is string=>!!v))].sort((a,b)=>a.localeCompare(b,'vi'));
    return <SelectField key={field} label={label} value={value[field]} onChange={v=>onChange({...value,[field]:v})} options={[{label:'Tất cả',value:''},...options.map(v=>({label:v,value:v}))]}/>;
  })}<Button onPress={onReset}>Xóa bộ lọc</Button></View>;
}
