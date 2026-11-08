# 🌲 Realm of Terracraft - 2D Pixel Survival Adventure

Trò chơi sinh tồn, phiêu lưu và xây dựng phong cách 2D Sandbox cổ điển lấy cảm hứng từ Terraria & Minecraft. Game được tối ưu hóa siêu nhẹ, chạy mượt mà 60 FPS trên trình duyệt web cả máy tính và điện thoại thông minh.

---

## 🚀 Hướng Dẫn Đưa Lên GitHub & Kích Hoạt GitHub Pages

Trò chơi đã được cấu hình sẵn đường dẫn tương đối (`base: './'`) trong `vite.config.ts` và tích hợp sẵn quy trình tự động hóa **GitHub Actions** (`.github/workflows/deploy.yml`).

### Bước 1: Khởi tạo và Đẩy Code lên Repository GitHub
Mở terminal tại thư mục chứa source code và chạy:
```bash
git init
git add .
git commit -m "Initial commit: Terracraft 2D Game"
git branch -M main
git remote add origin https://github.com/TÊN_TÀI_KHOẢN/TÊN_REPOSITORY.git
git push -u origin main
```

### Bước 2: Bật GitHub Pages trên GitHub
1. Vào repository của bạn trên **GitHub.com**.
2. Chọn tab **Settings** (Cài đặt) -> Chọn mục **Pages** ở cột bên trái.
3. Ở phần **Build and deployment** -> **Source**:
   - Chọn **GitHub Actions**.
4. GitHub Actions sẽ tự động kích hoạt workflow, biên dịch mã nguồn và xuất bản trang web của bạn tại địa chỉ:
   `https://<ten-tai-khoan>.github.io/<ten-repo>/`

---

## 🛠️ Chạy Thử Ở Máy Cá Nhân (Local Development)

```bash
# 1. Cài đặt các thư viện phụ thuộc
npm install

# 2. Khởi chạy máy chủ phát triển
npm run dev

# 3. Biên dịch bản xuất bản chính thức (Production Build)
npm run build
```
Thư mục `dist/` sau khi build chứa toàn bộ các file HTML, JS, CSS tĩnh độc lập, có thể upload lên bất kỳ dịch vụ hosting tĩnh nào (GitHub Pages, Netlify, Vercel, Cloudflare Pages,...).

---

## 🎮 Hướng Dẫn Phím Điều Khiển

| Thao tác | Bàn Phím / Chuột | Cảm Ứng (Điện Thoại) |
|---|---|---|
| Di chuyển trái / phải | **A / D** hoặc Phím mũi tên | Nút mũi tên ảo Trái / Phải |
| Nhảy lên | **W** hoặc **Space** | Nút mũi tên Lên |
| Tụt xuống qua bậc gỗ | **S** | Nút mũi tên Xuống |
| Đào mỏ / Chặt gỗ / Chém kiếm / Bắn tên | **Chuột Trái** | Nút Hồng Tâm Hành Động (Đỏ) |
| Đặt khối / Cắm đuốc / Đặt bàn chế tạo | **Chuột Phải** | Chạm giữ vào ô đất |
| Chọn nhanh vật phẩm | **1 - 9** | Chạm vào ô tương ứng trên thanh Hotbar |
| Mở túi đồ (30 ô) | **E** | Nút icon Túi Đồ ở góc trên |
| Mở Lò Chế Tạo | **C** | Nút icon Búa ở góc trên |
| Quản lý Thành Viên Đồng Đội | **V** | Nút icon Nhóm ở góc trên |
| Uống bình máu nhanh | **Q** | Tự động dùng bình máu trong túi |
| Tạm dừng trò chơi | **Esc** | Nút Tạm Dừng |
