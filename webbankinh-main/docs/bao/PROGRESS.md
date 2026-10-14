# Tiến độ chuẩn bị của Bảo

## Cập nhật triển khai demo cục bộ — 2026-10-13

Người dùng yêu cầu không cần backend và cho phép triển khai local. Python 3.13.15
đã hoạt động qua đường dẫn đầy đủ; đã cài 4 skill Expo và 2 skill GitHub. Không còn
blocker skill/backend đối với phạm vi demo mới. Phần ghi chép chuẩn bị bên dưới là lịch sử.

Đã triển khai UI + xử lý + persistence cục bộ cho DN003, LSP003, LSP007, SP004,
BH001, BH005, VC001, HD003, KH003, NV002. Chưa nghiệm thu theo tiêu chí backend của
bao.md nguyên bản. Không có API/server/email/SMS thật, bảo mật chỉ dành cho demo.

- Quên mật khẩu: OTP mô phỏng có TTL, giới hạn thử/gửi lại, một lần; reset phiên demo.
- Category: sửa name/description/material, kiểm trùng và quyền local; detail có sản phẩm/giá.
- Product: bảng ảnh có fallback, tồn còn/hết, sort/filter/paging; giữ ProductType khi Category đổi tên.
- POS: draft rỗng, mã duy nhất, cart lưu cùng Invoice; khôi phục draft khi reload và mở pending từ list.
- Measurement: khách dùng service chung, snapshot hai mắt trên invoice và lịch sử khách; quy tắc nhập demo ghi rõ.
- Voucher: tạo/normalize/unique/validate; dùng chung filter và checkout, kiểm lại voucher trước khi trả tiền.
- Invoice detail: item/customer/measurement/totals/payment snapshot; chung layout in cho màn detail và checkout pending.
- Customer: số lần mua/last purchase từ paid; không tạo lịch hẹn giả.
- Employee: contact/position/shift/branch, role/user đồng bộ, reset password demo riêng; giữ tên trên bill cũ.

Kết quả kiểm thử đã chạy: typecheck pass; Vitest 57/57 tests trong 7 files (45 test
cũ + 12 test mới); build:web pass. Browser Chrome headless: 13 nhóm kiểm tra pass,
không có Runtime.exceptionThrown; desktop 1440px và viewport 390px không tràn body.
Đã kiểm tra reload draft, double-click chỉ tạo một draft, đổi Category không làm sai
loại hàng, OTP/reset/login, mẫu in không đổi thanh toán và PDF thật tạo từ template
qua Chrome. Hộp thoại in hệ điều hành được mock; chưa kiểm thử native/multi-tab.

Artifacts: `artifacts/bao-desktop.png`, `bao-narrow.png`, `bao-invoice.png`,
`bao-invoice.pdf`, `bao-browser-results.json`. Profile browser riêng, không chứa dữ
liệu của người dùng. Script tái chạy: `node scripts/verify-bao.cjs` sau build:web.

File chung sửa: domain.ts (3 trường tùy chọn), database.ts (transaction local),
demoSession.ts (version phiên), web.tsx (gắn module/khôi phục POS), package.json/lock
(bản vá Expo cùng SDK). Không thay App.tsx hoặc framework. Các docs ở README.md,
info.md và ma trận ACCEPTANCE.md mô tả phạm vi mới.

Đã cập nhật expo từ ~57.0.27 lên ~57.0.28 bằng expo install, giữ SDK 57 và npm.
Sau cập nhật: typecheck, 57 tests, build:web và expo install --check đều pass.

### Bàn giao Git

Đã lưu commit local trên nhánh bao, tác giả commit tự động là Codex:
ffb465b (DN003/NV002 password), 6a6b7e0 (9 story còn lại/UI và tests),
3d3f646 (Expo patch/gitignore), f18f2ab (docs/script/ảnh/PDF). Worktree đã kiểm tra sạch.
Fetch/merge origin/main trước bàn giao trả Already up to date.

Chưa push hoặc tạo PR: auto-review từ chối push vì cần người dùng xác nhận rõ việc
xuất bản mã nguồn, tài liệu, ảnh và PDF lên GitHub. Phần local đã hoàn thành;
chỉ tiếp tục xuất bản sau xác nhận. Mô tả PR chuẩn bị ở PR.md, reviewer Kiên.

### Cập nhật xuất bản sau xác nhận người dùng

