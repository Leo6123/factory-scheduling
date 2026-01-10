"use client";

import Swimlane from "@/components/Swimlane";
import { mockScheduleItems } from "@/data/mockSchedule";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function Home() {
  const { user, signOut, permissions } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <ProtectedRoute>
      <main className="h-screen flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                工廠排程系統 APS
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                生產排程視覺化管理 · 11 條產線
              </p>
            </div>
            
            {/* 用戶資訊和登出按鈕 */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-300">{user?.email}</div>
                <div className="text-xs text-gray-500">
                  {user?.role === 'admin' ? '管理員' : user?.role === 'operator' ? '操作員' : '訪客'}
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
              >
                登出
              </button>
            </div>
          </div>
        </div>

        {/* 主要內容區 */}
        <div className="flex-1 overflow-hidden">
          <Swimlane initialItems={mockScheduleItems} />
        </div>
      </main>
    </ProtectedRoute>
  );
}
