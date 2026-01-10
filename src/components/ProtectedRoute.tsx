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

  // 檢查 sessionStorage 中是否有標記需要顯示確認對話框
  useEffect(() => {
    if (loading || !user || hasCheckedMultipleTabs || typeof window === 'undefined') {
      return;
    }

    // 檢查 AuthContext 是否已經檢測到其他分頁（通過 sessionStorage）
    const shouldShowDialog = sessionStorage.getItem('show_multitab_dialog') === 'true';
    const dialogEmail = sessionStorage.getItem('multitab_email');
    
    if (shouldShowDialog && dialogEmail === user.email) {
      console.log('⚠️ [ProtectedRoute] 顯示多分頁確認對話框');
      setShowConfirmDialog(true);
      setHasCheckedMultipleTabs(true);
      // 清除標記，避免重複顯示
      sessionStorage.removeItem('show_multitab_dialog');
      sessionStorage.removeItem('multitab_email');
    } else {
      setHasCheckedMultipleTabs(true);
    }
  }, [user, loading, hasCheckedMultipleTabs]);

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
