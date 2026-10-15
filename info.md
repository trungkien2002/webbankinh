# Thông tin dự án

## Phạm vi và công nghệ
- Web bán kính phục vụ demo cuối môn, dùng React Native, Expo, React Native Web và TypeScript.
- Không cần backend: dữ liệu giả lập lưu tại trình duyệt, không dùng dữ liệu nhạy cảm thật. Đăng nhập là xác thực demo cục bộ.
- Cửa hàng Élan là trang đầu tiên; đăng nhập và khu quản lý tách riêng. Thiết kế xanh olive, màu kem; ảnh sản phẩm thật, font Be Vietnam Pro đóng gói trong dự án.
- Không đưa mã story, Sprint, tên người thực hiện, nguồn tham khảo hoặc chữ demo vào giao diện sản phẩm.
- Cửa hàng và khu quản lý dùng chung sản phẩm, đơn hàng, voucher và tồn kho. Đơn chờ chưa trừ tồn; thanh toán kiểm tra và trừ tồn đúng một lần.

## Git và tài liệu
- Thành viên quyền Write: Ltbaoo (Bảo) đã chấp nhận ngày 2026-10-13. Lời mời hoantnph69989 (Hoan), Khanh123453 (Khánh) vẫn chờ chấp nhận.
- Repository: trungkien2002/webbankinh. Nhánh chính main; công việc của Kiên trên kien. Đồng bộ main trước khi làm.
- Commit phải có tiền tố chỉ loại thay đổi bằng tiếng Anh và mô tả bằng tiếng Việt: `feat: ...` (tính năng mới), `fix: ...` (sửa lỗi), `update: ...` (cập nhật), `merge: ...` (hợp nhất), `refactor: ...` (tổ chức lại code), `test: ...` (kiểm thử), `chore: ...` (bảo trì). Áp dụng cả tiêu đề commit merge; không viết tiêu đề chỉ bằng tiếng Việt. Mỗi tiêu đề chỉ nêu một tính năng/mục đích chính, không liệt kê mọi hạng mục.
- Không tự push/merge main khi chưa được yêu cầu cho thay đổi đó.
- Hồ sơ dự án dùng cục bộ, không đưa Markdown và tài liệu môn học lên GitHub theo yêu cầu của người dùng.

## Giới hạn
- Burndown for Trello đã liên kết bảng yWz83uom với tài khoản trungkientrn1; nhập đủ 41 story/339 SP theo Google Sheet, dùng Points và Asia/Ho_Chi_Minh, bỏ qua thẻ lưu trữ. Khoảng biểu đồ tổng thể dự kiến 08–22/10/2026.
- Lịch suy ra từ hạn Trello: S1 08–10/10, S2 11–13/10, S3 14–20/10, S4 15–22/10/2026. Đây là đề xuất theo mốc hiện có, không phải lịch nhóm đã xác nhận; S3/S4 chồng vì hạn hóa đơn 15/10 nhưng voucher 20/10. Chưa sửa lịch Google Sheet/Trello.
- Burndown for Trello không còn đồng bộ tự động hằng ngày theo tài liệu dịch vụ; dùng Reload from Trello để cập nhật. Không nhập giờ thực tế hoặc số SP hoàn thành ước lượng từ số task; giữ Done theo thẻ.
- Dịch vụ nhận Done theo danh sách có chữ Done, không dựa trực tiếp vào phần trăm checklist. Spent/Points Completed là lượng effort đã ghi nhận theo đơn vị của bảng, không đồng nghĩa SP nghiệm thu; không nhập số checklist hay giờ vào bảng đang dùng Points. Estimates nhập trên dịch vụ không ghi ngược vào tiêu đề thẻ Trello.
- Thanh toán, giao hàng và tài khoản đều phục vụ mô phỏng demo, không kết nối dịch vụ thật.
- Giao diện web mới được kiểm tra trên trình duyệt; chưa kiểm tra bản Android/iOS.

## Sprint 1 của Kiên — bản local
- DN001 dùng xác thực local và sessionStorage: phiên mới sau đăng nhập, thời hạn tuyệt đối 8 giờ, vô hiệu khi logout/hết hạn/tài khoản không hoạt động. Phiên cũ chỉ chứa user ID yêu cầu đăng nhập lại. Không tạo backend hoặc JWT.
- Quyền được kiểm tra lại khi điều hướng và thao tác; tài khoản nhân viên đọc danh sách phân loại, chỉ admin thêm/xóa. Không coi kiểm soát phía trình duyệt là bảo mật server.
- LSP001 lưu phân loại bằng localCategoryApi và localStorage; chặn trống/trùng, ID UUID, báo lỗi khi lưu thất bại và khôi phục dữ liệu trong bộ nhớ.
- LSP005 có truy vấn async local, phân trang 10 dòng, sắp xếp tên A–Z/Z–A/mới nhất, trạng thái tải/rỗng/lỗi và thử lại. Thay đổi query hoặc sort trở về trang đầu; trang được giới hạn khi dữ liệu thay đổi.
- Các task API/JWT trên Trello vẫn là nội dung gốc và chưa được đổi/tích như backend đã làm; chỉ cập nhật tiến độ sau khi người dùng kiểm tra và chốt cách quy đổi task local.

