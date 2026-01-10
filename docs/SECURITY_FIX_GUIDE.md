# 資安修復指南

## 🚨 立即需要修復的問題（優先級 1）

### 問題 1：RLS 政策過於寬鬆 ⚠️ **高風險**

**當前狀態**：
- 所有已登入用戶都可以對 `schedule_items`、`line_configs`、`suggested_schedules` 進行所有操作
- 即使是 `viewer` 角色也可以刪除和修改所有排程項目
- 前端有權限檢查，但後端沒有，可以繞過

**修復步驟**：

1. **在 Supabase Dashboard 執行安全強化的 RLS 政策**：

   ```bash
   # 打開 Supabase Dashboard > SQL Editor
   # 執行：supabase_secure_rls_policies.sql
   ```

   這個腳本會：
   - 建立 `get_user_role_safe()` 函數來獲取用戶角色
   - 建立基於角色的 RLS 政策：
     - `viewer`：只能 SELECT（查看）
     - `operator`：可以 SELECT、INSERT、UPDATE（查看、新增、修改）
     - `admin`：可以 SELECT、INSERT、UPDATE、DELETE（所有操作）

2. **驗證政策是否生效**：

   ```bash
   # 在 Supabase Dashboard > SQL Editor 執行
   # supabase_test_rls_policies.sql
   ```

3. **測試不同角色的權限**：
   - 以 `viewer` 角色登入，嘗試刪除排程項目（應該失敗）
   - 以 `operator` 角色登入，嘗試刪除排程項目（應該失敗）
   - 以 `admin` 角色登入，嘗試刪除排程項目（應該成功）

---

## ⚠️ 建議修復的問題（優先級 2）

### 問題 2：Google API Key 暴露在客戶端 ⚠️ **中風險**

**當前狀態**：
- `NEXT_PUBLIC_GOOGLE_API_KEY` 暴露在客戶端代碼中
- 任何人都可以查看源代碼或瀏覽器開發工具來獲取 API Key

**修復方案**：

**方案 A：限制 API Key 權限（推薦）**
1. 在 Google Cloud Console 中：
   - 限制 API Key 只能從特定域名使用（例如：`factory-scheduling.vercel.app`）
   - 限制 API Key 只能訪問 Google Sheets API
   - 設定使用配額限制

**方案 B：移動到伺服器端（更安全）**
1. 建立 Next.js API Route：
   ```typescript
   // src/app/api/google-sheets/route.ts
   import { NextRequest, NextResponse } from 'next/server';
   import { google } from 'googleapis';
   
   export async function GET(request: NextRequest) {
     // 從伺服器端環境變數讀取 API Key（不使用 NEXT_PUBLIC_）
     const apiKey = process.env.GOOGLE_API_KEY;
     // ... 處理請求
   }
   ```

2. 修改客戶端代碼，調用 API Route 而不是直接調用 Google Sheets API

**修復優先級**：🟡 **中（如果 Google Sheets 功能不是關鍵，可以稍後修復）**

---

### 問題 3：缺少輸入驗證 ⚠️ **中風險**

**當前狀態**：
- 用戶輸入直接保存到資料庫，沒有驗證格式和範圍

**修復方案**：

1. **建立輸入驗證函數**：
   ```typescript
   // src/utils/validation.ts
   export function validateScheduleItem(item: ScheduleItem): { valid: boolean; errors: string[] } {
     const errors: string[] = [];
     
     // 驗證日期格式
     if (item.deliveryDate && !/^\d{4}-\d{2}-\d{2}$/.test(item.deliveryDate)) {
       errors.push('交付日期格式不正確');
     }
     
     // 驗證數量範圍
     if (item.quantity <= 0 || item.quantity > 1000000) {
       errors.push('數量必須在 1 到 1,000,000 之間');
     }
     
     // 驗證產線 ID（白名單）
     const validLineIds = PRODUCTION_LINES.map(l => l.id);
     if (!validLineIds.includes(item.lineId)) {
       errors.push('產線 ID 不正確');
     }
     
     return { valid: errors.length === 0, errors };
   }
   ```

2. **在保存前驗證**：
   ```typescript
   // 在 useScheduleData.ts 的 saveScheduleItemsToDB 中
   for (const item of items) {
     const validation = validateScheduleItem(item);
     if (!validation.valid) {
       throw new Error(`驗證失敗: ${validation.errors.join(', ')}`);
     }
   }
   ```

