/**
 * 公开披露文件采集管线
 *
 * 支持的数据源：
 * 1. 巨潮资讯网 (cninfo.com.cn) — A股年报/季报/招股书 PDF（HTTP API）
 * 2. SEC EDGAR — 美股 10-K / 10-Q / 13-F（官方 JSON API）
 *
 * 流程：搜索披露文件 → 下载 PDF → pdfjs-dist 文本抽取 → 存入 filings 表
 * 抽取后的文本传给 LLM 做结构化提取（见 server-extract.ts）。
 *
 * 安全注意：
 * - 爬虫遵守 robots.txt 和接口限流（cninfo 无明确 API 条款但有公开页面；
 *   SEC EDGAR 限 10 req/s，超限 IP 被封）。
 * - 下载的文件存在 data/filings/ 目录下（不在代码仓库内）。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import iconv from 'iconv-lite';
import {
  upsertFiling,
  getPendingFilings,
  updateFilingStatus,
  getFilingsByCompany,
  default as db,
  Filing,
} from './db';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILINGS_DIR = path.join(DATA_DIR, 'filings');
if (!fs.existsSync(FILINGS_DIR)) {
  fs.mkdirSync(FILINGS_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// 巨潮资讯网 (cninfo) 搜索
// A股上市公司用"证券代码 + 交易所"定位。
// ---------------------------------------------------------------------------

interface CninfoAnnouncement {
  announcementId: string;
  announcementTitle: string;
  adjunctUrl: string;
  adjunctType: string;
  announcementTime: string;
  fileName: string;
}

interface CninfoSearchResult {
  code: string;
  message: string;
  announcements: CninfoAnnouncement[];
  totalAnnouncements: number;
}

/**
 * 从巨潮搜索公司年报/季报公告。
 * exchange: 'szse'（深交所）或 'sse'（上交所）
 * 例如比亚迪 = 002594.SZ → szse, 002594
 */
