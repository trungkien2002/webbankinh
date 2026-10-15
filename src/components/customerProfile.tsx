import { Toast } from './toast';
import { loginDemo } from '../services/demoSession';
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Customer } from '../contracts/domain';
import { customerLogin, customerRegister, customerSession, customerLogout, updateCustomerProfile } from '../services/customerAccount';
import { Button, Field, ui, palette as p } from './ui';
import { AuthLayout } from './authLayout';
import { MemberDashboard } from './memberDashboard';
export function CustomerProfile({onCustomer}:{onCustomer:(customer:Customer|null)=>void}) {
  const [customer,setCustomer]=useState(customerSession),[register,setRegister]=useState(false),[form,setForm]=useState<Record<string,string>>({}),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{const verify=()=>{if(!customerSession())setCustomer(null);};const timer=setInterval(verify,15000);window.addEventListener('focus',verify);return()=>{clearInterval(timer);window.removeEventListener('focus',verify);};},[]);
  const field=(key:string,label:string,secure=false)=><Field label={label} value={form[key]||''} secure={secure} onChange={value=>setForm({...form,[key]:value})}/>;
  const auth=async()=>{setBusy(true);setNotice('');try{if(!register&&(form.account||'').trim().toLowerCase()==='b'){await loginDemo(form.account,form.password||'');window.location.hash='/admin';return;}const c=register?await customerRegister({name:form.name||'',email:form.account||'',phone:form.phone||'',password:form.password||''}):await customerLogin(form.account||'',form.password||'');setCustomer(c);onCustomer(c);setForm({});}catch(e){setNotice((e as Error).message);}finally{setBusy(false);}};
  if(!customer||!customerSession())return <AuthLayout title={register?'Tạo tài khoản Élan':'Chào mừng trở lại'}>{register&&<>{field('name','Họ và tên')}{field('phone','Số điện thoại')}</>}{field('account',register?'Email':'Tài khoản')}{field('password','Mật khẩu',true)}<Toast message={notice} onClose={()=>setNotice('')}/><Button primary disabled={busy} onPress={auth}>{busy?'Đang xử lý…':register?'Tạo tài khoản':'Đăng nhập'}</Button><Pressable accessibilityRole="button" onPress={()=>{setRegister(v=>!v);setNotice('');}} style={{paddingVertical:12}}><Text style={{textAlign:'center',color:p.green,fontSize:13}}>{register?'Đã có tài khoản? Đăng nhập':'Chưa có tài khoản? Đăng ký ngay'}</Text></Pressable></AuthLayout>;
  return <View style={{backgroundColor:'#f2f3ef',padding:16,borderRadius:18}}><Toast message={notice} onClose={()=>setNotice('')}/><MemberDashboard key={customer.id} customer={customer} onLogout={()=>{customerLogout();setCustomer(null);onCustomer(null);setNotice('');setRegister(false);}} onSave={value=>{try{const next=updateCustomerProfile(value);setCustomer(next);onCustomer(next);setNotice('Đã lưu thông tin.');}catch(e){setNotice((e as Error).message);}}}/></View>;
}
