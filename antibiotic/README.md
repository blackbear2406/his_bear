# PANTHER Antibiotic Lookup

Module kháng sinh độc lập trong repository HIS_BEAR.

## Thành phần
- `antibiotic/panther-auto.js`: runtime giao diện và nhận diện tên thuốc.
- `antibiotic/bookmarklet.txt`: launcher ngắn để dán vào URL của Chrome bookmark.
- `index.html`: trang GitHub Pages.

## Xuất dữ liệu từ eMed
1. Mở trang [Hướng dẫn liều kháng sinh eMed](https://emed.bvbnd.vn/wiki/duoc/khang-sinh/lieu/).
2. Tạo bookmark mới, dán dòng trong `antibiotic/emed-export-bookmarklet.txt` vào trường URL.
3. Bấm bookmark để tải `panther-emed-antibiotics.json`.
4. Mở VNPT-HIS, chạy PANTHER AUTO và chọn **Nạp danh mục JSON**.

Exporter chỉ gom tên thuốc và ảnh bảng liều theo thứ tự heading trên trang; chưa trích xuất hoặc diễn giải nội dung ảnh thành liều dạng chữ.

## Dùng thử
1. Bật GitHub Pages bằng GitHub Actions cho repository.
2. Tạo bookmark mới, dán nguyên dòng trong `antibiotic/bookmarklet.txt` vào trường URL.
3. Mở VNPT-HIS, bấm bookmark.
4. Trong panel PANTHER, chọn **Nạp danh mục JSON** và chọn tệp danh mục tương thích.
5. Gõ ít nhất 3 ký tự tên thuốc trong ô nhập. Chọn thuốc để xem tóm tắt/bảng ảnh nguồn.

## Định dạng danh mục
```json
{
  "schema": "panther-antibiotic-catalog-v1",
  "drugs": [
    {
      "name": "Tên thuốc",
      "aliases": ["tên khác"],
      "summary": {
        "Liều dùng": "Chỉ điền khi đã xác minh nguồn",
        "Cách dùng": "..."
      },
      "images": [
        { "src": "https://emed.bvbnd.vn/...", "alt": "Bảng liều" }
      ],
      "sourceUrl": "https://emed.bvbnd.vn/wiki/duoc/khang-sinh/lieu/"
    }
  ]
}
```

## Giới hạn bản 0.1.0
- Runtime quan sát INPUT/TEXTAREA/contenteditable và iframe cùng origin; HIS dùng iframe khác origin sẽ không truy cập được.
- Chưa khóa bộ nhận diện vào đúng trường kê thuốc vì cần kiểm tra DOM thực tế của màn hình kê đơn.
- Danh mục không được tự tạo liều. Tệp đầu vào phải được đối chiếu eMed trước khi sử dụng.
- Công cụ chỉ hiển thị tham khảo, không thay thế đánh giá lâm sàng và quy trình kê đơn của bệnh viện.
