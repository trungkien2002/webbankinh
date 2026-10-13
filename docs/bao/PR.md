# Triển khai 10 story Bảo cho demo cục bộ

Theo yêu cầu người dùng “không cần backend”, thêm các chức năng Bảo vào app Expo
hiện có và lưu chung trong localStorage. POS tạo/lưu draft thật trong nguồn dữ liệu
local thay vì chỉ giữ cart ở component; refresh khôi phục draft gần nhất và danh sách
hóa đơn mở lại được các draft/pending. Quên mật khẩu dùng OTP mô phỏng hiển thị
trực tiếp, không gửi email/SMS.

Story: DN003, LSP003, LSP007, SP004, BH001, BH005, VC001, HD003, KH003, NV002.

Thay đổi chính: edit/detail category, list/stock/filter/sort sản phẩm, draft/cart/
measurement snapshots, tạo voucher và revalidate lúc thanh toán, detail/in/PDF,
purchase summary chỉ tính paid, edit employee/user/reset password demo.

File chung: web.tsx gắn biểu mẫu/POS; database.ts thêm transaction ghi một lần;
demoSession.ts version phiên; domain.ts thêm material/shift/branch tùy chọn;
package.json và lock nâng bản vá Expo ~57.0.28 cùng SDK. Không thay App.tsx.
ProductType tách khỏi tên Category để sửa tên nhóm không làm sai loại hàng.

Không thay API/schema server vì không có backend trong phạm vi được yêu cầu.
Các trường tùy chọn tương thích bản ghi local cũ. Snapshot đơn paid giữ giá/
thông số/nhân viên lịch sử. Adapter in có file web/native tương ứng.

Chạy: npm ci, npm run web. Tài khoản admin demo admin@example.com / Demo@123.

Validation: typecheck pass; 57 tests/7 files pass; build:web pass;
expo install --check pass. Chrome headless 13 nhóm pass, không runtime exception:
draft reload/double click, rename-category regression, voucher/checkout, đo mắt,
detail/in không tạo payment, OTP/login, viewport 1440/390px. PDF tạo thật từ
template bằng Chrome; hộp thoại in hệ điều hành mock. Test native/multi-tab/
email/backend chưa chạy. Ma trận chi tiết: docs/bao/ACCEPTANCE.md.

Ảnh: artifacts/bao-desktop.png, artifacts/bao-narrow.png, artifacts/bao-invoice.png.
PDF mẫu: artifacts/bao-invoice.pdf. Kết quả: artifacts/bao-browser-results.json.

Reviewer: Kiên (trungkien2002). Không merge/auto-merge; đề nghị review phạm vi demo
cục bộ, khác tiêu chí backend của bao.md nguyên bản. Quyết định người dùng ở info.md.
