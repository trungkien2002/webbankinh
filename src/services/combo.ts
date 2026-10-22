import { Invoice, InvoiceCombo, InvoiceItem } from '../contracts/domain';
import { db } from './database';

export const ASSEMBLY_UNIT_FEE = 50_000;
export function itemQuantities(items: InvoiceItem[]) {
  return items.reduce<Record<string,number>>((result,item) => { result[item.productId] = (result[item.productId] || 0) + item.quantity; return result; },{});
}
export function buildDraftItems(quantities: Record<string,number>, previous: Invoice, proposed = previous.combos || []) {
  const remaining = {...quantities};
  for (const [id, quantity] of Object.entries(remaining)) {
    const product = db.products.find(p=>p.id===id&&!p.isDeleted);
    if (!product || !Number.isInteger(quantity) || quantity <= 0 || quantity > product.stock) throw new Error('Sản phẩm hoặc số lượng không hợp lệ, vượt tồn kho.');
  }
  const items: InvoiceItem[] = [], combos: InvoiceCombo[] = [];
  // Reducing/removing a component unlinks its combo and removes the associated fee.
  for (const combo of proposed) {
    if ((remaining[combo.frameId] || 0) < combo.quantity || (remaining[combo.lensId] || 0) < combo.quantity) continue;
    combos.push(combo);
    for (const [productId,unitPrice] of [[combo.frameId,combo.framePrice],[combo.lensId,combo.lensPrice]] as [string,number][]) {
      const product = db.products.find(p=>p.id===productId)!;
      const old = previous.items.find(i=>i.comboId===combo.id&&i.productId===productId);
      items.push({id:`${combo.id}-${productId}`,productId,productName:old?.productName||product.name,sku:old?.sku||product.sku,
        productTypeSnapshot:old?.productTypeSnapshot||product.productType,comboId:combo.id,unitPrice,quantity:combo.quantity,lineTotal:unitPrice*combo.quantity});
      remaining[productId] -= combo.quantity;
    }
  }
  for (const [productId, quantity] of Object.entries(remaining)) {
    if (!quantity) continue;
    const product = db.products.find(p=>p.id===productId)!;
    items.push({id:`line-${productId}`,productId,productName:product.name,sku:product.sku,productTypeSnapshot:product.productType,
      unitPrice:product.price,quantity,lineTotal:product.price*quantity});
  }
  return {items,combos,assemblyFee:combos.reduce((s,c)=>s+c.quantity*c.assemblyUnitFee,0)};
}
