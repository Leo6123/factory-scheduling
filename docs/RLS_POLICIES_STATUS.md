# RLS 政策實施狀態確認

## ✅ 檢查結果（2025-01-11）

### 政策數量檢查

| 表名 | SELECT | INSERT | UPDATE | DELETE | 總數 | 狀態 |
|------|--------|--------|--------|--------|------|------|
| `user_profiles` | 1 | 1 | 1 | 0 | 3 | ✅ 符合預期 |
| `schedule_items` | 1 | 1 | 1 | 1 | 4 | ✅ 符合預期 |
| `line_configs` | 1 | 0 | 1 | 0 | 2 | ✅ 符合預期 |
| `suggested_schedules` | 1 | 1 | 1 | 1 | 4 | ✅ 符合預期 |

### 結論

**所有表的 RLS 政策數量都符合預期！** ✅

---

## 📋 下一步：完整驗證

雖然政策數量正確，但還需要確認：

### 1. 檢查函數是否存在

請執行以下 SQL 查詢來確認 `get_user_role_safe()` 函數存在：

```sql
SELECT 
  proname as "函數名稱",
  prorettype::regtype as "返回類型",
  pg_get_function_arguments(oid) as "參數"
FROM pg_proc
WHERE proname IN ('get_user_role', 'get_user_role_safe')
AND pronamespace = 'public'::regnamespace;
```

**預期結果**：應該返回 2 行（`get_user_role` 和 `get_user_role_safe`）

### 2. 檢查 RLS 是否已啟用

請執行以下 SQL 查詢來確認所有表的 RLS 都已啟用：

```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS 已啟用"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'schedule_items', 'line_configs', 'suggested_schedules')
ORDER BY tablename;
```

**預期結果**：所有表的 `RLS 已啟用` 都應該是 `true`

### 3. 測試 RLS 政策是否生效（重要）

使用 viewer 用戶（例如：`david.hung@avient.com`）登入系統後，在瀏覽器 Console 中執行：

```javascript
// 測試新增（應該失敗）
const { data, error } = await supabase
  .from('schedule_items')
  .insert({
    product_name: 'TEST-RLS',
    batch_number: 'TEST-BATCH-RLS',
    quantity: 100,
    delivery_date: '2025-01-01',
    line_id: 'TS26'
  });
console.log('新增結果:', { data, error });
// 預期：error 應該包含 "new row violates row-level security policy"

// 測試更新（應該失敗）
const { data: items } = await supabase
  .from('schedule_items')
  .select('id')
  .limit(1);

if (items && items.length > 0) {
  const { data: updateData, error: updateError } = await supabase
    .from('schedule_items')
    .update({ quantity: 999 })
    .eq('id', items[0].id);
  console.log('更新結果:', { updateData, updateError });
  // 預期：error 應該包含 "new row violates row-level security policy"
}

// 測試刪除（應該失敗）
if (items && items.length > 0) {
  const { data: deleteData, error: deleteError } = await supabase
    .from('schedule_items')
    .delete()
    .eq('id', items[0].id);
  console.log('刪除結果:', { deleteData, deleteError });
  // 預期：error 應該包含 "new row violates row-level security policy"
}
```

**預期結果**：所有修改操作都應該失敗，並返回 RLS 政策錯誤。

---

## ✅ 檢查清單

- [x] 政策數量正確（所有表）
- [ ] `get_user_role_safe()` 函數存在（需要確認）
- [ ] RLS 已啟用（所有表）（需要確認）
- [ ] viewer 用戶無法新增/修改/刪除（需要測試）
- [ ] operator 用戶可以新增/修改，但無法刪除（需要測試）
- [ ] admin 用戶可以所有操作（需要測試）

---

## 📝 備註

- RLS 政策數量正確是好的開始，但還需要確認政策內容是否正確
- 建議執行上述測試來確認 RLS 政策真正生效
- 如果測試失敗，可能需要檢查政策的 USING 和 WITH CHECK 條件
