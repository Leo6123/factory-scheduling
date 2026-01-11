# 構建錯誤分析

## 📋 錯誤訊息

```
Error: Unexpected token `DndContext`. Expected jsx identifier
./src/components/Swimlane.tsx
  }, [scheduleItems, selectedDateStr, lineConfigs]);

  return (
    <DndContext
```

## 🔍 問題定位

錯誤發生在 commit `a8b8c49`（feat: implement viewer role permissions）中。

比較：
- ✅ commit `56eeaa7`：構建成功
- ❌ commit `a8b8c49`：構建失敗

## 📝 Commit a8b8c49 的變更

1. 添加 `import { useAuth } from "@/contexts/AuthContext";`
2. 在組件開頭添加：
   ```typescript
   const { hasPermission } = useAuth();
   const canEdit = hasPermission('canEdit');
   const canView = hasPermission('canView');
   ```
3. 修改 `DndContext` 的 props：
   ```typescript
   sensors={canEdit ? sensors : []}
   onDragStart={canEdit ? handleDragStart : undefined}
   onDragMove={canEdit ? handleDragMove : undefined}
   onDragEnd={canEdit ? handleDragEnd : undefined}
   ```
4. 在 `UnscheduledSidebar` 外添加條件渲染：`{canEdit && (`

## 🤔 可能的原因

錯誤訊息 "Expected jsx identifier" 通常表示：
1. 在 `return` 之前有未閉合的括號或語法錯誤
2. 函數定義有問題
3. JSX 語法解析錯誤

但從代碼來看，結構都是正確的。

## 🔧 需要進一步檢查

需要查看完整的構建日誌或使用 TypeScript 編譯器來確認具體問題。
