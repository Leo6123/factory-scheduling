# 資安審計報告

## 📋 執行日期
2024年12月

## 🔍 檢查範圍
- 身份驗證和授權
- Row Level Security (RLS) 政策
- API 安全
- 客戶端安全
- 會話管理
- 敏感資料處理
- 環境變數管理
- 輸入驗證

---

## 🚨 嚴重安全問題

### 1. **RLS 政策過於寬鬆** ⚠️ **高風險**

**問題**：
- `schedule_items`、`line_configs`、`suggested_schedules` 表允許所有已登入用戶進行所有操作（SELECT/INSERT/UPDATE/DELETE）
- 這意味著即使是 `viewer` 角色的用戶也可以刪除和修改所有排程項目
- 前端有權限檢查（`hasPermission`），但後端沒有，用戶可以通過直接調用 Supabase API 來繞過前端限制

**影響**：
- 任何已登入用戶都可以刪除所有排程資料
- 任何已登入用戶都可以修改其他人的排程
- 權限控制完全依賴前端，不安全

**修復建議**：
需要建立基於角色的 RLS 政策，根據用戶角色（admin/operator/viewer）來限制操作。

**優先級**：🔴 **高（立即修復）**

---

### 2. **沒有基於角色的資料庫權限檢查** ⚠️ **高風險**

**問題**：
- RLS 政策只檢查 `auth.role() = 'authenticated'`，不檢查用戶在 `user_profiles` 表中的實際角色
- 這使得所有已登入用戶都有相同的權限

**影響**：
- 無法實現基於角色的存取控制（RBAC）
- 與前端權限檢查不一致

**修復建議**：
需要建立 RPC 函數或使用 RLS 政策來檢查用戶在 `user_profiles` 表中的角色。

**優先級**：🔴 **高（立即修復）**

---

### 3. **Google API Key 暴露在客戶端** ⚠️ **中風險**

**問題**：
- `NEXT_PUBLIC_GOOGLE_API_KEY` 暴露在客戶端代碼中
- 任何人可以查看源代碼或瀏覽器開發工具來獲取 API Key

**影響**：
- API Key 可能被濫用
- 可能產生額外的 API 費用

**修復建議**：
- 如果可能，將 Google Sheets API 調用移到伺服器端（Next.js API Routes）
- 或者限制 API Key 的權限（僅允許特定域名使用）
- 考慮使用 Google Service Account 進行伺服器端認證

**優先級**：🟡 **中**

---

## ⚠️ 中等安全問題

### 4. **缺少輸入驗證和清理** ⚠️ **中風險**

**問題**：
- 雖然使用 Supabase 的查詢構建器（有 SQL 注入防護），但缺少輸入驗證
- 用戶輸入直接保存到資料庫，沒有驗證格式和範圍

**影響**：
- 可能保存無效或惡意資料
- 可能導致資料不一致

**修復建議**：
- 添加輸入驗證（例如：日期格式、數量範圍、產線 ID 白名單等）
- 使用 TypeScript 類型檢查
- 在資料庫層添加 CHECK 約束

**優先級**：🟡 **中**

---

### 5. **會話過期時間未明確設定** ⚠️ **低-中風險**

**問題**：
- Supabase session 的過期時間使用默認值
- 沒有明確設定 session 過期時間

**影響**：
- Session 可能過期時間過長，增加安全風險
- 如果 session 洩露，攻擊者有更多時間利用

**修復建議**：
- 設定合理的 session 過期時間（例如：24 小時）
- 實現自動刷新機制

**優先級**：🟡 **中**

---

## ✅ 已實施的安全措施

### 1. **身份驗證** ✅
- 使用 Supabase Auth 進行身份驗證
- 密碼登入已實施
- Session 管理使用 sessionStorage（關閉瀏覽器後清除）

### 2. **路由保護** ✅
- 使用 `ProtectedRoute` 組件保護需要登入的頁面
- 未登入用戶會自動重定向到登入頁

### 3. **SQL 注入防護** ✅
- 使用 Supabase 的查詢構建器，有內建的 SQL 注入防護
- 沒有直接執行 SQL 語句

### 4. **環境變數管理** ✅
- `.env.local` 已添加到 `.gitignore`
- 敏感資訊不會提交到版本控制

