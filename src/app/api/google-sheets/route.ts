import { NextRequest, NextResponse } from 'next/server';

// Google Sheets API 路由
// 將 Google API Key 移到伺服器端，避免暴露在客戶端

// 明確指定為動態路由（因為使用了 searchParams）
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const spreadsheetId = searchParams.get('spreadsheetId');
    const sheetName = searchParams.get('sheetName') || 'Report';
    const range = searchParams.get('range') || 'D2:H';

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'Missing spreadsheetId parameter' },
        { status: 400 }
      );
    }

    // 從伺服器端環境變數獲取 API Key（不暴露給客戶端）
    const googleApiKey = process.env.GOOGLE_API_KEY;

    if (!googleApiKey) {
      console.error('❌ GOOGLE_API_KEY 環境變數未設定');
      return NextResponse.json(
        { error: 'Google API Key not configured' },
        { status: 500 }
      );
    }

    // 構建 Google Sheets API URL
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!${range}?key=${googleApiKey}`;

    console.log('🔄 [API] 從 Google Sheets 讀取資料:', {
      spreadsheetId,
      sheetName,
      range,
      url: url.replace(googleApiKey, '***'), // 不在日誌中暴露 API Key
    });

    // 調用 Google Sheets API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Google Sheets API 錯誤:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return NextResponse.json(
        { error: `Google Sheets API error: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log('✅ [API] Google Sheets 資料讀取成功，行數:', data.values?.length || 0);

    // 返回資料（不包含 API Key）
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ [API] Google Sheets 請求異常:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
