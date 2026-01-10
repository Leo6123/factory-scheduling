"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut, checkExistingSession } = useAuth();
  const router = useRouter();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasCheckedMultipleTabs, setHasCheckedMultipleTabs] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // 檢測是否有其他分頁在使用同一 session
  useEffect(() => {
    if (loading || !user || hasCheckedMultipleTabs || typeof window === 'undefined') {
      return;
    }

    // 使用 BroadcastChannel 檢測其他分頁
    const channel = new BroadcastChannel('tab_detection');
    const tabId = `tab_${Date.now()}_${Math.random()}`;
    let hasOtherTab = false;
    let timeoutId: NodeJS.Timeout;

    // 監聽其他分頁的消息
    const messageHandler = (event: MessageEvent) => {
      if (event.data.type === 'TAB_ALIVE' && event.data.email === user.email && event.data.tabId !== tabId) {
        // 收到其他分頁的「我還活著」消息
        if (!hasOtherTab) {
          hasOtherTab = true;
          console.log('⚠️ 檢測到其他分頁正在使用此帳號');
          setShowConfirmDialog(true);
          setHasCheckedMultipleTabs(true);
          clearTimeout(timeoutId);
          channel.removeEventListener('message', messageHandler);
          channel.close();
        }
      } else if (event.data.type === 'TAB_DETECTION_REQUEST' && event.data.email === user.email) {
        // 回應其他分頁的檢測請求
        channel.postMessage({ type: 'TAB_ALIVE', tabId, email: user.email });
        // 同時也檢查是否有其他分頁
        if (!hasOtherTab) {
          hasOtherTab = true;
          console.log('⚠️ 檢測到其他分頁正在使用此帳號（回應請求時）');
          setShowConfirmDialog(true);
          setHasCheckedMultipleTabs(true);
          clearTimeout(timeoutId);
        }
      }
    };

    channel.addEventListener('message', messageHandler);

    // 請求其他分頁回應
    channel.postMessage({ type: 'TAB_DETECTION_REQUEST', email: user.email });

    // 等待 1 秒看是否有回應
    timeoutId = setTimeout(() => {
      if (!hasOtherTab) {
        // 沒有其他分頁回應，這是唯一的分頁
        console.log('✅ 這是唯一的分頁，無需顯示確認對話框');
        setHasCheckedMultipleTabs(true);
      }
      channel.removeEventListener('message', messageHandler);
      channel.close();
    }, 1000);

    // 定期發送「我還活著」消息（每 3 秒），讓其他分頁知道這個分頁存在
    const keepAliveInterval = setInterval(() => {
      if (!hasOtherTab) {
        channel.postMessage({ type: 'TAB_ALIVE', tabId, email: user.email });
      }
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(keepAliveInterval);
      channel.removeEventListener('message', messageHandler);
      channel.close();
    };
  }, [user, loading, hasCheckedMultipleTabs]);

  const handleConfirmLogout = async () => {
    setShowConfirmDialog(false);
    // 通知其他分頁登出
    if (typeof window !== 'undefined') {
      const channel = new BroadcastChannel('auth_logout');
      channel.postMessage({ type: 'FORCE_LOGOUT', email: user?.email });
      channel.close();
    }
    // 登出當前分頁
    await signOut();
    router.push('/login');
  };

  const handleCancelLogout = async () => {
    setShowConfirmDialog(false);
    // 用戶選擇登出當前分頁
    await signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-gray-400">載入中...</div>
      </div>
    );
  }

  if (!user) {
    return null; // 重定向中
  }

  return (
    <>
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="檢測到其他分頁"
        message={`此帳號（${user.email}）已在其他分頁登入。\n\n是否要關閉其他分頁並繼續使用此分頁？\n\n選擇「確認」將登出其他分頁，選擇「取消」將登出當前分頁。`}
        confirmText="確認（關閉其他分頁）"
        cancelText="取消（登出此分頁）"
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
        type="warning"
      />
      {children}
    </>
  );
}
