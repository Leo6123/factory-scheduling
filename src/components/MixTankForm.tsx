"use client";

import { useState, useEffect } from "react";
import { ScheduleItem } from "@/types/schedule";
import { UNSCHEDULED_LANE } from "@/constants/productionLines";

interface MixTankFormProps {
  onAdd: (item: ScheduleItem) => void;
  existingBatchIds?: Set<string>;  // 混合缸卡片允許相同批號，此參數保留以保持接口一致性
  allScheduleItems?: ScheduleItem[];  // 所有排程項目，用於查找相同批號的生產卡片
}

export default function MixTankForm({ onAdd, allScheduleItems = [] }: MixTankFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [materialNumber, setMaterialNumber] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [quantity, setQuantity] = useState("");
  const [materialReadyDate, setMaterialReadyDate] = useState<string>("");

  // 當批號改變時，查找相同批號的生產卡片並繼承齊料時間
  useEffect(() => {
    if (batchNumber.trim() && allScheduleItems.length > 0) {
      // 查找相同批號的生產卡片（排除混合缸卡片）
      const matchingItem = allScheduleItems.find(
        (item) =>
          item.batchNumber === batchNumber.trim() &&
          item.materialDescription !== "混合缸排程" &&
          item.materialReadyDate
      );
      
      if (matchingItem && matchingItem.materialReadyDate) {
        setMaterialReadyDate(matchingItem.materialReadyDate);
      } else {
        // 如果沒有找到或沒有齊料時間，清空
        setMaterialReadyDate("");
      }
    } else {
      setMaterialReadyDate("");
    }
  }, [batchNumber, allScheduleItems]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 驗證
    if (!materialNumber.trim()) {
      alert("請輸入 Material Number");
      return;
    }
    if (!batchNumber.trim()) {
      alert("請輸入批號");
      return;
    }
    if (!quantity.trim() || isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0) {
      alert("請輸入有效的數量");
      return;
    }

    // 混合缸卡片允許使用相同批號，不需要檢查重複

    // 建立新卡片
    const newItem: ScheduleItem = {
      id: `mix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productName: materialNumber.trim(),
      materialDescription: "混合缸排程",
      batchNumber: batchNumber.trim(),
      quantity: parseFloat(quantity),
      deliveryDate: new Date().toISOString().split("T")[0], // 今天
      lineId: UNSCHEDULED_LANE.id,
      // 如果有繼承的齊料時間，則加入
      ...(materialReadyDate.trim() && { materialReadyDate: materialReadyDate.trim() }),
    };

    onAdd(newItem);

    // 重置表單
    setMaterialNumber("");
    setBatchNumber("");
    setQuantity("");
    setMaterialReadyDate("");
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full h-8 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap
                   bg-blue-500/20 text-blue-400 border border-blue-500/30
                   hover:bg-blue-500/30 transition-colors"
      >
        <span>🔧</span>
        <span>混合缸</span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-blue-400">🔧 新增混合缸排程</h3>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {/* Material Number */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Material Number</label>
          <input
            type="text"
            value={materialNumber}
            onChange={(e) => setMaterialNumber(e.target.value)}
            placeholder="例: NE0NAV12020"
            className="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded
                       text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* 批號 */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">批號</label>
          <input
            type="text"
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            placeholder="例: TWCC123456"
            className="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded
                       text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* 數量 */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">數量 (KG)</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="例: 1000"
            step="0.01"
            min="0"
            className="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded
                       text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* 按鈕 */}
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex-1 px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded
                       hover:bg-gray-600 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded
                       hover:bg-blue-500 transition-colors font-medium"
          >
            新增
          </button>
        </div>
      </div>
    </form>
  );
}

