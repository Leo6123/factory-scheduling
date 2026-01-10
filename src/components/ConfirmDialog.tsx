"use client";

import { ReactNode } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'warning' | 'info' | 'error';
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = '確認',
  cancelText = '取消',
  onConfirm,
  onCancel,
  type = 'warning',
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const typeStyles = {
    warning: {
      icon: '⚠️',
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/50',
      text: 'text-yellow-400',
      button: 'bg-yellow-600 hover:bg-yellow-500',
    },
    info: {
      icon: 'ℹ️',
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/50',
      text: 'text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-500',
    },
    error: {
      icon: '❌',
      bg: 'bg-red-500/20',
      border: 'border-red-500/50',
      text: 'text-red-400',
      button: 'bg-red-600 hover:bg-red-500',
    },
  };

  const styles = typeStyles[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className={`w-full max-w-md mx-4 ${styles.bg} ${styles.border} border rounded-lg p-6 shadow-xl`}>
        {/* 標題 */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{styles.icon}</span>
          <h3 className={`text-lg font-semibold ${styles.text}`}>{title}</h3>
        </div>

        {/* 訊息 */}
        <p className="text-gray-300 mb-6 whitespace-pre-line">{message}</p>

        {/* 按鈕 */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg font-medium text-white ${styles.button} transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
