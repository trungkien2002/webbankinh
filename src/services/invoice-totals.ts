export const DEMO_TAX_RATE = 10;
export function invoiceTotals(subtotal: number, discountAmount: number, assemblyFee = 0, taxRate = 0) {
  if (![subtotal,discountAmount,assemblyFee,taxRate].every(Number.isFinite) || subtotal<0 || discountAmount<0 || discountAmount>subtotal || assemblyFee<0 || taxRate<0 || taxRate>100)
    throw new Error('Số tiền hoặc tỷ lệ thuế không hợp lệ.');
  const taxAmount = Math.round((subtotal-discountAmount+assemblyFee)*taxRate/100);
  return {taxRate,taxAmount,totalAmount:subtotal-discountAmount+assemblyFee+taxAmount};
}
