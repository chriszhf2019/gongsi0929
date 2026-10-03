/**
 * 后台管理 + 限流 + 日志中间件
 *
 * - quotaLimiter: 每人每日 N 次免费深度分析（按 user_id 或 IP）
 * - mountAdminRoutes: 挂载 /api/admin/* 路由（配置、监控、日志）
 * - logAiCall: 在 AI 端点内部调用，记录每次请求的使用日志
 *
 * Admin 鉴权：简单密码模式，前端通过 x-admin-password 请求头传递，
 * 后端用 crypto.timingSafeEqual 比对 ADMIN_PASSWORD（env）。
 */
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import {
  getConfig,
  setConfig,
  setConfigBatch,
  getAllConfigMasked,
  logUsage,
  getDailyUsedCount,
  incrementDailyUsedCount,
  getAdminStats,
  getRecentLogs,
  countLogs,
  getReportOrderAdminStats,
  listReportOrders,
  clearCompanyCache,
  countCompanyCache,
  purgeExpiredCompanyCache,
  listUsers,
  updateUser,
  deleteUser,
} from './db';
import { getAvailableProviders, resetProviderClients, generateText } from './server-ai';
import { getSessionUser, SessionUserInfo } from './server-auth';
import {
  crawlCompanyFilings,
  processFiling,
  getCompanyFilings,
  listPendingFilings,
} from './server-filing';
import { extractFromText, processAllPendingFilings } from './server-extract';

// ---------------------------------------------------------------------------
// Admin 鉴权
// ---------------------------------------------------------------------------

/**
 * 管理员密码：只从 env ADMIN_PASSWORD 读取。
 * 安全策略：
 * - 不再提供硬编码默认密码（旧默认值已从代码库移除）
 * - 若 env 未设置，启动后首次使用时生成一次性随机密码并打印到控制台，
 *   供运维临时登录后尽快在 .env 中固定配置
 */
let generatedAdminPassword: string | null = null;

function getAdminPassword(): string | null {
  const fromEnv = (process.env.ADMIN_PASSWORD || '').trim();
  if (fromEnv) return fromEnv;
  if (generatedAdminPassword === null) {
    generatedAdminPassword = crypto.randomBytes(12).toString('hex');
    console.warn(
      '[admin] ADMIN_PASSWORD 未设置，已生成一次性随机管理员密码：',
      generatedAdminPassword,
      '\n[admin] 请在 .env 中设置 ADMIN_PASSWORD 以固定密码（此随机密码重启后会变化）。'
    );
  }
  return generatedAdminPassword;
}

/**
 * 通过 timing-safe 比对密码，避免计时侧信道。
 */
function isAdminPassword(candidate: string): boolean {
  const expected = getAdminPassword();
  if (!expected) return false;
  const a = Buffer.from(candidate || '');
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Admin 鉴权中间件。
 * 通过条件：x-admin-password 头匹配，或当前 session 用户 role='admin'。
 */
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: '管理员密码错误或未提供' });
    return;
  }
  next();
}

/**
 * 判断请求是否携带有效管理员凭据。
 * 两种途径：
 * 1. x-admin-password 请求头匹配 ADMIN_PASSWORD（env）
 * 2. 当前 session 用户的 role === 'admin'（管理员通过正常登录流程登录）
 */
export function isAdminRequest(req: Request): boolean {
  // 途径 1：管理员密码头
  const pwd = (req.headers['x-admin-password'] as string) || '';
  if (isAdminPassword(pwd)) return true;
  // 途径 2：session 中的 admin 角色用户
  const sessionUser = getSessionUser(req);
  return !!sessionUser && sessionUser.role === 'admin';
}

// ---------------------------------------------------------------------------
// 每日配额限流
// ---------------------------------------------------------------------------

/**
 * 从请求中提取用户身份。
 * 安全策略：
 * - 优先使用服务端 session（HttpOnly Cookie，不可伪造）
 * - 未登录时回退到 IP 识别
 * - 不再信任请求体中的 user 字段（旧版本可被任意伪造绕过配额）
 */
export function extractUser(req: Request): {
  userId: string;
  userEmail: string;
  ip: string;
  sessionUser: SessionUserInfo | null;
} {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket?.remoteAddress ||
    'unknown';
  const sessionUser = getSessionUser(req);
  return {
    userId: sessionUser ? sessionUser.id : `ip:${ip}`,
    userEmail: sessionUser ? sessionUser.email : '',
    ip,
    sessionUser,
  };
}

/**
 * 每日配额限流中间件。
 * 按 user_id（或 IP）限制每日调用次数，次数从 DB 配置 DAILY_FREE_LIMIT 读取（默认 2）。
 *
 * 同时保留对 IP 的频率限制（短窗口内），防止刷接口。
 */
