# Filter Bar Redesign — Spec

**Date:** 2026-04-24
**Status:** Draft

---

## 1. Concept

Cải thiện filter bar trên tab **Tổng Quan** với layout 2 hàng cố định, không wrap, đảm bảo "Đến (VND)" không bao giờ xuống hàng. Đồng thời tăng content width từ `max-w-4xl` lên `max-w-5xl` để tận dụng không gian tốt hơn.

---

## 2. Design

### 2.1 Content Width

- **Before:** `max-w-4xl` (896px)
- **After:** `max-w-5xl` (1024px) — thêm ~128px

### 2.2 Filter Bar Layout (Layout B — 2-row fixed)

```
┌─────────────────────────────────────────────────────────────┐
│ Chi tiết Ai Nợ Ai                    [Tối ưu hóa ▼]           │
├─────────────────────────────────────────────────────────────┤
│ [Người nợ ▾]           [Chủ nợ ▾]                            │  ← Row 1
│ [Từ]   [Đến]                              [Tìm] [↺]          │  ← Row 2
├─────────────────────────────────────────────────────────────┤
│ Bảng Ai Nợ Ai                                                │
└─────────────────────────────────────────────────────────────┘
```

**Row 1:** `flex flex-wrap gap-3` — 2 dropdowns, flex-1, min-width 140px
**Row 2:** `flex flex-wrap gap-3 items-end` — 2 amount inputs (w-[110px]), spacer (flex-1), 2 buttons

### 2.3 Key Tailwind Classes

| Element | Classes |
|---------|---------|
| Filter bar wrapper | `flex flex-col gap-3` |
| Row 1 | `flex flex-wrap gap-3` |
| Row 2 | `flex flex-wrap gap-3 items-end` |
| Amount inputs | `w-[110px]` (rộng hơn `w-32` = 128px → 110px với flex) |
| Spacer before buttons | `flex-1` |
| Buttons | `px-4 py-2 bg-primary-600 text-white` / `px-3 py-2 bg-surface-100` |

---

## 3. Files

| File | Change |
|------|--------|
| `index.html` | `max-w-4xl` → `max-w-5xl` on `<main>` |
| `tab-tong-quan.html` | Restructure filter bar HTML: wrapper `flex flex-col gap-3`, split into 2 explicit rows |

---

## 4. Out of Scope

- Logic JS — không thay đổi (event listeners, `applyFilter`, `populateFilterDropdowns`)
- Vị trí filter — vẫn giữ dưới header, trên bảng (Position A)
- Backend changes