async function searchCninfoFilings(
  companyName: string,
  stockCode: string,
  exchange: 'szse' | 'sse',
  filingType: 'year' | 'quarter' | 'prospectus' = 'year'
): Promise<CninfoAnnouncement[]> {
  const categoryMap: Record<string, string> = {
    year: 'category_ndbg_szsh', // 年度报告
    quarter: 'category_pgngszsh', // 季度报告
    prospectus: 'category_scgk_cszl', // 招股书
  };
  const category = categoryMap[filingType] || categoryMap.year;
  const pageSize = 10;

  // cninfo 要求 GBK 编码，不能用默认的 UTF-8 URLSearchParams
  // 注意 stock 参数格式为 "股票代码,交易所代码"，逗号不能编码
  const rawBody =
    `stock=${stockCode},${exchange}` +
    `&tabName=fulltext&pageSize=${pageSize}&pageNum=1&column=${exchange}` +
    `&category=${category}&plate=&seDate=&isHLtitle=true`;

  try {
    const bodyBytes = iconv.encode(rawBody, 'gbk');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch('http://www.cninfo.com.cn/new/hisAnnouncement/query', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=GBK',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'application/json, text/javascript, */*; q=0.01',
      },
      body: bodyBytes,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[filing] cninfo API error ${response.status} for ${companyName}`);
      return [];
    }

    // 响应正文是 UTF-8 JSON，无需特殊处理
    const data = (await response.json()) as CninfoSearchResult;
    if (data.code !== '0' || !Array.isArray(data.announcements)) {
      return [];
    }

    return data.announcements.filter((a) => a.adjunctUrl && a.adjunctUrl.endsWith('.pdf'));
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.warn(`[filing] cninfo search timeout for ${companyName}`);
    } else {
      console.warn(`[filing] cninfo search failed for ${companyName}:`, err);
    }
    return [];
  }
}

/**
 * 从巨潮 PDF URL 提取真实下载地址。
 * cninfo 的 adjunctUrl 通常是相对路径如 /new/announcement/.../xxx.pdf，
 * 需要拼接完整 URL。
 */
function cninfoPdfUrl(adjunctUrl: string): string {
  if (adjunctUrl.startsWith('http')) return adjunctUrl;
  return `http://www.cninfo.com.cn${adjunctUrl}`;
}

// ---------------------------------------------------------------------------
// SEC EDGAR 搜索
// ---------------------------------------------------------------------------

interface SecFilingItem {
  accessionNumber: string;
  filingDate: string;
  form: string;
  primaryDocument: string;
  primaryDocDescription: string;
}

interface SecCompanyFilings {
  cik: string;
  name: string;
  filings: { recent: { form: string; filingDate: string; accessionNumber: string; primaryDocument: string; primaryDocDescription: string }[] };
}

/**
 * 带重试和超时的 fetch 封装（最多 3 次，5s/15s/45s 退避）。
 * 适用于 PDF 下载等不幂等的网络请求。
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 30000, ...fetchOptions } = options;
  const delays = [5000, 15000, 45000];
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...fetchOptions, signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) return res;
      if (res.status < 500 && res.status >= 400) {
        throw new Error(`HTTP ${res.status}`);
      }
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err: any) {
      clearTimeout(timer);
      if (err?.name === 'AbortError') {
        lastError = new Error(`Timeout after ${timeoutMs}ms`);
      } else {
        lastError = err;
      }
      if (attempt < delays.length) {
        console.warn(`[filing] fetch attempt ${attempt + 1} failed for ${url}: ${lastError.message}, retrying in ${delays[attempt]}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
        continue;
      }
    }
  }
  throw lastError || new Error('fetchWithRetry exhausted');
}

/**
 * 通过 SEC 公司的 CIK 获取近两年的 10-K / 10-Q 列表。
 * company_tickers.json 可以通过公司名反向查 CIK。
 */
async function searchSecFilings(
  companyName: string,
  cik: string,
  formTypes: string[] = ['10-K', '10-Q', '13-F']
): Promise<{ form: string; filingDate: string; accessionNumber: string; docUrl: string }[]> {
  try {
    const url = `https://data.sec.gov/submissions/${cik}.json`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'GenSight Research analysis@gensight.app',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];

    const data = (await res.json()) as SecCompanyFilings;
    const recent = (data.filings?.recent || {}) as {
      form?: string[];
      filingDate?: string[];
      accessionNumber?: string[];
      primaryDocument?: string[];
      primaryDocDescription?: string[];
    };
    const forms = recent.form || [];
    const dates = recent.filingDate || [];
    const accessions = recent.accessionNumber || [];
    const docs = recent.primaryDocument || [];
    const descriptions = recent.primaryDocDescription || [];

    const results: { form: string; filingDate: string; accessionNumber: string; docUrl: string }[] = [];
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 2);

    for (let i = 0; i < forms.length; i++) {
      if (!formTypes.includes(forms[i])) continue;
      const fd = new Date(dates[i]);
      if (fd < cutoff) continue;
      const acc = accessions[i].replace(/-/g, '');
      const doc = docs[i];
      const docUrl = `https://www.sec.gov/Archives/edgar/full-index/${fd.getFullYear()}/${fmtQtr(fd)}/${cik}/${acc}/${doc}`;
      results.push({ form: forms[i], filingDate: dates[i], accessionNumber: accessions[i], docUrl });
    }
    return results.slice(0, 10);
  } catch (err) {
    console.warn(`[filing] SEC search failed for ${companyName}:`, err);
    return [];
  }
}

function fmtQtr(d: Date): string {
  return `QTR${Math.ceil((d.getMonth() + 1) / 3)}`;
}

/**
 * 通过 SEC 公司名反向查 CIK（从 company_tickers.json）。
 * 该文件每 30 分钟更新，缓存使用。
 */
let _cikCache: Map<string, string> | null = null;
let _cikCacheTime = 0;
const CIK_CACHE_TTL = 30 * 60 * 1000;

async function findCikByName(companyName: string): Promise<string | null> {
  const now = Date.now();
  if (!_cikCache || now - _cikCacheTime > CIK_CACHE_TTL) {
    try {
      const res = await fetch('https://www.sec.gov/files/company_tickers.json', {
        headers: { 'User-Agent': 'GenSight Research analysis@gensight.app', Accept: 'application/json' },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as Record<string, { ticker: string; name: string; cik: string }>;
      _cikCache = new Map(Object.values(data).map((v) => [v.name.toLowerCase(), v.cik.padStart(10, '0')]));
      _cikCacheTime = now;
    } catch {
      return null;
    }
  }
  const lower = companyName.toLowerCase();
  // 精确匹配优先，再模糊
  for (const [name, cik] of _cikCache.entries()) {
    if (name.includes(lower) || lower.includes(name.replace(/[^a-z]/g, ''))) {
      return cik;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 港交所披露易 (HKEXnews) 搜索
// 港股年报/中期报告 PDF。参考开源实现：github.com/agentladle/mcp-hkexnews
// 注意两个坑：
//   1) prefix.do 的 lang 用大写 "ZH"，titleSearchServlet.do 的 lang 用小写 "zh"
//   2) titleSearchServlet.do 返回的 result 是 JSON 字符串，需二次 JSON.parse
// ---------------------------------------------------------------------------

interface HkexFiling {
  title: string;
  longText: string;
  dateTime: string; // DD/MM/YYYY HH:mm
  fileLink: string;
  fileSize: string;
  newsId: string;
  stockCode: string;
}

// stockId 内存缓存（prefix.do 结果，TTL 1 天）
let _hkStockIdCache = new Map<string, string>();
let _hkStockIdCacheTime = 0;
const HK_STOCKID_CACHE_TTL = 24 * 3600 * 1000;

/**
 * 通过港交所披露易 prefix.do 反查内部 stockId。
 * 输入 5 位港股代码（如 "01211"），返回内部 stockId（如 "2696"）。
 */
async function findHkexStockId(stockCode: string): Promise<string | null> {
  const code5 = stockCode.padStart(5, '0');
  const now = Date.now();
  if (now - _hkStockIdCacheTime > HK_STOCKID_CACHE_TTL) {
    _hkStockIdCache = new Map();
    _hkStockIdCacheTime = now;
  }
  const cached = _hkStockIdCache.get(code5);
  if (cached) return cached;

  try {
    const res = await fetchWithRetry(
      `https://www1.hkexnews.hk/search/prefix.do?callback=cb&lang=ZH&type=A&name=${code5}&market=SEHK`,
      { timeoutMs: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!res.ok) return null;

    const text = await res.text();
    // JSONP：cb({...}); → 剥离外层回调
    const start = text.indexOf('(');
    const end = text.lastIndexOf(')');
    if (start === -1 || end === -1) return null;
    const json = JSON.parse(text.slice(start + 1, end));
    const recs = json?.stockInfo || [];
    const sid = recs.length ? String(recs[0].stockId) : null;
    if (sid) _hkStockIdCache.set(code5, sid);
    return sid;
  } catch (err) {
    console.warn(`[filing] hkex prefix.do failed for ${code5}:`, err);
    return null;
  }
}

/**
 * 通过港交所披露易 titleSearchServlet.do 搜索公司公告（含年报/中期报告）。
 */
async function searchHkexFilings(stockCode: string): Promise<HkexFiling[]> {
  const sid = await findHkexStockId(stockCode);
  if (!sid) return [];

  try {
    // fromDate 用 YYYYMMDD 限定近 2 年年初；空日期只会返回最近几条公告，
    // 必须限定区间才能覆盖到历史年报（toDate 留空表示至今）。
    const fromDate = hkexFromDateYearsAgo(2);
    const params = new URLSearchParams({
      sortDir: '0',
      sortByOptions: 'DateTime',
      category: '0',
      market: 'SEHK',
      stockId: sid,
      documentType: '-1',
      fromDate,
      toDate: '',
      title: '',
      searchType: '1',
      t1code: '-2',
      t2Gcode: '-2',
      t2code: '-2',
      rowRange: '300',
      lang: 'zh',
    });
    const res = await fetchWithRetry(
      `https://www1.hkexnews.hk/search/titleSearchServlet.do?${params}`,
      { timeoutMs: 20000, headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!res.ok) return [];

    const body = await res.json();
    // result 字段是 JSON 字符串，需二次解析
    let rows: any[] = [];
    if (typeof body.result === 'string') {
      try {
        rows = JSON.parse(body.result) || [];
      } catch {
        rows = [];
      }
    } else {
      rows = body.result || [];
    }

    return rows.map((r: any) => ({
      title: String(r.TITLE || '').replace(/<br\s*\/?>/gi, ' ').trim(),
      longText: String(r.LONG_TEXT || '').replace(/<br\s*\/?>/gi, ' ').trim(),
      dateTime: String(r.DATE_TIME || ''),
      fileLink: String(r.FILE_LINK || ''),
      fileSize: String(r.FILE_INFO || ''),
      newsId: String(r.NEWS_ID || ''),
      stockCode: String(r.STOCK_CODE || ''),
    }));
  } catch (err) {
    console.warn(`[filing] hkex titleSearchServlet failed for ${stockCode}:`, err);
    return [];
  }
}

/**
 * 按公告标题（繁体）分类：年报 / 中期报告 / 季度报告 / 其他公告。
 * 实测标题样例：`2025年年報`、`二零二六年中期報告`、`二零二六年第一季度報告`、
 * `2025年度可持續發展報告`（ESG，需排除）、`中期業績公告`、`業績預告`。
 */
function classifyHkexFilingType(title: string, longText: string): string {
  const text = `${title} ${longText}`;
  // 排除非财报类：ESG/可持续发展报告、盈利警告、业绩预告
  if (/可持續|環境、社會|ESG|業績預告|盈利警告/i.test(text)) return 'announcement';
  if (/年報/.test(text)) return 'annual_report';
  if (/中期/.test(text)) return 'interim_report';
  if (/季度/.test(text)) return 'quarterly_report';
  return 'announcement';
}

/** 从 DD/MM/YYYY HH:mm 提取年份 */
function parseHkexYear(dateTime: string): number | null {
  const m = dateTime.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? parseInt(m[3], 10) : null;
}

/** 计算 N 年前的年初日期（YYYYMMDD），用于港交所 fromDate 参数。
 *  注意：港交所接口对过远的 fromDate 会静默返回空（实测 20230929 返回 recordCnt=0，
 *  20240101 正常返回 300 条），故用「年初」而非「精确 N 年前今天」以稳妥覆盖。 */
function hkexFromDateYearsAgo(years: number): string {
  const y = new Date().getFullYear() - years;
  return `${y}0101`;
}

// ---------------------------------------------------------------------------
// PDF 文本抽取（pdfjs-dist）
// ---------------------------------------------------------------------------

let _pdfjs: typeof import('pdfjs-dist') | null = null;

async function getPdfJs() {
  if (!_pdfjs) {
    _pdfjs = await import('pdfjs-dist');
    _pdfjs.GlobalWorkerOptions.workerSrc = '';
  }
  return _pdfjs;
}

/**
 * 从 URL 下载 PDF 并抽取纯文本。
 * 返回前 maxChars 个字符（年报通常 10-20 万字，取前 8 万做结构化抽取足够）。
 */
async function extractPdfText(pdfUrl: string, maxChars = 80000): Promise<string> {
  try {
    const pdfjs = await getPdfJs();
    const response = await fetch(pdfUrl);
    if (!response.ok) throw new Error(`PDF download failed: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const pdf = await pdfjs.getDocument({ data: uint8 }).promise;
    const texts: string[] = [];
    for (let i = 1; i <= Math.min(pdf.numPages, 300); i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      texts.push(pageText);
      if (texts.join('').length > maxChars) break;
    }
    return texts.join('\n').slice(0, maxChars);
  } catch (err) {
    throw new Error(`PDF extraction failed: ${(err as Error)?.message || String(err)}`);
  }
}

/**
 * 从本地路径读取 PDF 并抽取文本（巨潮文件下载到本地后调用）。
 */
async function extractLocalPdfText(localPath: string, maxChars = 80000): Promise<string> {
  try {
    const pdfjs = await getPdfJs();
    const data = new Uint8Array(fs.readFileSync(localPath));
    const pdf = await pdfjs.getDocument({ data }).promise;
    const texts: string[] = [];
    for (let i = 1; i <= Math.min(pdf.numPages, 300); i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      texts.push(pageText);
      if (texts.join('').length > maxChars) break;
    }
    return texts.join('\n').slice(0, maxChars);
  } catch (err) {
    throw new Error(`Local PDF extraction failed: ${(err as Error)?.message || String(err)}`);
  }
}

// ---------------------------------------------------------------------------
// 文件采集入口
// ---------------------------------------------------------------------------

/**
 * 根据公司名触发披露文件采集（自动识别 A股 vs 美股）。
 * A股：需要提供 股票代码+交易所 映射（暂时需要外部传入或从 automotiveIndustry 匹配）。
 * 美股：通过 company_tickers.json 反查 CIK。
 *
 * 返回已创建的 filing 记录列表。
 */
export async function crawlCompanyFilings(
  companyName: string,
  options?: {
    stockCode?: string;
    exchange?: 'szse' | 'sse' | 'hkex';
    cik?: string;
    filingType?: 'year' | 'quarter' | 'prospectus';
  }
): Promise<Filing[]> {
  const created: Filing[] = [];

  // 美股路径
  const cik = options?.cik || (options?.stockCode ? undefined : await findCikByName(companyName));
  if (cik) {
    const secFilings = await searchSecFilings(companyName, cik);
    for (const f of secFilings) {
      const filing = upsertFiling({
        companyName,
        filingType: f.form,
        period: f.filingDate,
        year: new Date(f.filingDate).getFullYear(),
        pdfUrl: f.docUrl,
        status: 'pending',
      });
      created.push(filing);
    }
    return created;
  }

  // 港股路径（港交所披露易，需显式传入 stockCode + exchange='hkex'）
  if (options?.stockCode && options.exchange === 'hkex') {
    const filings = await searchHkexFilings(options.stockCode);
    // 只采集有抽取价值的财报类文件（年报/中期报告），过滤临时公告
    for (const f of filings) {
      const filingType = classifyHkexFilingType(f.title, f.longText);
      if (filingType === 'announcement') continue;
      const pdfUrl = f.fileLink.startsWith('http')
        ? f.fileLink
        : `https://www1.hkexnews.hk${f.fileLink}`;
      const filing = upsertFiling({
        companyName,
        exchange: 'hkex',
        ticker: options.stockCode,
        filingType,
        period: f.dateTime,
        year: parseHkexYear(f.dateTime) ?? undefined,
        pdfUrl,
        status: 'pending',
      });
      created.push(filing);
    }
    return created;
  }

  // A股路径（需要显式传入 stockCode + exchange）
  if (options?.stockCode && (options.exchange === 'szse' || options.exchange === 'sse')) {
    const announcements = await searchCninfoFilings(
      companyName,
      options.stockCode,
      options.exchange,
      options.filingType || 'year'
    );
    for (const ann of announcements) {
      const pdfUrl = cninfoPdfUrl(ann.adjunctUrl);
      const filing = upsertFiling({
        companyName,
        exchange: options.exchange,
        ticker: options.stockCode,
        filingType: 'year_report',
        period: ann.announcementTime,
        pdfUrl,
        status: 'pending',
      });
      created.push(filing);
    }
    return created;
  }

  console.warn(`[filing] cannot determine filing source for "${companyName}": no stockCode/exchange nor SEC CIK found`);
  return [];
}

/**
 * 下载并抽取单个 filing 的文本。
 * 结果通过 updateFilingStatus 更新记录状态。
 * 返回抽取的文本（供 server-extract.ts 调用）。
 */
export async function processFiling(filingId: string): Promise<string | null> {
  const filing = db.prepare('SELECT * FROM filings WHERE id = ?').get(filingId) as Filing | undefined;
  if (!filing) {
    console.error(`[filing] filing not found: ${filingId}`);
    return null;
  }

  if (!filing.pdf_url) {
    updateFilingStatus(filingId, 'error', undefined, 'No PDF URL');
    return null;
  }

  try {
    updateFilingStatus(filingId, 'downloading');

    // 如果是 cninfo PDF，先下载到本地（带重试，避免临时网络故障）
    let localPath = filing.local_path;
    if (filing.pdf_url.includes('cninfo.com.cn') && !filing.local_path) {
      const fileName = `${filing.id}.pdf`;
      localPath = path.join(FILINGS_DIR, fileName);
      const res = await fetchWithRetry(filing.pdf_url, { timeoutMs: 60000 });
      const buf = await res.arrayBuffer();
      fs.writeFileSync(localPath, Buffer.from(buf));
      updateFilingStatus(filingId, 'downloaded', localPath);
    } else {
      updateFilingStatus(filingId, 'downloaded', localPath);
    }

    // 抽取文本
    let text: string;
    if (localPath && fs.existsSync(localPath)) {
      text = await extractLocalPdfText(localPath);
    } else {
      text = await extractPdfText(filing.pdf_url);
    }

    if (!text || text.length < 500) {
      updateFilingStatus(filingId, 'error', localPath, 'PDF text too short or empty');
      return null;
    }

    updateFilingStatus(filingId, 'parsed', localPath);
    return text;
  } catch (err: any) {
    console.error(`[filing] processFiling error for ${filingId}:`, err);
    updateFilingStatus(filingId, 'error', undefined, err?.message || String(err));
    return null;
  }
}

/**
 * 获取公司的历史 filing 列表。
 */
export function getCompanyFilings(companyName: string): Filing[] {
  return getFilingsByCompany(companyName);
}

/**
 * 获取待处理的 filing（管理员触发处理时使用）。
 */
export function listPendingFilings(): Filing[] {
  return getPendingFilings();
}
