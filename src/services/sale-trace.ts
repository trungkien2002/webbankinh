import {Invoice,SaleActorSnapshot} from '../contracts/domain';
import {db} from './database';
export function saleActor(userId:string):SaleActorSnapshot {
 const user=db.users.find(u=>u.id===userId&&u.isActive);
 if(!user)throw new Error('Tài khoản bán hàng không hợp lệ.');
 return {userId:user.id,account:user.username||user.email,employeeName:db.employees.find(e=>e.userId===userId)?.fullName||user.username};
}
export function saleTrace(invoice:Invoice){
 return {seller:invoice.createdBy?.employeeName||invoice.employeeName||'Chưa ghi nhận',
 account:invoice.createdBy?.account||(invoice.employeeId==='ONLINE'?'Đơn trực tuyến':'Chưa lưu tài khoản'),
 collector:invoice.paidBy?.employeeName||'Chưa ghi nhận',collectorAccount:invoice.paidBy?.account||'Chưa lưu tài khoản',
 customer:invoice.customerName||'Khách vãng lai',phone:invoice.customerPhone||'Không cung cấp',
 channel:invoice.employeeId==='ONLINE'?'Trực tuyến':'Tại quầy'};
}
export function saleTime(value?:string){if(!value)return 'Chưa ghi nhận';const date=new Date(value);return Number.isFinite(date.getTime())?date.toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour12:false}):'Ngày giờ không hợp lệ';}
export const paymentNames={cash:'Tiền mặt',transfer:'Chuyển khoản',qr:'QR mô phỏng',card:'Thẻ mô phỏng'};
