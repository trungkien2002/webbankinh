# Rà soát chuẩn bị phân hệ Bảo

> Bản ghi rà soát ban đầu, giữ để tham chiếu. Người dùng sau đó yêu cầu bỏ backend
> và làm demo cục bộ. Trạng thái triển khai hiện tại ở PROGRESS.md; quyết định mới ở
> ../../info.md. Blocker Python/skill dưới đây đã được giải quyết.

Ngày: 2026-10-13. Nguồn yêu cầu: `C:/Users/Admin/Downloads/bao.md`.
Repository: `https://github.com/trungkien2002/webbankinh.git`; nhánh làm việc `bao`.
Bản nền đã clone: `277868d00ec54492daa804f3bb3c528a480d8e85` (bao và main cùng commit lúc kiểm tra).

## Phạm vi và trạng thái

Đây là phân tích và kế hoạch, chưa triển khai hoặc nghiệm thu story. Các đề xuất API trong tài liệu đi kèm chưa phải contract được nhóm duyệt. Không sửa code của Khánh, không tự quyết backend, không thay framework hoặc package manager.

Git chạy qua `C:/Program Files/Git/cmd/git.exe`. Python trong PATH là alias WindowsApps và không chạy được; chưa cài được bộ skill Expo/GitHub bắt buộc. Thiếu skill thì theo mục 1 của bao.md chỉ tiếp tục đọc code và phân tích. Không thay bằng backend hoặc UI mock rồi báo Done.

Repository hiện thiếu `AGENTS.md`, `README.md`, `info.md`, `docs/INTEGRATION.md`, `docs/members/` và bản bao.md nội bộ. `progress.md` có sẵn thuộc Khánh; giữ nguyên báo cáo của thành viên này. Ghi chép của Bảo nằm riêng trong thư mục này.

## Bản đồ mã nguồn

Chủ sở hữu bên dưới lấy từ chú thích code, progress.md và phân công bao.md; không suy ra tác giả từng dòng bằng tên file.

| File / nhóm file | Vai trò hiện có | Liên hệ / người phụ trách |
|---|---|---|
| `App.tsx`, `index.ts`, `app.json`, `tsconfig.json` | Khởi động Expo, nạp font, mở WebApp; strict TypeScript | Nền chung, Kiên điều phối |
| `src/contracts/domain.ts` | User, Employee, Category, Product, EyePrescription, Customer, Voucher, Invoice và enum | Contract chung, Kiên điều phối |
| `src/services/database.ts` | Singleton dữ liệu, nạp JSON và ghi localStorage; reset bằng bộ seed khác | Persistence demo, chưa có DB server |
| `data/local-database.json`, `data/catalog-sources.json`, `assets/catalog/`, `src/components/catalogAssets.ts` | Danh mục demo, nguồn ảnh, ánh xạ ảnh local | Catalog chung, chưa là dữ liệu server |
| `src/services/authService.ts` | DN004 tạo user, kiểm tra role từ input; password không được lưu tại đây | Khánh; Bảo DN003 phụ thuộc |
| `src/services/demoSession.ts` | Đăng nhập web demo, SHA-256 phía client, localStorage/sessionStorage | Chưa thay thế DN001/auth server của Kiên |
| `src/services/categoryService.ts` | LSP004 xóa mềm, danh sách, helper tạo phân loại | Khánh; Bảo LSP003/LSP007 dùng cùng ID |
| `src/services/productService.ts` | SP001 tạo sản phẩm, SP005 tìm/lọc mảng | Khánh; Bảo SP004 nối cùng catalog |
| `src/services/invoiceService.ts` | BH002 tạo đơn pending, HD004 lọc; helper thanh toán/trừ stock | Khánh; Bảo BH001/BH005/HD003 cần tích hợp Kiên và Hoan |
| `src/services/voucherService.ts` | VC002 sửa, BH006 tính giảm từ subtotal client | Khánh; Bảo VC001 tạo voucher |
| `src/services/customerService.ts` | KH004 tìm khách; helper thêm và đọc theo ID | Khánh; Bảo KH003/BH005 phối hợp Kiên/Hoan |
| `src/services/employeeService.ts` | NV001 tạo employee và user tùy chọn | Khánh; Bảo NV002 phối hợp auth Kiên |
| `src/services/catalog.ts` | Nạp thêm seed và xóa mềm mã demo cũ, marker localStorage | Helper demo |
| `src/components/ui.tsx` | Button, Field, Choice, Sheet, Table, palette, tiền VND; Table phân trang client | Tái sử dụng cho UI Bảo |
| `src/components/employeeForm.tsx`, `voucherForm.tsx` | Form thêm nhân viên, sửa voucher | Khánh; tham khảo bố cục, không ghi đè story |
| `src/components/hero.tsx`, `icons.tsx`, `productArt.ts`, `web.css`, `webStyles.tsx`, `webStyles.web.tsx` | Hero, icon, ảnh và style; đã có adapter CSS web | UI chung; hero vẫn có window/document trực tiếp |
| `src/screens/web.tsx` | Màn hình đang được App dùng: cửa hàng, login demo, quản trị, POS và modal | Điểm gắn module mới với thay đổi nhỏ |
| `src/screens/home/index.tsx` | Màn hình phân hệ Khánh cũ; không được App import trực tiếp | Giữ nguyên, không xây màn hình Bảo tách rời |
| `src/services/sprint1..4.test.ts` | Unit test các story Khánh trên singleton local | Không phải nghiệm thu story Bảo |
| `src/services/catalog.test.ts`, `webFlow.test.ts`, `vitest.config.ts` | Test catalog và logic bán hàng local, Vitest môi trường Node | Chưa có browser/backend test |
| `preview/index.html`, `src/styles.d.ts` | Preview HTML và khai báo CSS | Không dùng preview thay ứng dụng Expo |

