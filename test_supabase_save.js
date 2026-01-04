// 在瀏覽器控制台 (F12) 中執行此腳本來測試 Supabase 保存功能
// 複製整個腳本並貼到控制台，然後按 Enter

(async function testSupabaseSave() {
  console.log('🧪 開始測試 Supabase 保存功能...\n');
  
  // 1. 檢查 Supabase 客戶端
  console.log('1️⃣ 檢查 Supabase 環境變數...');
  const supabaseUrl = process?.env?.NEXT_PUBLIC_SUPABASE_URL || window?.__NEXT_DATA__?.env?.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || window?.__NEXT_DATA__?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ 環境變數未設定！');
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ 已設定' : '❌ 未設定');
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✅ 已設定' : '❌ 未設定');
    console.error('\n請檢查 Vercel 專案設定中的環境變數');
    return;
  }
  
  console.log('✅ 環境變數已設定');
  console.log('URL:', supabaseUrl.substring(0, 30) + '...');
  console.log('Key:', supabaseKey.substring(0, 20) + '...\n');
  
  // 2. 動態載入 Supabase 客戶端
  console.log('2️⃣ 載入 Supabase 客戶端...');
  let supabase;
  try {
    // 嘗試從頁面中獲取已初始化的 supabase 客戶端
    if (window.__SUPABASE_CLIENT__) {
      supabase = window.__SUPABASE_CLIENT__;
      console.log('✅ 使用頁面中的 Supabase 客戶端');
    } else {
      // 如果沒有，嘗試動態導入
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      supabase = createClient(supabaseUrl, supabaseKey);
      console.log('✅ 動態建立 Supabase 客戶端');
    }
  } catch (err) {
    console.error('❌ 無法載入 Supabase 客戶端:', err);
    return;
  }
  
  // 3. 測試讀取
  console.log('\n3️⃣ 測試讀取權限...');
  const { data: readData, error: readError } = await supabase
    .from('schedule_items')
    .select('id')
    .limit(1);
  
  if (readError) {
    console.error('❌ 讀取測試失敗:', readError);
    console.error('錯誤代碼:', readError.code);
    console.error('錯誤訊息:', readError.message);
    if (readError.code === 'PGRST301' || readError.message?.includes('RLS')) {
      console.error('\n⚠️ 這是 RLS (Row Level Security) 政策問題！');
      console.error('請在 Supabase SQL Editor 執行 supabase_rls_policy.sql 腳本');
    }
    return;
  }
  
  console.log('✅ 讀取權限 OK');
  console.log('現有資料筆數:', readData?.length || 0);
  
  // 4. 測試寫入
  console.log('\n4️⃣ 測試寫入權限...');
  const testId = `test-${Date.now()}`;
  const testData = {
    id: testId,
    product_name: 'TEST_PRODUCT',
    batch_number: 'TEST_BATCH',
    quantity: 100,
    delivery_date: '2026-01-01',
    line_id: 'TEST_LINE',
  };
  
  const { data: writeData, error: writeError } = await supabase
    .from('schedule_items')
    .upsert(testData, { onConflict: 'id' });
  
  if (writeError) {
    console.error('❌ 寫入測試失敗:', writeError);
    console.error('錯誤代碼:', writeError.code);
    console.error('錯誤訊息:', writeError.message);
    console.error('錯誤詳情:', JSON.stringify(writeError, null, 2));
    
    if (writeError.code === 'PGRST301' || writeError.message?.includes('RLS')) {
      console.error('\n⚠️ 這是 RLS (Row Level Security) 政策問題！');
      console.error('請在 Supabase SQL Editor 執行以下 SQL:');
      console.error(`
CREATE POLICY "Allow all operations on schedule_items"
ON public.schedule_items
FOR ALL
USING (true)
WITH CHECK (true);
      `);
    }
    return;
  }
  
  console.log('✅ 寫入權限 OK');
  console.log('寫入結果:', writeData);
  
  // 5. 驗證資料已保存
  console.log('\n5️⃣ 驗證資料已保存...');
  const { data: verifyData, error: verifyError } = await supabase
    .from('schedule_items')
    .select('*')
    .eq('id', testId)
    .single();
  
  if (verifyError) {
    console.error('❌ 驗證失敗:', verifyError);
    return;
  }
  
  console.log('✅ 資料已成功保存到資料庫！');
  console.log('保存的資料:', verifyData);
  
  // 6. 清理測試資料
  console.log('\n6️⃣ 清理測試資料...');
  const { error: deleteError } = await supabase
    .from('schedule_items')
    .delete()
    .eq('id', testId);
  
  if (deleteError) {
    console.warn('⚠️ 清理測試資料失敗:', deleteError);
  } else {
    console.log('✅ 測試資料已清理');
  }
  
  console.log('\n🎉 所有測試通過！Supabase 連接和權限都正常。');
  console.log('如果 APP 中仍然無法保存，請檢查：');
  console.log('1. 瀏覽器控制台是否有其他錯誤');
  console.log('2. 網路連線是否正常');
  console.log('3. 是否有其他 JavaScript 錯誤阻止了保存操作');
})();

