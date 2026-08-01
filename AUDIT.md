# LiftPath — audit và định hướng thiết kế lại

## Kết luận

Nền tảng dữ liệu hiện tại đủ tốt để tiếp tục phát triển: lịch sử, buổi tập đang dở, chỉ số cơ thể và cài đặt đều được lưu cục bộ; phần chương trình, state và timer đã tách khỏi giao diện. Điểm nghẽn chính nằm ở trải nghiệm sử dụng và khả năng bảo trì của lớp UI.

## Phát hiện quan trọng

### 1. Thứ bậc thông tin chưa phục vụ hành động chính

Màn hình đầu dành nhiều diện tích cho cấp độ, huy hiệu, thử thách, emoji và nhãn “Pro”. Người dùng phải đọc qua nhiều thành phần trước khi tới hành động quan trọng nhất: xem buổi tiếp theo, bắt đầu tập và nhập hiệp.

**Thay đổi:** đưa buổi tiếp theo và nút bắt đầu lên đầu; gamification được rút thành tiến độ tuần và chuỗi duy trì ngắn gọn.

### 2. Ngôn ngữ hình ảnh thiếu nhất quán

Giao diện trộn icon Lucide, emoji, gradient tím/cam/xanh lá, glassmorphism và nhiều kiểu thẻ. Điều này tạo cảm giác giống landing page hơn là công cụ dùng trong lúc tập.

**Thay đổi:** dùng một hệ màu tối trung tính, một màu nhấn lime, icon thống nhất, khoảng cách và bán kính theo token.

### 3. Luồng tập cần rõ và nhanh hơn

Bảng nhập hiệp, bộ đếm nghỉ và điều hướng bài tập bị cạnh tranh thị giác. Một số thông báo trong giao diện cũng khẳng định tính năng chưa được triển khai, ví dụ giữ màn hình luôn sáng.

**Thay đổi:** tạo “workout cockpit” riêng với progress cố định, timer nổi bật khi hoạt động, stepper bài tập, bảng hiệp có nhãn truy cập và điều hướng bài trước/bài sau.

### 4. Thao tác phá hủy dữ liệu dùng DOM mutation

Xác nhận hủy/xóa được thực hiện bằng `dataset`, `innerHTML` và `setTimeout`. Cách này khó bảo trì, không ổn định với React và yếu về accessibility.

**Thay đổi:** quản lý trạng thái xác nhận bằng React state; dùng dialog/bottom sheet rõ ràng cho hủy buổi, kết thúc buổi và xóa dữ liệu.

### 5. Responsive mới chỉ tối ưu cho mobile hẹp

App bị giới hạn ở chiều rộng 520px và hiển thị như một cột điện thoại trên desktop.

**Thay đổi:** thêm layout desktop với sidebar, chiều rộng nội dung lớn hơn; mobile vẫn dùng bottom navigation và safe-area.

### 6. Accessibility còn thiếu

Thiếu `aria-current`, nhãn cho nhiều input, progress semantics, hỗ trợ Escape cho modal và focus style nhất quán.

**Thay đổi:** bổ sung semantic roles, labels, visible focus, `aria-live` cho timer, hỗ trợ reduced motion và đóng modal bằng Escape.

### 7. PWA chưa có trải nghiệm offline đầy đủ

Service worker chỉ xử lý nhắc timer, chưa cache app shell. Màu manifest cũng không khớp nền tối của app.

**Thay đổi:** thêm runtime cache cho navigation và asset cùng origin, dọn cache cũ, đồng bộ manifest/theme color.

### 8. Quy trình CI không kiểm tra pull request

Workflow chỉ chạy khi push vào `main`, vì vậy lỗi TypeScript/build có thể chỉ lộ ra sau khi merge.

**Thay đổi:** chạy type check và build trên pull request; chỉ triển khai Pages khi push vào `main`.

## Phạm vi giữ nguyên

- Cấu trúc dữ liệu trong localStorage và khóa lưu trữ.
- Giáo án A/B/C, danh sách bài tập và chu kỳ phase.
- Bộ đếm nghỉ, âm báo, rung và nhắc lịch.
- Lịch sử buổi tập và chỉ số cơ thể hiện có.

Vì không đổi schema, dữ liệu người dùng hiện tại tiếp tục được đọc sau khi cập nhật.

## Kiểm chứng

- `App.tsx` đã được kiểm tra cú pháp và type surface bằng TypeScript 5.8.3 với stub tương ứng các module hiện tại.
- `styles.css` đã được parse bằng PostCSS.
- Workflow mới sẽ chạy `npm ci`, `npm run lint` và `npm run build` trên pull request bằng dependency thật của repository.
