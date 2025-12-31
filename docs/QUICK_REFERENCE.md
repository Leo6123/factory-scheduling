# 快速參考指南 Quick Reference

## 🚀 新增功能時的快速檢查清單

### 1. 決定功能位置

| 功能類型 | 放置位置 | 範例 |
|---------|---------|------|
| 簡單工具函數 | `src/utils/` | `formatDate.ts` |
| 資料處理邏輯 | `src/hooks/` | `useReports.ts` |
| UI 組件 | `src/components/` | `ReportView.tsx` |
| 複雜功能模組 | `src/features/` | `notifications/` |
| API 服務 | `src/services/api/` | `reportAPI.ts` |
| 類型定義 | `src/types/` | `report.ts` |

---

## 📁 目錄結構決策樹

```
新功能需求
    ↓
是 UI 組件嗎？
    ├─ 是 → src/components/
    └─ 否 ↓
是資料處理邏輯嗎？
    ├─ 是 → src/hooks/
    └─ 否 ↓
是工具函數嗎？
    ├─ 是 → src/utils/
    └─ 否 ↓
是 API 調用嗎？
    ├─ 是 → src/services/api/
    └─ 否 ↓
是複雜功能模組嗎？
    └─ 是 → src/features/
```

---

## 🔧 常見擴展場景與對應方案

### 場景 1: 新增報表功能

```
✅ 建議結構：
src/
├── types/
│   └── report.ts              # 定義 Report 類型
├── hooks/
│   └── useReports.ts          # 報表資料處理
├── components/
│   ├── ReportView.tsx         # 報表視圖
│   └── ReportFilters.tsx      # 報表篩選器
└── services/api/
    └── reportAPI.ts           # 報表 API（如需要）
```

### 場景 2: 新增權限管理

```
✅ 建議結構：
src/
├── types/
│   └── auth.ts                # 定義 User, Permission 類型
├── hooks/
│   └── useAuth.ts             # 權限檢查邏輯
├── middleware.ts               # Next.js Middleware（路由保護）
└── components/
    └── ProtectedRoute.tsx     # 受保護的路由組件
```

### 場景 3: 新增即時通知

```
✅ 建議結構：
src/
├── features/
│   └── notifications/
│       ├── components/
│       │   ├── NotificationCenter.tsx
│       │   └── NotificationItem.tsx
│       ├── hooks/
│       │   └── useNotifications.ts
│       ├── types.ts
│       └── utils.ts
└── services/
    └── websocket.ts           # WebSocket 連接（如需要）
```

### 場景 4: 新增資料匯出功能

```
✅ 建議結構：
src/
├── utils/
│   └── exportUtils.ts         # 匯出邏輯（CSV, PDF 等）
├── components/
│   └── ExportButton.tsx       # 匯出按鈕（已存在，可擴展）
└── types/
    └── export.ts              # 匯出選項類型
```

---

## ⚠️ 避免的常見錯誤

### ❌ 錯誤 1: 把所有邏輯塞進現有組件
```typescript
// ❌ 不好：在 Swimlane.tsx 中直接寫新功能
function Swimlane() {
  // ... 900 行現有代碼 ...
  // 新增 200 行報表邏輯 ← 不要這樣做
}
```

```typescript
// ✅ 好：創建獨立組件
function Swimlane() {
  return (
    <>
      {/* 現有邏輯 */}
      <ReportView /> {/* 新功能 */}
    </>
  );
}
```

### ❌ 錯誤 2: 不定義類型
```typescript
// ❌ 不好
function processData(data: any) {
  // ...
}
```

```typescript
// ✅ 好
interface ProcessedData {
  id: string;
  value: number;
}
function processData(data: ProcessedData) {
  // ...
}
```

### ❌ 錯誤 3: 直接修改核心邏輯
```typescript
// ❌ 不好：為了新功能修改核心邏輯
function Swimlane() {
  // 修改現有的排序邏輯來支援報表 ← 不要這樣做
}
```

```typescript
// ✅ 好：通過組合擴展
function Swimlane() {
  // 保持現有邏輯不變
}

function ReportView() {
  // 新功能獨立實現
  const { items } = useScheduleData(); // 重用現有 Hook
}
```

---

## 📦 依賴管理

### 新增依賴前檢查：

1. **是否已有類似功能？**
   ```bash
   # 檢查現有依賴
   cat package.json | grep -i "相關關鍵字"
   ```

2. **是否相容 TypeScript？**
   - 優先選擇有 `@types/` 的庫
   - 或確認庫本身支援 TypeScript

3. **是否會增加 bundle 大小？**
   - 使用 `npm run build` 檢查
   - 考慮使用動態導入（`next/dynamic`）

---

## 🔍 代碼審查檢查點

新增功能後，檢查：

- [ ] 是否有 TypeScript 類型定義？
- [ ] 是否有適當的錯誤處理？
- [ ] 是否遵循現有的命名慣例？
- [ ] 是否會影響現有功能的性能？
- [ ] 是否已更新相關文檔？
- [ ] 是否通過 `npm run build` 編譯？

---

## 🎯 整合新功能到現有系統

### 方法 1: 組合模式（推薦）
```typescript
// 不修改現有組件，通過組合添加
function Page() {
  return (
    <>
      <ExistingComponent />
      <NewFeature /> {/* 新功能 */}
    </>
  );
}
```

### 方法 2: Hook 擴展
```typescript
// 重用現有 Hook，擴展新功能
function useExtendedSchedule() {
  const schedule = useScheduleData(); // 現有 Hook
  const newFeature = useNewFeature(); // 新功能 Hook
  
  return { ...schedule, ...newFeature };
}
```

### 方法 3: 組件擴展
```typescript
// 通過 props 擴展現有組件
<Swimlane 
  {...existingProps}
  newFeature={newFeatureData} // 新功能
/>
```

---

## 📚 相關文檔

- [架構指南](./ARCHITECTURE_GUIDE.md) - 詳細架構說明
- [功能範例](./FEATURE_EXAMPLE.md) - 完整範例代碼
- [資料庫設置](./DATABASE_SETUP.md) - Supabase 設置
- [Google Sheets 設置](./GOOGLE_SHEETS_SETUP.md) - Google Sheets 整合

---

## 💡 快速決策流程

```
遇到新功能需求
    ↓
需要 UI 嗎？
    ├─ 是 → 創建組件 (components/)
    └─ 否 ↓
需要狀態管理嗎？
    ├─ 是 → 創建 Hook (hooks/)
    └─ 否 ↓
需要 API 調用嗎？
    ├─ 是 → 創建服務 (services/api/)
    └─ 否 ↓
是工具函數嗎？
    └─ 是 → 創建工具 (utils/)
```

---

**最後更新**: 2025-01-XX

