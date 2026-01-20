# 新專案建立指南：Work Permit Application

**建立日期：** 2026-01-20  
**專案名稱：** Cursor_Work Permit Application  
**專案路徑：** `D:\Cursor_Work Permit Application`

---

## 📋 建立步驟

由於專案名稱包含空格，建議使用以下命令建立：

```bash
# 建立專案目錄
mkdir "D:\Cursor_Work Permit Application"
cd "D:\Cursor_Work Permit Application"

# 建立 Next.js 專案
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

**或使用不含空格的專案名稱：**

```bash
# 建議使用：D:\Cursor_WorkPermitApp
npx create-next-app@latest "D:\Cursor_WorkPermitApp" --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

---

## ✅ 建立完成後

1. 進入專案目錄
2. 安裝依賴（如果未自動安裝）
3. 啟動開發伺服器
4. 在 Cursor 中開啟新專案資料夾

---

**注意：** 專案名稱包含空格可能會在某些工具中造成問題，建議使用不含空格的名稱。
