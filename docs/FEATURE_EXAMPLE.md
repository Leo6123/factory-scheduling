# 功能擴展範例：新增「通知系統」

## 📋 目標
示範如何在不影響現有程式碼的情況下，新增一個通知功能。

---

## 🎯 步驟 1: 定義類型

```typescript
// src/types/notification.ts
export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
}
```

---

## 🎯 步驟 2: 創建 Hook

```typescript
// src/hooks/useNotifications.ts
"use client";

import { useState, useCallback } from 'react';
import { Notification, NotificationType } from '@/types/notification';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((
    type: NotificationType,
    title: string,
    message: string
  ) => {
    const notification: Notification = {
      id: Date.now().toString(),
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
    };
    
    setNotifications((prev) => [notification, ...prev]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    clearAll,
  };
}
```

---

## 🎯 步驟 3: 創建組件

```typescript
// src/components/NotificationCenter.tsx
"use client";

import { useNotifications } from '@/hooks/useNotifications';
import { NotificationType } from '@/types/notification';

const typeColors: Record<NotificationType, string> = {
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
};

export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();

  return (
    <div className="fixed top-4 right-4 z-50 w-96">
      <div className="bg-gray-800 rounded-lg shadow-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">
            通知 {unreadCount > 0 && `(${unreadCount})`}
          </h3>
          <button
            onClick={clearAll}
            className="text-sm text-gray-400 hover:text-white"
          >
            清除全部
          </button>
        </div>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded ${
                notification.read ? 'bg-gray-700' : 'bg-gray-600'
              } cursor-pointer hover:bg-gray-500`}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="flex items-start gap-2">
                <div className={`w-2 h-2 rounded-full mt-2 ${typeColors[notification.type]}`} />
                <div className="flex-1">
                  <div className="font-semibold">{notification.title}</div>
                  <div className="text-sm text-gray-300">{notification.message}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {notification.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 🎯 步驟 4: 整合到現有系統（不修改核心邏輯）

```typescript
// src/app/page.tsx
"use client";

import Swimlane from "@/components/Swimlane";
import { NotificationCenter } from "@/components/NotificationCenter"; // 新增
import { mockScheduleItems } from "@/data/mockSchedule";

export default function Home() {
  return (
    <main className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/10">
        {/* ... 現有代碼 ... */}
      </div>

      {/* 主要內容區 */}
      <div className="flex-1 overflow-hidden">
        <Swimlane initialItems={mockScheduleItems} />
      </div>

      {/* 新增：通知中心（不影響現有功能） */}
      <NotificationCenter />
    </main>
  );
}
```

---

## 🎯 步驟 5: 在需要的地方使用（可選）

```typescript
// src/components/Swimlane.tsx
// 在現有組件中使用（不修改核心邏輯）

import { useNotifications } from '@/hooks/useNotifications';

export default function Swimlane({ initialItems }: SwimlaneProps) {
  const { addNotification } = useNotifications(); // 新增
  
  // 在適當的地方觸發通知
  const handleSaveSuccess = () => {
    addNotification('success', '儲存成功', '排程已成功儲存');
  };

  // ... 現有邏輯保持不變
}
```

---

## ✅ 優點

1. **不影響現有代碼**：所有新功能都在新文件中
2. **類型安全**：完整的 TypeScript 支援
3. **可重用**：`useNotifications` Hook 可在任何地方使用
4. **易於測試**：每個部分都可以獨立測試
5. **易於維護**：清晰的結構和職責分離

---

## 📝 總結

這個範例展示了：
- ✅ 如何定義類型
- ✅ 如何創建可重用的 Hook
- ✅ 如何創建獨立組件
- ✅ 如何整合到現有系統而不破壞現有功能

**關鍵原則**：新增功能時，盡量不修改現有核心邏輯，而是通過組合和擴展的方式實現。

