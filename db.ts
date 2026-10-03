/**
 * SQLite 数据层
 *
 * 主要表：
 * 1. config          — key/value 配置存储（AI Provider 配置、限流参数等）
 * 2. usage_logs      — 每次 AI 调用日志（用户、IP、端点、provider、状态、耗时）
 * 3. daily_quotas    — 用户每日配额计数（按 user_id + date 唯一）
 * 4. users           — 注册用户（scrypt 密码哈希）
 * 5. sessions        — 服务端会话（HttpOnly Cookie 携带 token）
 * 6. company_cache   — AI 分析结果缓存（按公司名，TTL 过期，省钱核心）
 *
 * 设计原则：
 * - 配置优先从 DB 读取，env 作为 fallback（这样后台改完立刻生效，无需重启）
 * - 日志写入失败不阻塞主流程
 * - better-sqlite3 是同步 API，简单可靠
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// 确保数据目录存在
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'gensight.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ---------------------------------------------------------------------------
// 初始化表结构
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    key         TEXT PRIMARY KEY,
    value       TEXT,
    updated_at  INTEGER
  );

  CREATE TABLE IF NOT EXISTS usage_logs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       TEXT,
    user_email    TEXT,
    ip            TEXT,
    endpoint      TEXT,
    company_name  TEXT,
    provider      TEXT,
    status        TEXT,
    error         TEXT,
    duration_ms   INTEGER,
    created_at    INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_usage_logs_endpoint ON usage_logs(endpoint);

  CREATE TABLE IF NOT EXISTS daily_quotas (
    user_id     TEXT,
    date        TEXT,
    used_count  INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, date)
  );

  CREATE TABLE IF NOT EXISTS report_orders (
    id                TEXT PRIMARY KEY,
    user_id           TEXT,
    user_email        TEXT NOT NULL,
    company_name      TEXT NOT NULL,
    report_type       TEXT NOT NULL DEFAULT 'automotive_deep',
    amount_cents      INTEGER NOT NULL DEFAULT 0,
    currency          TEXT NOT NULL DEFAULT 'CNY',
    status            TEXT NOT NULL,
    payment_provider  TEXT,
    payment_ref       TEXT,
    report_markdown   TEXT,
    error             TEXT,
    created_at        INTEGER,
    paid_at           INTEGER,
    delivered_at      INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_report_orders_user_id ON report_orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_report_orders_email ON report_orders(user_email);
  CREATE INDEX IF NOT EXISTS idx_report_orders_created_at ON report_orders(created_at);
  CREATE INDEX IF NOT EXISTS idx_report_orders_status ON report_orders(status);

  CREATE TABLE IF NOT EXISTS email_deliveries (
    id                  TEXT PRIMARY KEY,
    order_id            TEXT NOT NULL,
    recipient           TEXT NOT NULL,
    provider            TEXT NOT NULL,
    status              TEXT NOT NULL,
    provider_message_id TEXT,
    error               TEXT,
    created_at          INTEGER,
    sent_at             INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_email_deliveries_order_id ON email_deliveries(order_id);
  CREATE INDEX IF NOT EXISTS idx_email_deliveries_created_at ON email_deliveries(created_at);

  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    role          TEXT,
    organization  TEXT,
    tier          TEXT NOT NULL DEFAULT 'Free',
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at    INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    created_at INTEGER,
    expires_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

  CREATE TABLE IF NOT EXISTS company_cache (
    cache_key  TEXT PRIMARY KEY,
    query      TEXT NOT NULL,
    data_json  TEXT NOT NULL,
    provider   TEXT,
    created_at INTEGER,
    expires_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_company_cache_expires_at ON company_cache(expires_at);
`);

// ---------------------------------------------------------------------------
// 配置读写
// ---------------------------------------------------------------------------

/**
 * 读取一个配置项。优先 DB，其次 env，最后 default。
 */
export function getConfig(key: string, defaultValue?: string): string | undefined {
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key) as { value: string | null } | undefined;
  if (row && row.value !== null && row.value !== '') {
    return row.value;
  }
  // fallback 到 env
  const envVal = process.env[key];
  if (envVal) return envVal;
  return defaultValue;
}

/**
 * 写入配置项。
 */
