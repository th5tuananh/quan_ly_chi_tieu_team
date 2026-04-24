# Advanced Analytics: Trend Analysis & Predictions

**Status:** 🔴 Chưa thực hiện

**Created:** 2026-04-24

---

## 1. Overview

Thêm tab "Xu Hướng" mới bên cạnh tab Báo Cáo, cung cấp trend analysis và spending predictions. Tab này tập trung vào 3 mục tiêu: theo dõi xu hướng chi tiêu, dự đoán đơn giản, và phân tích pattern thói quen.

---

## 2. Architecture

### Backend

**`getTrendAnalytics(monthFilter, sourceFilter, memberId)`** trong `Code.gs`:

Trả về JSON:
```json
{
  "monthlyTrend": [
    {"month": "2026-01", "total": 1500000},
    {"month": "2026-02", "total": 1800000}
  ],
  "forecast": {
    "nextMonth": "2026-05",
    "predicted": 1700000,
    "method": "median"
  },
  "weeklyHeatmap": [
    {"weekIndex": 0, "dayOfWeek": 0, "avgSpend": 120000},
    {"weekIndex": 0, "dayOfWeek": 1, "avgSpend": 350000}
  ],
  "sourceBreakdown": [
    {"month": "2026-01", "grab": 40, "shopee": 35, "outside": 25}
  ],
  "memberRanked": [
    {"id": "TV001", "name": "An", "totalSpend": 5000000, "consistencyScore": 0.15, "sparkline": [800000, 900000, 850000, 950000, 800000, 750000]}
  ]
}
```

**Aggregation logic:**
- `monthlyTrend`: sum `tongTien` grouped by month, last 6 months
- `forecast`: median của 3 tháng gần nhất, chỉ show khi >= 3 tháng data
- `weeklyHeatmap`: mỗi transaction → dayOfWeek (0=T2, 6=CN), weekIndex → avg spend per day
- `sourceBreakdown`: % contribution theo tháng
- `memberRanked`: sort by `totalSpend` desc, consistency = stddev/mean

### Frontend

- Partial file: `tab-xu-huong.html`
- State: `window._trendData` cache
- State: `window._trendFilters` = {monthFrom, monthTo, sources[], memberId}
- Charts: Chart.js 4.x (reuse CDN)

### Integration

- `index.html` thêm nav item "Xu Hướng" sau "Báo Cáo"
- `refreshUI()` gọi `renderTrend()` khi switch vào tab
- Tab thứ 7 (sau Lịch Sử)

---

## 3. Chart Specifications

### 3.1 Trend Line + Forecast (Bar + Line combo)

- **Type:** Mixed chart — Bar (actual) + Line overlay (forecast)
- **X-axis:** 6 tháng gần nhất (label: "Thg 1", "Thg 2"...)
- **Y-axis:** Chi tiêu VND
- **Bars:** Actual chi tiêu, màu primary blue (#3B82F6)
- **Forecast line:** Dashed line, màu orange (#F97316), chỉ 1 điểm (tháng tới)
- **Tooltip:** "Tháng 3/2026: 1,500,000đ (Forecast: 1,700,000đ)"
- **Forecast threshold:** Chỉ show khi >= 3 tháng data

### 3.2 Weekly Heatmap

- **Type:** Custom canvas grid (không dùng Chart.js matrix)
- **Grid:** 7 columns (T2→CN) × 4-5 rows (tuần gần nhất)
- **Cell colors:** Gradient trắng → blue dựa trên avgSpend
- **Hover:** Tooltip "T2, Week 2: 350,000đ"
- **Click:** Drilldown → show transactions list cho ngày đó
- **Threshold:** Chỉ show khi >= 4 weeks data

### 3.3 Source Stacked Area Chart

- **Type:** Stacked area chart (Chart.js)
- **X-axis:** 6 tháng gần nhất
- **Y-axis:** Tổng chi tiêu (VND)
- **Layers:** Grab (blue #3B82F6), ShopeeFood (green #22C55E), Bên ngoài (gray #6B7280)
- **Legend:** Clickable để ẩn/hiện từng nguồn

### 3.4 Member Ranked List + Sparkline

- **Layout:** Vertical list, top 5 members
- **Each row:**
  - Initial avatar (màu primary nhạt, chữ cái đầu)
  - Name (bold)
  - Total spend (formatted VND)
  - Consistency badge: "Đều" (score < 0.2), "Biến động" (>= 0.2)
  - Sparkline: mini line chart 6 tháng (50px wide, SVG inline)
- **Click:** Drilldown → chi tiêu chi tiết của member đó

---

## 4. Filter & Interaction

### Filter Controls (top of tab)

| Control | Type | Default |
|---------|------|---------|
| Từ tháng | dropdown (month) | 6 tháng trước |
| Đến tháng | dropdown (month) | Tháng hiện tại |
| Nguồn | checkbox group (Grab/Shopee/ngoài) | All checked |
| Thành viên | dropdown | "Tất cả" |

- **Apply button:** Gọi backend với filter params → update all charts
- **Reset button:** Restore defaults → re-fetch

### Interactions

- Filter change → gọi lại `getTrendAnalytics()` → update all charts
- Chart hover → tooltip detailed breakdown
- Click heatmap cell → modal/show list transactions ngày đó
- Click member row → modal/show member spending breakdown

### Loading States

- Skeleton loaders khi fetch
- Error state: message + retry button

---

## 5. Edge Cases & Error Handling

### Empty States

| Scenario | Message |
|----------|---------|
| Không có data | "Chưa có giao dịch nào trong khoảng thời gian này" + illustration |
| Filter ra kết quả trống | "Không có dữ liệu phù hợp với bộ lọc" |
| Heatmap < 4 weeks | Hide heatmap, show message |
| Forecast < 3 months | Hide forecast point, show line only |

### Error Handling

- **Backend timeout (>10s):** Show error + retry button
- **Invalid filter (Đến tháng < Từ tháng):** Client-side validation, disable Apply

### Chart.js Fallback

- Nếu Chart.js fail load → show static summary cards thay vì charts

---

## 6. Files to Create/Modify

| File | Action |
|------|--------|
| `tab-xu-huong.html` | Create — new tab partial |
| `utils.html` | Modify — thêm `renderTrend()`, `getTrendData()`, filter handlers, chart rendering |
| `Code.gs` | Modify — thêm `getTrendAnalytics()` |
| `index.html` | Modify — thêm nav item "Xu Hướng" |

---

## 7. Dependencies

- Chart.js 4.x (CDN — đã có)
- Tailwind CSS (CDN — đã có)
- google.script.run (GAS RPC — đã có)

---

## 8. Out of Scope

- Push notifications / cảnh báo budget
- Export PDF cho analytics
- Historical comparison với năm trước
- Machine learning / sophisticated forecasting