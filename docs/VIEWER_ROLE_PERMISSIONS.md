# Viewer（讀者）角色權限設定說明

## 📋 概述

Viewer（讀者）角色是唯讀角色，只能查看排程資料，無法進行任何編輯或操作。

## ✅ 允許的功能

### 1. 查看排程資料
- **卡片視圖**：可以查看卡片模式的排程資料
- **24h 時間軸視圖**：可以查看時間軸模式的排程資料

### 2. 日期選擇
- **月份選擇器**：可以選擇年份和月份
- **日期選擇**：可以選擇具體的日期（點擊日期按鈕）
- **日期範圍選項**（僅卡片模式）：
  - **1日**：顯示當天的排程
  - **15日**：顯示前 15 天的排程
  - **月底**：顯示到月底的排程（30 日或 31 日）

### 3. 批號查詢
- **批號搜尋**：可以使用右上角的「批號查詢」功能搜尋特定批號

### 4. 統計資料查看
- **月總產能**：可以查看當月的總產能
- **月已排程**：可以查看當月已排程的數量
- **當日已排產能**：可以查看當天已排程的產能
- **當日完成產量**：可以查看當天完成的產量
- **月剩餘**：可以查看當月剩餘的產能

## ❌ 禁止的功能

### 1. 左側邊欄（完全隱藏）
- **匯入訂單**：無法匯入 Excel 檔案
- **混合缸新增**：無法新增混合缸排程
- **新增卡片**：無法新增卡片
- **NG修色新增**：無法新增 NG修色項目
- **清機流程**：無法新增清機流程
- **故障維修**：無法新增故障維修
- **回到上一步**：無法使用復原功能
- **清除全部**：無法清除所有排程
- **匯出排程**：無法匯出排程資料
- **存檔功能**：無法儲存或載入排程快照
- **匯入建議排程**：無法匯入建議排程
- **未排程區域**：無法看到未排程的項目

### 2. 卡片功能（完全禁用）
- **拖曳卡片**：無法拖曳卡片到不同產線或時間
- **編輯數量**：無法點擊數量進行編輯
- **編輯齊料時間**：無法點擊齊料時間進行編輯
- **切換狀態**：無法切換以下狀態：
  - 2押
  - 3押
  - 結晶
  - CCD
  - Dryblending
  - Package
  - 異常未完成
- **查看配方**：無法查看配方內容（預設收合，不顯示配方列表）

### 3. 產線設定
- **編輯產能**：無法編輯產線的產能設定

## 🔧 技術實現

### 權限檢查

Viewer 角色的權限設定（`src/types/auth.ts`）：
```typescript
viewer: {
  canImport: false,
  canExport: false,
  canClear: false,
  canEdit: false,    // 關鍵：無法編輯
  canDelete: false,
  canView: true,     // 只能查看
  canImportSuggestedSchedule: false,
}
```

### 主要修改

1. **左側邊欄隱藏**（`src/components/Swimlane.tsx`）：
   ```typescript
   {canEdit && (
     <UnscheduledSidebar ... />
   )}
   ```
   - 只有 `canEdit = true` 的用戶才能看到左側邊欄

2. **拖曳功能禁用**（`src/components/Swimlane.tsx`）：
   ```typescript
   <DndContext
     sensors={canEdit ? sensors : []}  // viewer 無法拖曳：禁用所有 sensors
     onDragStart={canEdit ? handleDragStart : undefined}
     onDragMove={canEdit ? handleDragMove : undefined}
     onDragEnd={canEdit ? handleDragEnd : undefined}
   >
   ```
   - 只有 `canEdit = true` 的用戶才能拖曳卡片

3. **卡片功能禁用**（`src/components/DraggableCard.tsx`）：
   - 所有編輯功能都已經有 `canEdit` 檢查
   - 拖曳功能使用 `disabled: !canEdit`
   - 數量編輯、齊料時間編輯、狀態切換都根據 `canEdit` 條件顯示

## 📝 使用場景

Viewer 角色適合：
- **管理層查看**：管理層可以查看排程狀態，但不進行修改
- **報表查看**：需要查看排程資料但不進行操作的人員
- **只讀訪問**：只需要查看權限的用戶

## ⚠️ 注意事項

1. **資料同步**：Viewer 仍然會收到 Realtime 同步更新，可以看到其他用戶的編輯結果
2. **無法編輯**：即使看到資料，也無法進行任何編輯或操作
3. **左側邊欄完全隱藏**：Viewer 無法看到未排程的項目，只能查看已排程的項目

## 📚 相關文件

- `src/types/auth.ts` - 角色權限定義
- `src/components/Swimlane.tsx` - 主排程組件（權限檢查）
- `src/components/UnscheduledSidebar.tsx` - 左側邊欄組件
- `src/components/DraggableCard.tsx` - 可拖曳卡片組件（權限檢查）