Người dùng đã xác nhận “làm tiếp đi” cho đề nghị push code/tài liệu/ảnh/PDF và tạo PR.
Đã fetch/merge main (Already up to date) và push duy nhất nhánh bao thành công;
origin/bao đã nhận các commit local tới 182189b trước cập nhật báo cáo này.

Chưa tạo PR: GitHub connector trả 403 `Resource not accessible by integration`.
Phương án dùng credential Git qua API bị auto-review từ chối và chưa được chạy;
helper đã được xóa, không có credential được đọc hoặc lưu. Không thử vượt chặn.

Tạo PR trực tiếp tại https://github.com/trungkien2002/webbankinh/compare/main...bao?expand=1
(base main, compare bao), mô tả ở PR.md, reviewer trungkien2002.
Không merge, không auto-merge. Muốn tạo PR bằng connector cần cấp quyền Pull requests
cho integration trên repository này.

### Lịch sử chuẩn bị ban đầu

Ngày 2026-10-13; nhánh `bao`; baseline `277868d00ec54492daa804f3bb3c528a480d8e85`.

## Đã thực hiện

- Clone repository chính thức vào `team-repository`, xác nhận bao/main cùng baseline và merge origin/main trả `Already up to date` trong lượt kiểm tra trước. Không ghi đè bản tải về ban đầu.
- Rà soát entrypoint, cấu hình, contract, services và tests; xác định điểm gắn UI, dữ liệu local và phụ thuộc backend.
- Lưu bản đồ file/chức năng/chủ sở hữu ở `REVIEW.md`, đề xuất operation/API và module ở `API-PROPOSAL.md`, ma trận tình huống/mong đợi/trạng thái ở `ACCEPTANCE.md`.
- Cài dependencies bằng npm ci theo package-lock. Không sửa package.json, lockfile, domain hoặc code ứng dụng.

## Kết quả kiểm tra thực tế

| Lệnh / kiểm tra | Kết quả | Giới hạn |
|---|---|---|
| `npm ci --no-audit --no-fund` | Exit 0; cài 525 packages | npm báo install script esbuild chưa được allowScripts bao phủ; không đổi cấu hình này |
| `npm run typecheck` | Pass, exit 0 | Chỉ kiểm tra TypeScript |
| `npm test` trong sandbox | Không khởi động được, exit 1 | esbuild báo Access denied khi đọc thư mục cha |
| `npm test` chạy lại với quyền ngoài sandbox | Pass, 6 test files, 45 tests, exit 0 | Tests có sẵn của code local; chưa là test story Bảo hoặc backend |
| `npm run build:web` | Pass, exit 0; export vào dist | Build không chứng minh browser flow hoặc persistence |
| `npx expo install --check` trong sandbox | Exit 1, EACCES khi kết nối | Hạn chế môi trường |
| `npx expo install --check` với quyền ngoài sandbox | Exit 1: expo 57.0.27, phiên bản kỳ vọng ~57.0.28 | Đã phát hiện lệch phiên bản; chưa thay dependency chung trong giai đoạn phân tích |
| Browser desktop/màn hẹp | Chưa chạy | Không có kết quả UI hoặc ảnh nghiệm thu trong báo cáo này |
| Backend/integration/restart persistence | Chưa chạy | Không có backend/API baseline được duyệt |

## Trạng thái story

DN003, LSP003, LSP007, SP004, BH001, BH005, VC001, HD003, KH003, NV002: **đã phân tích, chưa triển khai, chưa nghiệm thu**. Không có story Done.

Các blocker chung: Python alias không chạy, bộ skill bắt buộc chưa cài; thiếu tài liệu tích hợp/ownership nội bộ và backend/auth/DB/client API thật. Blocker riêng theo story đã ghi ở API-PROPOSAL.md. Không tự dựng backend riêng hoặc dùng localStorage làm bằng chứng hoàn thành.

## Bước tiếp theo

1. Cài/khôi phục Python hoạt động, dùng skill-installer cài skill còn thiếu và đọc theo thứ tự bao.md.
2. Kiên xác nhận baseline backend, schema/auth/email, client API và các quyết định trong API-PROPOSAL.md; bổ sung tài liệu chung.
3. Fetch/merge main trước story đầu tiên và từng story tiếp theo; chạy lại checks sau thay đổi.
4. Triển khai theo sprint, test server và browser thật; ghi kết quả từng story vào ma trận trước khi đề nghị nghiệm thu.

Tài liệu hiện lưu local trên nhánh bao; chưa tạo commit/push/PR. Không có thay đổi chức năng để báo hoàn thành.
