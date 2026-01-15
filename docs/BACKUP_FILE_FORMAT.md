# 備份檔案格式說明

## 📄 備份檔案類型

根據使用的備份方法，會生成不同格式的備份檔案：

---

## 1. SQL 格式備份（pg_dump）

### 檔案格式
- **副檔名**：`.sql`
- **檔案大小**：依資料量而定（可能有幾 MB 到幾 GB）
- **格式**：純文字 SQL 腳本

### 檔案內容結構

```sql
--
-- PostgreSQL database dump
--

-- Dumped from database version 15.1
-- Dumped by pg_dump version 15.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);

--
-- Name: schedule_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.schedule_items (
    id uuid NOT NULL,
    product_name text,
    batch_number text,
    quantity numeric,
    delivery_date text,
    line_id text,
    schedule_date text,
    start_hour numeric,
    end_hour numeric,
    material_ready_date text,
    recipe_items jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    -- ... 其他欄位
    CONSTRAINT schedule_items_pkey PRIMARY KEY (id)
);

--
-- Data for Name: schedule_items; Type: TABLE DATA; Schema: public;
--

COPY public.schedule_items (id, product_name, batch_number, quantity, delivery_date, line_id, schedule_date, start_hour, end_hour, material_ready_date, recipe_items, created_at, updated_at) FROM stdin;
550e8400-e29b-41d4-a716-446655440000	AC82425046	TWCC140978	201	2026-01-19	TS26	2026-01-11	7.4	9.4	2026-12-30	[{"item":"Material A","quantity":100},{"item":"Material B","quantity":50}]	2025-01-11 10:00:00+00	2025-01-11 10:00:00+00
660e8400-e29b-41d4-a716-446655440001	NB32425919	TWCC141004	15	2026-01-06	27CC	2026-01-02	2	2.15	2026-12-30	[{"item":"Material C","quantity":10}]	2025-01-11 10:01:00+00	2025-01-11 10:01:00+00
\.

--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public;
--

COPY public.user_profiles (id, email, role, created_at, updated_at) FROM stdin;
434c8e6e-d5fa-4c1a-a967-505a146a4d82	ali.liu@avient.com	viewer	2025-01-01 00:00:00+00	2025-01-01 00:00:00+00
550e8400-e29b-41d4-a716-446655440000	joyce.liao@avient.com	operator	2025-01-01 00:00:00+00	2025-01-01 00:00:00+00
\.

--
-- Name: schedule_items_pkey; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.schedule_items
    ADD CONSTRAINT schedule_items_pkey PRIMARY KEY (id);

--
-- PostgreSQL database dump complete
--
```

### 內容說明

1. **資料庫設定**：
   - PostgreSQL 版本資訊
   - 字符編碼設定
   - 時區設定等

2. **資料表結構（Schema）**：
   - `CREATE TABLE` 語句
   - 欄位定義
   - 主鍵和索引
   - 約束條件

3. **資料內容（Data）**：
   - `COPY ... FROM stdin` 語句
   - 每行是一筆資料記錄
   - 欄位值以 Tab 分隔（`\t`）
   - `\.` 表示資料結束

4. **索引和約束**：
   - 主鍵約束
   - 外鍵約束
   - 索引定義

---

## 2. CSV 格式備份（SQL Editor COPY）

### 檔案格式
- **副檔名**：`.csv`
- **檔案大小**：較小（只包含資料，不含結構）
- **格式**：逗號分隔值

### 檔案內容範例

```csv
id,product_name,batch_number,quantity,delivery_date,line_id,schedule_date,start_hour,end_hour,created_at,updated_at
550e8400-e29b-41d4-a716-446655440000,AC82425046,TWCC140978,201,2026-01-19,TS26,2026-01-11,7.4,9.4,2025-01-11 10:00:00+00,2025-01-11 10:00:00+00
660e8400-e29b-41d4-a716-446655440001,NB32425919,TWCC141004,15,2026-01-06,27CC,2026-01-02,2,2.15,2025-01-11 10:01:00+00,2025-01-11 10:01:00+00
```

### 內容說明

- **第一行**：欄位名稱（header）
- **後續行**：資料記錄
- **分隔符號**：逗號（`,`）
- **文字值**：可能需要引號包圍（如果包含逗號）

---

## 3. 壓縮備份（gzip）

### 檔案格式
- **副檔名**：`.sql.gz` 或 `.sql.gz`
- **檔案大小**：原始檔案的 10-30%（大幅壓縮）
- **格式**：gzip 壓縮的 SQL 檔案

### 使用方式

```bash
# 解壓縮
gunzip backup_20250111_140000.sql.gz

# 或使用 gzip
gzip -d backup_20250111_140000.sql.gz
```

---

## 📊 備份檔案內容詳解

### 包含的資料表

根據當前專案，備份檔案會包含以下表的資料：

1. **`schedule_items`** - 排程項目
   - 所有排程資料
   - 包含產品名稱、批號、數量、日期等

2. **`user_profiles`** - 用戶資料
   - 用戶 email
   - 用戶角色（admin/operator/viewer）

3. **`line_configs`** - 產線設定
   - 產線出量設定（kg/h）

4. **`suggested_schedules`** - 建議排程
   - AI 建議的排程方案

### 每筆資料的格式

