# 下一步執行步驟

## 📋 當前完成狀態

✅ **已完成的功能：**
- 身份驗證系統（Supabase Auth）
- 登入頁面
- 角色系統（管理員/操作員/訪客）
- 路由保護
- 功能權限控制
- 卡片互動權限控制
- 訪客權限限制（只能查看，無法編輯/匯出）
- RLS 政策 SQL 腳本
- 移除開發環境調試代碼

✅ **構建狀態：**
- TypeScript 編譯：✅ 成功
- Next.js 構建：✅ 成功
- Lint 檢查：✅ 無錯誤

---

## 🚀 下一步執行步驟

### **步驟 1：執行 Supabase SQL 腳本** ⚠️ 重要

**目標**：設定資料庫安全政策和用戶角色系統

**執行步驟：**

1. 登入 Supabase Dashboard
   - 訪問：https://supabase.com/dashboard
   - 選擇您的專案

2. 進入 SQL Editor
   - 左側選單點擊 **SQL Editor**
   - 點擊 **New query**

3. 執行安全設定腳本
   - 打開檔案：`supabase_security_setup.sql`
   - 複製全部內容
   - 貼上到 SQL Editor
   - 點擊 **Run** 執行

4. 驗證執行結果
   - 確認看到 "✅ 已建立 RLS 政策" 訊息
   - 檢查是否有錯誤訊息
   - 如有錯誤，請記錄錯誤內容

**預期結果：**
- 建立 `user_profiles` 表
- 啟用所有表格的 RLS
- 建立基於角色的訪問控制政策
- 建立觸發器（自動為新用戶分配角色）

---

### **步驟 2：建立第一個管理員帳號** 👤

**目標**：建立可以管理系統的管理員帳號

**執行步驟：**

#### 方法 A：透過 Supabase Dashboard（推薦）

1. 進入 **Authentication** > **Users**
2. 點擊 **Add User** > **Create new user**
3. 填寫資訊：
   ```
   Email: admin@yourcompany.com（改為您的管理員信箱）
   Password: [設定強密碼]
   Auto Confirm User: ✅ 勾選（重要！）
   ```
4. 點擊 **Create User**

**重要**：第一個建立的用戶會自動成為管理員（透過 SQL 觸發器）

#### 方法 B：手動設定角色（如果需要）

如果用戶已存在，執行以下 SQL：

```sql
-- 檢查現有用戶
SELECT id, email FROM auth.users ORDER BY created_at;

-- 將第一個用戶設為管理員
UPDATE public.user_profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1);
```

---

### **步驟 3：測試登入功能** 🔐

**目標**：確認身份驗證系統正常運作

**執行步驟：**

1. 啟動開發伺服器（如果尚未啟動）
   ```bash
   npm run dev
   ```

2. 訪問應用
   - 瀏覽器打開：`http://localhost:3000`
   - 應該自動重定向到 `/login`

3. 使用管理員帳號登入
   - 輸入 Email 和 Password
   - 點擊「登入」
   - 應該成功登入並進入主頁

4. 檢查用戶資訊
   - 確認右上角顯示您的 Email
   - 確認顯示「管理員」角色

5. 測試登出功能
   - 點擊「登出」按鈕
   - 應該重定向回登入頁面

**預期結果：**
- ✅ 可以成功登入
- ✅ 可以成功登出
- ✅ 未登入時自動重定向到登入頁
- ✅ 顯示正確的用戶角色

---

### **步驟 4：測試權限控制** 🛡️

**目標**：確認不同角色的權限正確運作

#### 測試管理員權限

1. 使用管理員帳號登入
2. 檢查應該看到的按鈕：
   - ✅ 匯入訂單（Excel）
   - ✅ 匯出排程
   - ✅ 新增卡片、NG修色、清機流程等
   - ✅ 存檔功能
   - ✅ 清除全部（雖然已禁用，但仍顯示）

