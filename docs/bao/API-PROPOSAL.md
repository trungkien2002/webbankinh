# Đề xuất tích hợp 10 story của Bảo

> Tài liệu cho giai đoạn backend nếu có sau này. Phiên hiện tại đã chuyển sang demo
> cục bộ theo yêu cầu người dùng; implementation dùng bao-service.ts/password-reset.ts.

Ngày 2026-10-13. Toàn bộ operation/route dưới đây là đề xuất để Kiên và chủ sở hữu thống nhất; chưa tồn tại và chưa được duyệt. URL base, session, lỗi HTTP, phân trang, idempotency và migration theo baseline chung sau khi được chốt. Không dùng đề xuất này như API đã chạy.

## Quy ước cần chốt chung

- Giữ entity ID và enum trong `src/contracts/domain.ts`; frontend không gửi role hoặc createdBy như nguồn xác thực. Server lấy actor từ session.
- Danh sách trả items, tổng số và thông tin phân trang theo một envelope chung; sort ổn định có ID làm khóa phụ. Chốt giới hạn page size, trường sort hợp lệ.
- Lỗi phân biệt validation, không có quyền, không tồn tại, xung đột dữ liệu và lỗi hạ tầng; có lỗi theo field để giữ form. Không quyết định status/body khác nhau cho từng module.
- Các lệnh tạo draft/measurement/voucher cần cơ chế chống gửi lại theo baseline; timeout chưa biết kết quả phải tra cứu trước retry, không tự tạo bản ghi thứ hai.
- Chốt tiền VND, quy tắc làm tròn, ngày hiệu lực và múi giờ. Server tính totals/voucher/stock; UI chỉ hỗ trợ nhập và hiển thị.

| Story | Operation đề xuất | Input và dữ liệu cần trả | Phụ thuộc / quyết định cần duyệt |
|---|---|---|---|
| DN003 | POST `/auth/password-reset/request`, POST `/auth/password-reset/confirm` | Request: email hoặc contact theo kênh được duyệt. Confirm: challenge, OTP/token, mật khẩu mới. Request có phản hồi chung cho tài khoản tồn tại/không tồn tại | Kiên DN001, Khánh DN004; email transport test; TTL, giới hạn thử/gửi, bcrypt policy, tiêu thụ token một lần, hủy session cũ. Không trả OTP trong API demo |
| LSP003 | GET `/categories/:id`, PATCH `/categories/:id` | Category hiện có; sửa name/description, metadata chỉ sau duyệt schema; tùy baseline có version chống ghi đè | Kiên LSP001/LSP005, Khánh LSP004; policy tên trùng và mục đã xóa; Admin server |
| LSP007 | GET `/categories/:id`, GET `/products?categoryId=...` | Category + trang sản phẩm có giá/ảnh/trạng thái; nhóm rỗng là dữ liệu hợp lệ | Kiên LSP005, Khánh SP001; schema quy cách/bảng giá nếu có; không tạo giá nhóm riêng |
| SP004 | GET `/products` | Filter/sort/page chung; Product + số tồn khả dụng được server xác nhận | Khánh SP001/SP005, Kiên SP002/SP006, Hoan SP003/SP007/BH007; chốt stock vs stockAvailable, sản phẩm ngừng bán, cập nhật sau checkout/import |
| BH001 | POST `/invoices`, GET `/invoices/:id` | Draft rỗng, mã duy nhất, items rỗng, totals bằng 0, actor từ session; trả ID cho cart chung | Kiên BH003/auth, Khánh BH002, Hoan BH007; draft không tính doanh thu/không trừ stock; idempotency và cách khôi phục ID sau refresh |
| BH005 | GET `/customers`, POST `/customers/:id/measurements`, PATCH `/invoices/:id/customer-prescription` | Chọn/tạo khách qua service chung; SPH/CYL/AXIS hai mắt, PD, ngày đo; measurement ID và snapshot gắn invoice | Kiên KH001/BH003, Hoan KH002, Khánh KH004; chốt dải số/bước nhập/AXIS khi CYL=0/đơn không cần đo; model measurement và transaction liên kết snapshot |
| VC001 | POST `/vouchers` | Voucher dùng code, name, discountType=`percentage` hoặc `fixed`, discountValue, minOrderValue, maxDiscountAmount?, startDate, endDate, isActive | Khánh VC002/BH006, Kiên VC003; unique code trim/uppercase, điều kiện combo nếu được duyệt; server validate và API filter thấy bản ghi mới |
| HD003 | GET `/invoices/:id` | Invoice snapshots, thông số hai mắt, customer snapshot, payment(s), productionStatus; layout in dùng chung checkout | Kiên HD001, Hoan HD002/BH007; model payment và nguồn totals; adapter in/PDF chỉ đọc, không tạo payment |
| KH003 | GET `/customers` | Customer summary, số lần mua từ các invoice đủ điều kiện; lịch hẹn chỉ khi model/scope được duyệt | Kiên KH001, Hoan KH002, Khánh KH004; chốt chỉ paid hay policy khác, draft/pending/cancelled không mặc nhiên tính; paging và thống kê phía server |
| NV002 | GET `/employees/:id`, PATCH `/employees/:id`, POST `/employees/:id/password-reset` | Employee và User liên kết; cập nhật contact/position/role theo policy; mật khẩu gửi riêng đến auth operation, không trả hash | Khánh NV001/DN004, Hoan NV003, Kiên NV004/DN001; Admin server, đồng bộ user/email/role nguyên tử; employee không có user; ca/chi nhánh và session revoke sau duyệt |

## Kế hoạch module, chưa tạo code

| Nhóm | Module dự kiến | Điểm gắn / tái sử dụng |
|---|---|---|
| Auth | `src/features/auth/PasswordReset.tsx` | Link từ login trong WebApp; dùng Field/Button; gọi client auth chung |
| Category | `src/features/categories/CategoryEdit.tsx`, `CategoryDetail.tsx` | Sheet của màn danh mục; reload dữ liệu chung khi lưu |
| Product | `src/features/products/ProductList.tsx` | Thay phần đọc/paging client tại màn sản phẩm bằng API; giữ bộ lọc của SP005 |
| POS | `src/features/invoices/DraftInvoice.tsx`, `CustomerPrescription.tsx` | Gắn draft ID vào cart của Kiên; chọn khách chung, không tách POS |
| Voucher | `src/features/vouchers/VoucherCreate.tsx` | Thêm action Admin ở màn voucher, giữ VoucherForm sửa của Khánh |
| Invoice detail | `src/features/invoices/InvoiceDetail.tsx`, `InvoicePrint.web.tsx`, `InvoicePrint.tsx` | Mở từ bảng hóa đơn; layout bill do nhóm thống nhất và chia sẻ checkout |
| Customer | `src/features/customers/CustomerList.tsx` | Màn khách hàng chung, giữ search KH004 |
| Employee | `src/features/employees/EmployeeEdit.tsx` | Action sửa trong bảng nhân viên; giữ form tạo NV001 |

Tên module chỉ phục vụ chia việc; điều chỉnh theo navigation và client API của baseline. Không sửa domain.ts/package.json/App.tsx trước khi có nhu cầu cụ thể và bằng chứng tích hợp.
