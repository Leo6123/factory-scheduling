"use client";

import { useState } from "react";
import { LineConfig } from "@/types/productionLine";

interface LineConfigEditorProps {
  lineId: string;
  lineName: string;
  color: string;
  config?: LineConfig;  // 改為可選，添加防護措施
  onUpdate: (lineId: string, avgOutput: number) => void;
}

export default function LineConfigEditor({
  lineId,
  lineName,
  color,
  config,
  onUpdate,
}: LineConfigEditorProps) {
  // 防護措施：如果 config 為 undefined，使用預設值
  const safeConfig = config || { id: lineId, avgOutput: 100 };
  
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(safeConfig.avgOutput.toString());

  const handleSave = () => {
    const value = parseFloat(inputValue);
    if (!isNaN(value) && value > 0) {
      onUpdate(lineId, value);
    } else {
      setInputValue(safeConfig.avgOutput.toString());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setInputValue(safeConfig.avgOutput.toString());
      setIsEditing(false);
    }
  };

  return (
    <div
      className="flex items-center justify-center flex-col gap-1 w-24 py-2 flex-shrink-0"
      style={{ backgroundColor: `${color}30` }}
    >
      <span
        className="px-2 py-1 rounded text-xs font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {lineName}
      </span>
      
      {/* 平均產量設定 */}
      <div className="flex items-center gap-1 mt-1">
        {isEditing ? (
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-14 px-1 py-0.5 text-xs text-center bg-gray-800 border border-gray-600 
                       rounded text-white focus:outline-none focus:border-blue-500"
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-gray-400 hover:text-white transition-colors 
                       bg-gray-800/50 px-2 py-0.5 rounded hover:bg-gray-700"
            title="點擊編輯平均產量"
          >
            {safeConfig.avgOutput} kg/h
          </button>
        )}
      </div>
    </div>
  );
}

