// Google Sheets QC 資料介面
export interface QCData {
  startBatchNumber: string;  // 開始產品批號
  endBatchNumber: string;    // 結束產品批號
  qcResult?: string;         // QC結果
}

// 從 Google Sheets 讀取 QC 資料
// 現在使用 Next.js API Route（伺服器端），不再需要 API Key
export async function fetchQCDataFromGoogleSheets(
  spreadsheetId: string,
  apiKey?: string  // 保留參數以向後兼容，但不再使用
): Promise<QCData[]> {
  try {
    // 讀取 C 欄（開始產品批號）和 E 欄（結束產品批號）
    // 嘗試多種工作表名稱，或使用第一個工作表
    const sheetNames = ['Report', 'report', 'QC完整表單', 'Sheet1', '工作表1'];
    let lastError: Error | null = null;

    for (const sheetName of sheetNames) {
      try {
        // 使用 Next.js API Route（伺服器端）
        // API Key 不再暴露在客戶端
        const apiUrl = `/api/google-sheets?spreadsheetId=${encodeURIComponent(spreadsheetId)}&sheetName=${encodeURIComponent(sheetName)}&range=D2:H`;
        
        const response = await fetch(apiUrl);

        if (!response.ok) {
          lastError = new Error(`無法讀取 Google Sheets: ${response.statusText}`);
          continue; // 嘗試下一個工作表名稱
        }

        const data = await response.json();
        const rows = data.values || [];

        // 轉換為 QCData 格式
        // D 欄（索引 0）：開始產品批號
        // E 欄（索引 1）：結束產品批號或狀態
        // H 欄（索引 4）：QC結果（PASS/NG）
        const qcDataList: QCData[] = rows
          .filter((row: any[]) => row && row.length >= 1 && row[0]) // 過濾空行
          .map((row: any[]) => {
            const startBatch = String(row[0] || '').trim(); // D 欄：開始產品批號
            const endBatch = String(row[1] || '').trim();   // E 欄：結束產品批號或狀態
            const qcResult = String(row[4] || '').trim().toUpperCase(); // H 欄：QC結果（PASS/NG）
            
            // 處理 E 欄：如果是 "進行中"，則表示還沒完成
            // 如果是批號，則表示已完成
            let cleanEndBatch = '';
            if (endBatch && 
                endBatch !== '進行中' && 
                !endBatch.toLowerCase().includes('未完成') &&
                endBatch.trim().length >= 3) {
              // 移除可能的 (NG) 標記和空格
              cleanEndBatch = endBatch.replace(/\s*\(NG\)\s*/gi, '').trim();
              
              // 除錯：檢查 TWCC140878
              if (cleanEndBatch.toUpperCase() === 'TWCC140878' || startBatch.toUpperCase() === 'TWCC140878') {
                console.log(`🔍 處理 TWCC140878: D欄="${startBatch}", E欄="${endBatch}", cleanEndBatch="${cleanEndBatch}", QC結果="${qcResult}"`);
              }
            }
            
            return {
              startBatchNumber: startBatch,
              endBatchNumber: cleanEndBatch, // 如果 E 欄是 "進行中" 或空，則 endBatchNumber 為空
              qcResult: qcResult || undefined, // QC結果（PASS/NG）
            };
          })
          .filter((qc: QCData) => {
            // 過濾無效資料：排除標題行和空值
            const isValid = qc.startBatchNumber && 
                           qc.startBatchNumber !== '進行中' &&
                           !qc.startBatchNumber.toLowerCase().includes('產品批號') &&
                           !qc.startBatchNumber.toLowerCase().includes('批號') &&
                           qc.startBatchNumber.length >= 3; // 批號至少 3 個字元
            return isValid;
          });

        console.log(`✅ 成功從工作表 "${sheetName}" 讀取 ${qcDataList.length} 筆 QC 資料`);
        return qcDataList;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        continue; // 嘗試下一個工作表名稱
      }
    }

    // 如果所有工作表名稱都失敗，嘗試使用 CSV 格式（公開 Sheet）
    // 注意：CSV 格式不需要 API Key，所以可以繼續使用
    try {
      // 嘗試多個工作表名稱的 CSV 格式
      const csvSheetNames = ['Report', 'report', 'QC完整表單', 'Sheet1'];
      for (const csvSheetName of csvSheetNames) {
        try {
          // 讀取 D、E、H 欄（從第 2 行開始，不限制結束行數）
          // D 欄：開始產品批號
          // E 欄：結束產品批號或狀態
          // H 欄：QC結果（PASS/NG）
          const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(csvSheetName)}&range=D2:H`;
          const csvResponse = await fetch(csvUrl);
          if (csvResponse.ok) {
            const csvText = await csvResponse.text();
            const lines = csvText.split('\n').filter(line => line.trim());
            const qcDataList: QCData[] = [];
            
            console.log(`🔍 嘗試從工作表 "${csvSheetName}" 讀取 CSV，共 ${lines.length} 行`);
            
            // 顯示前 3 行原始資料（除錯用）
            if (lines.length > 0) {
              console.log(`📋 CSV 原始資料前 3 行:`, lines.slice(0, 3));
            }
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              // CSV 格式：正確解析包含引號的欄位
              // 使用更強健的 CSV 解析方式
              const columns: string[] = [];
              let current = '';
              let inQuotes = false;
              
              for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                  inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                  columns.push(current.trim());
                  current = '';
                } else {
                  current += char;
                }
              }
              columns.push(current.trim()); // 最後一欄
              
              // 移除欄位值中的引號（處理多層引號）
              const cleanColumns = columns.map(col => {
                let cleaned = col.replace(/^"|"$/g, '').trim();
                // 處理可能的雙引號轉義
                cleaned = cleaned.replace(/""/g, '"');
                return cleaned;
              });
              
              // CSV 格式：讀取 D2:H 範圍，則：
              // columns[0] = D 欄（開始產品批號）
              // columns[1] = E 欄（結束產品批號或狀態）
              // columns[4] = H 欄（QC結果：PASS/NG）
              
              let startBatch = '';
              let endBatch = '';
              let qcResult = '';
              
              if (cleanColumns.length >= 5) {
                // 讀取 D2:H 範圍，D 欄是索引 0，E 欄是索引 1，H 欄是索引 4
                startBatch = cleanColumns[0] || '';
                endBatch = cleanColumns[1] || '';
                qcResult = (cleanColumns[4] || '').trim().toUpperCase();
              } else if (cleanColumns.length >= 2) {
                // 如果只有 2 欄，可能是舊格式，只讀取 D 和 E 欄
                startBatch = cleanColumns[0] || '';
                endBatch = cleanColumns[1] || '';
              }
              
              // 除錯：顯示前 3 行的解析結果，以及包含 140878 的行
              if (i < 3 || (line.includes('140878') && i < 20)) {
                console.log(`📋 第 ${i + 1} 行解析: 原始="${line}", 解析後=`, cleanColumns, `D欄="${startBatch}", E欄="${endBatch}"`);
              }
              
              if (startBatch) {
                // 處理 E 欄：如果是 "進行中" 或 "未完成"，則表示還沒完成
                // 如果是批號，則表示已完成
                let cleanEndBatch = '';
                if (endBatch && 
                    endBatch !== '進行中' && 
                    !endBatch.toLowerCase().includes('未完成') &&
                    endBatch.length >= 3) {
                  cleanEndBatch = endBatch.replace(/\s*\(NG\)\s*/gi, '').trim();
                }
                
                // 跳過標題行和無效資料
                const isValidStartBatch = !startBatch.toLowerCase().includes('產品批號') &&
                    !startBatch.toLowerCase().includes('批號') &&
                    startBatch !== '進行中' &&
                    startBatch.length >= 3; // 批號至少 3 個字元
                
                if (isValidStartBatch) {
                  qcDataList.push({
                    startBatchNumber: startBatch.trim(),
                    endBatchNumber: cleanEndBatch, // 如果 E 欄是 "進行中"，則為空字串
                    qcResult: qcResult || undefined, // QC結果（PASS/NG）
                  });
                } else {
                  // 除錯：顯示被過濾掉的資料（只顯示前 5 筆）
                  if (i < 5 && startBatch.length > 0) {
                    console.log(`⚠️ 第 ${i + 1} 行被過濾: startBatch="${startBatch}", endBatch="${endBatch}"`);
                  }
                }
              }
            }
            
            if (qcDataList.length > 0) {
              console.log(`✅ 成功從 CSV 格式讀取 ${qcDataList.length} 筆 QC 資料 (工作表: ${csvSheetName})`);
              console.log(`📋 CSV 解析: 成功解析 ${qcDataList.length} 筆，前 5 筆:`, qcDataList.slice(0, 5));
              
              // 檢查是否有 TWCC140878（除錯用）
              const testBatch = qcDataList.find(qc => 
                (qc.startBatchNumber && qc.startBatchNumber.toUpperCase() === 'TWCC140878') || 
                (qc.endBatchNumber && qc.endBatchNumber.toUpperCase() === 'TWCC140878')
              );
              if (testBatch) {
                console.log(`✅ 找到測試批號 TWCC140878:`, testBatch);
              } else {
                // 檢查是否有包含 140878 的批號
                const similarBatches = qcDataList.filter(qc => 
                  (qc.startBatchNumber && qc.startBatchNumber.includes('140878')) ||
                  (qc.endBatchNumber && qc.endBatchNumber.includes('140878'))
                );
                if (similarBatches.length > 0) {
                  console.log(`🔍 找到類似批號（包含 140878）:`, similarBatches.slice(0, 3));
                } else {
                  // 搜尋所有包含 1408 的批號（可能格式略有不同）
                  const all1408Batches = qcDataList.filter(qc => 
                    (qc.startBatchNumber && qc.startBatchNumber.includes('1408')) ||
                    (qc.endBatchNumber && qc.endBatchNumber.includes('1408'))
                  );
                  console.log(`⚠️ 未找到測試批號 TWCC140878`);
                  console.log(`📊 統計: 總共 ${qcDataList.length} 筆，包含 1408 的批號: ${all1408Batches.length} 筆`);
                  if (all1408Batches.length > 0) {
                    console.log(`🔍 包含 1408 的批號範例:`, all1408Batches.slice(0, 5).map(qc => ({
                      start: qc.startBatchNumber,
                      end: qc.endBatchNumber || '(空)'
                    })));
                  }
                  console.log(`📋 檢查前 10 筆:`, qcDataList.slice(0, 10).map(qc => ({
                    start: qc.startBatchNumber || '(空)',
                    end: qc.endBatchNumber || '(空)'
                  })));
                }
              }
              
              return qcDataList;
            } else {
              console.log(`⚠️ 工作表 "${csvSheetName}" 沒有找到有效的 QC 資料`);
            }
          }
        } catch (csvErr) {
          // 繼續嘗試下一個工作表名稱
          continue;
        }
      }
    } catch (csvErr) {
      console.warn('CSV 格式讀取失敗:', csvErr);
    }

    // 所有方法都失敗
    throw lastError || new Error('無法讀取 Google Sheets，請確認 Sheet 是否公開或提供有效的 spreadsheetId');
  } catch (error) {
    console.error('讀取 Google Sheets QC 資料失敗:', error);
    return [];
  }
}

// QC 資料索引（用於快速查找）
export interface QCIndex {
  completedBatches: Map<string, string>;  // 結束產品批號 -> 原始批號
  inProgressBatches: Map<string, string>;  // 開始產品批號 -> 原始批號
  ngBatches: Map<string, string>;  // NG 批號 -> 原始批號
}

// 建立 QC 資料索引（O(n) 時間，只需執行一次）
export function buildQCIndex(qcDataList: QCData[]): QCIndex {
  const completedBatches = new Map<string, string>();
  const inProgressBatches = new Map<string, string>();
  const ngBatches = new Map<string, string>();

  for (const qc of qcDataList) {
    // 處理 NG 狀態（優先級最高）
    // 如果 H 欄是 "NG"，則標記為 NG
    if (qc.qcResult === 'NG') {
      // NG 狀態：檢查 E 欄（結束產品批號）或 D 欄（開始產品批號）
      if (qc.endBatchNumber && qc.endBatchNumber.trim().length >= 3) {
        const endBatchUpper = qc.endBatchNumber.trim().toUpperCase();
        ngBatches.set(endBatchUpper, qc.endBatchNumber);
      } else if (qc.startBatchNumber && qc.startBatchNumber.trim().length >= 3) {
        const startBatchUpper = qc.startBatchNumber.trim().toUpperCase();
        ngBatches.set(startBatchUpper, qc.startBatchNumber);
      }
      continue; // NG 狀態優先，不處理其他狀態
    }

    // 處理結束產品批號（QC完成，且不是 NG）
    if (qc.endBatchNumber && 
        qc.endBatchNumber.trim() !== '進行中' && 
        !qc.endBatchNumber.toLowerCase().includes('未完成') &&
        qc.endBatchNumber.trim().length >= 3) {
      const endBatchUpper = qc.endBatchNumber.trim().toUpperCase();
      completedBatches.set(endBatchUpper, qc.endBatchNumber);
      
      // 除錯：檢查 TWCC140878
      if (endBatchUpper === 'TWCC140878') {
        console.log(`✅ 索引建立: TWCC140878 加入 QC完成索引, endBatchNumber="${qc.endBatchNumber}", QC結果="${qc.qcResult}"`);
      }
    }

    // 處理開始產品批號（QC中，且不是 NG）
    if (qc.startBatchNumber && 
        qc.startBatchNumber.trim().length >= 3 &&
        !qc.startBatchNumber.toLowerCase().includes('產品批號') &&
        !qc.startBatchNumber.toLowerCase().includes('批號') &&
        qc.startBatchNumber !== '進行中') {
      const startBatchUpper = qc.startBatchNumber.trim().toUpperCase();
      inProgressBatches.set(startBatchUpper, qc.startBatchNumber);
    }
  }

  return { completedBatches, inProgressBatches, ngBatches };
}

// 檢查批號的 QC 狀態（使用索引，O(1) 時間）
export function getQCStatus(
  batchNumber: string,
  qcIndex: QCIndex | null
): 'QC中' | 'QC完成' | 'NG' | null {
  if (!batchNumber || !qcIndex) {
    return null;
  }

  const batch = batchNumber.trim();
  const batchUpper = batch.toUpperCase();
  
  // 先檢查是否為 NG（優先級最高）
  if (qcIndex.ngBatches.has(batchUpper)) {
    return 'NG';
  }
  
  // 再檢查是否在結束產品批號中（QC完成）
  if (qcIndex.completedBatches.has(batchUpper)) {
    return 'QC完成';
  }

  // 最後檢查是否在開始產品批號中（QC中）
  if (qcIndex.inProgressBatches.has(batchUpper)) {
    return 'QC中';
  }

  return null;
}

// 舊版函數（向後兼容，但效率較低，用於除錯）
export function getQCStatusLegacy(
  batchNumber: string,
  qcDataList: QCData[]
): 'QC中' | 'QC完成' | null {
  if (!batchNumber || qcDataList.length === 0) {
    if (!batchNumber) {
      console.log('🔍 QC 比對: 批號為空');
    } else if (qcDataList.length === 0) {
      console.log('🔍 QC 比對: QC 資料列表為空');
    }
    return null;
  }

  const batch = batchNumber.trim();
  const batchUpper = batch.toUpperCase();
  
  // 除錯：顯示比對的批號（只在特定批號或資料不多時顯示）
  const isTestBatch = batchUpper === 'TWCC140878' || batchUpper.includes('140878');
  if (isTestBatch || (qcDataList.length > 0 && qcDataList.length <= 50)) {
    console.log(`🔍 QC 比對: 檢查批號 "${batch}" (轉大寫: "${batchUpper}")`);
    console.log(`📊 QC 資料總數: ${qcDataList.length} 筆`);
  }

  // 檢查是否在結束產品批號中（QC完成）
  // 比對時不區分大小寫，並移除可能的空格
  let matchedEndBatch: string | null = null;
  const isCompleted = qcDataList.some(
    (qc) => {
      if (!qc.endBatchNumber) return false;
      const endBatch = qc.endBatchNumber.trim().toUpperCase();
      const match = endBatch === batchUpper && endBatch !== '進行中' && endBatch !== '';
      if (match) {
        matchedEndBatch = qc.endBatchNumber;
        console.log(`✅ QC完成: 批號 "${batch}" 在結束產品批號中找到 (${qc.endBatchNumber})`);
      }
      return match;
    }
  );
  
  // 如果沒有完全匹配，顯示前幾個可能的匹配項（除錯用，但只在第一次時顯示）
  if (!isCompleted && qcDataList.length > 0 && qcDataList.length <= 50) {
    const possibleMatches = qcDataList
      .filter(qc => qc.endBatchNumber && qc.endBatchNumber.trim().toUpperCase().includes(batchUpper))
      .slice(0, 3)
      .map(qc => qc.endBatchNumber);
    if (possibleMatches.length > 0) {
      console.log(`🔍 QC 比對: 未找到完全匹配，但發現部分匹配:`, possibleMatches);
    }
  }

  if (isCompleted) {
    return 'QC完成';
  }

  // 檢查是否在開始產品批號中（QC中）
  // 比對時不區分大小寫，並移除可能的空格
  let matchedStartBatch: string | null = null;
  const isInProgress = qcDataList.some(
    (qc) => {
      if (!qc.startBatchNumber) return false;
      const startBatch = qc.startBatchNumber.trim().toUpperCase();
      const match = startBatch === batchUpper;
      if (match) {
        matchedStartBatch = qc.startBatchNumber;
        if (isTestBatch) {
          console.log(`🟡 QC中: 批號 "${batch}" 在開始產品批號中找到 (${qc.startBatchNumber}), E欄: ${qc.endBatchNumber || '(空/進行中)'}`);
        } else {
          console.log(`🟡 QC中: 批號 "${batch}" 在開始產品批號中找到 (${qc.startBatchNumber})`);
        }
      }
      return match;
    }
  );
  
  // 如果沒有找到，且是測試批號，顯示更多資訊
  if (!isInProgress && !isCompleted && isTestBatch) {
    // 搜尋所有包含此批號的資料
    const allMatches = qcDataList.filter(qc => 
      (qc.startBatchNumber && qc.startBatchNumber.toUpperCase().includes(batchUpper)) ||
      (qc.endBatchNumber && qc.endBatchNumber.toUpperCase().includes(batchUpper))
    );
    if (allMatches.length > 0) {
      console.log(`🔍 找到包含 "${batchUpper}" 的資料:`, allMatches.slice(0, 5));
    } else {
      // 顯示一些範例資料
      const sampleBatches = qcDataList
        .filter(qc => qc.startBatchNumber && qc.startBatchNumber.toUpperCase().startsWith('TWCC'))
        .slice(0, 10)
        .map(qc => qc.startBatchNumber);
      console.log(`⚠️ 未找到批號 "${batch}"，TWCC 批號範例:`, sampleBatches);
    }
  }
  
  // 如果沒有完全匹配，顯示前幾個可能的匹配項（除錯用，但只在第一次時顯示）
  if (!isInProgress && !isCompleted && qcDataList.length > 0) {
    // 只在 QC 資料不多時顯示詳細訊息，避免 Console 被刷屏
    if (qcDataList.length <= 50) {
      const possibleMatches = qcDataList
        .filter(qc => qc.startBatchNumber && qc.startBatchNumber.trim().toUpperCase().includes(batchUpper))
        .slice(0, 3)
        .map(qc => qc.startBatchNumber);
      if (possibleMatches.length > 0) {
        console.log(`🔍 QC 比對: 未找到完全匹配，但發現部分匹配:`, possibleMatches);
      } else {
        // 只在第一次比對失敗時顯示範例
        const sampleBatches = qcDataList.slice(0, 5).map(qc => ({
          start: qc.startBatchNumber,
          end: qc.endBatchNumber
        }));
        console.log(`🔍 QC 比對: 未找到匹配，QC 資料範例:`, sampleBatches);
      }
    }
  }

  if (isInProgress) {
    return 'QC中';
  }

  return null;
}