**排程項目範例**：
```sql
-- 原始資料
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "productName": "AC82425046",
  "batchNumber": "TWCC140978",
  "quantity": 201,
  "deliveryDate": "2026-01-19",
  "lineId": "TS26",
  "scheduleDate": "2026-01-11",
  "startHour": 7.4,
  "endHour": 9.4,
  "recipeItems": [
    {"item": "Material A", "quantity": 100},
    {"item": "Material B", "quantity": 50}
  ]
}

-- SQL 備份中的格式（COPY 格式）
550e8400-e29b-41d4-a716-446655440000	AC82425046	TWCC140978	201	2026-01-19	TS26	2026-01-11	7.4	9.4	2026-12-30	{"item":"Material A","quantity":100},{"item":"Material B","quantity":50}	2025-01-11 10:00:00+00	2025-01-11 10:00:00+00
```

---

## 📝 備份檔案命名規則

### 自動化腳本生成的檔案名稱

```
backup_YYYYMMDD_HHMMSS.sql
```

**範例**：
- `backup_20250111_143022.sql` - 2025年1月11日 14:30:22 的備份
- `backup_20250111_143022.sql.gz` - 壓縮後的備份

### 檔案命名說明

- **`backup_`** - 前綴
- **`YYYYMMDD`** - 日期（年月日）
- **`HHMMSS`** - 時間（時分秒）
- **`.sql`** - 檔案格式
- **`.gz`** - 壓縮格式（如果有壓縮）

---

## 🔍 如何查看備份檔案內容

### 方法 1：使用文字編輯器

```bash
# 查看 SQL 備份檔案
notepad backup_20250111_143022.sql  # Windows
open backup_20250111_143022.sql     # macOS
cat backup_20250111_143022.sql      # Linux
```

### 方法 2：使用命令行工具

```bash
# 查看前 50 行
head -n 50 backup_20250111_143022.sql

# 查看後 50 行
tail -n 50 backup_20250111_143022.sql

# 搜尋特定內容
grep "schedule_items" backup_20250111_143022.sql
```

### 方法 3：使用資料庫工具

```bash
# 還原到本機資料庫查看
psql -h localhost -U postgres -d test_db < backup_20250111_143022.sql
```

---

## 📊 備份檔案大小估算

### 當前專案估算

假設：
- **schedule_items**：100 筆，每筆約 1 KB = 100 KB
- **user_profiles**：10 筆，每筆約 0.1 KB = 1 KB
- **line_configs**：11 筆，每筆約 0.1 KB = 1 KB
- **資料表結構**：約 10 KB
- **總計**：約 112 KB（未壓縮）

**壓縮後**：約 30-50 KB（gzip 壓縮率約 70%）

### 長期使用估算

| 資料量 | 未壓縮大小 | 壓縮後大小 |
|--------|-----------|-----------|
| 1,000 筆 | ~1 MB | ~300 KB |
| 10,000 筆 | ~10 MB | ~3 MB |
| 100,000 筆 | ~100 MB | ~30 MB |

---

## 🔄 備份檔案用途

### 1. 完整還原

```bash
# 還原整個資料庫
psql "postgresql://postgres:[password]@[host]:5432/postgres" < backup_20250111_143022.sql
```

### 2. 部分還原

```sql
-- 在 Supabase SQL Editor 中執行特定表的還原
-- 先刪除舊資料
DELETE FROM public.schedule_items;

-- 然後從備份中複製該表的 INSERT 語句執行
```

### 3. 資料分析

```bash
# 匯出為 CSV 進行分析
# 在備份檔案中找到 COPY 語句對應的資料部分
# 轉換為 CSV 格式
```

### 4. 資料遷移

```bash
# 將備份還原到另一個資料庫
psql "postgresql://postgres:[password]@new-host:5432/postgres" < backup_20250111_143022.sql
```

---

## 📋 備份檔案檢查清單

備份檔案應該包含：

- ✅ 資料表結構定義（CREATE TABLE）
- ✅ 所有資料內容（COPY ... FROM stdin）
- ✅ 主鍵和索引定義
- ✅ 外鍵約束
- ✅ 時間戳記（created_at, updated_at）

---

## ⚠️ 注意事項

### 1. 檔案大小
- 大型資料庫備份可能很大（幾 GB）
- 建議使用壓縮減少檔案大小
- 確保有足夠的儲存空間

### 2. 檔案格式
- SQL 檔案是純文字格式
- 可以用任何文字編輯器打開
- 但建議使用專業工具查看

### 3. 資料完整性
- 備份檔案包含所有資料和結構
- 可以用來完全還原資料庫
- 但需要確保備份時的資料是完整的

---

## 🎯 實際範例

### 完整的備份檔案範例（簡化版）

```sql
--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;

--
-- Name: schedule_items; Type: TABLE
--

CREATE TABLE public.schedule_items (
    id uuid NOT NULL,
    product_name text,
    batch_number text,
    quantity numeric,
    delivery_date text,
    line_id text,
    schedule_date text,
    start_hour numeric,
    end_hour numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT schedule_items_pkey PRIMARY KEY (id)
);

--
-- Data for Name: schedule_items
--

COPY public.schedule_items (id, product_name, batch_number, quantity, delivery_date, line_id, schedule_date, start_hour, end_hour, created_at, updated_at) FROM stdin;
550e8400-e29b-41d4-a716-446655440000	AC82425046	TWCC140978	201	2026-01-19	TS26	2026-01-11	7.4	9.4	2025-01-11 10:00:00+00	2025-01-11 10:00:00+00
660e8400-e29b-41d4-a716-446655440001	NB32425919	TWCC141004	15	2026-01-06	27CC	2026-01-02	2	2.15	2025-01-11 10:01:00+00	2025-01-11 10:01:00+00
\.
```

這就是備份檔案的基本格式和內容！
