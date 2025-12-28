"use client";

import { ScheduleItem } from "@/types/schedule";
import { getProductColor } from "@/utils/productColor";

interface ScheduleCardProps {
  item: ScheduleItem;
  color?: string;  // 可覆蓋預設顏色
}

export default function ScheduleCard({ item, color }: ScheduleCardProps) {
  // 根據 Material Number (productName) 的第三個字元判斷顏色
  const cardColor = color || getProductColor(item.productName);

  return (
    <div
      className="rounded-lg p-3 shadow-md cursor-grab active:cursor-grabbing 
                 hover:scale-[1.02] transition-transform duration-150
                 border border-white/10 backdrop-blur-sm min-w-[180px]"
      style={{
        backgroundColor: `${cardColor}20`,
        borderLeftColor: cardColor,
        borderLeftWidth: "4px",
      }}
    >
      {/* 產品名稱 */}
      <div className="font-bold text-sm text-white truncate mb-1">
        {item.productName}
      </div>

      {/* 產品描述 (Material Description) */}
      {item.materialDescription && (
        <div 
          className="text-[10px] px-1.5 py-0.5 rounded mb-1 truncate inline-block"
          style={{ backgroundColor: `${cardColor}40`, color: cardColor }}
        >
          {item.materialDescription}
        </div>
      )}
      
      {/* 批號 */}
      <div className="text-xs text-gray-300 mb-1">
        <span className="text-gray-500">批號:</span> {item.batchNumber}
      </div>
      
      {/* 數量 */}
      <div className="text-xs text-gray-300 mb-1">
        <span className="text-gray-500">數量:</span>{" "}
        <span className="font-semibold text-emerald-400">
          {item.quantity.toLocaleString()} KG
        </span>
      </div>
      
      {/* 排程日期 */}
      {item.scheduleDate && (
        <div className="text-xs text-blue-400">
          <span className="text-gray-500">排程:</span> {item.scheduleDate.slice(5)} {item.startHour !== undefined && `${item.startHour}h`}
        </div>
      )}
      
      {/* 需求日期 */}
      <div className="text-xs text-gray-400">
        <span className="text-gray-500">需求:</span> {item.deliveryDate}
      </div>
    </div>
  );
}

