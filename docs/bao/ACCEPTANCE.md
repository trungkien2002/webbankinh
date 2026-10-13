# Ma trận nghiệm thu dự kiến — Bảo

## Kết quả trong phạm vi demo cục bộ mới

Người dùng đã bỏ yêu cầu backend và giao triển khai local. Ma trận này ghi các
kiểm tra thực tế; không suy ra nghiệm thu server từ kết quả local.

| Story ID | Tình huống đã chạy | Mong đợi | Kết quả thực tế |
|---|---|---|---|
| DN003 | OTP đúng/sai/hết hạn/dùng lại/5 lần sai, rate limit; reset và login mới/cũ; phiên cũ | Giới hạn đúng, một lần, mật khẩu/phiên cũ mất hiệu lực | Unit pass; browser reset/login pass |
| LSP003 | Sửa name/material; tên trắng/trùng; role sai; persistence | Lưu vào nguồn chung, chặn dữ liệu/quyền sai | Unit + browser pass; hồi quy thêm sản phẩm sau rename pass |
| LSP007 | Nhóm có/rỗng, ID sai; metadata và giá nhóm | Đọc đúng nhóm/ID, không tạo bảng giá riêng | Unit + browser pass |
| SP004 | List, lọc còn/hết, sort, paging hiện có; ảnh fallback qua onError | Bảng/ảnh/tồn hiển thị và lọc đúng | Browser list/filter/sort pass; ảnh lỗi và mọi tổ hợp paging chưa tự động kiểm đủ |
| BH001 | Draft rỗng, hai mã khác nhau, nhấn đôi, cart save và reload | Mã khác nhau; nhấn đôi một draft; phục hồi cart | Unit + browser pass |
| BH005 | Chọn khách, SPH/CYL/AXIS/PD hai mắt; sai dải/ngày/ID; đổi khách; snapshot cũ | Validate demo; lưu lịch sử và snapshot; không sửa snapshot paid | Unit + browser pass |
| VC001 | Tạo/normalize/duplicate, %/tiền/ngày sai; áp vào đơn, tạm dừng trước checkout | Unique/validate, tính chung, mã dừng không được thanh toán | Unit + browser pass |
| HD003 | Item/measurement snapshot khi SP/khách đổi; in không đổi payment; render PDF | Giá/thông số lịch sử đúng, thao tác in chỉ đọc | Unit + browser pass; PDF thực tế trong artifacts |
| KH003 | Paid tăng purchaseCount, draft/pending không tăng; UI summary | Thống kê từ đơn paid | Unit + browser pass; không có model lịch hẹn |
| NV002 | Contact/role/user/shift/branch; email trùng/role sai; password reset; bill cũ | User/employee cùng lưu; bảo toàn snapshot bill | Unit pass; browser shift/branch pass |

Chung: transaction local bị lỗi quota không đổi memory/stock/payment (unit pass),
Chrome runtime không có exception, viewport 1440px và 390px không tràn body.
57 tests/7 files pass; 13 nhóm browser check pass. Chưa chạy native, bảo mật/server,
đồng thời nhiều tab, hoặc kiểm thử tất cả tình huống lỗi qua UI. Hộp thoại in được
mock, file PDF tạo thật từ cùng HTML template bằng Chrome. Xem PROGRESS.md.

## Checklist gốc cho giai đoạn backend (lịch sử)

Ngày 2026-10-13. Các tiêu chí backend dưới đây chưa được chạy trong phạm vi local; giữ để dùng nếu nhóm triển khai backend sau này. Fixture chỉ nằm trong test, không reset DB demo.

