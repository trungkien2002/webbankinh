import React, {useEffect,useState} from 'react';
import {View,Text} from 'react-native';
import {searchCategories} from '../../services/hoan-service';
import {db} from '../../services/database';
import {ui} from '../ui';
export type CategoryFilterProps={userId:string;revision:number;onResult:(ids:string[])=>void};
export function CategoryFilter({userId,revision,onResult}:CategoryFilterProps){
 const [query,setQuery]=useState('');const [material,setMaterial]=useState('');const [error,setError]=useState('');
 const materials=Array.from(new Set(db.categories.filter(c=>!c.isDeleted&&c.material).map(c=>c.material!))).sort();
 useEffect(()=>{const timer=setTimeout(()=>{try {const result=searchCategories(userId,{q:query,material});onResult(result.map(c=>c.id));setError('');}catch(e){setError((e as Error).message);onResult([]);}},300);return()=>clearTimeout(timer);},[userId,query,material,revision]);
 return <View style={{gap:8}}><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
 <input aria-label="Tìm phân loại" placeholder="Tìm phân loại (không dấu)..." value={query} onChange={e=>setQuery(e.target.value)} style={{flex:'1 1 190px',minWidth:0,padding:10,border:'1px solid #cad5c5',borderRadius:8}}/>
 <select aria-label="Lọc chất liệu" value={material} onChange={e=>setMaterial(e.target.value)} style={{flex:'1 1 150px',minWidth:0,padding:10,border:'1px solid #cad5c5',borderRadius:8}}><option value="">Mọi chất liệu</option>{materials.map(m=><option key={m}>{m}</option>)}</select>
 <button type="button" onClick={()=>{setQuery('');setMaterial('');}} style={{padding:10,borderRadius:8,border:'1px solid #cad5c5',background:'white'}}>Xóa lọc</button></View>
 {!!error&&<Text style={{color:'#a23932'}}>{error}</Text>}</View>;
}
