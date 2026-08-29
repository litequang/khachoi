# HƯỚNG DẪN DEPLOY MỚI (FIREBASE SPARK PLAN)

Ứng dụng này đã được tối ưu hoàn toàn để chạy 100% trên Client (Client-side/Serverless) bằng Firebase Client SDK, không cần Backend, không cần Cloud Run và **hoàn toàn miễn phí trên gói Spark Plan**.

### Bước 1: Cấu hình Firebase Console
* Tạo một dự án Firebase mới (hoặc dùng dự án hiện có).
* **Giữ nguyên gói Spark Plan (Free)**, không cần thêm thẻ thanh toán hay bật Blaze.
* Vào **Authentication** → Bật phương thức đăng nhập bằng **Email/Password**.
* Vào **Firestore Database** → Tạo một database mới (vị trí gần bạn như asia-southeast1).
* Vào **Hosting** → Nhấn Get Started.

### Bước 2: Tạo Admin đầu tiên thủ công (Setup 1 lần duy nhất)
Vì hệ thống bảo mật không cho phép user tự đăng ký, bạn cần tạo tài khoản quản trị viên đầu tiên bằng tay:
1. Vào Firebase Console → Authentication → Users.
2. Bấm **Add user** và nhập:
   - Email: `admin@task.local`
   - Password: `admin@123456`
3. Sao chép **User UID** của tài khoản vừa tạo.
4. Chuyển sang phần Firestore Database.
5. Tạo collection `users`, tạo một document mới với ID chính là **User UID** vừa copy, sau đó thêm các field sau:
   - `username`: "admin" (kiểu String)
   - `displayName`: "Admin" (kiểu String)
   - `role`: "ADMIN" (kiểu String)
   - `active`: true (kiểu Boolean)

### Bước 3: Build giao diện Frontend
Mở Terminal tại thư mục mã nguồn và chạy:
```bash
npm install
npm run build
```

### Bước 4: Deploy lên Firebase Hosting & Rules
Đảm bảo bạn đã cài `firebase-tools` (npm i -g firebase-tools).
```bash
firebase login
firebase use <project-id-của-bạn>
firebase deploy --only firestore:rules,hosting
```

**(Tùy chọn)** Nếu ứng dụng yêu cầu index cho tính năng sắp xếp/lọc trong tương lai:
```bash
firebase deploy --only firestore:indexes
```

🎉 **Hoàn tất!** Giờ đây bạn có thể truy cập tên miền Firebase Hosting của bạn, đăng nhập bằng `admin` và bắt đầu sử dụng, hoặc tạo thêm các tài khoản SALE, DESIGNER trực tiếp từ giao diện Quản trị viên của ứng dụng. Mọi thứ hoạt động độc lập không cần máy chủ riêng!