const ipRecentCalls = new Map<string, number[]>(); // ip -> [timestamps]
const IP_WINDOW_MS = 60 * 1000;
const IP_MAX_IN_WINDOW = 10;

export function quotaLimiter(req: Request, res: Response, next: NextFunction): void {
  const { userId, ip } = extractUser(req);

  // 0. 管理员（role=admin 或 x-admin-password）不受每日配额限制
  if (isAdminRequest(req)) {
    next();
    return;
  }

  // 1. IP 短窗口限流（防止刷）
  const now = Date.now();
  const recent = (ipRecentCalls.get(ip) || []).filter((t) => now - t < IP_WINDOW_MS);
  if (recent.length >= IP_MAX_IN_WINDOW) {
    res.status(429).json({ error: '请求过于频繁，请稍后再试', retryAfter: 60 });
    return;
  }
  recent.push(now);
  ipRecentCalls.set(ip, recent);

  // 2. 每日配额
  const limitStr = getConfig('DAILY_FREE_LIMIT', '2');
  const limit = Math.max(0, parseInt(limitStr, 10) || 2);
  const used = getDailyUsedCount(userId);
  if (used >= limit) {
    res.setHeader('X-Quota-Limit', String(limit));
    res.setHeader('X-Quota-Remaining', '0');
    res.status(429).json({
      error: `今日免费分析次数已用完（${limit} 次/天）`,
      quotaLimit: limit,
      quotaUsed: used,
    });
    return;
  }

  res.setHeader('X-Quota-Limit', String(limit));
  res.setHeader('X-Quota-Remaining', String(limit - used));
  next();
}

// 定时清理 IP 短窗口缓存（避免内存泄漏）
setInterval(() => {
  const now = Date.now();
  for (const [ip, ts] of ipRecentCalls.entries()) {
    const recent = ts.filter((t) => now - t < IP_WINDOW_MS);
    if (recent.length === 0) {
      ipRecentCalls.delete(ip);
    } else {
      ipRecentCalls.set(ip, recent);
    }
  }
}, 5 * 60 * 1000).unref();

// ---------------------------------------------------------------------------
// 使用日志辅助
// ---------------------------------------------------------------------------

export interface AiCallContext {
  endpoint: string;
  companyName?: string;
  provider?: string;
}

/**
 * 在 AI 端点内部调用：自增配额 + 记录成功日志。
 */
export function recordAiSuccess(
  req: Request,
  ctx: AiCallContext,
  durationMs: number
): void {
  try {
    const { userId, userEmail, ip } = extractUser(req);
    incrementDailyUsedCount(userId);
    logUsage({
      user_id: userId,
      user_email: userEmail,
      ip,
      endpoint: ctx.endpoint,
      company_name: ctx.companyName,
      provider: ctx.provider,
      status: 'success',
      duration_ms: durationMs,
    });
  } catch (e) {
    console.warn('[middleware] recordAiSuccess failed:', e);
  }
}

/**
 * 在 AI 端点 catch 块中调用：记录失败日志（不计入配额，避免失败扣次数）。
 */
export function recordAiError(
  req: Request,
  ctx: AiCallContext,
  error: any,
  durationMs: number
): void {
  try {
    const { userId, userEmail, ip } = extractUser(req);
    logUsage({
      user_id: userId,
      user_email: userEmail,
      ip,
      endpoint: ctx.endpoint,
      company_name: ctx.companyName,
      provider: ctx.provider,
      status: 'error',
      error: error?.message || String(error),
      duration_ms: durationMs,
    });
  } catch (e) {
    console.warn('[middleware] recordAiError failed:', e);
  }
}

// ---------------------------------------------------------------------------
// Admin 路由
// ---------------------------------------------------------------------------

import { Express } from 'express';

