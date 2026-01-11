# 檢查 RLS 政策實施狀態

## 📋 檢查步驟

### 步驟 1：執行檢查腳本

1. 打開 Supabase Dashboard
2. 進入 SQL Editor
3. 複製並執行 `check_rls_policies.sql` 文件中的所有 SQL 查詢

### 步驟 2：檢查結果

執行腳本後，檢查以下項目：

#### 1. RLS 是否已啟用

所有表（`user_profiles`, `schedule_items`, `line_configs`, `suggested_schedules`）的 `RLS 已啟用` 應該都是 `true`。

#### 2. 函數是否存在

`get_user_role_safe()` 函數應該存在。

#### 3. 政策數量

預期政策數量：

| 表名 | SELECT | INSERT | UPDATE | DELETE | 總數 |
|------|--------|--------|--------|--------|------|
| user_profiles | 1 | 1 | 1 | 0 | 3 |
| schedule_items | 1 | 1 | 1 | 1 | 4 |
| line_configs | 1 | 0 | 1 | 0 | 2 |
| suggested_schedules | 1 | 1 | 1 | 1 | 4 |

#### 4. 政策名稱

預期的政策名稱：

**user_profiles:**
- `Users can view own profile` (SELECT)
- `Allow authenticated users to insert` (INSERT)
- `Users can update own profile` (UPDATE)

**schedule_items:**
- `Authenticated users can view schedule_items` (SELECT)
- `Admin and operator can insert schedule_items` (INSERT)
- `Admin and operator can update schedule_items` (UPDATE)
- `Only admin can delete schedule_items` (DELETE)

**line_configs:**
- `Authenticated users can view line_configs` (SELECT)
- `Admin and operator can update line_configs` (UPDATE)

**suggested_schedules:**
- `Authenticated users can view suggested_schedules` (SELECT)
- `Admin and operator can insert suggested_schedules` (INSERT)
- `Only admin can update suggested_schedules` (UPDATE)
- `Only admin can delete suggested_schedules` (DELETE)

---

## 🔧 如果 RLS 政策未實施

如果檢查結果不符合預期，請執行以下步驟：

### 1. 執行 RLS 政策腳本

在 Supabase SQL Editor 中執行 `supabase_secure_rls_policies.sql` 文件。

### 2. 驗證執行結果

執行後，再次執行 `check_rls_policies.sql` 確認政策已正確實施。

---

## 🧪 測試 RLS 政策

### 測試 1：測試 viewer 用戶權限

使用 viewer 用戶（例如：`david.hung@avient.com`）登入系統，嘗試以下操作：

1. **查看排程**（應該成功）
   - 應該可以查看所有排程項目

2. **新增排程**（應該失敗）
   - 嘗試新增排程項目，應該被 RLS 政策阻止

3. **修改排程**（應該失敗）
   - 嘗試修改排程項目，應該被 RLS 政策阻止

4. **刪除排程**（應該失敗）
   - 嘗試刪除排程項目，應該被 RLS 政策阻止

### 測試 2：測試 operator 用戶權限

使用 operator 用戶登入系統，嘗試以下操作：

1. **查看排程**（應該成功）
2. **新增排程**（應該成功）
3. **修改排程**（應該成功）
4. **刪除排程**（應該失敗 - 只有 admin 可以刪除）

### 測試 3：測試 admin 用戶權限

使用 admin 用戶登入系統，嘗試以下操作：

1. **查看排程**（應該成功）
2. **新增排程**（應該成功）
3. **修改排程**（應該成功）
4. **刪除排程**（應該成功）

### 測試 4：直接調用 Supabase API（重要）

在瀏覽器開發工具 Console 中，使用 viewer 用戶的 session，直接調用 Supabase API：

```javascript
// 使用 viewer 用戶的 Supabase client
const { data, error } = await supabase
  .from('schedule_items')
  .insert({
    product_name: 'TEST',
    batch_number: 'TEST-BATCH',
    quantity: 100,
    delivery_date: '2025-01-01',
    line_id: 'TS26'
  });

// 應該返回錯誤（RLS 政策阻止）
console.log('Insert result:', { data, error });

// 嘗試更新
const { data: updateData, error: updateError } = await supabase
  .from('schedule_items')
  .update({ quantity: 200 })
  .eq('id', '某個存在的 ID');

// 應該返回錯誤（RLS 政策阻止）
console.log('Update result:', { updateData, updateError });

// 嘗試刪除
const { data: deleteData, error: deleteError } = await supabase
  .from('schedule_items')
  .delete()
  .eq('id', '某個存在的 ID');

// 應該返回錯誤（RLS 政策阻止）
console.log('Delete result:', { deleteData, deleteError });
```

**預期結果**：所有修改操作都應該失敗，並返回 RLS 政策錯誤。

---

## ✅ 檢查清單

- [ ] RLS 已啟用（所有表）
- [ ] `get_user_role_safe()` 函數存在
- [ ] 政策數量正確
- [ ] 政策名稱正確
- [ ] viewer 用戶無法新增/修改/刪除（測試通過）
- [ ] operator 用戶可以新增/修改，但無法刪除（測試通過）
- [ ] admin 用戶可以所有操作（測試通過）
- [ ] 直接調用 Supabase API 測試通過（RLS 政策生效）

---

## 📝 備註

- RLS 政策是資料庫層的安全措施，即使前端被繞過，後端也會阻止未授權的操作
- 如果 RLS 政策未正確實施，viewer 用戶可能可以通過直接調用 Supabase API 來繞過前端限制
- 建議定期檢查 RLS 政策，確保安全措施始終有效