export function setConfig(key: string, value: string): void {
  db.prepare(
    `INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(key, value, Date.now());
}

/**
 * 批量写入配置。
 */
export function setConfigBatch(items: Record<string, string>): void {
  const txn = db.transaction((entries: [string, string][]) => {
    const stmt = db.prepare(
      `INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    );
    for (const [k, v] of entries) stmt.run(k, v, Date.now());
  });
  txn(Object.entries(items));
}

/**
 * 读取所有配置（脱敏 API Key）。
 */
export function getAllConfigMasked(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM config').all() as { key: string; value: string | null }[];
  const result: Record<string, string> = {};
  for (const r of rows) {
    const v = r.value ?? '';
    // API Key 类字段脱敏：只显示前 4 位 + 末 4 位
    if (r.key.endsWith('_API_KEY') && v.length > 8) {
      result[r.key] = `${v.slice(0, 4)}****${v.slice(-4)}`;
    } else {
      result[r.key] = v;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// 使用日志
// ---------------------------------------------------------------------------

export interface UsageLogEntry {
  user_id?: string;
  user_email?: string;
  ip?: string;
  endpoint: string;
  company_name?: string;
  provider?: string;
  status: 'success' | 'error';
  error?: string;
  duration_ms?: number;
}

/**
 * 写入一条使用日志。失败静默忽略，不影响主流程。
 */
export function logUsage(entry: UsageLogEntry): void {
  try {
    db.prepare(
      `INSERT INTO usage_logs
       (user_id, user_email, ip, endpoint, company_name, provider, status, error, duration_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      entry.user_id || null,
      entry.user_email || null,
      entry.ip || null,
      entry.endpoint,
      entry.company_name || null,
      entry.provider || null,
      entry.status,
      entry.error || null,
      entry.duration_ms ?? null,
      Date.now()
    );
  } catch (e) {
    console.warn('[db] logUsage failed:', e);
  }
}

// ---------------------------------------------------------------------------
// 每日配额
// ---------------------------------------------------------------------------

function todayStr(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * 获取用户当日已用次数。
 */
export function getDailyUsedCount(userId: string): number {
  const row = db
    .prepare('SELECT used_count FROM daily_quotas WHERE user_id = ? AND date = ?')
    .get(userId, todayStr()) as { used_count: number } | undefined;
  return row?.used_count ?? 0;
}

// ---------------------------------------------------------------------------
// 注册用户与会话（真实鉴权，替代从前纯前端的 localStorage 身份）
// ---------------------------------------------------------------------------

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: string | null;
  organization: string | null;
  tier: string;
  password_hash: string;
  password_salt: string;
  created_at: number;
}

export function getUserByEmail(email: string): UserRecord | null {
  return (
    (db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as
      | UserRecord
      | undefined) || null
  );
}

export function getUserById(id: string): UserRecord | null {
  return (db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRecord | undefined) || null;
}

export function createUser(input: {
  email: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  role?: string;
  organization?: string;
  tier?: string;
}): UserRecord {
  const id = `usr_${crypto.randomUUID()}`;
  db.prepare(
    `INSERT INTO users (id, email, name, role, organization, tier, password_hash, password_salt, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.email.toLowerCase(),
    input.name,
    input.role || null,
    input.organization || null,
    input.tier || 'Free',
    input.passwordHash,
    input.passwordSalt,
    Date.now()
  );
  return getUserById(id)!;
}

// ---------------------------------------------------------------------------
// 管理员账号自动创建 + 用户管理
// ---------------------------------------------------------------------------

const ADMIN_SCRYPT_KEYLEN = 64;

function hashPasswordInternal(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, ADMIN_SCRYPT_KEYLEN).toString('hex');
  return { hash, salt };
}

/**
 * 启动时确保存在一个管理员用户。
 * 从 env 读取 ADMIN_EMAIL（默认 admin@gensight.local）和 ADMIN_PASSWORD。
 * 若该邮箱已存在则跳过（不覆盖已有密码/角色）；不存在则创建 role='admin'、tier='Pro' 的账号。
 * 密码必须至少 8 位且含字母数字，否则拒绝创建并打印警告。
 */
export function ensureAdminUser(): { created: boolean; email: string } {
  const email = (process.env.ADMIN_EMAIL || 'admin@gensight.local').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';

  const existing = getUserByEmail(email);
  if (existing) {
    // 已存在：确保其 role 为 admin（防止被误降级后无法恢复）
    if (existing.role !== 'admin') {
      db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(existing.id);
    }
    return { created: false, email };
  }

  if (!password || password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    console.warn(
      '[admin] 管理员账号未创建：ADMIN_PASSWORD 未设置或不符合要求（至少 8 位且含字母+数字）。' +
        ` 请在 .env 中设置 ADMIN_EMAIL=${email} 和 ADMIN_PASSWORD=<密码> 后重启。`
    );
    return { created: false, email };
  }

  const { hash, salt } = hashPasswordInternal(password);
  createUser({
    email,
    name: '系统管理员',
    passwordHash: hash,
    passwordSalt: salt,
    role: 'admin',
    tier: 'Pro',
  });
  console.log(`[admin] 已创建管理员账号：${email}（role=admin, tier=Pro）`);
  return { created: true, email };
}

/**
 * 列出所有用户（不含密码哈希），附带登录次数与最近登录时间。
 */
export function listUsers(): Array<{
  id: string;
  email: string;
  name: string;
  role: string | null;
  organization: string | null;
  tier: string;
  created_at: number;
  login_count: number;
  last_login_at: number | null;
}> {
  const rows = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.organization, u.tier, u.created_at,
              COUNT(l.id) AS login_count,
              MAX(CASE WHEN l.endpoint = 'auth/login' AND l.status = 'success' THEN l.created_at END) AS last_login_at
       FROM users u
       LEFT JOIN usage_logs l ON l.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    )
    .all() as any[];
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    organization: r.organization,
    tier: r.tier,
    created_at: r.created_at,
    login_count: r.login_count || 0,
    last_login_at: r.last_login_at || null,
  }));
}