**修復優先級**：🟡 **中（可以逐步添加驗證）**

---

## ✅ 已實施的安全措施

### 1. 身份驗證 ✅
- ✅ Supabase Auth 認證
- ✅ Session 管理使用 sessionStorage（關閉瀏覽器後清除）
- ✅ 單裝置登入機制

### 2. 路由保護 ✅
- ✅ ProtectedRoute 組件保護需要登入的頁面
- ✅ 未登入用戶自動重定向到登入頁

### 3. SQL 注入防護 ✅
- ✅ 使用 Supabase 查詢構建器（內建防護）
- ✅ 沒有直接執行 SQL 語句

### 4. 環境變數管理 ✅
- ✅ `.env.local` 已添加到 `.gitignore`
- ✅ 敏感資訊不會提交到版本控制

### 5. 會話管理 ✅
- ✅ 使用 sessionStorage（關閉瀏覽器後清除）
- ✅ BroadcastChannel 跨分頁同步

---

## 📋 修復檢查清單

### 立即修復（優先級 1）
- [ ] 執行 `supabase_secure_rls_policies.sql` 建立基於角色的 RLS 政策
- [ ] 執行 `supabase_test_rls_policies.sql` 驗證政策是否生效
- [ ] 測試不同角色的權限是否正確

### 盡快修復（優先級 2）
- [ ] 限制 Google API Key 權限（或移動到伺服器端）
- [ ] 添加輸入驗證函數
- [ ] 在保存前驗證所有用戶輸入

### 建議修復（優先級 3）
- [ ] 設定 Session 過期時間
- [ ] 添加操作日誌記錄（記錄刪除、修改等重要操作）
- [ ] 實現速率限制（防止暴力破解）

---

## 🧪 測試步驟

### 測試 1：驗證 RLS 政策

1. **以 viewer 角色登入**：
   - 嘗試查看排程：應該成功 ✅
   - 嘗試新增排程：應該失敗 ❌（錯誤：permission denied）
   - 嘗試修改排程：應該失敗 ❌
   - 嘗試刪除排程：應該失敗 ❌

2. **以 operator 角色登入**：
   - 嘗試查看排程：應該成功 ✅
   - 嘗試新增排程：應該成功 ✅
   - 嘗試修改排程：應該成功 ✅
   - 嘗試刪除排程：應該失敗 ❌（錯誤：permission denied）

3. **以 admin 角色登入**：
   - 嘗試查看排程：應該成功 ✅
   - 嘗試新增排程：應該成功 ✅
   - 嘗試修改排程：應該成功 ✅
   - 嘗試刪除排程：應該成功 ✅

### 測試 2：驗證前端權限檢查

1. **以 viewer 角色登入**：
   - 檢查 UI 是否隱藏了「新增卡片」、「刪除」等按鈕
   - 檢查是否可以拖曳排程項目（應該不能）

2. **以 operator 角色登入**：
   - 檢查 UI 是否顯示了「新增卡片」、「修改」等按鈕
   - 檢查是否隱藏了「清除全部」按鈕
   - 檢查是否可以刪除項目（應該不能）

3. **以 admin 角色登入**：
   - 檢查 UI 是否顯示了所有按鈕
   - 檢查是否可以執行所有操作

---

## 📚 相關文件

- `supabase_secure_rls_policies.sql` - 安全強化的 RLS 政策腳本
- `supabase_test_rls_policies.sql` - 測試 RLS 政策的腳本
- `docs/SECURITY_AUDIT_REPORT.md` - 完整的安全審計報告
- `src/types/auth.ts` - 權限定義
- `src/contexts/AuthContext.tsx` - 身份驗證上下文

---

## ⚠️ 注意事項

1. **備份資料**：在執行 RLS 政策修改前，建議先備份資料庫
2. **測試環境**：建議先在測試環境中執行和測試，確認無誤後再在生產環境執行
3. **逐步實施**：建議先修復優先級 1 的問題，然後再處理優先級 2 和 3 的問題
4. **監控**：修復後需要密切監控系統，確保沒有破壞現有功能

---

## 📞 如果遇到問題

如果在執行修復時遇到問題：

1. **檢查 Supabase Dashboard > Database > Replication**：確認 Realtime 已啟用
2. **檢查 Supabase Dashboard > Database > Policies**：確認 RLS 政策已正確建立
3. **查看 Supabase Dashboard > Logs**：查看錯誤日誌
4. **檢查瀏覽器控制台**：查看前端錯誤訊息
