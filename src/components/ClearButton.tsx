"use client";

interface ClearButtonProps {
  onClear: () => void;
  itemCount: number;
}

export default function ClearButton({ onClear, itemCount }: ClearButtonProps) {
  const handleClick = () => {
    if (itemCount === 0) return;
    
    const confirmed = window.confirm(
      `確定要清除所有 ${itemCount} 筆訂單嗎？\n此操作無法復原。`
    );
    
    if (confirmed) {
      onClear();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={itemCount === 0}
      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap
                 transition-all duration-200
                 ${itemCount === 0
                   ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                   : "bg-red-600 hover:bg-red-500 active:scale-95"}`}
    >
      {/* 垃圾桶圖示 */}
      <svg 
        className="w-3 h-3" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
        />
      </svg>
      
      清除全部
    </button>
  );
}

