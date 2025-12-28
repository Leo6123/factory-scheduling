"use client";

import { useState } from "react";
import { ScheduleItem } from "@/types/schedule";

interface MaintenanceFormProps {
  onAdd: (item: ScheduleItem) => void;
}


export default function MaintenanceForm({ onAdd }: MaintenanceFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customHours, setCustomHours] = useState("");

  const handleSubmit = () => {
    const hours = parseFloat(customHours);
    if (isNaN(hours) || hours <= 0) {
      alert("請輸入有效的時間");
      return;
    }
    
    const now = new Date();
    const id = `MAINT-${now.getTime()}`;
    
    // 故障維修的 quantity 代表時長 (分鐘)
    const durationMinutes = hours * 60;
    
    const newItem: ScheduleItem = {
      id,
      productName: `故障維修`,
      materialDescription: `${hours} 小時`,
      batchNumber: id,
      quantity: durationMinutes,
      deliveryDate: now.toISOString().split('T')[0],
      lineId: "UNSCHEDULED",
      isMaintenance: true,
      maintenanceHours: hours,
    };

    onAdd(newItem);
    setIsOpen(false);
    setCustomHours("");
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full px-3 py-2 text-sm font-medium rounded-lg
                   bg-amber-500/20 text-amber-400 border border-amber-500/30
                   hover:bg-amber-500/30 transition-colors
                   flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>故障維修</span>
      </button>
    );
  }

  return (
    <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-amber-400">🔧 故障維修</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* 輸入時間 */}
      <div className="mb-3">
        <label className="text-xs text-gray-400 mb-1 block">維修時間 (小時):</label>
        <input
          type="number"
          value={customHours}
          onChange={(e) => setCustomHours(e.target.value)}
          placeholder="輸入小時數..."
          className="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded-lg
                     text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
          step="0.5"
          min="0.5"
        />
      </div>

      {/* 確認按鈕 */}
      <button
        onClick={handleSubmit}
        className="w-full px-3 py-2 text-sm font-medium rounded-lg
                   bg-amber-600 text-white hover:bg-amber-500 transition-colors"
      >
        新增維修卡片
      </button>
    </div>
  );
}