3. 檢查卡片功能：
   - ✅ 可以拖曳卡片
   - ✅ 可以編輯數量
   - ✅ 可以編輯齊料日期
   - ✅ 可以展開/收合配方
   - ✅ 可以看到所有勾選按鈕（2押、3押、結晶等）

#### 建立並測試操作員帳號

1. 在 Supabase 建立操作員用戶
   - Authentication > Users > Add User
   - Email: `operator@yourcompany.com`
   - Password: [設定密碼]
   - Auto Confirm User: ✅ 勾選

2. 確認角色為操作員（應該自動設定）
   ```sql
   SELECT email, role FROM public.user_profiles WHERE email = 'operator@yourcompany.com';
   ```

3. 使用操作員帳號登入
4. 檢查應該看到的按鈕：
   - ✅ 匯入訂單
   - ✅ 匯出排程
   - ❌ 清除全部（不顯示）
   - ✅ 其他編輯功能

#### 建立並測試訪客帳號

1. 將操作員改為訪客角色
   ```sql
   UPDATE public.user_profiles
   SET role = 'viewer'
   WHERE email = 'operator@yourcompany.com';
   ```

2. 使用訪客帳號登入
3. 檢查應該看到的按鈕：
   - ❌ 匯入訂單（不顯示）
   - ❌ 匯出排程（不顯示）
   - ❌ 所有新增功能（不顯示）
   - ❌ 清除全部（不顯示）

4. 檢查卡片功能：
   - ❌ 無法拖曳卡片（游標為 default）
   - ❌ 數量無法點擊編輯（無 hover 效果）
   - ❌ 齊料日期無法點擊編輯
   - ❌ 配方自動顯示（無展開/收合按鈕）
   - ❌ 看不到任何勾選按鈕（2押、3押、結晶等）

5. 檢查可以執行的操作：
   - ✅ 查看24小時時間軸
   - ✅ 查看卡片視圖
   - ✅ 查看所有排程資訊（只讀）

---

### **步驟 5：設定 Supabase Auth** ⚙️

**目標**：確保 Supabase Auth 設定正確

**執行步驟：**

1. 進入 Supabase Dashboard > Authentication > Settings

2. 設定 Site URL
   - 開發環境：`http://localhost:3000`
   - 生產環境：`https://factory-scheduling.vercel.app`
   - 點擊 **Save**

3. 確認 Email 設定（可選）
   - 如果需要 Email 驗證，設定 SMTP
   - 如果需要忘記密碼功能，啟用相關選項

4. 確認 OAuth 提供者（如不需要可跳過）
   - 目前使用 Email/Password 登入
   - 如需 Google、GitHub 等，可在此設定

---

### **步驟 6：環境變數檢查** 🔑

**目標**：確保生產環境變數正確設定

**執行步驟：**

#### 檢查 Vercel 環境變數

1. 進入 Vercel Dashboard
   - 訪問：https://vercel.com/dashboard
   - 選擇專案：`factory-scheduling`

2. 進入 Settings > Environment Variables

3. 確認以下變數已設定：
   - ✅ `NEXT_PUBLIC_SUPABASE_URL`
   - ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - ✅ `NEXT_PUBLIC_GOOGLE_API_KEY`（如果使用 QC 功能）

4. 檢查環境
   - Production: ✅ 已設定
   - Preview: ✅ 已設定（可選）
   - Development: ✅ 已設定（可選）

---

### **步驟 7：測試部署** 🚀

**目標**：確認生產環境部署正常

**執行步驟：**

1. 提交代碼到 Git（如果尚未提交）
   ```bash
   git status
   git add .
   git commit -m "feat: Implement authentication and security (basic protection)"
   git push origin main
   ```

2. 等待 Vercel 自動部署
   - 訪問 Vercel Dashboard
   - 查看最新的部署狀態
   - 確認部署成功（綠色勾號）

3. 測試生產環境
   - 訪問：`https://factory-scheduling.vercel.app`
   - 應該自動重定向到 `/login`
   - 使用管理員帳號登入測試

