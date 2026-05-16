# Hướng dẫn sử dụng AutoTest UI

## Giới thiệu

AutoTest UI là công cụ giúp bạn tự động tạo và chạy test cho API mà không cần viết code thủ công.  
Giao diện tương tự Postman — nhập API vào, hệ thống tự tạo test cases và chạy luôn.

---

## Cài đặt lần đầu

Chỉ cần làm 1 lần duy nhất.

**Bước 1 — Cài Python dependencies:**
```powershell
cd D:\Work\automation-test
pip install -r requirements.txt
pip install -r requirements_web.txt
playwright install chromium
```

**Bước 2 — Khởi động server:**
```powershell
cd D:\Work\automation-test
python run_web.py
```

**Bước 3 — Mở trình duyệt và truy cập:**
```
http://localhost:8000
```

> Server cần đang chạy mỗi khi bạn muốn dùng. Giữ cửa sổ terminal mở.

---

## Cách sử dụng hàng ngày

### 1. Tạo test case mới

Mở `http://localhost:8000` → Tab **New Test**

| Trường | Mô tả | Ví dụ |
|--------|-------|-------|
| **Tên test case** | Đặt tên dễ nhớ | `Get danh sách sản phẩm` |
| **Method** | HTTP method | GET / POST / PUT / PATCH / DELETE |
| **URL** | Địa chỉ API đầy đủ | `https://api.example.com/products` |
| **Params** | Query parameters | `page=1`, `limit=10` |
| **Headers** | Request headers | `Authorization: Bearer <token>` |
| **Body** | Request body (JSON) | `{"name": "Sản phẩm A"}` |

### 2. Generate test functions

Sau khi điền thông tin, bấm nút **⚡ Generate Tests**.

Hệ thống sẽ:
1. Gọi API của bạn để kiểm tra response
2. Tự động tạo các test functions phù hợp
3. Hiển thị code được sinh ra ở panel bên trái
4. Lưu vào database

**Các test functions được tạo tự động:**
- Kiểm tra status code đúng không
- Kiểm tra response time < 5 giây
- Kiểm tra response trả về JSON
- Kiểm tra response có đủ các fields cần thiết
- Với list: kiểm tra không rỗng, từng item có đủ fields
- Với POST/PUT: kiểm tra dữ liệu đã gửi được phản hồi lại

### 3. Chạy test

Bấm nút **▶ Run Tests** ở panel bên phải.

Kết quả hiển thị theo thời gian thực:
- 🟢 Dòng xanh = test PASSED
- 🔴 Dòng đỏ = test FAILED
- Cuối cùng hiển thị tổng: Passed / Failed / Total

### 4. Xem lịch sử

Click tab **History** trên header để xem tất cả lần test đã chạy.

Mỗi dòng trong lịch sử có thể:
- **Output** — Xem chi tiết log của lần chạy đó
- **Re-run** — Chạy lại test case đó
- **Delete** — Xóa khỏi lịch sử

---

## Dữ liệu lưu ở đâu

```
D:\Work\automation-test\web\data.db    ← SQLite database
```

| Bảng | Nội dung |
|------|----------|
| `test_cases` | Thông tin API + generated code |
| `test_runs` | Lịch sử mỗi lần chạy (status, passed, failed, log) |

---

## Cấu trúc dự án

```
automation-test/
├── web/
│   ├── app.py          ← FastAPI server (routes)
│   ├── generator.py    ← Tự động tạo test code từ API config
│   ├── runner.py       ← Chạy pytest, stream kết quả về UI
│   ├── database.py     ← Lưu/đọc SQLite
│   ├── data.db         ← Database (tự tạo khi chạy lần đầu)
│   └── static/
│       └── index.html  ← Giao diện web
├── tests/
│   ├── _generated/     ← File test tạm (tự xóa sau khi chạy)
│   ├── api/            ← API tests viết tay
│   └── web/            ← Web UI tests viết tay
├── run_web.py          ← Khởi động server
├── requirements.txt    ← Dependencies cho pytest
└── requirements_web.txt← Dependencies cho web server
```

---

## Xử lý lỗi thường gặp

### "Không thể kết nối tới URL"
- Kiểm tra URL có đúng không
- Kiểm tra API có đang chạy không
- Nếu API cần VPN, hãy bật VPN trước

### "API timeout sau 10 giây"
- API phản hồi quá chậm
- Kiểm tra network, thử lại sau

### Test FAILED
- Bấm **Output** trong History để xem chi tiết lỗi
- Dòng đỏ sẽ chỉ rõ test nào fail và lý do

### Server không khởi động
```powershell
# Kiểm tra port 8000 có đang bị dùng không
netstat -ano | findstr :8000

# Đổi port nếu cần — sửa file run_web.py
# port=8000  →  port=8001
```

---

## Workflow khuyến nghị

```
1. Bật server:     python run_web.py
2. Mở browser:     http://localhost:8000
3. Nhập API info → Generate Tests
4. Xem code được tạo ra (panel trái)
5. Bấm Run Tests → xem kết quả real-time
6. Vào History để xem lại hoặc chạy lại bất cứ lúc nào
```
