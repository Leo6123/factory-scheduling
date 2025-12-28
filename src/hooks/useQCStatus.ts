"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchQCDataFromGoogleSheets, getQCStatus, buildQCIndex, QCData, QCIndex } from '@/utils/googleSheets';
import { ScheduleItem } from '@/types/schedule';

// QC 狀態快取（避免重複請求）
let qcDataCache: QCData[] = [];
let qcIndexCache: QCIndex | null = null;
let qcDataCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 分鐘快取

// 自訂 Hook：管理 QC 狀態
export function useQCStatus(
  scheduleItems: ScheduleItem[],
  googleSheetId?: string,
  googleApiKey?: string
) {
  const [qcData, setQcData] = useState<QCData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 建立 QC 索引（使用 useMemo 避免重複計算）
  // 如果快取中有索引，直接使用；否則從 qcData 建立
  const qcIndex = useMemo(() => {
    if (qcIndexCache) {
      return qcIndexCache;
    }
    if (qcData.length === 0) return null;
    return buildQCIndex(qcData);
  }, [qcData]);

  // 載入 QC 資料
  const loadQCData = useCallback(async () => {
    if (!googleSheetId) {
      setQcData([]);
      qcIndexCache = null;
      return;
    }

    // 檢查快取
    const now = Date.now();
    if (qcDataCache.length > 0 && (now - qcDataCacheTime) < CACHE_DURATION) {
      setQcData(qcDataCache);
      if (qcIndexCache) {
        // 索引已建立，直接使用
      } else {
        qcIndexCache = buildQCIndex(qcDataCache);
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 開始載入 QC 資料，Sheet ID:', googleSheetId);
      const data = await fetchQCDataFromGoogleSheets(googleSheetId, googleApiKey);
      qcDataCache = data;
      qcDataCacheTime = now;
      
      // 建立索引
      const startTime = performance.now();
      qcIndexCache = buildQCIndex(data);
      const endTime = performance.now();
      
      setQcData(data);
      console.log(`✅ QC 資料載入成功，共 ${data.length} 筆`);
      console.log(`⚡ 索引建立完成，耗時 ${(endTime - startTime).toFixed(2)}ms`);
      console.log(`📊 索引統計: QC完成 ${qcIndexCache.completedBatches.size} 筆，QC中 ${qcIndexCache.inProgressBatches.size} 筆，NG ${qcIndexCache.ngBatches.size} 筆`);
      
      // 測試批號 TWCC140878
      const testStatus = getQCStatus('TWCC140878', qcIndexCache);
      if (testStatus) {
        console.log(`✅ 測試批號 TWCC140878: ${testStatus}`);
      } else {
        console.log(`⚠️ 測試批號 TWCC140878: 未找到`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '載入 QC 資料失敗';
      console.error('❌ QC 資料載入失敗:', errorMsg, err);
      setError(errorMsg);
      setQcData([]);
      qcIndexCache = null;
    } finally {
      setIsLoading(false);
    }
  }, [googleSheetId, googleApiKey]);

  // 取得特定批號的 QC 狀態（使用索引，O(1) 時間）
  const getBatchQCStatus = useCallback(
    (batchNumber: string): 'QC中' | 'QC完成' | 'NG' | null => {
      return getQCStatus(batchNumber, qcIndex);
    },
    [qcIndex]
  );

  // 初始化載入
  useEffect(() => {
    loadQCData();
  }, [loadQCData]);

  // 定期重新載入（每 5 分鐘）
  useEffect(() => {
    if (!googleSheetId) return;

    const interval = setInterval(() => {
      loadQCData();
    }, 5 * 60 * 1000); // 5 分鐘

    return () => clearInterval(interval);
  }, [loadQCData, googleSheetId]);

  return {
    qcData,
    qcIndex,
    isLoading,
    error,
    getBatchQCStatus,
    refreshQCData: loadQCData,
  };
}