### 5. **單裝置登入** ✅
- 實現了單裝置登入機制
- 多分頁檢測和強制登出

### 6. **Session 持久化** ✅
- 使用 sessionStorage（關閉瀏覽器後清除）
- 使用 BroadcastChannel 進行跨分頁同步

---

## 📊 安全評分

| 項目 | 評分 | 說明 |
|------|------|------|
| 身份驗證 | 🟢 **良好** | Supabase Auth，sessionStorage |
| 授權（RLS） | 🔴 **不足** | 政策過於寬鬆，需要基於角色的政策 |
| API 安全 | 🟡 **中等** | 缺少伺服器端驗證 |
| 輸入驗證 | 🟡 **中等** | 缺少驗證和清理 |
| Session 管理 | 🟢 **良好** | sessionStorage + BroadcastChannel |
| 資料保護 | 🟡 **中等** | RLS 政策需要改進 |
| 環境變數 | 🟢 **良好** | 已正確管理 |

**總體評分**：🟡 **中等（需要改進）**

---

## 🔧 立即需要修復的問題

### 優先級 1（高風險 - 立即修復）

1. **建立基於角色的 RLS 政策**
   - 根據用戶在 `user_profiles` 表中的角色來限制操作
   - `viewer` 只能 SELECT
   - `operator` 可以 SELECT、INSERT、UPDATE（不能 DELETE）
   - `admin` 可以所有操作（SELECT、INSERT、UPDATE、DELETE）

2. **改進 RLS 政策**
   - 確保 RLS 政策檢查用戶角色，而不僅僅是認證狀態

### 優先級 2（中風險 - 盡快修復）

3. **移動 Google API Key 到伺服器端**
   - 如果可能，將 Google Sheets API 調用移到 Next.js API Routes

4. **添加輸入驗證**
   - 驗證日期格式、數量範圍、產線 ID 等

### 優先級 3（低風險 - 建議修復）

5. **設定 Session 過期時間**
   - 明確設定 session 過期時間

6. **添加日誌記錄**
   - 記錄重要操作（例如：刪除、修改排程項目）

---

## 📝 建議的修復方案

### 方案 1：建立基於角色的 RLS 政策

使用 RPC 函數來檢查用戶角色，然後在 RLS 政策中調用：

```sql
-- 建立函數來獲取用戶角色
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 建立基於角色的 RLS 政策
CREATE POLICY "Viewer can only select schedule_items"
  ON public.schedule_items
  FOR SELECT
  USING (get_user_role() IN ('admin', 'operator', 'viewer'));

CREATE POLICY "Operator can insert/update schedule_items"
  ON public.schedule_items
  FOR INSERT, UPDATE
  USING (get_user_role() IN ('admin', 'operator'))
  WITH CHECK (get_user_role() IN ('admin', 'operator'));

CREATE POLICY "Admin can delete schedule_items"
  ON public.schedule_items
  FOR DELETE
  USING (get_user_role() = 'admin');
```

### 方案 2：使用 Supabase Edge Functions（更安全）

將敏感操作移到 Supabase Edge Functions，在伺服器端進行權限檢查。

---

## 🔒 安全最佳實踐建議

1. **最小權限原則**：用戶只應該有完成工作所需的最小權限
2. **深度防禦**：不要只依賴前端權限檢查，後端也要驗證
3. **定期審計**：定期檢查和更新安全政策
4. **監控和日誌**：記錄重要操作，監控異常行為
5. **資料備份**：定期備份資料，以防資料被惡意刪除

---

## 📚 相關文件

- `supabase_fix_rls_complete.sql` - 當前的 RLS 政策
- `src/types/auth.ts` - 權限定義
- `src/contexts/AuthContext.tsx` - 身份驗證上下文

---

## ✅ 下一步行動

1. [ ] 建立基於角色的 RLS 政策（優先級 1）
2. [ ] 測試 RLS 政策是否正確工作
3. [ ] 移動 Google API Key 到伺服器端（優先級 2）
4. [ ] 添加輸入驗證（優先級 2）
5. [ ] 設定 Session 過期時間（優先級 3）
6. [ ] 添加操作日誌記錄（優先級 3）
