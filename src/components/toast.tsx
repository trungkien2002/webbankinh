import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { View, Text } from 'react-native';
import { IconButton } from './icons';
export function Toast({message,onClose}:{message:string;onClose:()=>void}) {
  const close=useRef(onClose);close.current=onClose;
  useEffect(()=>{if(!message)return;const timer=setTimeout(()=>close.current(),3000);return()=>clearTimeout(timer);},[message]);
  if(!message)return null;
  return createPortal(<View testID="notification-toast" accessibilityLiveRegion="polite" style={{position:'fixed',top:16,right:16,width:340,maxWidth:'calc(100vw - 32px)',zIndex:100000,backgroundColor:'#fff',borderWidth:1,borderColor:'#cad8c3',borderLeftWidth:4,borderLeftColor:'#284e43',borderRadius:12,padding:14,flexDirection:'row',alignItems:'center',gap:10,boxShadow:'0 8px 28px #203d3026'} as any}><Text style={{flex:1,fontSize:14,lineHeight:21,color:'#25342c'}}>{message}</Text><IconButton name="close" label="Đóng thông báo" onPress={onClose}/></View>,document.body);
}
