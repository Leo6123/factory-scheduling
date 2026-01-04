# 部署指南

## 版本更新內容

本次更新包含以下新功能：
- ✅ 建議排程功能（Excel 匯入，顯示在卡片上）
- ✅ 看配方功能（展開/收合顯示配方項目）
- ✅ 混合缸排程功能
- ✅ 齊料時間功能（支援編輯和警告提示）
- ✅ 2押和 3押功能
- ✅ 新增生產線：HS1, HS2, HS3, HS4, M600, H/C, 小僑隆
- ✅ 修復拖曳卡片至垃圾桶的問題
- ✅ 修復重新匯入資料的問題

## 部署步驟

### 1. Git 推送（已完成）
```bash
git push origin main
```

### 2. Supabase 資料庫遷移

#### 方法 A：使用 Supabase Dashboard SQL Editor
1. 登入 Supabase Dashboard
2. 進入 SQL Editor
3. 執行 `docs/supabase_migration.sql` 中的 SQL 語句

#### 方法 B：使用 Supabase CLI
```bash
supabase db push
```

#### 重要說明
- 如果資料庫表已存在，SQL 會自動跳過（使用 `IF NOT EXISTS`）
- `recipe_items` 欄位是可選的，如果不存在，系統會自動跳過，不影響功能
- 建議先備份資料庫

### 3. Vercel 部署

#### 自動部署（推薦）
- 如果已設定 Vercel 自動部署，推送後會自動觸發部署
- 檢查 Vercel Dashboard 確認部署狀態

#### 手動部署
```bash
# 安裝 Vercel CLI（如果尚未安裝）
npm i -g vercel

# 部署
vercel --prod
```

#### 環境變數檢查
確保 Vercel 專案設定中有以下環境變數：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_GOOGLE_SHEET_ID`（可選，QC 狀態功能）
- `NEXT_PUBLIC_GOOGLE_API_KEY`（可選，QC 狀態功能）

### 4. 驗證部署

#### 功能測試清單
- [ ] 匯入訂單 Excel 檔案
- [ ] 匯入建議排程 Excel 檔案
- [ ] 查看卡片上的建議排程
- [ ] 查看卡片上的配方（如果有配方資料）
- [ ] 拖曳卡片到垃圾桶（應只刪除單一卡片）
- [ ] 重新匯入資料（不應清除所有卡片）
- [ ] 混合缸排程功能
- [ ] 齊料時間編輯功能
- [ ] 2押和 3押功能

#### 資料庫驗證
```sql
-- 檢查建議排程表
SELECT COUNT(*) FROM suggested_schedules;

-- 檢查配方資料欄位
SELECT id, product_name, recipe_items 
FROM schedule_items 
WHERE recipe_items IS NOT NULL 
LIMIT 5;
```

## 回滾方案

如果部署後發現問題，可以：

### 1. Git 回滾
```bash
git revert HEAD
git push origin main
```

### 2. Vercel 回滾
- 在 Vercel Dashboard 中選擇之前的部署版本
- 點擊 "Promote to Production"

### 3. 資料庫回滾（如果需要）
```sql
-- 移除配方資料欄位（謹慎使用）
ALTER TABLE schedule_items DROP COLUMN IF EXISTS recipe_items;

-- 刪除建議排程表（謹慎使用）
DROP TABLE IF EXISTS suggested_schedules;
```

## 注意事項

1. **向後兼容性**：所有新功能都是向後兼容的，不會影響現有資料
2. **資料庫欄位**：`recipe_items` 欄位是可選的，如果不存在，系統會自動跳過
3. **環境變數**：確保所有必要的環境變數都已設定
4. **備份**：建議在部署前備份資料庫

## 支援

如有問題，請檢查：
- 瀏覽器控制台的錯誤訊息
- Vercel 部署日誌
- Supabase 資料庫日誌


