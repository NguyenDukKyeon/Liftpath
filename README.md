# LiftPath

Ứng dụng PWA tập luyện cá nhân, không giới hạn số tuần. Dữ liệu được lưu cục bộ trên từng thiết bị.

## Chạy trên máy tính

Yêu cầu Node.js 20 trở lên:

```powershell
npm install
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal. Để mở thử từ điện thoại trong cùng Wi-Fi, dùng địa chỉ mạng được Vite hiển thị. Thông báo và cài PWA đầy đủ cần HTTPS.

## Kiểm tra production

```powershell
npm run lint
npm run build
npm run preview
```

## GitHub Pages

Ứng dụng production hiện được xuất bản từ nhánh `gh-pages`. Workflow `.github/workflows/deploy.yml` tự kiểm tra TypeScript và production build khi có commit lên `main`.

URL đang hoạt động:

<https://nguyendukkyeon.github.io/https-github.com-DukKyeonn-liftpath/>

## Giới hạn thông báo nền

Thông báo chính xác khi app đang mở. Khi app đóng hoàn toàn, việc nhắc nền phụ thuộc hệ điều hành, trình duyệt và cách PWA được cài; không có dịch vụ push phía máy chủ nên không thể bảo đảm trên mọi thiết bị.