4. 檢查功能
   - 確認所有功能正常運作
   - 檢查權限控制是否正確

---

### **步驟 8：建立其他用戶** 👥

**目標**：為團隊成員建立帳號

**執行步驟：**

1. 在 Supabase Dashboard 建立用戶
   - Authentication > Users > Add User
   - 為每個團隊成員建立帳號

2. 設定角色
   - 第一個用戶：自動為管理員
   - 其他用戶：預設為操作員
   - 如需調整，使用 SQL：
     ```sql
     UPDATE public.user_profiles
     SET role = 'admin'  -- 或 'operator' 或 'viewer'
     WHERE email = 'user@example.com';
     ```

3. 通知團隊成員
   - 提供登入網址
   - 提供帳號和密碼（建議要求首次登入後修改密碼）
   - 說明角色權限

---

### **步驟 9：監控和維護** 📊

**目標**：確保系統正常運作

**執行步驟：**

1. 定期檢查 Supabase 日誌
   - Dashboard > Logs
   - 檢查是否有錯誤或異常活動

2. 審查用戶列表
   - 定期檢查 Authentication > Users
   - 移除不再使用的帳號

3. 審查 RLS 政策
   - 執行查詢確認政策正確：
     ```sql
     SELECT tablename, policyname, cmd
     FROM pg_policies
     WHERE schemaname = 'public'
     ORDER BY tablename, cmd;
     ```

4. 備份資料庫
   - Supabase 提供自動備份
   - 建議定期手動備份重要資料

---

## ⚠️ 注意事項

### **重要提醒**

1. **SQL 腳本執行前務必備份資料庫**
   - 執行 `supabase_security_setup.sql` 前先備份

2. **第一個用戶自動為管理員**
   - 確保第一個建立的用戶是您要的管理員帳號

3. **環境變數保護**
   - 確認 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 是匿名金鑰
   - **不要**將服務端金鑰（Service Role Key）暴露在前端

4. **生產環境設定**
   - 確認 Site URL 設定為生產環境網址
   - 確認 Email 驗證設定（如需要）

5. **測試完整性**
   - 測試所有角色權限
   - 測試所有功能按鈕
   - 測試卡片互動功能

---

## 🆘 遇到問題時

### **常見問題解決**

1. **無法登入**
   - 檢查 Supabase Auth 設定
   - 檢查 Site URL 是否正確
   - 檢查瀏覽器控制台錯誤訊息

2. **權限不正確**
   - 檢查 `user_profiles` 表中的角色
   - 確認 RLS 政策已正確建立
   - 檢查瀏覽器控制台是否有權限相關錯誤

3. **功能按鈕不顯示**
   - 檢查用戶角色是否正確
   - 檢查 `ROLE_PERMISSIONS` 設定
   - 確認組件中的權限檢查邏輯

4. **卡片無法拖曳（訪客除外）**
   - 檢查 `canEdit` 權限
   - 確認 `useDraggable` 的 `disabled` 屬性
   - 檢查瀏覽器控制台錯誤

---

## 📚 相關文檔

- [資安設定指南](./SECURITY_SETUP_GUIDE.md)
- [資安建議](./SECURITY_RECOMMENDATIONS.md)
- [Supabase 設定步驟](../docs/SUPABASE_SETUP_STEPS.md)

---

## ✅ 完成檢查清單

- [ ] 步驟 1：執行 Supabase SQL 腳本
- [ ] 步驟 2：建立第一個管理員帳號
- [ ] 步驟 3：測試登入功能
- [ ] 步驟 4：測試權限控制（管理員/操作員/訪客）
- [ ] 步驟 5：設定 Supabase Auth
- [ ] 步驟 6：檢查環境變數
- [ ] 步驟 7：測試部署
- [ ] 步驟 8：建立其他用戶
- [ ] 步驟 9：設定監控和維護

---

**下一步建議：從步驟 1 開始執行 SQL 腳本！**
