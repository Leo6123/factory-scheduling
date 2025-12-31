# 架構擴展指南 Architecture Guide

## 📋 目錄
1. [現有架構分析](#現有架構分析)
2. [擴展建議](#擴展建議)
3. [最佳實踐](#最佳實踐)
4. [常見擴展場景](#常見擴展場景)

---

## 🏗️ 現有架構分析

### 當前結構
```
src/
├── app/              # Next.js App Router
│   ├── page.tsx      # 主頁面（入口）
│   └── layout.tsx    # 根布局
├── components/        # React 組件
│   ├── Swimlane.tsx  # 主排程視圖（核心組件）
│   ├── DraggableCard.tsx
│   └── ...
├── hooks/            # 自定義 Hooks
│   ├── useScheduleData.ts  # 排程資料管理
│   └── useQCStatus.ts      # QC 狀態管理
├── types/            # TypeScript 類型定義
│   ├── schedule.ts
│   └── productionLine.ts
├── utils/            # 工具函數
│   ├── googleSheets.ts
│   └── excelParser.ts
├── lib/              # 第三方庫配置
│   └── supabase.ts
└── constants/        # 常數定義
    └── productionLines.ts
```

### 當前狀態管理方式
- **本地狀態**: `useState` 在組件內
- **資料持久化**: `useScheduleData` Hook + Supabase
- **QC 狀態**: `useQCStatus` Hook + Google Sheets
- **無全局狀態管理**: 目前沒有使用 Redux/Zustand

---

## 🚀 擴展建議

### 1. **保持模組化架構**

#### ✅ 建議做法
- 每個功能獨立成一個 Hook 或組件
- 使用 TypeScript 介面定義清晰的資料結構
- 組件保持單一職責原則

#### ❌ 避免做法
- 把所有邏輯塞進 `Swimlane.tsx`
- 在組件內直接寫業務邏輯
- 使用 `any` 類型

### 2. **新增功能時的目錄結構**

#### 新增功能模組範例：
```
src/
├── features/              # 新增：功能模組目錄
│   ├── notifications/     # 通知功能
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── types.ts
│   │   └── utils.ts
│   ├── reports/           # 報表功能
│   └── analytics/         # 分析功能
├── services/              # 新增：API 服務層
│   ├── api/
│   │   ├── schedule.ts
│   │   ├── qc.ts
│   │   └── reports.ts
│   └── cache/
└── contexts/               # 新增：Context API（如需全局狀態）
    └── ScheduleContext.tsx
```

### 3. **狀態管理策略**

#### 方案 A: 繼續使用 Hooks（適合小型擴展）
```typescript
// src/hooks/useNewFeature.ts
export function useNewFeature() {
  const [state, setState] = useState();
  // ... 邏輯
  return { state, actions };
}
```

#### 方案 B: Context API（適合中等規模）
```typescript
// src/contexts/ScheduleContext.tsx
export const ScheduleContext = createContext();
export function ScheduleProvider({ children }) {
  // 全局狀態管理
}
```

#### 方案 C: Zustand（推薦，適合大型擴展）
```bash
npm install zustand
```

```typescript
// src/stores/scheduleStore.ts
import { create } from 'zustand';

interface ScheduleStore {
  items: ScheduleItem[];
  addItem: (item: ScheduleItem) => void;
  updateItem: (id: string, updates: Partial<ScheduleItem>) => void;
}

export const useScheduleStore = create<ScheduleStore>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  // ...
}));
```

---

## 📝 最佳實踐

### 1. **類型安全優先**

#### ✅ 好的做法
```typescript
// src/types/newFeature.ts
export interface NewFeatureData {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

// 使用時
function MyComponent({ data }: { data: NewFeatureData }) {
  // ...
}
```

#### ❌ 避免
```typescript
function MyComponent({ data }: { data: any }) {
  // ...
}
```

### 2. **組件拆分原則**

#### 大組件拆分範例：
```typescript
// ❌ 避免：所有邏輯在一個組件
function Swimlane() {
  // 1000+ 行代碼
}

// ✅ 建議：拆分成多個小組件
function Swimlane() {
  return (
    <>
      <SwimlaneHeader />
      <SwimlaneContent />
      <SwimlaneFooter />
    </>
  );
}
```

### 3. **API 服務層分離**

#### 創建統一的 API 服務：
```typescript
// src/services/api/schedule.ts
export const scheduleAPI = {
  async getItems(): Promise<ScheduleItem[]> {
    // 統一處理 API 調用
  },
  async createItem(item: ScheduleItem): Promise<void> {
    // ...
  },
};
```

### 4. **錯誤處理統一化**

```typescript
// src/utils/errorHandler.ts
export function handleError(error: unknown, context: string) {
  console.error(`[${context}]`, error);
  // 統一的錯誤處理邏輯
}
```

---

## 🎯 常見擴展場景

### 場景 1: 新增報表功能

#### 步驟：
1. 創建類型定義
```typescript
// src/types/report.ts
export interface Report {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  data: ReportData;
}
```

2. 創建 Hook
```typescript
// src/hooks/useReports.ts
export function useReports() {
  // 報表邏輯
}
```

3. 創建組件
```typescript
// src/components/ReportView.tsx
export function ReportView() {
  // UI 組件
}
```

4. 在 `Swimlane.tsx` 中整合
```typescript
// 不修改現有邏輯，只添加新功能入口
```

### 場景 2: 新增通知系統

#### 建議結構：
```
src/features/notifications/
├── components/
│   ├── NotificationCenter.tsx
│   └── NotificationItem.tsx
├── hooks/
│   └── useNotifications.ts
├── types.ts
└── utils.ts
```

### 場景 3: 新增權限管理

#### 建議：
- 創建 `src/middleware/auth.ts`（Next.js Middleware）
- 創建 `src/hooks/useAuth.ts`
- 在需要的地方使用

---

## 🔧 技術債務管理

### 當前已知問題：
1. **Swimlane.tsx 過大**（~900 行）
   - 建議：拆分成多個子組件

2. **狀態管理分散**
   - 建議：考慮引入 Zustand 或 Context API

3. **錯誤處理不統一**
   - 建議：創建統一的錯誤處理工具

### 重構優先級：
1. ⚠️ **高優先級**：拆分 `Swimlane.tsx`
2. ⚠️ **中優先級**：統一狀態管理
3. ✅ **低優先級**：優化性能（使用 React.memo）

---

## 📦 依賴管理

### 新增依賴時注意：
1. **檢查相容性**
   ```bash
   npm outdated
   ```

2. **使用 TypeScript 支援的庫**
   - 優先選擇有 `@types/` 的庫

3. **避免重複功能**
   - 例如：已有 `@dnd-kit`，不要再用 `react-beautiful-dnd`

---

## 🧪 測試建議（未來）

### 建議結構：
```
src/
├── __tests__/
│   ├── components/
│   ├── hooks/
│   └── utils/
└── __mocks__/
```

### 測試工具：
- **Jest** + **React Testing Library**
- **Playwright**（E2E 測試）

---

## 📚 文檔維護

### 每次新增功能時：
1. 更新 `README.md`
2. 在 `docs/` 目錄添加功能說明
3. 更新類型定義的註釋

---

## ✅ 檢查清單（新增功能前）

- [ ] 是否已定義 TypeScript 類型？
- [ ] 是否遵循現有的目錄結構？
- [ ] 是否會影響現有功能？
- [ ] 是否已考慮錯誤處理？
- [ ] 是否已考慮性能影響？
- [ ] 是否已更新相關文檔？

---

## 🎓 總結

### 核心原則：
1. **模組化**：每個功能獨立
2. **類型安全**：充分利用 TypeScript
3. **可維護性**：清晰的代碼結構
4. **可擴展性**：預留擴展空間

### 擴展流程：
```
新功能需求
    ↓
定義類型 (types/)
    ↓
創建 Hook/Service (hooks/ 或 services/)
    ↓
創建組件 (components/ 或 features/)
    ↓
整合到現有系統
    ↓
測試與優化
```

---

**最後更新**: 2025-01-XX
**維護者**: 開發團隊

