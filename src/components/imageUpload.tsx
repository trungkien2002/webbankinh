import { Toast } from './toast';
import React, { useRef, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { Button, ui } from './ui';

export function ImageUpload({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return <View style={{ gap: 12, marginBottom: 20 }}><Text style={ui.label}>Ảnh sản phẩm</Text>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Tải ảnh sản phẩm từ máy" style={{ maxWidth: '100%', fontFamily: 'inherit' }} onChange={async e => {
      setError(''); const file = e.target.files?.[0]; if (!file) return;
      if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Chọn ảnh JPG, PNG hoặc WebP tối đa 5 MB.'); return; }
      setBusy(true);
      const url = URL.createObjectURL(file);
      try {
        const image = new window.Image(); image.src = url; await image.decode();
        const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width*scale); canvas.height = Math.round(image.height*scale);
        const context = canvas.getContext('2d'); if (!context) throw new Error('Không xử lý được ảnh.');
        context.fillStyle = '#fff'; context.fillRect(0,0,canvas.width,canvas.height); context.drawImage(image,0,0,canvas.width,canvas.height);
        onChange(canvas.toDataURL('image/jpeg', .82));
      } catch { setError('File ảnh không đọc được. Hãy chọn ảnh khác.'); }
      finally { URL.revokeObjectURL(url); setBusy(false); }
    }} />
    {busy && <Text style={ui.muted}>Đang xử lý ảnh…</Text>}
    <Toast message={error} onClose={() => setError('')} />
    {!!value && <><Image accessibilityLabel="Xem trước ảnh sản phẩm" source={{ uri: value }} resizeMode="contain" style={{ width: '100%', height: 170, backgroundColor: '#e9e9e9', borderRadius: 10 }} /><Button onPress={() => { onChange(''); if(input.current) input.current.value=''; }}>Xóa</Button></>}
  </View>;
}
