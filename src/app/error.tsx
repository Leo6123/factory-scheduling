"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-red-400 mb-4">發生錯誤</h2>
        <p className="text-gray-400 mb-6">{error.message || '未知錯誤'}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors"
        >
          重試
        </button>
      </div>
    </div>
  );
}
