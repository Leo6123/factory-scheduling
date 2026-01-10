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

  // 檢查並監聽 sessionStorage 中的標記
  useEffect(() => {
    if (loading || !user || typeof window === 'undefined') {
      return;
    }

    let checkCount = 0;
    const maxChecks = 20; // 檢查 20 次，每次間隔 250ms = 總共 5 秒

    // 檢查函數
    const checkDialog = () => {
      checkCount++;
      const shouldShowDialog = sessionStorage.getItem('show_multitab_dialog') === 'true';
      const dialogEmail = sessionStorage.getItem('multitab_email');
      
      console.log(`[ProtectedRoute] 檢查對話框標記 (${checkCount}/${maxChecks}):`, { 
        shouldShowDialog, 
        dialogEmail, 
        userEmail: user.email,
        showConfirmDialog 
      });
      
      if (shouldShowDialog && dialogEmail === user.email && !showConfirmDialog) {
        console.log('⚠️ [ProtectedRoute] 顯示多分頁確認對話框！');
        setShowConfirmDialog(true);
        setHasCheckedMultipleTabs(true);
        // 清除標記，避免重複顯示
        sessionStorage.removeItem('show_multitab_dialog');
        sessionStorage.removeItem('multitab_email');
        return true; // 找到標記，停止檢查
      }
      
      if (checkCount >= maxChecks && !hasCheckedMultipleTabs) {
        console.log('✅ [ProtectedRoute] 檢查完成，沒有檢測到多分頁標記');
        setHasCheckedMultipleTabs(true);
      }
      
      return false;
    };

    // 立即檢查一次
    if (checkDialog()) {
      return; // 如果已經顯示對話框，不需要繼續檢查
    }

    // 監聽 BroadcastChannel 消息（當 AuthContext 設置標記時也會發送消息）
    const channel = new BroadcastChannel('tab_detection');
    const messageHandler = (event: MessageEvent) => {
      if (event.data.type === 'SHOW_MULTITAB_DIALOG' && event.data.email === user.email) {
        console.log('📢 [ProtectedRoute] 收到 BroadcastChannel 消息，需要顯示對話框');
        checkDialog();
      }
    };
    channel.addEventListener('message', messageHandler);

    // 定期檢查（每 250ms 檢查一次）
    const checkInterval = setInterval(() => {
      if (!showConfirmDialog && checkCount < maxChecks) {
        if (checkDialog()) {
          clearInterval(checkInterval);
          channel.removeEventListener('message', messageHandler);
          channel.close();
        }
      } else if (checkCount >= maxChecks || showConfirmDialog) {
        clearInterval(checkInterval);
        channel.removeEventListener('message', messageHandler);
        channel.close();
      }
    }, 250);

    return () => {
      clearInterval(checkInterval);
      channel.removeEventListener('message', messageHandler);
      channel.close();
    };
  }, [user, loading, showConfirmDialog, hasCheckedMultipleTabs]);

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
