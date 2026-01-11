# 設置所有 Viewer 用戶角色

## 📋 說明

此腳本將 9 個用戶設置為 `viewer`（訪客）角色。

## 📝 用戶列表

1. `ali.liu@avient.com`
2. `david.hung@avient.com`
3. `eva.cheng@avient.com`
4. `flora.hsiao@avient.com`
5. `jc.huang@avient.com`
6. `kelly.chien@avient.com`
7. `vicky.zhao@avient.com`
8. `vincent.chen@avient.com`
9. `wenchi.chen@avient.com`

## 🔧 執行步驟

### 步驟 1：在 Supabase SQL Editor 中執行

1. 登入 [Supabase Dashboard](https://app.supabase.com/)
2. 選擇您的專案
3. 前往 **SQL Editor**（左側選單）
4. 點擊 **New Query**
5. 複製 `supabase_set_all_viewers.sql` 文件中的內容
6. 貼上到 SQL Editor
7. 點擊 **Run**（或按 `Ctrl + Enter`）

### 步驟 2：檢查執行結果

執行後，應該會看到一個查詢結果表格，顯示 9 個用戶的記錄：

| id | email | role | created_at | updated_at |
|---|---|---|---|---|
| ... | ali.liu@avient.com | viewer | ... | ... |
| ... | david.hung@avient.com | viewer | ... | ... |
| ... | eva.cheng@avient.com | viewer | ... | ... |
| ... | flora.hsiao@avient.com | viewer | ... | ... |
| ... | jc.huang@avient.com | viewer | ... | ... |
| ... | kelly.chien@avient.com | viewer | ... | ... |
| ... | vicky.zhao@avient.com | viewer | ... | ... |
| ... | vincent.chen@avient.com | viewer | ... | ... |
| ... | wenchi.chen@avient.com | viewer | ... | ... |

### 步驟 3：確認所有用戶都是 `viewer` 角色

如果查詢結果中所有用戶的 `role` 欄位都是 `viewer`，則表示設置成功。

## ✅ 預期結果

執行成功後，所有 9 個用戶都會：
- ✅ 角色設定為 `viewer`
- ✅ 可以登入系統
- ✅ 只能查看排程（不能編輯）
- ✅ 左側邊欄（未排程區域）完全隱藏
- ✅ 配方列表不顯示（只顯示「看配方: (X 項)」標籤）
- ✅ 無法拖曳卡片
- ✅ 用戶顯示為「訪客」（Guest）

## 🆘 如果執行失敗

如果執行失敗，請檢查：

1. **UUID 是否正確**：
   - 確保所有 UUID 格式正確
   - 確保 UUID 存在於 `auth.users` 表中

2. **Email 是否正確**：
   - 確保所有 email 格式正確
   - 確保 email 對應的 UUID 正確

3. **錯誤訊息**：
   - 查看 SQL Editor 中的錯誤訊息
   - 根據錯誤訊息調整 SQL 語句

## 📚 相關文件

- `supabase_set_all_viewers.sql` - 完整的 SQL 腳本
- `docs/VIEWER_ROLE_PERMISSIONS.md` - Viewer 角色權限詳細說明
- `docs/DEBUG_VIEWER_RECIPE_ISSUE.md` - 排查 Viewer「看配方」權限問題