## Quản lý công việc trên Trello
- Bảng yWz83uom chỉ hiển thị 41 User Story chính trong 4 Sprint; 67 thẻ bổ sung đã được lưu trữ theo yêu cầu mới. Mỗi Sprint chỉ dùng To do, Doing, Done.
- Mỗi User Story là một thẻ, checklist lấy đúng cột Task (phân rã) trong Sprint Backlog, tổng cộng 134 task. Quyết định này thay lựa chọn dùng Điều kiện nghiệm thu trước đó.
- Chưa tích task nào: To do; tích một phần: Doing; tích hết: Done. Người phụ trách không quyết định trạng thái. Chỉ tích task đã hoàn thành đầy đủ theo code thực tế; không coi service local là API/JWT/Cloud/email đã triển khai.
- Giữ ID, phân công, nhãn, hạn và lịch sử của thẻ chính; lưu trữ thẻ lẻ để có thể khôi phục.

## Database và chuyển động
- `data/local-database.json` là seed dùng chung: 50 mã hàng thuộc 4 phân loại (20 gọng, 20 kính râm, 7 tròng theo độ, 3 phụ kiện), cùng users, employees, customers, vouchers, invoices.
- Tên mẫu và ảnh lấy từ danh mục công khai của eyebobs. `data/catalog-sources.json` lưu xuất xứ để kiểm tra nội bộ; không đưa nguồn vào giao diện.
- Giá bán và tồn kho là dữ liệu cửa hàng tự cấu hình, không phải giá niêm yết của nhà sản xuất. Địa chỉ/email trong footer là thông tin mẫu do người dùng cho phép tự đặt.
- Ảnh tại `assets/catalog`, font và giấy phép tại `assets/fonts`. Thành viên dùng cùng mã nguồn và file seed; thay đổi lưu riêng trong localStorage, chưa có đồng bộ nhiều máy.
- Migration nạp 50 mã hàng một lần, giữ hóa đơn và mã hàng cũ để tra cứu; mã cũ không còn hiển thị trong bộ sưu tập mới. Mã hàng tự tạo được giữ.
- Slideshow ba cảnh tự chuyển mỗi 6 giây; giao diện mới bỏ nút trước/sau và dừng/tiếp tục, giữ chấm chọn cảnh. Hover tạm ngừng, ưu tiên reduced motion và tab đang hiển thị. Nút/card có hover và focus bàn phím.
- Cửa hàng mới tách trang bộ sưu tập, giỏ hàng, chi tiết sản phẩm và bài viết bằng hash route; card có xem nhanh khi hover/focus, nhấn để mở trang chi tiết. Gallery hiện có mặt trước/góc nghiêng/nhìn từ trên cho 16 mẫu với 32 ảnh bổ sung; các mẫu khác chưa có đủ ảnh thật. Giữ và kéo ảnh phóng to tại con trỏ; có điều khiển bàn phím. Không giả ảnh mặt sau khi nguồn không có.
- Giỏ hàng theo bố cục dòng sản phẩm và khối tổng tiền riêng, thu một cột dưới 900px, có tăng/giảm/xóa, voucher, form nhận hàng ở bước tiếp theo và sản phẩm gợi ý. Giỏ cửa hàng lưu localStorage riêng với đơn nháp tại quầy.
- Responsive đã kiểm tra trên browser ở 320/390/768/1024/1440px: menu quản lý thu gọn dưới 1000px; KPI hai cột ở màn vừa; quầy có lưới theo chiều rộng vùng nội dung; bảng chuyển thẻ có nhãn dưới 700px, 5 mục/trang. Nút có icon, lựa chọn tiền mặt/chuyển khoản có icon riêng, chuyển trang và thông báo thêm giỏ có animation tôn trọng reduced motion. Chưa kiểm tra thiết bị vật lý/native.
- Mật khẩu admin thử nghiệm được thay bằng migration local một lần theo yêu cầu. Giữ cơ chế đặt lại mật khẩu; không ghi giá trị mật khẩu trong hồ sơ dự án.
- Cửa hàng phân trang 12 sản phẩm; quầy bán hàng 6 sản phẩm/trang; bảng quản lý 10 dòng desktop và 5 thẻ mobile, chiếm chiều rộng vùng nội dung.

