# 檢查瀏覽器控制台日誌

## 📋 說明

這是排查 Viewer 權限問題的**最重要步驟**。控制台日誌會告訴我們：
1. 用戶角色是否正確從資料庫獲取
2. 權限檢查是否正確
3. 是否有錯誤發生

## 🔧 步驟

### 1. 打開開發者工具

1. **登錄系統**（使用 `david.hung@avient.com`）
2. **按 `F12` 打開開發者工具**
3. **切換到 Console 標籤**

### 2. 查看日誌

在 Console 中搜索以下關鍵字：

#### 關鍵字 1：`[Auth] 開始獲取用戶角色`

**應該看到**：
```
🔍 [Auth] 開始獲取用戶角色，用戶 ID: 091c1409-c47e-46d4-a841-c1a24a6458cc Email: david.hung@avient.com
```

#### 關鍵字 2：`獲取用戶角色成功`

**應該看到**：
```
✅ [Auth] 獲取用戶角色成功: viewer Email: david.hung@avient.com
```

**如果看到**：
```
⚠️ [Auth] user_profiles 中沒有該用戶記錄（ID: ...），使用默認角色 operator
```
這表示用戶沒有在 `user_profiles` 表中，需要重新執行 SQL。

**如果看到**：
```
⚠️ [Auth] 獲取用戶角色失敗，使用默認角色 operator
```
這表示查詢失敗，使用了默認角色。

#### 關鍵字 3：`後台獲取角色成功`

**應該看到**：
```
✅ 後台獲取角色成功，更新為: viewer
```

**如果看到**：
```
⚠️ 後台獲取角色失敗，保持默認角色: ...
```
這表示後台獲取角色失敗，仍在使用默認角色 `operator`。

### 3. 截圖或複製日誌

請截圖或複製控制台中的所有日誌，特別是：
- 包含 `[Auth]` 的日誌
- 包含 `獲取用戶角色` 的日誌
- 包含 `後台獲取角色` 的日誌
- 任何錯誤訊息（紅色文字）

### 4. 清除控制台並重新登錄

1. **點擊控制台的清除按鈕**（🚫 圖標）
2. **登出系統**
3. **重新登錄**
4. **查看新的日誌**

## 🎯 預期的完整日誌流程

如果一切正常，應該看到以下日誌（按順序）：

```
✅ 找到現有會話，用戶: david.hung@avient.com
🔍 [Auth] 開始獲取用戶角色，用戶 ID: 091c1409-c47e-46d4-a841-c1a24a6458cc Email: david.hung@avient.com
✅ [Auth] 獲取用戶角色成功: viewer Email: david.hung@avient.com
✅ 後台獲取角色成功，更新為: viewer
```

## 🆘 如果看到錯誤

### 錯誤 1：`user_profiles 中沒有該用戶記錄`

**原因**：用戶沒有在 `user_profiles` 表中

**解決方法**：
1. 在 Supabase SQL Editor 中執行：
   ```sql
   SELECT id, email, role 
   FROM public.user_profiles 
   WHERE email = 'david.hung@avient.com';
   ```
2. 如果沒有記錄，重新執行 `supabase_set_all_viewers.sql`

### 錯誤 2：`獲取用戶角色失敗，使用默認角色 operator`

**原因**：查詢失敗，可能是 RLS 政策問題

**解決方法**：
1. 檢查 RLS 政策
2. 確認用戶有權限查詢 `user_profiles` 表

### 錯誤 3：`後台獲取角色失敗，保持默認角色`

**原因**：後台獲取角色時失敗，仍在使用默認角色 `operator`

**解決方法**：
1. 檢查控制台中的錯誤訊息
2. 查看是否有網路錯誤
3. 確認資料庫連線正常

## 📚 相關文件

- `docs/TROUBLESHOOT_VIEWER_PERMISSIONS.md` - 完整的排查步驟
- `docs/DEBUG_VIEWER_UI_ISSUE.md` - 排查 Viewer UI 顯示問題
