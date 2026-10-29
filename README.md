# Hoiso Synergy League 2026

Website thống kê giải bóng đá 6 đội: bảng xếp hạng, kết quả, vua phá lưới, thẻ phạt, đăng ký tài khoản và nhận đội.

## Cấu trúc
- `public/` – giao diện (index.html, app.js, banner, logo)
- `api/` – máy chủ chạy trên Vercel (auth, state, team)
- `data/seed.json` – dữ liệu giải ban đầu (tên đội, lịch, kết quả đã nhập). Chỉ dùng một lần, khi kho dữ liệu còn trống.

## Phân quyền
- **Mọi người**: xem bảng xếp hạng, kết quả, cầu thủ (không cần đăng nhập).
- **Đội trưởng** (đăng ký tên + mật khẩu, nhận một đội còn trống): sửa danh sách cầu thủ đội mình.
- **Ban tổ chức** (tên nằm trong `ADMIN_USERNAMES`): nhập tỉ số, diễn biến, đổi tên đội, gỡ đội trưởng.

## Triển khai
1. Tạo repository trên GitHub, đẩy toàn bộ thư mục này lên (giữ nguyên cấu trúc thư mục).
2. Vào vercel.com → Add New Project → chọn repository. Không cần đổi cài đặt build.
3. Trong dự án Vercel: Storage → tạo một database **Upstash Redis** (có gói miễn phí) và kết nối vào dự án. Vercel sẽ tự thêm biến môi trường kết nối.
4. Settings → Environment Variables, thêm:
   - `SESSION_SECRET`: chuỗi ngẫu nhiên dài từ 32 ký tự trở lên
   - `ADMIN_USERNAMES`: tên đăng nhập ban tổ chức, ví dụ `btc` (nhiều tên cách nhau bằng dấu phẩy)
   - `ADMIN_CODE`: mã bí mật dùng khi đăng ký tài khoản ban tổ chức
5. Deploy lại (Deployments → Redeploy).
6. Mở website, đăng ký ngay tài khoản ban tổ chức (tên trong `ADMIN_USERNAMES` + mã `ADMIN_CODE`) trước khi chia sẻ link.

## Bảo mật đã có
Mật khẩu băm bằng scrypt; cookie đăng nhập HttpOnly, Secure, SameSite=Lax, ký HMAC, hết hạn sau 30 ngày; giới hạn số lần đăng nhập và đăng ký; kiểm tra Origin; máy chủ tự kiểm quyền cho mọi thao tác ghi.

## Giới hạn
- Ai đăng ký trước được nhận đội trước. Ban tổ chức có thể bấm “Gỡ đội trưởng” ở tab Đội bóng.
- Không có chức năng quên mật khẩu hay đổi mật khẩu.
- Logo gắn theo tên đội; đổi tên đội thì logo không hiện.
- Dữ liệu giải lưu thành một bản duy nhất; hai người lưu cùng lúc thì lần lưu sau thắng.