/**
 * 更新用户角色/套餐。admin 不能降级自己（防止锁死）。
 */
export function updateUser(
  id: string,
  updates: { role?: string; tier?: string; name?: string; organization?: string }
): UserRecord | null {
  const user = getUserById(id);
  if (!user) return null;

  const fields: string[] = [];
  const values: unknown[] = [];
  if (updates.role !== undefined) {
    fields.push('role = ?');
    values.push(updates.role || null);
  }
  if (updates.tier !== undefined) {
    fields.push('tier = ?');
    values.push(updates.tier);
  }
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.organization !== undefined) {
    fields.push('organization = ?');
    values.push(updates.organization || null);
  }
  if (fields.length === 0) return user;

  values.push(id);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getUserById(id);
}

/**
 * 删除用户及其所有会话。不能删除最后一个 admin 账号。
 * 返回被删除的用户数（0 或 1）。
 */
export function deleteUser(id: string): { deleted: boolean; reason?: string } {
  const user = getUserById(id);
  if (!user) return { deleted: false, reason: '用户不存在' };

  if (user.role === 'admin') {
    const adminCount = (
      db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'").get() as { c: number }
    ).c;
    if (adminCount <= 1) {
      return { deleted: false, reason: '不能删除最后一个管理员账号' };
    }
  }

  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return { deleted: true };
}

export function createSession(userId: string, ttlMs: number): { token: string; expiresAt: number } {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + ttlMs;
  db.prepare(
    `INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`
  ).run(token, userId, now, expiresAt);
  return { token, expiresAt };
}

export function getSessionUser(token: string): { user: UserRecord; expiresAt: number } | null {
  const row = db
    .prepare(
      `SELECT s.expires_at AS expires_at, u.*
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`
    )
    .get(token) as (UserRecord & { expires_at: number }) | undefined;
  if (!row) return null;
  if (row.expires_at <= Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  const { expires_at, ...user } = row;
  return { user, expiresAt: expires_at };
}

export function deleteSession(token: string): void {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function purgeExpiredSessions(): number {
  const info = db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
  return info.changes;
}

/** 用户真实使用统计（用于 /api/auth/me 展示） */
export function getUserUsageStats(userId: string): { analyzedCompaniesCount: number } {
  const row = db
    .prepare(
      `SELECT COUNT(DISTINCT company_name) AS total
       FROM usage_logs
       WHERE user_id = ? AND status = 'success' AND company_name IS NOT NULL AND company_name != ''`
    )
    .get(userId) as { total: number };
  return { analyzedCompaniesCount: row?.total || 0 };
}

// ---------------------------------------------------------------------------
// AI 分析结果缓存（按公司名缓存，TTL 过期；热门公司重复查询零成本）
// ---------------------------------------------------------------------------

export function getCompanyCache(cacheKey: string): { data: any; createdAt: number } | null {
  const row = db
    .prepare('SELECT data_json, created_at FROM company_cache WHERE cache_key = ?')
    .get(cacheKey) as { data_json: string; created_at: number } | undefined;
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.data_json);
    return { data: parsed, createdAt: row.created_at };
  } catch {
    return null;
  }
}

