import React from 'react';
import { Platform } from 'react-native';
export function WebStyles() {
  if (Platform.OS !== 'web') return null;
  return <style>{`
    * { box-sizing: border-box; }
    html,body,#root { margin:0; width:100%; min-height:100%; }
    body { font-family:ElanSans,sans-serif; background:#faf9f6; overflow-x:hidden; }
    [role=button] { transition:background-color .18s ease,box-shadow .18s ease,transform .18s ease; }
    [role=button]:focus-visible { outline:2px solid #284e43; outline-offset:3px; }
    [role=button]:active { transform:scale(.98); }
    [data-testid=cart-toast] { animation:route-in .25s ease both; }
    [data-testid=route-content] { animation:route-in .28s ease both; }
    [data-testid=product-card] { transition:box-shadow .2s ease,transform .2s ease; }
    [data-testid=product-card]:hover { box-shadow:0 12px 30px #203d3012; transform:translateY(-3px); }
    @keyframes route-in { from { opacity:0; transform:translateY(9px); } to { opacity:1; transform:translateY(0); } }
    @media(max-width:599px) { [role=button] { min-height:42px; } }
    @media(prefers-reduced-motion:reduce) { *,*::before,*::after { animation:none!important; transition:none!important; } }
  `}</style>;
}
