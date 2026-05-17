# Hướng dẫn sử dụng AutoTest UI

## Giới thiệu

AutoTest UI là công cụ giúp bạn tự động tạo và chạy test cho API mà không cần viết code thủ công.  
Giao diện tương tự Postman — nhập API vào, hệ thống tự tạo test cases và chạy luôn.

---

## Cấu trúc dự án

```
automation-test/
├── backend/                    ← Python / FastAPI
│   ├── web/
│   │   ├── app.py              ← API routes
│   │   ├── generator.py        ← Tự động tạo test code
│   │   ├── runner.py           ← Chạy pytest, stream kết quả
│   │   ├── database.py         ← Lưu/đọc SQLite
│   │   └── data.db             ← Database (tự tạo khi chạy lần đầu)
│   ├── tests/
│   │   ├── _generated/         ← File test tạm (tự xóa sau khi chạy)
│   │   └── api/                ← API tests viết tay
│   ├── run_web.py              ← Khởi động server
│   ├── requirements.txt        ← Dependencies cho pytest
│   ├── requirements_web.txt    ← Dependencies cho web server
│   └── venv/                   ← Python virtual environment
└── frontend/                   ← React / Vite
    ├── src/
    │   ├── App.jsx
    │   ├── api.js              ← Tất cả API calls
    │   ├── components/
    │   └── pages/
    ├── package.json
    └── vite.config.js
```

---

## Cài đặt lần đầu

Chỉ cần làm 1 lần duy nhất. Cần cài sẵn: **Python 3.9+** và **Node.js 18+**.

---

### macOS

Mở **2 cửa sổ Terminal**.

**Terminal 1 — Backend:**
```zsh
cd ~/Desktop/automation-test/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt -r requirements_web.txt eval_type_backport
python3 run_web.py
```

**Terminal 2 — Frontend:**
```zsh
cd ~/Desktop/automation-test/frontend
npm install
npm run dev
```

**Mở trình duyệt:**
```
http://localhost:5173
```

---

### Windows

Mở **2 cửa sổ PowerShell**.

**PowerShell 1 — Backend:**
```powershell
cd D:\Work\automation-test\backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt -r requirements_web.txt
python run_web.py
```

**PowerShell 2 — Frontend:**
```powershell
cd D:\Work\automation-test\frontend
npm install
npm run dev
```

**Mở trình duyệt:**
```
http://localhost:5173
```

---

## Những lần sau

Backend và Frontend phải chạy cùng lúc.

**macOS:**
```zsh
# Terminal 1
cd ~/Desktop/automation-test/backend
source venv/bin/activate
python3 run_web.py

# Terminal 2
cd ~/Desktop/automation-test/frontend
npm run dev
```

**Windows:**
```powershell
# PowerShell 1
cd D:\Work\automation-test\backend
venv\Scripts\activate
python run_web.py

# PowerShell 2
cd D:\Work\automation-test\frontend
npm run dev
```

---

## Cách sử dụng hàng ngày

### 1. Tạo test case mới

Mở `http://localhost:5173` → Tab **New Test**

| Trường | Mô tả | Ví dụ |
|--------|-------|-------|
| **Tên test case** | Đặt tên dễ nhớ | `Get danh sách sản phẩm` |
| **Method** | HTTP method | GET / POST / PUT / PATCH / DELETE |
| **URL** | Địa chỉ API đầy đủ | `https://api.example.com/products` |
| **Params** | Query parameters | `page=1`, `limit=10` |
| **Headers** | Request headers | `Authorization: Bearer <token>` |
| **Body** | Request body (JSON) | `{"name": "Sản phẩm A"}` |

### 2. Generate test functions

Sau khi điền thông tin, bấm nút **⚡ Generate**.

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
- Dòng xanh = test PASSED
- Dòng đỏ = test FAILED
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
backend/web/data.db    ← SQLite database
```

| Bảng | Nội dung |
|------|----------|
| `test_cases` | Thông tin API + generated code |
| `test_runs` | Lịch sử mỗi lần chạy (status, passed, failed, log) |

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

### Backend không khởi động

**macOS:**
```zsh
# Kiểm tra port 8000 có đang bị dùng không
lsof -i :8000

# Kill process đang chiếm port
lsof -ti:8000 | xargs kill -9
```

**Windows:**
```powershell
# Kiểm tra port 8000 có đang bị dùng không
netstat -ano | findstr :8000
```

### Frontend không khởi động

```zsh
# Kiểm tra port 5173
lsof -i :5173           # macOS
netstat -ano | findstr :5173   # Windows

# Cài lại node_modules nếu cần
cd frontend
rm -rf node_modules
npm install
```

---

## Workflow khuyến nghị

```
1. Bật backend:    python3 run_web.py     (cổng 8000)
2. Bật frontend:   npm run dev             (cổng 5173)
3. Mở browser:     http://localhost:5173
4. Nhập API info → Generate
5. Xem code được tạo ra (panel trái)
6. Bấm Run Tests → xem kết quả real-time
7. Vào History để xem lại hoặc chạy lại bất cứ lúc nào
```