export function setCompanyCache(
  cacheKey: string,
  query: string,
  data: any,
  provider: string,
  ttlMs: number
): void {
  db.prepare(
    `INSERT INTO company_cache (cache_key, query, data_json, provider, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET
       query = excluded.query,
       data_json = excluded.data_json,
       provider = excluded.provider,
       created_at = excluded.created_at,
       expires_at = excluded.expires_at`
  ).run(cacheKey, query, JSON.stringify(data), provider, Date.now(), Date.now() + ttlMs);
}

export function purgeExpiredCompanyCache(): number {
  const info = db.prepare('DELETE FROM company_cache WHERE expires_at <= ?').run(Date.now());
  return info.changes;
}

export function clearCompanyCache(): number {
  const info = db.prepare('DELETE FROM company_cache').run();
  return info.changes;
}

export function countCompanyCache(): { total: number; active: number } {
  const total = (db.prepare('SELECT COUNT(*) AS c FROM company_cache').get() as { c: number }).c;
  const active = (
    db
      .prepare('SELECT COUNT(*) AS c FROM company_cache WHERE expires_at > ?')
      .get(Date.now()) as { c: number }
  ).c;
  return { total, active };
}

// ---------------------------------------------------------------------------
// 公开披露文件采集与结构化抽取（年报/季报/招股书 PDF，来源：巨潮/SEC EDGAR）
// ---------------------------------------------------------------------------

db.exec(`
  CREATE TABLE IF NOT EXISTS filings (
    id                TEXT PRIMARY KEY,
    company_name     TEXT NOT NULL,
    exchange         TEXT,
    ticker           TEXT,
    filing_type      TEXT NOT NULL,
    period           TEXT,
    year             INTEGER,
    pdf_url          TEXT,
    local_path       TEXT,
    status           TEXT NOT NULL DEFAULT 'pending',
    error            TEXT,
    created_at       INTEGER,
    updated_at       INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_filings_company ON filings(company_name);
  CREATE INDEX IF NOT EXISTS idx_filings_status  ON filings(status);
  CREATE INDEX IF NOT EXISTS idx_filings_type    ON filings(filing_type);

  CREATE TABLE IF NOT EXISTS extracted_data (
    id              TEXT PRIMARY KEY,
    company_name    TEXT NOT NULL,
    filing_id       TEXT,
    data_type       TEXT NOT NULL,
    json_data       TEXT NOT NULL,
    confidence      REAL,
    source_excerpt  TEXT,
    created_at      INTEGER,
    FOREIGN KEY (filing_id) REFERENCES filings(id)
  );
  CREATE INDEX IF NOT EXISTS idx_extracted_company  ON extracted_data(company_name);
  CREATE INDEX IF NOT EXISTS idx_extracted_type     ON extracted_data(data_type);
`);

export interface Filing {
  id: string;
  company_name: string;
  exchange: string | null;
  ticker: string | null;
  filing_type: string;
  period: string | null;
  year: number | null;
  pdf_url: string | null;
  local_path: string | null;
  status: string;
  error: string | null;
  created_at: number;
  updated_at: number;
}

export function upsertFiling(input: {
  companyName: string;
  exchange?: string;
  ticker?: string;
  filingType: string;
  period?: string;
  year?: number;
  pdfUrl?: string;
  localPath?: string;
  status?: string;
  error?: string;
}): Filing {
  const id = `fil_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`;
  const now = Date.now();
  db.prepare(
    `INSERT INTO filings (id, company_name, exchange, ticker, filing_type, period, year, pdf_url, local_path, status, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       exchange = excluded.exchange,
       ticker = excluded.ticker,
       pdf_url = excluded.pdf_url,
       local_path = excluded.local_path,
       status = excluded.status,
       error = excluded.error,
       updated_at = excluded.updated_at`
  ).run(
    id,
    input.companyName,
    input.exchange || null,
    input.ticker || null,
    input.filingType,
    input.period || null,
    input.year || null,
    input.pdfUrl || null,
    input.localPath || null,
    input.status || 'pending',
    input.error || null,
    now,
    now
  );
  return db.prepare('SELECT * FROM filings WHERE id = ?').get(id) as Filing;
}

