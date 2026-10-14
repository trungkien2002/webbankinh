# Élan Eyewear — bản demo cục bộ của Bảo

Ứng dụng Expo + React Native Web + TypeScript, trên nhánh `bao`.
Theo yêu cầu người dùng ngày 2026-10-13, các tính năng Bảo dùng dữ liệu cục bộ;
không cần khởi động backend.

## Chạy ứng dụng

Mở terminal tại thư mục `team-repository`:

```powershell
npm.cmd ci
npm.cmd run web
```

Mở URL Expo hiển thị (thường `http://localhost:8081`). Chọn biểu tượng
“Quản lý cửa hàng” để đăng nhập với tài khoản demo có sẵn:

- Admin: `admin@example.com` / `Demo@123`.
- Nhân viên: `hoan@example.com` / `Demo@123`.

Nếu đã đổi mật khẩu trên trình duyệt đó, dùng mật khẩu mới hoặc “Quên mật khẩu”.
OTP demo hiển thị trực tiếp, không gửi email/SMS. Dữ liệu lưu theo trình duyệt và
địa chỉ web; dùng cùng địa chỉ/port để xem lại. Xóa dữ liệu trang sẽ mất thay đổi local.

## 10 tính năng Bảo

| Story | Thao tác |
|---|---|
| DN003 | Đăng nhập → Quên mật khẩu → nhập email → lấy OTP demo → đặt mật khẩu mới |
| LSP003 | Phân loại kính → Sửa → tên/mô tả/chất liệu → Lưu (Admin) |
| LSP007 | Phân loại kính → Chi tiết → xem metadata và sản phẩm/giá thuộc nhóm |
| SP004 | Sản phẩm → danh sách có ảnh/tồn, tìm kiếm, lọc còn/hết hàng, sort và phân trang |
| BH001 | Bán hàng tại quầy → Tạo hóa đơn mới → thêm hàng; mở lại từ Hóa đơn, draft gần nhất phục hồi khi tải lại |
| BH005 | Đơn tại quầy → Khách hàng / thông số đo mắt → chọn khách và lưu SPH/CYL/AXIS/PD hai mắt |
| VC001 | Voucher → Thêm voucher → nhập mã/mức giảm/ngày → Lưu (Admin) |
| HD003 | Hóa đơn → Chi tiết → item/giá/khách/thông số snapshot → In / Lưu PDF |
| KH003 | Khách hàng → danh sách, tìm kiếm, số lần mua từ đơn paid và lần mua gần nhất |
| NV002 | Nhân viên → Sửa → liên hệ/vị trí/ca/chi nhánh/vai trò; đặt lại mật khẩu riêng (Admin) |

Khách mới được tạo ở màn Khách hàng bằng biểu mẫu chung. Chọn khách đó trong POS.
Đơn có tròng kính cần thông số đo trước khi hoàn tất. Đơn nháp/chờ không trừ tồn;
thanh toán cập nhật tồn và trạng thái một lần. In lại chỉ đọc, không tạo thanh toán.
Chưa có model lịch hẹn nên không hiển thị lịch tái khám giả.

## Kiểm tra

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build:web
npx.cmd expo install --check
node scripts/verify-bao.cjs
```

Script browser dùng Chrome headless có sẵn trên Windows, profile tạm riêng,
WebSocket của Node 24; có thể đặt CHROME_PATH nếu Chrome ở vị trí khác. Chạy build
trước. Ảnh, PDF mẫu và kết quả ở `artifacts/`; profile test không dùng dữ liệu demo của bạn.

Chi tiết kiểm thử và giới hạn tại `docs/bao/PROGRESS.md` và `info.md`.