## Phiên bản đã hợp nhất
- 2026-10-15: origin/main 7cebb93 đã merge PR #3 của Bảo với 10 story local; checkout chính vẫn giữ phần Kiên chưa commit trên nền 277868d. Bản main để kiểm tra nằm ở outputs/bao-review-20261015 và chạy cổng 8086. Chưa tích hợp thay đổi Kiên với main mới.
- PR #2 hợp nhất giao diện động và database 50 mã hàng vào main ngày 2026-10-13; commit main 277868d (đổi thông điệp từ 32f0f15, giữ nguyên code). Nhánh kien vẫn được giữ cho lần làm tiếp theo.

## Tài khoản khách hàng và kế hoạch tiếp tục
- Đã thêm tài khoản khách hàng local, tách credentials/session khỏi admin. Hồ sơ gồm tổng quan, lịch sử mua, thông tin tài khoản, địa chỉ và ưu đãi; số đơn/tổng tiền lấy từ đơn đã thanh toán gắn đúng customerId, không dùng số liệu từ ảnh tham khảo.
- Hash khách hàng dùng PBKDF2/SHA-256 600.000 vòng và salt ngẫu nhiên; sessionStorage thời hạn8giờ, logout hủy phiên, giới hạn5lần sai/1phút. Đây là xác thực local trong phạm vi đã chốt, không chứng minh bảo mật server hoặc tuân thủ toàn bộ ASVS. Không ghi mật khẩu/token vào hồ sơ.
- Ảnh sản phẩm có thể chọn từ máy: JPG/PNG/WebP tối đa5MB, decode/resize1200px và lưuJPEG trong dữ liệu local. Toast giỏ hàng render portal ngoài vùng cuộn, tự hết sau4giây và làm mới khi thêm tiếp.
- Mọi thao tác chi tiết/thêm/sửa/xóa/mở tại quầy/đóng dùng icon, có nhãn trợ năng và tooltip. Invoice chia nhóm, dùng ngày giờ Việt Nam và trạng thái Việt hóa.
- Lịch một lần05:30 ngày15/10/2026 theo giờ Việt Nam trong chat này, automation ti-p-t-c-web-b-n-k-nh-05-30-ng-y-15-10. Lịch đọc progress.md và kiểm tra các nhánh/tính năng thành viên, không tự merge/push. Nếu cửa sổ quota nào dưới7% thì dừng làm, lưu tiến độ và đợi lịch/quota.

## Hồ sơ thành viên và điều hướng (15/10/2026)
- Hồ sơ khách dùng bố cục tham khảo gồm thẻ thành viên, số đơn/tổng tiền thực, menu bên, đơn gần đây và vé ưu đãi; thu một cột trên mobile. Có lịch sử mua, chi tiết đơn mở rộng, hồ sơ đo mắt, địa chỉ và thông tin tài khoản. Cửa sổ hồ sơ trong admin dùng cùng thành phần theo chiều rộng thực của modal.
- Dữ liệu khách dựng sẵn dùng tên/số điện thoại hư cấu tự nhiên; migration một lần đổi nhãn có chữ kiểm thử/test, cập nhật snapshot hóa đơn theo customerId, giữ mã định danh, tổng tiền và quan hệ. Không tạo lịch sử mua/số tiền theo ảnh tham khảo.
- Tài khoản demo khách và admin có bí danh riêng theo yêu cầu; không lưu giá trị mật khẩu trong hồ sơ dự án. Admin vào trực tiếp `/#/admin`; trang tài khoản khách không còn liên kết quản lý cửa hàng.
- Đăng nhập khách trở lại bố cục ảnh/thông điệp bên trái và form bên phải. Giỏ hàng chỉ giữ một nút Tiếp tục mua sắm, bỏ nút Trang chủ và CTA rỗng trùng chức năng.
- Chấm slideshow loại khỏi quy tắc chiều cao nút mobile, cao 8px. Gallery/thông tin/card khi chuyển sang cột không dùng flex chia chiều cao, tránh khoảng trống và chồng phần gợi ý.

- 15/10/2026: câu giới thiệu đăng nhập đổi thành 'Một góc nhìn mới. Tự tin trong từng ánh nhìn.' Hồ sơ khách mở rộng tối đa1480px, tăng cỡ chữ/menu/vé ưu đãi, chiều cao nội dung desktop tối thiểu760px. Đăng nhập chung nhận bí danh admin và chuyển đúng phiên sang quản lý; vẫn giữ đường dẫn /#/admin. Ảnh tròng kính giữ màu gốc trên nền trắng, không hòa màu darken vì làm tròng chìm vào nền.


