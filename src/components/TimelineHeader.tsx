"use client";

interface TimelineHeaderProps {
  totalHours?: number; // 總共幾小時 (預設 24)
  interval?: number;   // 間隔幾小時顯示一個標籤 (預設 2)
}

// 將小時數轉換為時間格式 (00:00)
function formatHourToTime(hour: number): string {
  const h = hour % 24;
  return `${String(h).padStart(2, "0")}:00`;
}

export default function TimelineHeader({ 
  totalHours = 24,
  interval = 2,
}: TimelineHeaderProps) {
  // 產生時間標籤 (0, 2, 4, ... 24)
  const hourLabels = Array.from(
    { length: Math.floor(totalHours / interval) + 1 }, 
    (_, i) => i * interval
  );

  return (
    <div className="flex">
      {/* 左側空白對齊產線標籤 (LineConfigEditor 寬度 w-24 = 96px) */}
      <div className="w-24 flex-shrink-0" />
      
      {/* 時間軸標頭 - 使用相對定位確保對齊 */}
      <div className="flex-1 relative h-6 border-b border-white/10">
        {hourLabels.map((hour) => {
          const leftPercent = (hour / totalHours) * 100;
          const isMainMark = hour % 6 === 0; // 每 6 小時為主要標記
          
          return (
            <div
              key={hour}
              className="absolute transform -translate-x-1/2"
              style={{ left: `${leftPercent}%` }}
            >
              <span className={`text-xs ${isMainMark ? "text-gray-300 font-medium" : "text-gray-500"}`}>
                {formatHourToTime(hour)}
              </span>
              {/* 垂直刻度線 */}
              <div 
                className={`absolute top-5 left-1/2 -translate-x-1/2 w-px h-2 
                           ${isMainMark ? "bg-gray-400" : "bg-gray-700"}`} 
              />
            </div>
          );
        })}
      </div>

      {/* 右側空白對齊統計區 */}
      <div className="w-[120px] flex-shrink-0" />
    </div>
  );
}
