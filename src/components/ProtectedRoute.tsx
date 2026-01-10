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

  // 直接使用 BroadcastChannel 檢測其他分頁
  useEffect(() => {
    if (loading || !user || typeof window === 'undefined') {
      return;
    }

    console.log('🔍 [ProtectedRoute] 設置分頁檢測，用戶:', user.email, '已檢查:', hasCheckedMultipleTabs);
    const channel = new BroadcastChannel('tab_detection');
    const tabId = `pr_tab_${Date.now()}_${Math.random()}`;
    let hasOtherTab = false;
    let respondedTabs = new Set<string>();
    let timeoutId: NodeJS.Timeout | null = null;
    let keepAliveInterval: NodeJS.Timeout | null = null;
    let cleanupInterval: NodeJS.Timeout | null = null;
    let activeTabs = new Map<string, number>(); // tabId -> last seen timestamp

    // 監聽其他分頁的消息
    const messageHandler = (event: MessageEvent) => {
      console.log('📡 [ProtectedRoute] 收到消息:', event.data);
      
      // 收到其他分頁的「我還活著」消息
      if (event.data.type === 'TAB_ALIVE' && event.data.email === user.email) {
        if (event.data.tabId && event.data.tabId !== tabId) {
          // 更新該分頁的最後活動時間
          activeTabs.set(event.data.tabId, Date.now());
          
          if (!respondedTabs.has(event.data.tabId)) {
            respondedTabs.add(event.data.tabId);
            if (!hasOtherTab && !showConfirmDialog) {
              hasOtherTab = true;
              console.log('⚠️ [ProtectedRoute] 檢測到其他分頁正在使用此帳號，tabId:', event.data.tabId);
              setShowConfirmDialog(true);
              setHasCheckedMultipleTabs(true);
              // 清除 timeout（如果存在）
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }
            }
          }
        }
      } 
      // 收到檢測請求，回應說明這個分頁存在（這是關鍵！讓舊分頁能回應新分頁）
      else if (event.data.type === 'TAB_DETECTION_REQUEST' && event.data.email === user.email) {
        console.log('📤 [ProtectedRoute] 回應檢測請求，說明此分頁存在，tabId:', tabId);
        channel.postMessage({ type: 'TAB_ALIVE', tabId, email: user.email, timestamp: Date.now() });
      }
      // 收到分頁關閉通知
      else if (event.data.type === 'TAB_CLOSING' && event.data.email === user.email) {
        if (event.data.tabId && event.data.tabId !== tabId) {
          console.log('📴 [ProtectedRoute] 收到其他分頁關閉通知，tabId:', event.data.tabId);
          activeTabs.delete(event.data.tabId);
          respondedTabs.delete(event.data.tabId);
          
          // 如果之前檢測到其他分頁，但現在只剩這個分頁了，清除對話框
          if (activeTabs.size === 0 && hasOtherTab) {
            console.log('✅ [ProtectedRoute] 其他分頁已關閉，這是唯一的分頁了');
            hasOtherTab = false;
            setShowConfirmDialog(false);
            setHasCheckedMultipleTabs(true);
          }
        }
      }
    };

    channel.addEventListener('message', messageHandler);

    // 定期發送「我還活著」消息（讓其他分頁知道這個分頁存在）
    keepAliveInterval = setInterval(() => {
      if (user?.email) {
        channel.postMessage({ type: 'TAB_ALIVE', tabId, email: user.email, timestamp: Date.now() });
      }
    }, 3000); // 每 3 秒發送一次

    // 清理不活躍的分頁（超過 6 秒沒有活動的分頁視為已關閉）
    cleanupInterval = setInterval(() => {
      const now = Date.now();
      const entries = Array.from(activeTabs.entries());
      for (const [tabId, lastSeen] of entries) {
        if (now - lastSeen > 6000) {
          console.log('🗑️ [ProtectedRoute] 清理不活躍的分頁，tabId:', tabId);
          activeTabs.delete(tabId);
          respondedTabs.delete(tabId);
        }
      }
      
      // 如果之前檢測到其他分頁，但現在只剩這個分頁了，清除對話框
      if (activeTabs.size === 0 && hasOtherTab) {
        console.log('✅ [ProtectedRoute] 其他分頁已關閉（超時清理），這是唯一的分頁了');
        hasOtherTab = false;
        setShowConfirmDialog(false);
        setHasCheckedMultipleTabs(true);
      }
    }, 3000); // 每 3 秒檢查一次

    // 只在首次檢查時發送檢測請求
    if (!hasCheckedMultipleTabs) {
      console.log('📤 [ProtectedRoute] 首次檢查，發送檢測請求');
      // 立即發送「我還活著」消息
      channel.postMessage({ type: 'TAB_ALIVE', tabId, email: user.email, timestamp: Date.now() });
      
      // 請求其他分頁回應
      channel.postMessage({ type: 'TAB_DETECTION_REQUEST', email: user.email });

      // 等待 2.5 秒看是否有回應（增加一點時間以應對網路延遲）
      timeoutId = setTimeout(() => {
        if (!hasOtherTab && !showConfirmDialog) {
          console.log('✅ [ProtectedRoute] 這是唯一的分頁，沒有檢測到其他分頁');
          setHasCheckedMultipleTabs(true);
        }
        timeoutId = null;
      }, 2500);
    } else {
      // 如果已經檢查過，仍然監聽檢測請求（讓舊分頁能回應新分頁）
      console.log('👂 [ProtectedRoute] 已檢查過，但仍持續監聽檢測請求');
    }

    // 監聽分頁關閉事件（發送關閉通知給其他分頁）
    const handleBeforeUnload = () => {
      console.log('📴 [ProtectedRoute] 分頁即將關閉，通知其他分頁');
      channel.postMessage({ type: 'TAB_CLOSING', tabId, email: user.email });
    };

    const handlePageHide = () => {
      console.log('📴 [ProtectedRoute] 分頁隱藏/關閉，通知其他分頁');
      channel.postMessage({ type: 'TAB_CLOSING', tabId, email: user.email });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    // 保持 channel 打開，持續監聽（讓新分頁能檢測到這個分頁）
    return () => {
      // 清理時也發送關閉通知
      console.log('📴 [ProtectedRoute] 清理時通知其他分頁');
      channel.postMessage({ type: 'TAB_CLOSING', tabId, email: user.email });
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
      }
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      channel.removeEventListener('message', messageHandler);
      channel.close();
    };
  }, [user, loading]); // 只在 user 或 loading 改變時重新執行

  const handleConfirmLogout = async () => {
    setShowConfirmDialog(false);
    // 通知其他分頁登出
    if (typeof window !== 'undefined') {
      const channel = new BroadcastChannel('auth_logout');
      channel.postMessage({ type: 'FORCE_LOGOUT', email: user?.email });
      channel.close();
    }
    // 不登出當前分頁，繼續使用（這是用戶選擇「確認（關閉其他分頁）」的意思）
    console.log('✅ 用戶選擇關閉其他分頁，當前分頁繼續使用');
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