export function mountAdminRoutes(app: Express): void {
  // 登录校验（前端进入后台时调用一次以确认密码）
  app.post('/api/admin/login', (req: Request, res: Response) => {
    const pwd = (req.body && req.body.password) || '';
    if (isAdminPassword(pwd)) {
      res.json({ ok: true });
    } else {
      res.status(401).json({ error: '管理员密码错误' });
    }
  });

  // 读取所有配置（脱敏 API Key）
  app.get('/api/admin/config', requireAdmin, (_req: Request, res: Response) => {
    const masked = getAllConfigMasked();
    // 同时返回默认值提示
    res.json({
      configs: masked,
      defaults: {
        AI_PROVIDER: 'gemini',
        DAILY_FREE_LIMIT: '2',
        DAILY_FREE_BASIC_LIMIT: '10',
        DAILY_FREE_DEEP_LIMIT: '1',
        REPORT_PRICE_CNY: '8',
        AUTO_INDUSTRY_REFRESH_DAYS: '1',
        PAYMENT_MODE: 'mock',
        EMAIL_FROM: '',
        GEMINI_MODEL: 'gemini-3.7-flash',
        DEEPSEEK_BASE_URL: 'https://api.deepseek.com',
        DEEPSEEK_MODEL: 'deepseek-chat',
        QWEN_BASE_URL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        QWEN_MODEL: 'qwen-plus',
      },
      envFallbacks: {
        AI_PROVIDER: process.env.AI_PROVIDER || '',
        DAILY_FREE_LIMIT: process.env.DAILY_FREE_LIMIT || '',
        DAILY_FREE_BASIC_LIMIT: process.env.DAILY_FREE_BASIC_LIMIT || '',
        DAILY_FREE_DEEP_LIMIT: process.env.DAILY_FREE_DEEP_LIMIT || '',
        REPORT_PRICE_CNY: process.env.REPORT_PRICE_CNY || '',
        AUTO_INDUSTRY_REFRESH_DAYS: process.env.AUTO_INDUSTRY_REFRESH_DAYS || '',
        PAYMENT_MODE: process.env.PAYMENT_MODE || '',
        EMAIL_FROM: process.env.EMAIL_FROM || '',
        RESEND_API_KEY: process.env.RESEND_API_KEY ? '(env 已设置)' : '',
        GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '(env 已设置)' : '',
        DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ? '(env 已设置)' : '',
        QWEN_API_KEY: process.env.QWEN_API_KEY ? '(env 已设置)' : '',
      },
    });
  });

  // 批量更新配置
  app.put('/api/admin/config', requireAdmin, (req: Request, res: Response) => {
    const { configs } = req.body || {};
    if (!configs || typeof configs !== 'object') {
      res.status(400).json({ error: 'configs is required' });
      return;
    }

    // 白名单：只允许更新这些 key
    const ALLOWED_KEYS = new Set([
      'AI_PROVIDER',
      'DAILY_FREE_LIMIT',
      'DAILY_FREE_BASIC_LIMIT',
      'DAILY_FREE_DEEP_LIMIT',
      'REPORT_PRICE_CNY',
      'AUTO_INDUSTRY_REFRESH_DAYS',
      'PAYMENT_MODE',
      'EMAIL_FROM',
      'RESEND_API_KEY',
      'GEMINI_API_KEY',
      'GEMINI_MODEL',
      'GEMINI_BASE_URL',
      'DEEPSEEK_API_KEY',
      'DEEPSEEK_MODEL',
      'DEEPSEEK_BASE_URL',
      'QWEN_API_KEY',
      'QWEN_MODEL',
      'QWEN_BASE_URL',
    ]);

    const toUpdate: Record<string, string> = {};
    for (const [k, v] of Object.entries(configs)) {
      if (ALLOWED_KEYS.has(k)) {
        // 空字符串视为清空
        toUpdate[k] = String(v ?? '');
      }
    }

    if (Object.keys(toUpdate).length === 0) {
      res.status(400).json({ error: '没有可更新的配置项' });
      return;
    }

    setConfigBatch(toUpdate);

    // 重置 provider 客户端缓存，让新配置立刻生效
    resetProviderClients();

    res.json({ ok: true, updated: Object.keys(toUpdate) });
  });

  // 统计数据
  app.get('/api/admin/stats', requireAdmin, (_req: Request, res: Response) => {
    const stats = getAdminStats();
    res.json(stats);
  });

  // 日志列表（分页）
  app.get('/api/admin/logs', requireAdmin, (req: Request, res: Response) => {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
    const offset = Math.max(0, parseInt(req.query.offset as string, 10) || 0);
    const logs = getRecentLogs(limit, offset);
    const total = countLogs();
    res.json({ logs, total, limit, offset });
  });

  // 当前可用 provider 状态（已配置情况）
  app.get('/api/admin/providers', requireAdmin, (_req: Request, res: Response) => {
    res.json({ providers: getAvailableProviders() });
  });

  app.get('/api/admin/report-orders', requireAdmin, (req: Request, res: Response) => {
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
    res.json({
      stats: getReportOrderAdminStats(),
      orders: listReportOrders({ limit }),
    });
  });

  // AI 分析结果缓存：查看与清理（prompt/schema 调整后需要强制失效旧缓存）
  app.get('/api/admin/cache', requireAdmin, (_req: Request, res: Response) => {
    purgeExpiredCompanyCache();
    res.json(countCompanyCache());
  });

  app.delete('/api/admin/cache', requireAdmin, (_req: Request, res: Response) => {
    const cleared = clearCompanyCache();
    res.json({ ok: true, cleared });
  });

  // 测试 provider 可用性：用一个极简 prompt 调用一次
  app.post('/api/admin/test-provider', requireAdmin, async (req: Request, res: Response) => {
    const { provider } = req.body || {};
    if (!provider || !['gemini', 'deepseek', 'qwen'].includes(provider)) {
      res.status(400).json({ error: 'provider must be gemini/deepseek/qwen' });
      return;
    }
    const start = Date.now();
    try {
      const answer = await generateText(
        '请只回复一个字："好"。',
        provider
      );
      res.json({
        ok: true,
        provider,
        responsePreview: (answer || '').slice(0, 100),
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      res.json({
        ok: false,
        provider,
        error: e.message || String(e),
        durationMs: Date.now() - start,
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 公开披露文件采集管理
  // ---------------------------------------------------------------------------

  // 触发公司披露文件搜索（写入 pending filings）
  app.post('/api/admin/filings/search', requireAdmin, async (req: Request, res: Response) => {
    const { companyName, stockCode, exchange, cik } = req.body || {};
    if (!companyName) {
      return res.status(400).json({ error: 'companyName is required' });
    }
    try {
      const filings = await crawlCompanyFilings(companyName, {
        stockCode,
        exchange: exchange as 'szse' | 'sse' | 'hkex' | undefined,
        cik,
      });
      return res.json({ ok: true, filings, count: filings.length });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // 查看公司已采集的 filing 列表
  app.get('/api/admin/filings', requireAdmin, (req: Request, res: Response) => {
    const companyName = String(req.query.companyName || '');
    if (!companyName) {
      return res.status(400).json({ error: 'companyName is required' });
    }
    const filings = getCompanyFilings(companyName);
    return res.json({ filings });
  });

  // 手动触发处理单个 pending filing（下载 + 文本抽取，不做 LLM 抽取）
  app.post('/api/admin/filings/:id/process', requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const text = await processFiling(id);
      if (!text) {
        return res.status(422).json({ error: 'Filing not found or processing failed' });
      }
      return res.json({ ok: true, textLength: text.length, textPreview: text.slice(0, 200) });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // 手动触发对已抽取文本的 LLM 结构化提取
  app.post('/api/admin/filings/:id/extract', requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { companyName, filingType } = req.body || {};
    try {
      // 先确保文本已抽取
      const text = await processFiling(id);
      if (!text) {
        return res.status(422).json({ error: 'Filing text not available' });
      }
      const results = await extractFromText(
        companyName || 'Unknown',
        text,
        filingType || 'annual_report',
        id
      );
      return res.json({ ok: true, results });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // 批量处理所有 pending filings（下载 + 抽取全流程）
  app.post('/api/admin/filings/process-all', requireAdmin, async (_req: Request, res: Response) => {
    try {
      await processAllPendingFilings();
      return res.json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // ---------------------------------------------------------------------------
  // 用户管理（管理员可查看、修改角色/套餐、删除用户）
  // ---------------------------------------------------------------------------

  // 列出所有用户（含登录次数、最近登录时间）
  app.get('/api/admin/users', requireAdmin, (_req: Request, res: Response) => {
    try {
      const users = listUsers();
      res.json({ users });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 修改用户角色/套餐/姓名/组织
  app.patch('/api/admin/users/:id', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const { role, tier, name, organization } = req.body || {};

    // 校验 role 取值
    if (role !== undefined && !['admin', 'user', null, ''].includes(role)) {
      return res.status(400).json({ error: 'role 只能是 admin / user / 空' });
    }
    // 校验 tier 取值
    if (tier !== undefined && !['Free', 'Pro', 'Enterprise'].includes(tier)) {
      return res.status(400).json({ error: 'tier 只能是 Free / Pro / Enterprise' });
    }

    // 防止管理员通过此接口把自己降级（避免锁死后台）
    const sessionUser = getSessionUser(req);
    if (sessionUser && sessionUser.id === id && role === 'user') {
      return res.status(400).json({ error: '不能将自己降级为普通用户' });
    }

    const updates: any = {};
    if (role !== undefined) updates.role = role || null;
    if (tier !== undefined) updates.tier = tier;
    if (name !== undefined) updates.name = name;
    if (organization !== undefined) updates.organization = organization;

    const updated = updateUser(id, updates);
    if (!updated) return res.status(404).json({ error: '用户不存在' });

    const { password_hash, password_salt, ...safe } = updated as any;
    res.json({ user: safe });
  });

  // 删除用户（连同其会话）
  app.delete('/api/admin/users/:id', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    // 不能删除自己
    const sessionUser = getSessionUser(req);
    if (sessionUser && sessionUser.id === id) {
      return res.status(400).json({ error: '不能删除当前登录的管理员账号' });
    }
    const result = deleteUser(id);
    if (!result.deleted) {
      return res.status(400).json({ error: result.reason || '删除失败' });
    }
    res.json({ ok: true });
  });
}
