"use client";

import { useState } from "react";
import { ScheduleItem, CleaningProcessType, CLEANING_PROCESS_DURATION } from "@/types/schedule";

interface CleaningProcessFormProps {
  onAdd: (item: ScheduleItem) => void;
}

const CLEANING_OPTIONS: { type: CleaningProcessType; label: string }[] = [
  { type: 'A', label: 'A: 30分鐘' },
  { type: 'B', label: 'B: 60分鐘' },
  { type: 'C', label: 'C: 90分鐘' },
  { type: 'D', label: 'D: 120分鐘' },
  { type: 'E', label: 'E: 480分鐘' },
];

export default function CleaningProcessForm({ onAdd }: CleaningProcessFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<CleaningProcessType>('A');

  const handleSubmit = () => {
    const duration = CLEANING_PROCESS_DURATION[selectedType];
    const now = new Date();
    const id = `CLEAN-${selectedType}-${now.getTime()}`;
    
    // 清機流程的 quantity 代表時長 (分鐘)，用於計算時間軸上的寬度
    const newItem: ScheduleItem = {
      id,
      productName: `清機流程 ${selectedType}`,
      materialDescription: `${duration} 分鐘`,
      batchNumber: id,
      quantity: duration, // 以分鐘為單位
      deliveryDate: now.toISOString().split('T')[0],
      lineId: "UNSCHEDULED",
      isCleaningProcess: true,
      cleaningType: selectedType,
    };

    onAdd(newItem);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full h-8 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap
                   bg-cyan-500/20 text-cyan-400 border border-cyan-500/30
                   hover:bg-cyan-500/30 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>清機流程</span>
      </button>
    );
  }

  return (
    <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-cyan-400">🔄 清機流程</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* 選項列表 */}
      <div className="flex flex-col gap-1.5 mb-3">
        {CLEANING_OPTIONS.map((option) => (
          <button
            key={option.type}
            onClick={() => setSelectedType(option.type)}
            className={`px-3 py-2 text-sm rounded-lg text-left transition-colors
                       ${selectedType === option.type
                         ? "bg-cyan-500 text-white"
                         : "bg-gray-700/50 text-gray-300 hover:bg-gray-700"}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* 確認按鈕 */}
      <button
        onClick={handleSubmit}
        className="w-full px-3 py-2 text-sm font-medium rounded-lg
                   bg-cyan-600 text-white hover:bg-cyan-500 transition-colors"
      >
        新增清機卡片
      </button>
    </div>
  );
}