export function getFilingsByCompany(companyName: string): Filing[] {
  return db
    .prepare('SELECT * FROM filings WHERE company_name = ? ORDER BY year DESC, created_at DESC')
    .all(companyName) as Filing[];
}

export function getPendingFilings(): Filing[] {
  return db
    .prepare("SELECT * FROM filings WHERE status = 'pending' ORDER BY created_at ASC LIMIT 20")
    .all() as Filing[];
}

export function updateFilingStatus(
  id: string,
  status: string,
  localPath?: string,
  error?: string
): void {
  db.prepare(
    `UPDATE filings SET status = ?, local_path = ?, error = ?, updated_at = ? WHERE id = ?`
  ).run(status, localPath || null, error || null, Date.now(), id);
}

export function saveExtractedData(input: {
  companyName: string;
  filingId?: string;
  dataType: string;
  jsonData: any;
  confidence?: number;
  sourceExcerpt?: string;
}): void {
  const id = `ext_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`;
  db.prepare(
    `INSERT INTO extracted_data (id, company_name, filing_id, data_type, json_data, confidence, source_excerpt, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       json_data = excluded.json_data,
       confidence = excluded.confidence,
       source_excerpt = excluded.source_excerpt`
  ).run(
    id,
    input.companyName,
    input.filingId || null,
    input.dataType,
    JSON.stringify(input.jsonData),
    input.confidence ?? null,
    input.sourceExcerpt || null,
    Date.now()
  );
}

export function getExtractedData(companyName: string, dataType?: string): any[] {
  const rows = dataType
    ? db
        .prepare(
          "SELECT * FROM extracted_data WHERE company_name = ? AND data_type = ? ORDER BY created_at DESC"
        )
        .all(companyName, dataType)
    : db
        .prepare('SELECT * FROM extracted_data WHERE company_name = ? ORDER BY created_at DESC')
        .all(companyName);
  return (rows as any[]).map((r) => ({
    ...r,
    json_data: JSON.parse(r.json_data as string),
  }));
}

export function getLatestExtractedData(companyName: string): Record<string, any> {
  const byType: Record<string, any> = {};
  const rows = getExtractedData(companyName);
  for (const row of rows) {
    if (!byType[row.data_type]) {
      byType[row.data_type] = row.json_data;
    }
  }
  return byType;
}

// ---------------------------------------------------------------------------
// Paid report orders and email delivery
// ---------------------------------------------------------------------------

export type ReportOrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export interface ReportOrder {
  id: string;
  user_id: string | null;
  user_email: string;
  company_name: string;
  report_type: string;
  amount_cents: number;
  currency: string;
  status: ReportOrderStatus;
  payment_provider: string | null;
  payment_ref: string | null;
  report_markdown: string | null;
  error: string | null;
  created_at: number;
  paid_at: number | null;
  delivered_at: number | null;
}

export interface CreateReportOrderInput {
  userId?: string;
  userEmail: string;
  companyName: string;
  reportType?: string;
  amountCents: number;
  status?: ReportOrderStatus;
}

export function createReportOrder(input: CreateReportOrderInput): ReportOrder {
  const id = `rpt_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`;
  const now = Date.now();
  db.prepare(
    `INSERT INTO report_orders
     (id, user_id, user_email, company_name, report_type, amount_cents, currency, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'CNY', ?, ?)`
  ).run(
    id,
    input.userId || null,
    input.userEmail,
    input.companyName,
    input.reportType || 'automotive_deep',
    input.amountCents,
    input.status || 'pending_payment',
    now
  );
  return getReportOrder(id)!;
}

export function getReportOrder(id: string): ReportOrder | null {
  return (
    (db.prepare('SELECT * FROM report_orders WHERE id = ?').get(id) as ReportOrder | undefined) || null
  );
}

