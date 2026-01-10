"use client";

import { useActiveUsers } from '@/hooks/useActiveUsers';

/**
 * 顯示當前活動用戶的組件
 */
export default function ActiveUsersIndicator() {
  const { activeUsers, isLoading } = useActiveUsers();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
        <span>載入中...</span>
      </div>
    );
  }

  if (activeUsers.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
        <span>僅您一人</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>{activeUsers.length} 人在線</span>
      </div>
      {activeUsers.length > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-gray-500">•</span>
          <span className="text-gray-500 truncate max-w-[150px]">
            {activeUsers[0].email}
            {activeUsers.length > 1 && ` 等 ${activeUsers.length} 人`}
          </span>
        </div>
      )}
    </div>
  );
}
