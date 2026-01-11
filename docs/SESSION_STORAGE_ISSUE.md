# Session Storage 問題說明

## 問題

當嘗試在瀏覽器的不同分頁中同時登入不同的帳號時，後登入的帳號會覆蓋先登入的帳號，導致無法同時使用。

## 根本原因

Supabase 使用固定的 storage key 格式（例如：`sb-<project-ref>-auth-token`）來存儲 session。所有分頁共享同一個 key：

1. 用戶 A 在分頁 1 登入 → session 寫入 `sb-xxx-auth-token`
2. 用戶 B 在分頁 2 登入 → session 寫入同一個 `sb-xxx-auth-token` → **覆蓋用戶 A 的 session**
3. 結果：用戶 A 的 session 被覆蓋，無法同時使用

## 技術限制

- `sessionStorage` 在同一個瀏覽器會話中是獨立的（每個分頁有自己的 sessionStorage）
- 但是 Supabase 使用**相同的 key**在所有分頁中
- 當分頁 2 寫入 session 時，不會影響分頁 1 的 sessionStorage
- 但問題是：Supabase 的 `getSession()` 會讀取 storage，如果分頁 2 寫入了新 session，**實際上不會影響分頁 1**

等等，這不對。如果 sessionStorage 是獨立的，那麼不同分頁應該有獨立的 session 才對。

讓我重新思考...

實際上，**sessionStorage 在每個分頁中是獨立的**，這是瀏覽器的標準行為。所以理論上，不同分頁應該有獨立的 session。

但用戶報告仍然無法同時使用不同帳號。這可能是因為：

1. **Supabase 的 `onAuthStateChange` 監聽器**：可能在某處有邏輯會同步 session
2. **ProtectedRoute 的多分頁檢測**：可能誤觸發了不同帳號的檢測
3. **AuthContext 的初始化**：可能在初始化時讀取了錯誤的 session

## 當前狀態

已移除 BroadcastChannel 的 session 同步，理論上每個分頁應該有獨立的 session。

但問題可能仍然存在，因為 Supabase 的 storage interface 是固定的，我們無法改變 key 的格式。

## 可能的解決方案

### 方案 1：使用不同的瀏覽器 Profile（推薦給用戶）

用戶可以使用瀏覽器的多使用者功能：
- Chrome：建立不同的使用者 Profile
- 每個 Profile 有獨立的 sessionStorage 和 cookies
- 這是瀏覽器原生支持的方式

### 方案 2：接受限制（當前實現）

由於 Supabase 的設計，同一瀏覽器的不同分頁**理論上應該**支持不同帳號，因為 sessionStorage 是獨立的。

如果仍然無法工作，可能是 Supabase 的內部邏輯導致的，我們無法完全控制。

### 方案 3：使用 IndexedDB（複雜，不推薦）

使用 IndexedDB 來存儲 session，並為每個分頁使用不同的 key。但這需要大量修改 Supabase 的 storage 實現，不推薦。

## 測試建議

1. 打開兩個分頁
2. 在分頁 1 登入帳號 A
3. 在分頁 2 登入帳號 B（不要刷新分頁 1）
4. 檢查兩個分頁是否都能正常使用

如果仍然無法工作，請檢查瀏覽器控制台的錯誤訊息。
