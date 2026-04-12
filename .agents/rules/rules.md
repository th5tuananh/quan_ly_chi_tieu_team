---
trigger: always_on
---

# Rules for Google Apps Script "Quản Lý Chi Tiêu Team" Project

Khi AI Assistant thực hiện thao tác hay hỗ trợ người dùng chỉnh sửa trong project này, vui lòng tuân thủ tuyệt đối các nguyên tắc sau:

1. **Giao tiếp qua JSON**:
   Mọi hàm xử lý trong `Code.gs` trả về giá trị cho UI (thông qua `google.script.run`) ĐỀU BIẾN ĐỔI THÀNH DẠNG `JSON.stringify()`. Lý do vì Google Apps Script không thể gửi trực tiếp các Object phức tạp hoặc Array đa chiều về môi trường trình duyệt nếu không tuần tự hóa. Frontend sẽ parse chuỗi JSON này lại.

2. **Bảo mật và an toàn dữ liệu bằng LockService**:
   Khi Agent code tính năng THÊM / SỬA / XÓA ở phía server-side (`Code.gs`), luôn phải áp dụng:
   ```javascript
   const lock = LockService.getScriptLock();
   try {
     lock.waitLock(10000); // Đợi 10 giây
     // Thực thi logic và update Google Sheet
   } catch(e) {
     return JSON.stringify({error: e.toString()});
   } finally {
     lock.releaseLock();
   }
   ```

3. **Cấu trúc 2 file thần thánh**:
   Tuyệt đối KHÔNG chia nhỏ frontend thành `app.js`, `style.css` hay thêm quá trình build config (Vite/Webpack) TRỪ KHI NGƯỜI DÙNG YÊU CẦU ĐỔI TECH STACK MỘT CÁCH TRỰC TIẾP. Hiện tại framework giới hạn trong 2 file `Code.gs` và `index.html`.

4. **Tối ưu hóa thao tác API của SpreadsheetApp**:
   Hạn chế sửa dữ liệu bằng vòng lặp loop gọi `sheet.getRange().setValue()` nhiều lần liên tiếp vì rất tốn thời gian. Nên đọc mảng thông qua `.getValues()`, gom và update mảng 2 chiều bằng 1 lần `.setValues()`.

5. **Làm tròn số thập phân (JS Precision Float Issue)**:
   Mọi liên quan tới tiền tệ/logic tính độ lệch khoản chia, nếu cần, sử dụng `Math.round()` trên các giá trị để chống lỗi dấu chấm động. VD `10 / 3`. Trong project chia tiền theo đơn vị nghìn đồng VNĐ nên sai số không tồn tại phần thập phân.

6. **State cục bộ thay vì Refetch liên tục**:
   App UI hiện đang có biến cache JS là `members` và `transactions`. Update phía server thành công thì có thể load lại toàn bộ `transactions = await runAsync('getTransactions')` sau đó call `refreshUI()` để DOM được render lại. Không nên viết quá nhiều document query ở hàm đơn.
