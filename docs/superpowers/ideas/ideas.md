# Ideas Backlog — Quản Lý Chi Tiêu Team

> Lưu lại các ý tưởng hay: chưa thực hiện, đang thực hiện, đã thực hiện

---

## 1. 🎯 Batch Settlement (Duyệt trả nợ hàng loạt)
**Status:** 🟢 **Đã thực hiện**

**Problem:** Mỗi lần xác nhận trả nợ chỉ mark được 1 ChiTiet. Với team 5-10 người, cuối tháng việc mark từng dòng nợ rất tốn thời gian.

**Giải pháp:**
- Thêm checkbox bên mỗi dòng nợ trong tab Lịch Sử và Tổng Quan
- Chọn nhiều dòng → 1 click "Xác nhận đã trả" → tất cả được mark paid cùng lúc
- Giữ nguyên audit log cho từng khoản

**Context:** Team văn phòng — chi tiêu chủ yếu: quỹ, tiền ăn, không có điện nước

**Plan:** `docs/superpowers/plans/2026-04-23-batch-settlement.md`

---

## 2. 🔍 Debt Search & Filter trong Tổng Quan
**Status:** 🟢 **Đã thực hiện**

**Problem:** Tab Tổng Quan hiện show tất cả nợ. Khi có 50+ giao dịch, không thể tìm nhanh ai đang nợ ai.

**Giải pháp:**
- Thêm filter bar với 2 dropdowns (Người nợ, Chủ nợ) + 2 number inputs (Từ/Đến VND)
- Filter theo: người nợ, người được đòi, khoảng tiền
- Client-side filter trên `summaryData` đã load sẵn, không cần backend changes

**Layout:** Layout B (2-row fixed) — Row 1: member dropdowns, Row 2: amount inputs + spacer + buttons

**Files changed:**
- `tab-tong-quan.html` — filter bar HTML restructure
- `utils.html` — `populateFilterDropdowns()`, `applyFilter()`, `renderDebtSummary()`
- `index.html` — `max-w-5xl` (content width tăng từ 896px → 1024px)

**Spec:** `docs/superpowers/specs/2026-04-24-filter-bar-redesign.md`
**Plan:** `docs/superpowers/plans/2026-04-24-filter-bar-redesign.md`

---

## 3. 📊 Advanced Analytics: Trend Analysis & Predictions
**Status:** 🟢 Chưa thực hiện

**Problem:** Tab Báo Cáo hiện chỉ có 3 charts cơ bản, không có so sánh xu hướng.

**Giải pháp:**
- Trend line chart: Chi tiêu 6 tháng gần nhất với đường xu hướng
- Month-over-month comparison: % tăng/giảm so với tháng trước
- Top expense categories: Grab vs ShopeeFood vs khác
- Spending velocity: Trung bình chi tiêu mỗi tuần/tháng

---

## 4. 🔄 Recurring Bill Templates (Mẫu bill định kỳ)
**Status:** 🟢 Chưa thực hiện

**Problem:** Các khoản chi lặp lại hàng tuần/tháng (quỹ, tiền ăn) phải tạo đơn từ đầu mỗi lần.

**Giải pháp:**
- Lưu "Mẫu đơn": tên, người trả mặc định, nguồn, chia đều cho những ai
- 1 click tạo đơn từ template → chỉ cần điền số tiền và ngày
- Template list trong tab Tạo Đơn

---

## 5. 💡 Smart Settlement Suggestions (Gợi ý trả nợ thông minh)
**Status:** 🟢 Chưa thực hiện

**Problem:** Khi mark "đã trả hết" cho 1 người, mark tất cả ChiTiet. Không chọn subset hoặc theo điều kiện.

**Giải pháp:**
- Click vào tên người nợ → hiện list các ChiTiet cụ thể
- Chọn subset để mark paid
- Gợi ý: "Đánh dấu tất cả nợ cũ hơn 30 ngày"

---

## Legend
- 🔴 Chưa thực hiện
- 🟡 Đang thực hiện
- 🟢 Đã thực hiện