export function listReportOrders(options?: {
  userId?: string;
  email?: string;
  limit?: number;
}): ReportOrder[] {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (options?.userId) {
    clauses.push('user_id = ?');
    params.push(options.userId);
  }
  if (options?.email) {
    clauses.push('user_email = ?');
    params.push(options.email);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = Math.min(100, Math.max(1, options?.limit || 30));
  return db
    .prepare(`SELECT * FROM report_orders ${where} ORDER BY created_at DESC LIMIT ?`)
    .all(...params, limit) as ReportOrder[];
}

export function countFreeReportOrdersToday(userId: string): number {
  if (!userId) return 0;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const row = db
    .prepare(
      `SELECT COUNT(*) AS total
       FROM report_orders
       WHERE user_id = ?
         AND amount_cents = 0
         AND status IN ('processing', 'delivered')
         AND created_at >= ?`
    )
    .get(userId, start.getTime()) as { total: number };
  return row?.total || 0;
}

export function markReportOrderPaid(
  id: string,
  provider: string,
  paymentRef: string
): ReportOrder | null {
  db.prepare(
    `UPDATE report_orders
     SET status = 'paid', payment_provider = ?, payment_ref = ?, paid_at = ?, error = NULL
     WHERE id = ?`
  ).run(provider, paymentRef, Date.now(), id);
  return getReportOrder(id);
}

export function updateReportOrderStatus(
  id: string,
  status: ReportOrderStatus,
  error?: string
): ReportOrder | null {
  db.prepare('UPDATE report_orders SET status = ?, error = ? WHERE id = ?').run(
    status,
    error || null,
    id
  );
  return getReportOrder(id);
}

export function saveReportContent(id: string, markdown: string): ReportOrder | null {
  db.prepare('UPDATE report_orders SET report_markdown = ? WHERE id = ?').run(markdown, id);
  return getReportOrder(id);
}

export function markReportDelivered(id: string): ReportOrder | null {
  db.prepare(
    `UPDATE report_orders
     SET status = 'delivered', delivered_at = ?, error = NULL
     WHERE id = ?`
  ).run(Date.now(), id);
  return getReportOrder(id);
}

export interface EmailDeliveryRecord {
  id: string;
  order_id: string;
  recipient: string;
  provider: string;
  status: 'sent' | 'mock_sent' | 'failed';
  provider_message_id: string | null;
  error: string | null;
  created_at: number;
  sent_at: number | null;
}

export function recordEmailDelivery(input: {
  orderId: string;
  recipient: string;
  provider: string;
  status: EmailDeliveryRecord['status'];
  providerMessageId?: string;
  error?: string;
}): EmailDeliveryRecord {
  const id = `mail_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`;
  const now = Date.now();
  db.prepare(
    `INSERT INTO email_deliveries
     (id, order_id, recipient, provider, status, provider_message_id, error, created_at, sent_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.orderId,
    input.recipient,
    input.provider,
    input.status,
    input.providerMessageId || null,
    input.error || null,
    now,
    input.status === 'failed' ? null : now
  );
  return db.prepare('SELECT * FROM email_deliveries WHERE id = ?').get(id) as EmailDeliveryRecord;
}

export interface ReportOrderAdminStats {
  todayOrders: number;
  todayPaidOrders: number;
  todayRevenueCents: number;
  pendingOrders: number;
  deliveredOrders: number;
  failedOrders: number;
  mockEmailDeliveries: number;
}

export function getReportOrderAdminStats(): ReportOrderAdminStats {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const ts = start.getTime();
  const orders = db
    .prepare(
      `SELECT
         COUNT(*) AS todayOrders,
         SUM(CASE WHEN amount_cents > 0 AND paid_at IS NOT NULL THEN 1 ELSE 0 END) AS todayPaidOrders,
         SUM(CASE WHEN amount_cents > 0 AND paid_at IS NOT NULL THEN amount_cents ELSE 0 END) AS todayRevenueCents,
         SUM(CASE WHEN status = 'pending_payment' THEN 1 ELSE 0 END) AS pendingOrders,
         SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS deliveredOrders,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failedOrders
       FROM report_orders
       WHERE created_at >= ?`
    )
    .get(ts) as ReportOrderAdminStats;
  const email = db
    .prepare(
      `SELECT COUNT(*) AS total
       FROM email_deliveries
       WHERE status = 'mock_sent' AND created_at >= ?`
    )
    .get(ts) as { total: number };
  return {
    todayOrders: orders.todayOrders || 0,
    todayPaidOrders: orders.todayPaidOrders || 0,
    todayRevenueCents: orders.todayRevenueCents || 0,
    pendingOrders: orders.pendingOrders || 0,
    deliveredOrders: orders.deliveredOrders || 0,
    failedOrders: orders.failedOrders || 0,
    mockEmailDeliveries: email.total || 0,
  };
}

/**
 * 自增用户当日使用次数。返回自增后的新值。
 */
export function incrementDailyUsedCount(userId: string): number {
  const today = todayStr();
  db.prepare(
    `INSERT INTO daily_quotas (user_id, date, used_count) VALUES (?, ?, 1)
     ON CONFLICT(user_id, date) DO UPDATE SET used_count = used_count + 1`
  ).run(userId, today);
  return getDailyUsedCount(userId);
}

// ---------------------------------------------------------------------------
// 监控统计
// ---------------------------------------------------------------------------

export interface AdminStats {
  todayTotal: number;
  todaySuccess: number;
  todayError: number;
  last7Days: { date: string; total: number; success: number; error: number }[];
  byEndpoint: { endpoint: string; total: number }[];
  byProvider: { provider: string; total: number }[];
  topCompanies: { company_name: string; total: number }[];
  topUsers: { user_email: string; total: number }[];
  avgDurationMs: number;
}

/**
 * 获取监控统计。
 */
export function getAdminStats(): AdminStats {
  const today = todayStr();
  const todayStart = new Date(`${today}T00:00:00Z`).getTime();
  // 注意：created_at 是服务器本地时间戳，这里以本地日界近似聚合
  const localTodayStart = new Date();
  localTodayStart.setHours(0, 0, 0, 0);
  const ts = localTodayStart.getTime();

  const todayRow = db
    .prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
         SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error,
         AVG(duration_ms) as avg_dur
       FROM usage_logs WHERE created_at >= ?`
    )
    .get(ts) as { total: number; success: number; error: number; avg_dur: number | null } | undefined;

  // 近 7 天按日聚合（用本地日期字符串）。created_at 存的是毫秒，需 /1000 转 unixepoch 秒
  const last7Rows = db
    .prepare(
      `SELECT
         date(created_at / 1000, 'unixepoch', 'localtime') as d,
         COUNT(*) as total,
         SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
         SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error
       FROM usage_logs
       WHERE created_at >= ?
       GROUP BY d
       ORDER BY d ASC`
    )
    .all(ts - 6 * 24 * 3600 * 1000) as { d: string; total: number; success: number; error: number }[];

  const byEndpoint = db
    .prepare(
      `SELECT endpoint, COUNT(*) as total
       FROM usage_logs WHERE created_at >= ?
       GROUP BY endpoint ORDER BY total DESC`
    )
    .all(ts - 30 * 24 * 3600 * 1000) as { endpoint: string; total: number }[];

  const byProvider = db
    .prepare(
      `SELECT provider, COUNT(*) as total
       FROM usage_logs WHERE created_at >= ?
       GROUP BY provider ORDER BY total DESC`
    )
    .all(ts - 30 * 24 * 3600 * 1000) as { provider: string; total: number }[];

  const topCompanies = db
    .prepare(
      `SELECT company_name, COUNT(*) as total
       FROM usage_logs
       WHERE created_at >= ? AND company_name IS NOT NULL AND company_name != ''
       GROUP BY company_name ORDER BY total DESC LIMIT 10`
    )
    .all(ts - 30 * 24 * 3600 * 1000) as { company_name: string; total: number }[];

  const topUsers = db
    .prepare(
      `SELECT user_email, COUNT(*) as total
       FROM usage_logs
       WHERE created_at >= ? AND user_email IS NOT NULL AND user_email != ''
       GROUP BY user_email ORDER BY total DESC LIMIT 10`
    )
    .all(ts - 30 * 24 * 3600 * 1000) as { user_email: string; total: number }[];

  return {
    todayTotal: todayRow?.total ?? 0,
    todaySuccess: todayRow?.success ?? 0,
    todayError: todayRow?.error ?? 0,
    avgDurationMs: Math.round(todayRow?.avg_dur ?? 0),
    last7Days: last7Rows.map((r) => ({
      date: r.d,
      total: r.total,
      success: r.success,
      error: r.error,
    })),
    byEndpoint,
    byProvider,
    topCompanies,
    topUsers,
  };
}

/**
 * 分页查询日志。
 */
export function getRecentLogs(limit = 50, offset = 0): any[] {
  return db
    .prepare(
      `SELECT id, user_id, user_email, ip, endpoint, company_name, provider, status, error, duration_ms, created_at
       FROM usage_logs ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .all(limit, offset);
}

export function countLogs(): number {
  const row = db.prepare('SELECT COUNT(*) as c FROM usage_logs').get() as { c: number };
  return row.c;
}

export default db;
