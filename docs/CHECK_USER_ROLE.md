# 檢查用戶角色設定

## 確認用戶角色

請在 Supabase SQL Editor 中執行以下 SQL，確認 `ali.liu@avient.com` 的角色：

```sql
-- 檢查用戶角色
SELECT 
  id, 
  email, 
  role, 
  created_at, 
  updated_at
FROM public.user_profiles 
WHERE email = 'ali.liu@avient.com';
```

**預期結果**：
- 如果角色是 `viewer`，應該看到 `role = 'viewer'`
- 如果角色不是 `viewer`，需要更新角色

## 如果角色不是 viewer

如果查詢結果顯示角色不是 `viewer`，執行以下 SQL 更新：

```sql
-- 將用戶角色更新為 viewer
UPDATE public.user_profiles
SET 
  role = 'viewer',
  updated_at = NOW()
WHERE email = 'ali.liu@avient.com';

-- 驗證更新結果
SELECT id, email, role, updated_at
FROM public.user_profiles 
WHERE email = 'ali.liu@avient.com';
```

## 如果角色已經是 viewer

如果角色已經是 `viewer`，但還是可以看到左側邊欄和配方列表，可能是：

1. **瀏覽器快取問題**：
   - 清除瀏覽器快取
   - 硬刷新頁面（Ctrl + Shift + R）
   - 清除 sessionStorage 和 localStorage

2. **代碼未部署**：
   - 如果是生產環境，需要重新部署代碼
   - 如果是開發環境，需要重啟開發伺服器

3. **權限檢查邏輯問題**：
   - 檢查 `AuthContext` 中的權限檢查邏輯
   - 確認 `hasPermission('canEdit')` 是否正確返回 `false`

## 檢查所有 viewer 角色

查看所有 viewer 角色：

```sql
SELECT 
  id, 
  email, 
  role, 
  created_at, 
  updated_at
FROM public.user_profiles 
WHERE role = 'viewer'
ORDER BY email;
```

## 檢查權限設定

查看角色權限設定（確認 viewer 的 canEdit 是否為 false）：

在 `src/types/auth.ts` 中應該有：
```typescript
viewer: {
  canImport: false,
  canExport: false,
  canClear: false,
  canEdit: false,    // 必須是 false
  canDelete: false,
  canView: true,
  canImportSuggestedSchedule: false,
}
```
