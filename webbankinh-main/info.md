# Quyết định và contract demo cục bộ

Ngày 2026-10-13. Người dùng đã yêu cầu “không cần backend”, đồng ý và yêu cầu thực hiện
10 tính năng Bảo trên dữ liệu cục bộ. Quyết định này thay yêu cầu backend/persistence
server trong bao.md cho phạm vi làm việc hiện tại. Không coi đây là baseline backend
đã được Kiên duyệt.

- Giữ Expo + React Native Web + TypeScript, npm và schema hiện có.
- Dữ liệu dùng chung qua `src/services/database.ts`, lưu vào localStorage trên web.
  `transaction` clone dữ liệu và ghi một lần trước khi thay bộ nhớ cho các thao tác Bảo.
  Không đồng bộ dữ liệu giữa nhiều máy hoặc bảo đảm transaction đa tab.
- Category thêm material tùy chọn; Employee thêm shift/branch tùy chọn. Bản ghi cũ vẫn
  đọc được. ProductType vẫn là enum loại hàng; tên Category có thể đổi độc lập.
- Voucher giữ enum `percentage`/`fixed`, minOrderValue và maxDiscountAmount hiện có.
- Hóa đơn mới dùng draft; đơn chờ pending, doanh thu/số lần mua chỉ tính paid.
  Cart tại quầy lưu vào Invoice chung và khôi phục draft gần nhất của nhân viên.
  Đơn pending có thể mở lại từ danh sách. Snapshot trên đơn đã trả tiền không sửa lại.
- Phiếu đo dùng EyePrescription chung, thêm vào lịch sử Customer và snapshot Invoice.
  Giới hạn nhập demo SPH [-30,30], CYL [-10,10], AXIS nguyên [0,180], PD [40,80] mm;
  các giới hạn chỉ phục vụ nhập demo, không phải tiêu chuẩn y khoa đã duyệt.
- OTP mô phỏng hiển thị tại UI, 5 phút, tối đa 5 lần thử, chờ 60 giây để gửi lại,
  tiêu thụ một lần. Không gửi email/SMS thật; dùng digest demo hiện có, không bcrypt
  server. Phiên demo có version mật khẩu để vô hiệu sau reset.
- Admin được sửa category, tạo voucher, sửa nhân viên/reset password trong UI demo;
  các kiểm tra role phía client không thay xác thực server.
- In/PDF qua adapter `.web.tsx`; dùng hộp thoại in và chức năng lưu PDF trình duyệt.
  Adapter native thông báo cần mở web, không dùng DOM trong module chung.

Các API trong docs/bao/API-PROPOSAL.md vẫn là đề xuất cho giai đoạn backend nếu sau này có.