## Những điểm ảnh hưởng trực tiếp đến tích hợp

1. Không thấy server, route HTTP, migration, DB server hoặc client API chung. Services thao tác trực tiếp `db`; dữ liệu thật xuyên phân hệ chưa được xác minh.
2. `currentActorRole` do phía gọi truyền vào; các kiểm tra quyền này chưa chứng minh quyền phía server. DN003 và NV002 không được dùng demoSession thay auth thật.
3. Category chỉ có name/description; chưa có material hoặc quy cách tròng/gọng. Product dùng `stock`, không có `stockAvailable` hoặc trạng thái ngừng bán riêng ngoài `isDeleted`. Phải thống nhất mapping trước khi mở rộng contract.
4. `holdPendingInvoice` yêu cầu items không rỗng và tạo `pending`, không tạo draft rỗng của BH001. InvoiceCode dựa vào độ dài mảng; server phải đảm bảo mã duy nhất trong truy cập đồng thời.
5. POS trong web.tsx dùng cart ở state component, chưa gắn invoice draft ID để khôi phục sau refresh. Không tạo thêm giỏ hàng độc lập của Bảo.
6. Invoice đã có item/customer/prescription snapshot trong kiểu; flow tạo pending chưa nhận hoặc lưu prescription. Chưa có model measurement độc lập, payment record hoặc lịch hẹn.
7. `markAsPaid` ghi products rồi invoices qua hai setter; không có transaction/rollback DB. Không dùng unit test local để kết luận thanh toán nguyên tử. Đây là phụ thuộc checkout của Hoan, không tự sửa thay.
8. Voucher hiện dùng `percentage`/`fixed`, `minOrderValue`; phải giữ tên đã có hoặc duyệt migration đồng bộ, không dùng enum `percent` riêng. Chưa có create voucher.
9. Employee có position nhưng chưa có shift/branch. `userId` có thể rỗng khi thêm không kèm account; NV002 phải xử lý trường hợp này rõ ràng.
10. Đã có modal tóm tắt hóa đơn và hồ sơ khách; chưa có in/PDF, payment detail đầy đủ hoặc số lần mua từ API. Phân trang sản phẩm và bảng đều trên mảng client.
11. Hero truy cập window/document; demoSession truy cập storage trình duyệt. Khi tích hợp, tách phần mới cần DOM/in/PDF qua adapter `.web.tsx` và adapter native tương ứng.

## Thứ tự tiếp tục

1. Có Python hoạt động; dùng skill-installer cài các path còn thiếu theo bao.md, đọc expo-overview trước. Không commit skill/cấu hình cá nhân.
2. Kiên cung cấp baseline backend/auth/API client/schema đã duyệt và tài liệu sở hữu. Đọc lại main và các tài liệu mới.
3. Trước mỗi story: fetch origin, merge origin/main vào bao; giữ thay đổi người dùng. Không bắt đầu story mới nếu fetch thất bại.
4. Sprint 1: DN003 khi auth/email sẵn; LSP003 và LSP007 khi category/product API sẵn. Story bị chặn thì ghi rõ và chuyển story cùng sprint đủ phụ thuộc.
5. Sprint 2: SP004; Sprint 3: BH001 rồi BH005, VC001 theo API sẵn; Sprint 4: HD003, KH003, NV002.
6. Mỗi story tách module UI/service nhỏ, dùng contracts chung; unit/contract fixture cô lập chỉ là chuẩn bị. Nghiệm thu cần server thật và persistence qua restart.
7. Commit có Story ID; trước push đồng bộ main và chạy kiểm tra ảnh hưởng. Chỉ push bao; một PR bao → main, Kiên review; không merge/auto-merge.

Xem `API-PROPOSAL.md` cho phụ thuộc dữ liệu và `ACCEPTANCE.md` cho tình huống kiểm thử.
