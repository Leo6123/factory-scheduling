"use client";

interface MonthSelectorProps {
  year: number;
  month: number;
  selectedDay: number | null;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onDaySelect: (day: number) => void;
}

export default function MonthSelector({
  year,
  month,
  selectedDay,
  onYearChange,
  onMonthChange,
  onDaySelect,
}: MonthSelectorProps) {
  // 取得該月有幾天
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // 年份選項 (當前年 ± 2 年)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // 月份選項
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
      {/* 年月選擇 */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400">排程月份:</label>
        
        {/* 年份 */}
        <select
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white
                     focus:outline-none focus:border-blue-500"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y} 年</option>
          ))}
        </select>

        {/* 月份 */}
        <select
          value={month}
          onChange={(e) => onMonthChange(Number(e.target.value))}
          className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white
                     focus:outline-none focus:border-blue-500"
        >
          {months.map((m) => (
            <option key={m} value={m}>{m} 月</option>
          ))}
        </select>

        {selectedDay && (
          <span className="ml-4 text-sm text-blue-400">
            已選擇: {year}/{month}/{selectedDay}
          </span>
        )}
      </div>

      {/* 日期選擇 */}
      <div className="flex flex-wrap gap-1">
        {days.map((day) => {
          const isSelected = selectedDay === day;
          const isWeekend = new Date(year, month - 1, day).getDay() % 6 === 0;
          
          return (
            <button
              key={day}
              onClick={() => onDaySelect(day)}
              className={`w-8 h-8 text-xs rounded transition-all
                         ${isSelected 
                           ? "bg-blue-600 text-white ring-2 ring-blue-400" 
                           : isWeekend
                             ? "bg-red-900/30 text-red-400 hover:bg-red-900/50"
                             : "bg-white/10 text-gray-300 hover:bg-white/20"}`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

