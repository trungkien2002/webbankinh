# Nhật ký tiến độ phân hệ của Khánh (`khanh`)

- Thành viên phụ trách: Khánh
- Nhánh: `khanh`
- Người kiểm duyệt: Kiên (`trungkien2002`)
- Số lượng tính năng: 10 tính năng (84 SP, 336 giờ dự kiến)
- Framework: React Native + Expo + React Native Web + TypeScript

---

## 1. Danh sách tính năng và trạng thái triển khai

| Sprint | Story ID | Tên tính năng | SP | Trạng thái | Kiểm thử tự động |
|---|---|---|:---:|:---:|:---:|
| **Sprint 1** | **DN004** | Tạo tài khoản (Admin tạo user cho nhân viên & phân quyền) | 8 | **Đã hoàn thành** | 5/5 test pass |
| **Sprint 1** | **LSP004** | Xóa phân loại kính (Xóa mềm, validate ràng buộc SP) | 7 | **Đã hoàn thành** | 5/5 test pass |
| **Sprint 2** | **SP001** | Thêm sản phẩm kính thủ công (SKU, giá, tồn, thông số) | 10 | **Đã hoàn thành** | 5/5 test pass |
| **Sprint 2** | **SP005** | Tìm kiếm sản phẩm kính (Đa tiêu chí: dáng, hãng, giá) | 8 | **Đã hoàn thành** | 5/5 test pass |
| **Sprint 3** | **BH002** | Danh sách hoá đơn chờ thanh toán (Treo hoá đơn) | 9 | **Đã hoàn thành** | 3/3 test pass |
| **Sprint 3** | **BH006** | Áp dụng voucher giảm giá kính (% & tiền cố định) | 9 | **Đã hoàn thành** | 4/4 test pass |
| **Sprint 3** | **VC002** | Sửa thông tin voucher (Thời hạn, mức giảm, điều kiện) | 9 | **Đã hoàn thành** | 4/4 test pass |
| **Sprint 4** | **HD004** | Lọc hóa đơn theo thời gian, trạng thái (thanh toán, mài kính) | 7 | **Đã hoàn thành** | 3/3 test pass |
| **Sprint 4** | **KH004** | Tìm kiếm thông tin khách hàng (SĐT, mã hồ sơ, tốc độ <300ms) | 7 | **Đã hoàn thành** | 3/3 test pass |
| **Sprint 4** | **NV001** | Thêm thông tin nhân viên (Tạo employee liên kết user DN004) | 10 | **Đã hoàn thành** | 3/3 test pass |

**Tổng kết:** **10/10 tính năng hoàn thành**, **39/39 test case kiểm thử pass 100%**.

---

## 2. Kết quả kiểm thử kỹ thuật
- `npm run typecheck`: **Pass** (`tsc --noEmit` 0 lỗi)
- `npm test`: **Pass** (`vitest run` 39 tests pass trên 4 test suite)
- `npm run build:web`: **Pass** (Export thành công bản web vào `dist/`)

---

## 3. Bản đồ cấu trúc tệp mã nguồn
- `src/contracts/domain.ts`: Hợp đồng dữ liệu và các entity cốt lõi (`User`, `Employee`, `Category`, `Product`, `Voucher`, `Customer`, `Invoice`).
- `src/services/database.ts`: Tầng persistence dữ liệu cục bộ với cơ chế khôi phục từ Storage và Seed Data.
- `src/services/authService.ts`: Nghiệp vụ `DN004`.
- `src/services/categoryService.ts`: Nghiệp vụ `LSP004`.
- `src/services/productService.ts`: Nghiệp vụ `SP001` & `SP005`.
- `src/services/voucherService.ts`: Nghiệp vụ `VC002` & `BH006`.
- `src/services/invoiceService.ts`: Nghiệp vụ `BH002` & `HD004`.
- `src/services/customerService.ts`: Nghiệp vụ `KH004`.
- `src/services/employeeService.ts`: Nghiệp vụ `NV001`.
- `src/screens/home/index.tsx`: Giao diện React Native trực quan, đầy đủ biểu mẫu thao tác, thông báo modal cho toàn bộ 10 tính năng.
