import React, { useEffect, useState } from 'react';
import { Asset } from 'expo-asset';
import { Image, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Product } from '../contracts/domain';
import { catalogImage } from './catalogAssets';
import { galleryAssets } from './galleryAssets';
import { palette as p, ui } from './ui';

export function ProductGallery({ product }: { product: Product }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [holding, setHolding] = useState(false);
  const [point, setPoint] = useState({ x: 50, y: 50 });
  const images = [{ label: 'Mặt trước', uri: catalogImage(product.id) || product.imageUrl }, ...(product.imageOverride ? [] : galleryAssets[product.sku] || []).map(v => ({ label: v.label, uri: Asset.fromModule(v.asset).uri }))];
  useEffect(() => { setIndex(0); setHolding(false); }, [product.id]);
  const active = images[Math.min(index, images.length - 1)];
  const height = width < 600 ? 290 : width < 1000 ? 370 : 490;
  return <View style={{ gap: 14, minWidth: 0 }}>
    <div role="img" aria-label={`${product.name} · ${active.label}`} tabIndex={0}
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); const r = e.currentTarget.getBoundingClientRect(); setPoint({ x: (e.clientX-r.left)/r.width*100, y: (e.clientY-r.top)/r.height*100 }); setHolding(true); }}
      onPointerMove={e => { if (!holding) return; const r = e.currentTarget.getBoundingClientRect(); setPoint({ x: Math.max(0, Math.min(100, (e.clientX-r.left)/r.width*100)), y: Math.max(0, Math.min(100, (e.clientY-r.top)/r.height*100)) }); }}
      onBlur={() => setHolding(false)} onPointerUp={() => setHolding(false)} onPointerCancel={() => setHolding(false)} onLostPointerCapture={() => setHolding(false)}
      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setHolding(v => !v); } }}
      style={{ height, borderRadius: 16, overflow: 'hidden', background: product.productType === 'Tròng kính' ? '#fff' : '#e9e9e9', cursor: holding ? 'zoom-out' : 'zoom-in', touchAction: holding ? 'none' : 'pan-y', position: 'relative' }}>
      <img src={active.uri} alt={`${product.name} · ${active.label}`} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: product.productType === 'Tròng kính' ? 'normal' : 'darken', transform: holding ? 'scale(2.6)' : 'scale(1)', transformOrigin: `${point.x}% ${point.y}%`, transition: holding ? 'none' : 'transform 220ms ease', userSelect: 'none' }} />
    </div>
    <View style={{ flexDirection: 'row', gap: 12 }}>{images.map((v, i) => <Pressable key={v.label} accessibilityRole="button" accessibilityLabel={`Ảnh ${v.label}`} accessibilityState={{ selected: index === i }} onPress={() => { setIndex(i); setHolding(false); }} style={{ flex: 1, maxWidth: 150, borderRadius: 10, padding: 4, borderWidth: 2, borderColor: index === i ? p.green : p.line, backgroundColor: '#fff' }}><Image source={{ uri: v.uri }} resizeMode="contain" style={{ height: 78, width: '100%', backgroundColor: '#e9e9e9' }} /><Text style={[ui.muted, { textAlign: 'center', fontSize: 11, marginTop: 5 }]}>{v.label}</Text></Pressable>)}</View>
    <Text style={ui.muted}>Giữ ảnh để phóng to theo con trỏ. Trên điện thoại, giữ và kéo để xem chi tiết.</Text>
  </View>;
}