| Story ID | Tình huống | Mong đợi | Kết quả thực tế |
|---|---|---|---|
| DN003 | Email tồn tại/không tồn tại; OTP sai, hết hạn, quá số lần thử, dùng lại; gửi liên tiếp | Request không tiết lộ tài khoản; rate limit; token một lần, hết hạn bị từ chối | Chưa chạy — thiếu auth/email server |
| DN003 | Reset hợp lệ, đăng nhập mật khẩu mới/cũ, dùng session cũ | Mật khẩu mới dùng được; mật khẩu cũ và phiên cũ bị vô hiệu theo policy | Chưa chạy |
| LSP003 | Admin sửa, employee gọi API trực tiếp, ID sai/xóa mềm, tên trắng/trùng | Server kiểm quyền/validate; lỗi giữ form; không ghi dữ liệu sai | Chưa chạy — thiếu category API |
| LSP003 | Lưu và refresh search/list/detail; hai người cùng sửa | Cùng dữ liệu đã lưu; xử lý xung đột theo baseline | Chưa chạy |
| LSP007 | Nhóm rỗng, ID sai, sản phẩm ngừng bán, thay giá/tên | Empty/error đúng; metadata và giá từ nguồn chung, đúng policy trạng thái | Chưa chạy — thiếu detail/product API |
| SP004 | API có nhiều trang, sort/filter, danh sách rỗng, tồn 0, ảnh hỏng | Trang ổn định, reset trang khi lọc, badge tồn đúng, ảnh fallback | Chưa chạy — thiếu product API |
| SP004 | Thêm/sửa/xóa/import/checkout ở phân hệ khác rồi tải lại | Danh sách và tồn khớp dữ liệu server | Chưa chạy |
| BH001 | Tạo draft rỗng, hai đơn đồng thời, nhấn hai lần, timeout/retry | Mã duy nhất; chống lặp theo request; cart đúng invoice ID; draft chưa ảnh hưởng doanh thu/tồn | Chưa chạy — thiếu draft/cart server |
| BH001 | Refresh/mở lại draft, actor giả mạo, user không có quyền | Khôi phục đúng đơn; actor lấy từ session; server từ chối sai quyền | Chưa chạy |
| BH005 | SPH/CYL/AXIS/PD thiếu, không phải số, vượt policy; loại đơn không cần đo | Client hỗ trợ và server validate theo quy tắc đã duyệt; không tự suy diễn y khoa | Chưa chạy — thiếu policy đo mắt/API |
| BH005 | Chọn/tạo khách, lưu measurement + snapshot; thêm lần đo mới, lỗi giữa transaction | Đúng khách/đúng hai mắt; snapshot đơn cũ bất biến; lỗi không để bản ghi liên kết dở dang | Chưa chạy |
| VC001 | Code trống/trùng hoa thường, percent ngoài giới hạn, ngày sai/đảo, tiền âm/NaN | Server normalize/unique/validate, giữ form khi lỗi | Chưa chạy — thiếu create voucher API |
| VC001 | Admin tạo, employee gọi trực tiếp; áp mã vào đơn; refresh bộ lọc | Quyền đúng; voucher xuất hiện và tính đúng bằng server | Chưa chạy |
| HD003 | ID sai/quyền sai; SP đổi giá; lần đo mới; đối chiếu checkout | Giá và thông số snapshot không đổi; totals/payment khớp checkout | Chưa chạy — thiếu detail/payment API |
| HD003 | In lại/PDF nhiều lần; popup bị chặn; native mở adapter | Không thêm payment, không sửa invoice; lỗi in rõ; adapter phù hợp nền tảng | Chưa chạy |
| KH003 | Không có khách, nhiều trang; paid/draft/pending/cancelled; sửa contact/đo mắt | Danh sách đúng, số lần mua theo policy server; không bịa lịch hẹn | Chưa chạy — thiếu summary API |
| NV002 | Admin sửa, employee gọi API; trùng email/user, role sai, employee không có user | Server kiểm quyền/unique; liên kết rõ; lỗi không cập nhật một nửa | Chưa chạy — thiếu employee/auth API |
| NV002 | Đổi role/reset password, đăng nhập và session cũ; xem invoice lịch sử | Quyền/mật khẩu mới có hiệu lực; revoke theo policy; không đổi snapshot nhân viên trên đơn cũ | Chưa chạy |

## Các tình huống áp dụng cho mọi story

- Loading, empty, lỗi mạng/5xx, retry, nhấn hai lần; không mất dữ liệu form khi lỗi và không hiện thông báo thành công trước khi server xác nhận.
- Tải lại trang và khởi động lại backend; dữ liệu vẫn đúng. Xác minh trên DB thật của baseline, không chỉ state/localStorage.
- Desktop và màn hình hẹp; focus/keyboard, nhãn input, nút disabled khi đang gửi; browser test và ảnh UI thực tế.
- Mutation thành công làm mới đúng các màn liên quan; response cũ không ghi đè kết quả mới khi tìm kiếm nhanh.
- Transaction DB tạm: lỗi ở từng bước lưu, rollback, truy cập đồng thời, chống gửi lại. Đặc biệt measurement/snapshot, employee/user, checkout/tồn/thanh toán.

## Lệnh kiểm tra nền và cách đọc kết quả

`npm ci`, `npm run typecheck`, `npm test`, `npm run build:web`, `npx expo install --check`.
Kết quả thực tế của phiên rà soát được ghi ở `PROGRESS.md`. Test hiện có chạy logic cục bộ; dù pass cũng không chứng minh story Bảo, trình duyệt hoặc persistence server hoàn thành.
