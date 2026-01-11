# 修復用戶角色錯誤

## ❌ 錯誤訊息

```
ERROR: 23514: new row for relation "user_profiles" violates check constraint "user_profiles_role_check"
DETAIL: Failing row contains (..., Planner, ...)
```

## 🔍 問題原因

`user_profiles` 表有一個 CHECK 約束，只允許以下角色值：
- `'admin'` - 管理員
- `'operator'` - 排程員（操作員）
- `'viewer'` - 訪客

**不允許** `'Planner'` 或其他值。

## ✅ 解決方法

將 SQL 中的角色值改為 `'operator'`（排程員）：

```sql
-- ❌ 錯誤：使用 'Planner'
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  '7ef72fa1-a0dc-45f3-a440-b44dfe4ab2af',
  'cti912@hotmail.com',
  'Planner'  -- ❌ 這個值不允許
);

-- ✅ 正確：使用 'operator'
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  '7ef72fa1-a0dc-45f3-a440-b44dfe4ab2af',
  'cti912@hotmail.com',
  'operator'  -- ✅ 正確的角色值
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  updated_at = NOW();

-- 驗證
SELECT id, email, role, created_at
FROM public.user_profiles
WHERE email = 'cti912@hotmail.com';
```

## 📋 正確的角色值對照

| 角色值 | 中文名稱 | 說明 |
|--------|---------|------|
| `'admin'` | 管理員 | 所有權限，包括匯入建議排程 |
| `'operator'` | 排程員 | 所有權限，**不能**匯入建議排程 |
| `'viewer'` | 訪客 | 只能查看，不能編輯 |

## 🔧 完整修正的 SQL

```sql
-- 插入排程員 profile
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  '7ef72fa1-a0dc-45f3-a440-b44dfe4ab2af',  -- 從 Supabase Dashboard > Authentication > Users 複製的 UUID
  'cti912@hotmail.com',  -- 排程員的 email
  'operator'  -- ⚠️ 必須是 'operator'，不是 'Planner'
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  updated_at = NOW();

-- 驗證是否建立成功
SELECT 
  id, 
  email, 
  role,
  CASE 
    WHEN role = 'admin' THEN '✅ 管理員'
    WHEN role = 'operator' THEN '✅ 排程員'
    WHEN role = 'viewer' THEN '✅ 訪客'
    ELSE '❌ 未定義'
  END as role_description,
  created_at
FROM public.user_profiles
WHERE email = 'cti912@hotmail.com';
```
