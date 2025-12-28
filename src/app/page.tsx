"use client";

import Swimlane from "@/components/Swimlane";
import { mockScheduleItems } from "@/data/mockSchedule";

export default function Home() {
  return (
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
        </div>
      </div>

      {/* 主要內容區 */}
      <div className="flex-1 overflow-hidden">
        <Swimlane initialItems={mockScheduleItems} />
      </div>
    </main>
  );
}
