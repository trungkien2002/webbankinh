# Merge lịch sử đóng góp Khánh — 15/10/2026

- Nền main: `748be72`. Nhánh nguồn: `khanh`, tip `a4ea53d`.
- Commit `507b42b` của Khanh123453 triển khai 10 tính năng; `a4ea53d` của cùng tác giả chỉ cập nhật progress.md.
- Logic đã có trong main qua lần hợp nhất trước (commit tương ứng `6a21f9a`, PR #1); so sánh trực tiếp cho thấy authService/categoryService/customerService/employeeService/voucherService và bốn bộ sprint test trùng nhánh Khánh. ProductService, invoiceService, database và contracts trong main có thêm các sửa đổi đã duyệt, cần giữ lại.
- Nhóm tính năng gốc: DN004 tạo user/phân quyền; LSP004 xóa mềm phân loại; SP001 thêm sản phẩm; SP005 tìm/lọc sản phẩm; BH002 đơn chờ; BH006 áp voucher; VC002 sửa voucher; HD004 lọc hóa đơn; KH004 tìm khách; NV001 thêm nhân viên. 39 test gốc của Khánh được giữ trong tổng số 79 test hiện tại.
- Thực hiện merge ancestry với strategy ours: nhận các commit gốc vào lịch sử main, không sao chép lại code đã có, không ghi đè phần mở rộng hiện tại và không lấy src/screens/home/index.tsx, package hay giao diện cũ.
- Author/email của các commit gốc giữ nguyên; không thay tác giả, không tạo commit tính năng giả hoặc sửa lịch sử nhánh thành viên.
- Kiểm tra: 79/79 test và typecheck đạt. Diff toàn bộ src/assets/data/package với main trước merge rỗng. Không build lại vì mã và dependency không đổi; bản build trước tích hợp Hoan đã đạt.
