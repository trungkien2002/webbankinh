import { Invoice } from '../contracts/domain';
export async function printInvoice(_invoice: Invoice): Promise<void> {
  throw new Error('In/PDF có trên bản web. Mở ứng dụng bằng trình duyệt để in.');
}
