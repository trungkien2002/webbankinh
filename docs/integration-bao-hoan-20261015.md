# Tích hợp logic Bảo và Hoan — 15/10/2026

## Nền và giới hạn

- Nền giao diện đã duyệt: main `e9829b9`, backup kien `951aacf`.
- Chỉ tích hợp service, contracts, hỗ trợ lưu dữ liệu và test. Không thay đổi `src/components`, `src/screens`, CSS, ảnh, seed hay package.
- Không lấy `hoan-dialog.tsx`, gitlink `webbankinh`, bản dự án lồng `webbankinh-main`, các artifact và dependency giao diện từ nhánh Hoan.
- Đây vẫn là ứng dụng demo local; không thêm server, cổng thanh toán thật hoặc đồng bộ nhiều máy.

## Bảo — origin/bao 926c4c8

Nhánh đã là tổ tiên của main qua PR #3, không còn commit mới cần merge. Giữ logic hiện có: OTP local/reset phiên, sửa/chi tiết phân loại, danh sách sản phẩm, đơn nháp, thông số đo mắt, tạo voucher, snapshot/in hóa đơn, thống kê khách, sửa nhân viên. Không phục hồi giao diện cũ hoặc ghi đè các sửa đổi được duyệt sau PR #3.

## Hoan — origin/hoan e262a6d

| Nhóm | Logic đã lấy | Tương thích bổ sung |
|---|---|---|
| LSP002/LSP005 | Preview/import phân loại, báo lỗi dòng, tìm kiếm không dấu/chất liệu | Sổ importKeys và chống import lặp; hỗ trợ chữ đ |
| SP002/SP003 | Nhập kho theo SKU/barcode/lô; xóa mềm, danh sách bán | StockMovement, transaction, giữ snapshot hóa đơn |
| BH003 | Xóa dòng đơn, tính lại tổng/voucher | Xóa đơn tạm khi dòng cuối bị xóa, theo quyết định đã duyệt |
| BH004 | Thanh toán local tiền mặt/chuyển khoản/thẻ/QR, chống xử lý lặp; payload VietQR demo | PaymentRecord, transaction ghi cùng tồn kho/voucher/hóa đơn, kiểm tra key gắn đúng invoice/method và tiền mặt theo số tiền mới nhất |
| HD001 | Tìm/lọc hóa đơn theo mã/tên/điện thoại/ngày/trạng thái | Giữ lọc quyền đơn nháp trong service |
| KH002 | Sửa khách, thêm lần đo, giữ snapshot đơn cũ | Kiểm tra email hợp lệ/trùng |
| NV003 | Khóa/mở tài khoản, không khóa admin cuối | Thu hồi phiên bằng password version hiện có |

Logic mới được cung cấp qua service API và test. Các tính năng đã có như xóa sản phẩm vẫn dùng giao diện và luồng hiện hành. Không thêm màn import Excel, chọn thẻ/QR, chỉnh khách hay khóa user vào giao diện trong đợt này. Nhánh Hoan tham chiếu các adapter Excel nhưng không cung cấp chúng; preview import hiện nhận ma trận dữ liệu, chưa đọc file xlsx qua UI. VietQR dùng tài khoản demo cố định trong mã gốc, không phải cấu hình nhận tiền thật.

## Kiểm tra

- 79/79 Vitest, typecheck và Expo web export đạt.
- Hồi quy tích hợp: migration dữ liệu cũ giữ sản phẩm/hóa đơn; thanh toán không ghi hai lần; key không dùng chéo đơn/phương thức; lỗi lưu rollback cả tồn kho/payment/invoice; import sai không ghi một phần; xóa dòng cuối giữ quy tắc xóa đơn rỗng.
- `git diff` với nền đã duyệt rỗng cho toàn bộ component/screen/assets/data/package: không merge giao diện.
- Skill security-guidance đã được đọc; bộ tham chiếu ASVS đi kèm thiếu file nên không đưa ra tuyên bố tuân thủ ASVS. Việc kiểm tra ở đây giới hạn ở các guard và test local nêu trên.
- Chưa kiểm tra native/thiết bị thật, giao dịch thật hoặc đồng thời nhiều tab.
