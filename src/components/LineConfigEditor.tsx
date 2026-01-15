"use client";

interface LineConfigEditorProps {
  lineId: string;
  lineName: string;
  color: string;
}

export default function LineConfigEditor({
  lineName,
  color,
}: LineConfigEditorProps) {
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
      {/* 產線出量已移到每張卡片上，此處不再顯示 */}
    </div>
  );
}