## Thông báo và quầy bán hàng (15/10/2026)
- Thông báo dùng Toast portal cố định góc trên/phải16px, rộng340px (giới hạn chiều rộng viewport), tự tắt3000ms, có icon đóng. Đã áp dụng thông báo WebApp/admin, thêm giỏ, hồ sơ khách và BaoDialog. Lỗi riêng employeeForm/voucherForm/imageUpload cũng dùng Toast chung.
- Cột Thao tác/Hồ sơ cố định190px, phần nội dung nhận chiều rộng còn lại. POS có lọc phân loại/tồn kho/sắp xếp, card gọn, khối đơn rộng360–410px desktop và ảnh thumbnail từng sản phẩm. Chọn khách bằng tìm tên/sđt/mã, tối đa6kết quả, giữ khách vãng lai; không dựng nút cho toàn bộ danh sách.


## Khách hàng/đo mắt và vòng đời đơn tạm
- Modal đo mắt dùng SearchPicker tìm khách theo tên/sđt/mã, thẻ thông tin khách, chọn có/không thông số, hai thẻ mắt phải/trái với SPH/CYL/AXIS theo hàng, nhóm PD/ngày/ghi chú. Thu một cột trên mobile; giữ quy tắc số liệu hiện có.
- Khi lưu giỏ rỗng của đơn draft/pending, xóa bản ghi đơn chưa thanh toán khỏi dữ liệu local và reset draftId/customer/voucher ở quầy. Không cho sửa/xóa theo luồng này với đơn paid/cancelled.
- Nút chính Thêm vào giỏ hàng trên trang chi tiết dùng icon kèm chữ và chiều rộng đầy đủ; các thao tác bảng vẫn icon. Button có tùy chọn iconOnly để không ép mọi nút thêm thành ô44px.


- Hóa đơn có icon xóa riêng khi trạng thái khác paid (nháp/chờ/đã hủy), yêu cầu xác nhận trong modal. Service kiểm tra lại trạng thái và chặn paid, kể cả gọi trực tiếp. Xóa đơn đang mở sẽ reset giỏ/quầy; không đổi tồn kho qua thao tác xóa đơn chưa thanh toán.


- Quản lý sản phẩm có Chi tiết/Sửa/Xóa dạng icon. Admin sửa mã/tên/phân loại/loại/giá/tồn/thương hiệu/ảnh; kiểm tra SKU trùng, giá/tồn và phân loại hợp lệ. Xóa mềm isDeleted để giữ hóa đơn; nhân viên không có quyền sửa/xóa. imageOverride cho phép ảnh đã đổi thay ảnh catalog gốc, không hiển thị các góc cũ khi thay ảnh.


## Bản giao diện được duyệt (15/10/2026)
- Người dùng chốt bản hiện tại tại8086 là bản hoàn thiện, yêu cầu sao lưu lên nhánh kien và merge vào main trước khi nhập nhánh thành viên khác. Phạm vi phát hành là worktree outputs/bao-review-20261015 trên nền7cebb93; phần Sprint1Kiên chưa commit ở checkout chính được giữ riêng, chưa nhập vào bản này.


- Đã xuất bản: origin/kien951aacf là mốc sao lưu bản duyệt; main đã merge47df00a (cha7cebb93 và951aacf). Chưa merge nhánh Hoan/Khánh hay phần Sprint1Kiên local mới. Local checkout chính kien vẫn giữ nền277868d và thay đổi chưa commit, không tự pull/reset lên remote kien mới.

## Tích hợp logic thành viên, giữ giao diện đã duyệt
- Đợt15/10/2026 chỉ lấy service/contracts/test và phụ trợ lưu dữ liệu. Bảo926c4c8 đã có trong main, không merge lại. Hoane262a6d lấy hoan-service/test, bỏ hoan-dialog, gitlink và webbankinh-main lồng nhau.
- Bổ sung sổ importKeys/stockMovements/payments với migration mặc định rỗng cho dữ liệu local cũ. Thanh toán local có khóa chống lặp gắn invoice/method và ghi cùng transaction với tồn kho/voucher. Thêm import preview, tìm kiếm, chỉnh khách/khóa user qua service API; không thêm màn hình mới. QR là payload demo, adapter đọc file Excel chưa có trong nhánh nên chưa cung cấp uploadxlsx quaUI.
- Chi tiết phạm vi/nguồn/kiểm chứng tại docs/integration-bao-hoan-20261015.md. Giữ nguyên component/screen/CSS/ảnh/seed/package; backupkien951aacf còn nguyên.


- Merge logic Hoan đã push lên main tạiab1dd15; ancestry bao/hoan đều được ghi nhận. Không lấy hoan-dialog hoặc thư mục dự án lồng. GitHub xác nhận backupkien vẫn951aacf. Báo cáo phạm vi tại docs/integration-bao-hoan-20261015.md.
