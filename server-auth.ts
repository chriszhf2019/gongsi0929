/**
 * 服务端真实鉴权（替代从前纯前端 localStorage 的可伪造身份）
 *
 * 设计：
 * - 密码哈希：Node 内置 crypto.scrypt（每用户独立随机 salt），无额外依赖
 * - 会话：随机 32 字节 token 存 SQLite sessions 表，HttpOnly Cookie 携带
 * - Cookie 属性：HttpOnly（防 JS 读取）+ SameSite=Lax（防 CSRF 基本场景）
 * - 所有 AI / 订单端点通过 getSessionUser(req) 识别真实身份，不再信任请求体
 */
import { Request, Response } from 'express';
import crypto from 'crypto';
import { Express } from 'express';
import {
  createUser,
  createSession,
  deleteSession,
  getSessionUser as dbGetSessionUser,
  getUserByEmail,
  getUserUsageStats,
  logUsage,
  purgeExpiredSessions,
  UserRecord,
} from './db';

export const SESSION_COOKIE = 'gs_session';
export const SESSION_TTL_MS = 30 * 24 * 3600 * 1000; // 30 天
const SCRYPT_KEYLEN = 64;

// ---------------------------------------------------------------------------
// 密码哈希（scrypt + 随机 salt）
// ---------------------------------------------------------------------------

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  try {
    const actual = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
    const expected = Buffer.from(expectedHash, 'hex');
    if (actual.length !== expected.length) return false;
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function isValidPassword(password: string): boolean {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    /[a-zA-Z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

export function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------------------------------------------------------------------------
// Cookie / 会话工具
// ---------------------------------------------------------------------------

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

function clientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

export interface SessionUserInfo {
  id: string;
  email: string;
  name: string;
  role: string | null;
  organization: string | null;
  tier: string;
  createdAt: number;
}

function toSessionUserInfo(user: UserRecord): SessionUserInfo {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organization: user.organization,
    tier: user.tier,
    createdAt: user.created_at,
  };
}

/**
 * 从请求 Cookie 中解析当前登录用户。未登录返回 null。
 * 所有需要识别用户身份的后端逻辑统一走这里（不再信任请求体）。
 */
export function getSessionUser(req: Request): SessionUserInfo | null {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;
  const session = dbGetSessionUser(token);
  if (!session) return null;
  return toSessionUserInfo(session.user);
}

function setSessionCookie(res: Response, token: string, maxAgeMs: number): void {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(maxAgeMs / 1000)}`
  );
}

function clearSessionCookie(res: Response): void {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

// ---------------------------------------------------------------------------
// 鉴权路由
// ---------------------------------------------------------------------------

export function mountAuthRoutes(app: Express): void {
  // 注册
  app.post('/api/auth/register', (req: Request, res: Response) => {
    try {
      const name = String(req.body?.name || '').trim();
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const organization = String(req.body?.organization || '').trim() || undefined;
      const role = String(req.body?.role || '').trim() || undefined;

      if (!name) return res.status(400).json({ error: '姓名不能为空' });
      if (!isValidEmailFormat(email)) return res.status(400).json({ error: '邮箱格式不正确' });
      if (!isValidPassword(password)) {
        return res.status(400).json({ error: '密码至少 8 位，且需同时包含字母与数字' });
      }
      if (getUserByEmail(email)) {
        return res.status(409).json({ error: '该邮箱已注册，请直接登录' });
      }

      const { hash, salt } = hashPassword(password);
      const user = createUser({ email, name, passwordHash: hash, passwordSalt: salt, role, organization });
      const session = createSession(user.id, SESSION_TTL_MS);
      setSessionCookie(res, session.token, SESSION_TTL_MS);

      return res.status(201).json({
        user: toSessionUserInfo(user),
        stats: getUserUsageStats(user.id),
      });
    } catch (error: any) {
      console.error('[auth] register failed:', error);
      return res.status(500).json({ error: '注册失败，请稍后再试' });
    }
  });

  // 登录
  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const ip = clientIp(req);

      if (!email || !password) {
        logUsage({ user_email: email, ip, endpoint: 'auth/login', status: 'error', error: 'missing credentials' });
        return res.status(400).json({ error: '请输入邮箱与密码' });
      }

      const user = getUserByEmail(email);
      // 统一报错文案，避免账号枚举
      if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
        logUsage({ user_email: email, ip, endpoint: 'auth/login', status: 'error', error: 'invalid credentials' });
        return res.status(401).json({ error: '邮箱或密码不正确' });
      }

      const session = createSession(user.id, SESSION_TTL_MS);
      setSessionCookie(res, session.token, SESSION_TTL_MS);
      logUsage({ user_id: user.id, user_email: user.email, ip, endpoint: 'auth/login', status: 'success' });

      return res.json({
        user: toSessionUserInfo(user),
        stats: getUserUsageStats(user.id),
      });
    } catch (error: any) {
      console.error('[auth] login failed:', error);
      return res.status(500).json({ error: '登录失败，请稍后再试' });
    }
  });

  // 退出登录
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const token = parseCookies(req)[SESSION_COOKIE];
    const sessionUser = getSessionUser(req);
    if (token) deleteSession(token);
    clearSessionCookie(res);
    if (sessionUser) {
      logUsage({
        user_id: sessionUser.id,
        user_email: sessionUser.email,
        ip: clientIp(req),
        endpoint: 'auth/logout',
        status: 'success',
      });
    }
    res.json({ ok: true });
  });

  // 当前会话信息（前端启动时恢复登录态）
  app.get('/api/auth/me', (req: Request, res: Response) => {
    const user = getSessionUser(req);
    if (!user) return res.json({ user: null });
    res.json({ user, stats: getUserUsageStats(user.id) });
  });

  // 周期清理过期会话（避免表无限增长）
  setInterval(() => {
    try {
      purgeExpiredSessions();
    } catch (e) {
      console.warn('[auth] session purge failed:', e);
    }
  }, 60 * 60 * 1000).unref();
}
