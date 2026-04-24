# Quản Lý Chi Tiêu Team / Team Expense Management

> 🇻🇳 App quản lý chi tiêu nhóm chạy trên Google Apps Script — không cần server, không cần database phức tạp.
>
> 🇬🇧 A team expense management web app running on Google Apps Script — no server, no complex database required.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-orange.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-V8-green.svg)](https://developers.google.com/apps-script)

---

## 📋 Mục lục / Table of Contents

- [Giới thiệu / Introduction](#-giới-thiệu--introduction)
- [Tính năng / Features](#-tính-năng--features)
- [Kiến trúc / Architecture](#-kiến-trúc--architecture)
- [Cài đặt / Installation](#-cài-đặt--installation)
- [Cấu trúc file / File Structure](#-cấu-trúc-file--file-structure)
- [Database Schema](#database-schema)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Giới thiệu / Introduction

### 🇻🇳 Tiếng Việt

**Quản Lý Chi Tiêu Team** là một web app nội bộ dành cho nhóm/công sở, giúp theo dõi và phân chia chi tiêu một cách minh bạch. App chạy hoàn toàn trên **Google Apps Script** và lưu trữ dữ liệu trên **Google Sheets** — không cần hosting, không tốn chi phí server.

### 🇬🇧 English

**Team Expense Management** is an internal web app for teams/offices to track and split expenses transparently. The app runs entirely on **Google Apps Script** with data stored in **Google Sheets** — no hosting required, no server costs.

---

## ✨ Tính năng / Features

### 🇻🇳 Tính năng chính

| Mã | Tính năng | Mô tả |
|----|------------|--------|
| **F1** | Tối ưu hóa nợ | Thuật toán greedy collapse chuỗi nợ A→B→C thành A→C |
| **F2** | Analytics Dashboard | Chart.js bar/doughnut charts, filter theo tháng, so sánh tháng |
| **F3** | Chỉnh sửa giao dịch | Modal edit đầy đủ, validation phía client |
| **F5a** | Audit log thanh toán | Sheet `LichSuThanhToan` ghi lại ai trả, lúc nào |
| **F5b** | Xuất CSV | Export lịch sử ra file CSV (UTF-8 BOM) |
| **F6** | Batch Settlement | Chọn nhiều dòng nợ, duyệt trả hàng loạt |
| **F7** | Debt Search & Filter | Filter nợ theo người nợ/chủ nợ/khoảng tiền, Layout B 2-row fixed |

### 🇬🇧 Features

| Code | Feature | Description |
|------|---------|-------------|
| **F1** | Debt Optimization | Greedy algorithm collapses A→B→C debt chains into A→C |
| **F2** | Analytics Dashboard | Chart.js bar/doughnut charts, month filter, month-over-month comparison |
| **F3** | Edit Transaction | Full edit modal with client-side validation |
| **F5a** | Payment Audit Log | `LichSuThanhToan` sheet records who paid and when |
| **F5b** | CSV Export | Export transaction history to CSV (UTF-8 BOM) |
| **F6** | Batch Settlement | Select multiple debt rows, batch mark as paid |
| **F7** | Debt Search & Filter | Filter debts by debtor/creditor/amount range, Layout B 2-row fixed |

---

## 🏗️ Kiến trúc / Architecture

### 🇻🇳 Sơ đồ kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (SPA)                          │
│  index.html + Partial HTMLs + Vanilla JS (utils.html)          │
│  ├── Tailwind CSS (CDN)                                        │
│  ├── Chart.js 4.x (CDN)                                        │
│  └── google.script.run (GAS RPC)                              │
└────────────────────┬──────────────────────────────────────────┘
                     │ HTTP (google.script.run)
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│               Google Apps Script Runtime                       │
│  Code.gs                                                         │
│  ├── doGet() → HtmlService                                     │
│  ├── include() → HtmlService                                   │
│  └── [GAS functions] → LockService + Sheets API                │
└────────────────────┬──────────────────────────────────────────┘
                     │ Sheets API
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Google Sheets (Database)                     │
│  ├── ThanhVien   (members)                                    │
│  ├── GiaoDich    (transactions)                                │
│  ├── ChiTiet     (per-person debt in each transaction)         │
│  └── LichSuThanhToan (payment audit log)                       │
└─────────────────────────────────────────────────────────────────┘
```

### 🇬🇧 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (SPA)                          │
│  index.html + Partial HTMLs + Vanilla JS (utils.html)          │
│  ├── Tailwind CSS (CDN)                                        │
│  ├── Chart.js 4.x (CDN)                                        │
│  └── google.script.run (GAS RPC)                              │
└────────────────────┬──────────────────────────────────────────┘
                     │ HTTP (google.script.run)
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│               Google Apps Script Runtime                       │
│  Code.gs                                                         │
│  ├── doGet() → HtmlService                                     │
│  ├── include() → HtmlService                                   │
│  └── [GAS functions] → LockService + Sheets API                │
└────────────────────┬──────────────────────────────────────────┘
                     │ Sheets API
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Google Sheets (Database)                     │
│  ├── ThanhVien   (members)                                    │
│  ├── GiaoDich    (transactions)                                │
│  ├── ChiTiet     (per-person debt in each transaction)         │
│  └── LichSuThanhToan (payment audit log)                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Cài đặt / Installation

### 🇻🇳 Hướng dẫn cài đặt

1. **Mở Google Apps Script**
   - Truy cập [script.google.com](https://script.google.com)
   - Tạo project mới (Blank project)

2. **Copy files vào project**
   - Copy nội dung của các file `Code.gs`, `index.html`, `utils.html`, và các partial HTML vào project tương ứng

3. **Tạo Google Sheets database**
   - Tạo Spreadsheet mới với 4 sheets: `ThanhVien`, `GiaoDich`, `ChiTiet`, `LichSuThanhToan`
   - Copy Spreadsheet ID từ URL (phần giữa `/d/` và `/edit`)

4. **Cấu hình Spreadsheet ID**
   - Trong `Code.gs`, tìm dòng `MY_SPREADSHEET_ID` và điền Spreadsheet ID của bạn

5. **Deploy**
   - Run `initializeSpreadsheet()` một lần để khởi tạo header rows
   - Deploy as Web App → Execute as: Me → Who has access: Anyone

### 🇬🇧 Installation Guide

1. **Open Google Apps Script**
   - Go to [script.google.com](https://script.google.com)
   - Create a new Blank project

2. **Copy files into the project**
   - Copy contents of `Code.gs`, `index.html`, `utils.html`, and partial HTML files into corresponding files in the project

3. **Create Google Sheets database**
   - Create a new Spreadsheet with 4 sheets: `ThanhVien`, `GiaoDich`, `ChiTiet`, `LichSuThanhToan`
   - Copy the Spreadsheet ID from the URL (part between `/d/` and `/edit`)

4. **Configure Spreadsheet ID**
   - In `Code.gs`, find `MY_SPREADSHEET_ID` and paste your Spreadsheet ID

5. **Deploy**
   - Run `initializeSpreadsheet()` once to initialize header rows
   - Deploy as Web App → Execute as: Me → Who has access: Anyone

---

## 📁 Cấu trúc file / File Structure

```
├── Code.gs              # Backend API (GAS) — tất cả server-side functions
├── index.html           # Shell SPA — <head>, header, navigation, include()
├── utils.html           # Toàn bộ JavaScript phía client (state, renders, handlers)
├── edit-modal.html      # Partial: modal chỉnh sửa giao dịch
├── tab-tong-quan.html   # Partial: tab Tổng Quan + debt optimization toggle
├── tab-tao-don.html     # Partial: tab Tạo Đơn
├── tab-lich-su.html     # Partial: tab Lịch Sử + CSV export + Batch Settlement
├── tab-bao-cao.html     # Partial: tab Báo Cáo analytics
├── tab-thanh-vien.html  # Partial: tab Thành Viên
├── test/
│   └── test-utils.js    # Pure Node.js tests (không cần GAS runtime)
├── docs/superpowers/
│   ├── ideas/           # Backlog các ý tưởng tính năng
│   ├── plans/           # Chi tiết implementation plans
│   │   ├── 2026-04-18-5-features-implementation.md
│   │   ├── 2026-04-22-debt-settlement-design.md
│   │   ├── 2026-04-23-batch-settlement.md
│   │   └── 2026-04-24-filter-bar-redesign.md
│   └── specs/
│       ├── 2026-04-23-debt-search-filter-design.md
│       └── 2026-04-24-filter-bar-redesign.md
└── README.md           # This file
```

---

## 🗄️ Database Schema

### 🇻🇳 Cấu trúc Google Sheets

| Sheet | Columns | Mô tả |
|-------|---------|--------|
| `ThanhVien` | `id`, `ten`, `ngayThem` | Danh sách thành viên |
| `GiaoDich` | `id`, `nguoiTra`, `ngay`, `moTa`, `tongTien`, `nguon`, `trangThai` | Giao dịch chính |
| `ChiTiet` | `id`, `giaoDichId`, `thanhVienId`, `soTien`, `daThanhToan` | Ai nợ bao nhiêu trong mỗi GD |
| `LichSuThanhToan` | `id`, `chiTietId`, `ngayThanhToan`, `nguoiXacNhan` | Audit log khi check trả nợ |

### 🇬🇧 Google Sheets Structure

| Sheet | Columns | Description |
|-------|---------|-------------|
| `ThanhVien` | `id`, `ten`, `ngayThem` | Member list |
| `GiaoDich` | `id`, `nguoiTra`, `ngay`, `moTa`, `tongTien`, `nguon`, `trangThai` | Main transactions |
| `ChiTiet` | `id`, `giaoDichId`, `thanhVienId`, `soTien`, `daThanhToan` | Per-person debt in each transaction |
| `LichSuThanhToan` | `id`, `chiTietId`, `ngayThanhToan`, `nguoiXacNhan` | Payment audit log |

### ID Conventions / Quy ước ID

| Loại / Type | Format | Ví dụ / Example |
|-------------|--------|-----------------|
| Thành viên / Member | `TV###` | `TV001`, `TV002` |
| Giao dịch / Transaction | `GD###` | `GD001`, `GD002` |
| Chi tiết / Detail | `CT####` | `CT0001`, `CT0002` |
| Log thanh toán / Payment Log | `LT####` | `LT0001`, `LT0002` |

---

## 🧪 Testing

### 🇻🇳 Chạy tests

```bash
node test/test-utils.js
```

### 🇬🇧 Run tests

```bash
node test/test-utils.js
```

### Test Coverage / Phạm vi tests

| Module | Số tests | Mô tả |
|--------|----------|--------|
| CSV Export | 8 | BOM, headers, data integrity |
| simplifyDebts | 7 | Debt chain collapse, greedy algorithm |
| Aggregate Functions | 8 | By month, by member, by source |
| validateTransactionData | 7 | Form validation |
| Settlement Logic | 10 | Debt calculation |
| markBatchPaid | 7 | Batch settlement |
| **Total** | **47** | **All passing** |

---

## 🤝 Contributing

### 🇻🇳 Đóng góp

1. Fork repository này
2. Tạo feature branch (`git checkout -b feature/TenTinhNang`)
3. Commit changes (`git commit -m 'feat: add TenTinhNang'`)
4. Push lên branch (`git push origin feature/TenTinhNang`)
5. Tạo Pull Request

### 🇬🇧 Contributing

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/FeatureName`)
3. Commit your changes (`git commit -m 'feat: add FeatureName'`)
4. Push to the branch (`git push origin feature/FeatureName`)
5. Open a Pull Request

---

## 📄 License

MIT License — xem file [LICENSE](LICENSE) để biết chi tiết / see the [LICENSE](LICENSE) file for details.

---

## 🙏 Credits

**Quản Lý Chi Tiêu Team** — Built with Google Apps Script, Vanilla JavaScript, Tailwind CSS, and Chart.js.
