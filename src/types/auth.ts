// 用戶角色類型
export type UserRole = 'admin' | 'operator' | 'viewer';

// 用戶資訊介面
export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

// 權限定義
export interface Permissions {
  canImport: boolean;      // 匯入訂單
  canExport: boolean;      // 匯出排程
  canClear: boolean;       // 清除全部
  canEdit: boolean;        // 編輯排程
  canDelete: boolean;      // 刪除項目
  canView: boolean;        // 查看排程
}

// 角色權限映射
export const ROLE_PERMISSIONS: Record<UserRole, Permissions> = {
  admin: {
    canImport: true,
    canExport: true,
    canClear: true,
    canEdit: true,
    canDelete: true,
    canView: true,
  },
  operator: {
    canImport: true,
    canExport: true,
    canClear: false,  // 操作員不能清除全部
    canEdit: true,
    canDelete: true,
    canView: true,
  },
  viewer: {
    canImport: false,
    canExport: false,  // 訪客無法匯出排程
    canClear: false,
    canEdit: false,    // 訪客無法編輯任何內容（包括卡片功能）
    canDelete: false,
    canView: true,     // 訪客只能查看排程（24h時間軸和卡片視圖）
  },
};

// 取得角色權限
export function getPermissions(role: UserRole): Permissions {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer;
}
