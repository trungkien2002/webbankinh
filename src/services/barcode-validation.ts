import {db} from './database';
export function validateBarcode(value: string, productId?: string) {
  const barcode = value.trim();
  if (barcode && !/^[A-Za-z0-9_-]{1,48}$/.test(barcode)) throw new Error('Mã vạch gồm 1–48 chữ, số, dấu _ hoặc -.');
  if (barcode && db.products.some(p => !p.isDeleted && p.id !== productId && p.barcode?.toUpperCase() === barcode.toUpperCase()))
    throw new Error('Mã vạch đã gắn với sản phẩm khác.');
  return barcode;
}
