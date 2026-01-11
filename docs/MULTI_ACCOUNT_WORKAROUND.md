# 多帳號同時登入的解決方案

## 問題

在瀏覽器的不同分頁中，無法同時使用不同的帳號登入。當第二個帳號登入時，會覆蓋第一個帳號的 session。

## 根本原因

雖然理論上 `sessionStorage` 在每個分頁中是獨立的，但在實際使用中，Supabase 的 session 管理可能會受到以下因素影響：

1. **Supabase 的認證狀態同步機制**：`onAuthStateChange` 監聽器可能會在不同分頁間同步狀態
2. **瀏覽器的 sessionStorage 實現**：某些瀏覽器或情況下，sessionStorage 可能會在分頁間共享
3. **Supabase 的 storage key 格式**：所有分頁使用相同的 key（`sb-<project-ref>-auth-token`）

## 解決方案

### 方案 1：使用不同的瀏覽器 Profile（推薦）

**Chrome / Edge：**
1. 點擊右上角的用戶圖示
2. 選擇「新增」或「管理人員」
3. 建立新的 Profile
4. 在不同 Profile 中登入不同的帳號

**優點：**
- 完全隔離的環境
- 每個 Profile 有獨立的 cookies、sessionStorage、localStorage
- 瀏覽器原生支持，穩定可靠

**缺點：**
- 需要切換 Profile
- 不能在同一視窗中使用

### 方案 2：使用無痕模式

**Chrome / Edge：**
- 按下 `Ctrl + Shift + N`（Windows）或 `Cmd + Shift + N`（Mac）

**Firefox：**
- 按下 `Ctrl + Shift + P`（Windows）或 `Cmd + Shift + P`（Mac）

**優點：**
- 與正常視窗完全隔離
- 關閉無痕視窗後自動清除所有資料

**缺點：**
- 每次都需要重新登入
- 不能在同一視窗中使用

### 方案 3：使用不同的瀏覽器

- Chrome 中登入一個帳號
- Firefox 或 Edge 中登入另一個帳號

**優點：**
- 完全獨立
- 不需要額外設定

**缺點：**
- 需要安裝多個瀏覽器
- 切換不方便

### 方案 4：接受限制（當前狀態）

如果必須在同一瀏覽器的不同分頁中使用，當前實現**理論上應該**支持，因為：

1. 已經移除了 BroadcastChannel 的 session 同步
2. `sessionStorage` 在每個分頁中應該是獨立的
3. 多分頁檢測已經正確檢查 email

但如果仍然無法工作，可能是 Supabase 的內部邏輯或瀏覽器的限制，我們無法完全控制。

## 測試步驟

如果要測試當前實現是否支持多帳號：

1. 打開兩個分頁（**不要使用無痕模式**）
2. 在分頁 1 登入帳號 A（例如：`leo.chang@avient.com`）
3. 在分頁 2 登入帳號 B（例如：`cti912@hotmail.com`）**（不要刷新分頁 1）**
4. 檢查兩個分頁是否都能正常使用
5. 檢查是否出現「檢測到其他分頁」對話框（不應該出現，因為 email 不同）

## 如果仍然無法工作

如果測試後仍然無法同時使用不同帳號，建議使用**方案 1（不同的瀏覽器 Profile）**，這是最可靠的方式。
