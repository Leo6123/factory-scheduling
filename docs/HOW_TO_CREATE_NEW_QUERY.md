# 如何在 Supabase SQL Editor 中創建新查詢

## 📋 方法說明

在 Supabase SQL Editor 中，有多種方式可以創建新查詢：

## 🔧 方法 1：使用工具欄按鈕

1. **查看 SQL Editor 頂部工具欄**
   - 在 SQL Editor 標題（"SQL Editor"）旁邊
   - 尋找 **"+"** 或 **"New Query"** 或 **"New"** 按鈕
   - 點擊該按鈕即可創建新查詢

## 🔧 方法 2：使用左側邊欄

1. **查看左側邊欄**
   - 在 "PRIVATE (2)" 或 "SHARED" 或 "FAVORITES" 標題旁邊
   - 尋找 **"+"** 圖標或 **"New"** 按鈕
   - 點擊即可創建新查詢

## 🔧 方法 3：直接使用現有查詢（推薦）

如果您只是要執行 SQL 腳本，**不需要創建新查詢**：

1. **選擇現有的查詢**（左側邊欄中的任意一個，例如 "新增 schedule_items 欄位與 RLS 政策"）
2. **清空現有內容**（按 `Ctrl + A` 全選，然後按 `Delete`）
3. **貼上新的 SQL 腳本**（從 `supabase_set_all_viewers.sql` 文件複製）
4. **執行查詢**（點擊右下角的 **"Run"** 按鈕，或按 `Ctrl + Enter`）

## 📝 從圖片看到的界面

根據您提供的圖片，我看到：

1. **左側邊欄**：
   - "PRIVATE (2)" - 這表示您有 2 個私人的 SQL 查詢
   - 兩個查詢列表：
     - "新增 schedule_items 欄位與 RLS 政策"
     - "Production Schedule and Line ..."

2. **主編輯區域**：
   - 上半部分：SQL 腳本編輯區
   - 下半部分：Results（結果）面板

3. **執行按鈕**：
   - 右下角的 **"Run CTRL ←"** 按鈕（綠色按鈕）

## ✅ 建議操作步驟

### 選項 A：使用現有查詢（最簡單）

1. **點擊左側邊欄中的任意一個查詢**（例如 "新增 schedule_items 欄位與 RLS 政策"）
2. **清空編輯區域**：
   - 按 `Ctrl + A`（全選）
   - 按 `Delete`（刪除）
3. **貼上 SQL 腳本**：
   - 打開 `supabase_set_all_viewers.sql` 文件
   - 按 `Ctrl + A`（全選）
   - 按 `Ctrl + C`（複製）
   - 回到 SQL Editor，按 `Ctrl + V`（貼上）
4. **執行查詢**：
   - 點擊右下角的 **"Run"** 按鈕（綠色按鈕）
   - 或按 `Ctrl + Enter`

### 選項 B：創建新查詢（如果想保留現有查詢）

1. **尋找 "New Query" 按鈕**：
   - 查看 SQL Editor 頂部工具欄
   - 或查看左側邊欄的 "PRIVATE" 標題旁邊
   - 點擊 **"+"** 或 **"New Query"** 按鈕
2. **貼上 SQL 腳本**（同上）
3. **執行查詢**（同上）

## 🎯 如果找不到 "New Query" 按鈕

如果您找不到 "New Query" 按鈕，**請使用選項 A**（使用現有查詢）：

- 這是最簡單的方法
- 不需要創建新查詢
- 直接清空現有查詢的內容，貼上新的 SQL 腳本即可

## 📚 相關文件

- `supabase_set_all_viewers.sql` - 要執行的 SQL 腳本
- `docs/SET_ALL_VIEWERS.md` - 完整的執行說明
