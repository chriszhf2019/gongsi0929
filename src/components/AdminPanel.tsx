import React, { useEffect, useState, useCallback } from 'react';
import {
  Lock,
  Settings,
  BarChart3,
  Database,
  FileText,
  Save,
  TestTube2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Users,
  Building2,
  Clock,
  AlertCircle,
  Power,
  Mail,
  ReceiptText,
  Send,
  Search,
  Download,
  Play,
  Sparkles,
} from 'lucide-react';

type Provider = 'gemini' | 'deepseek' | 'qwen';

const PROVIDER_META: Record<Provider, { label: string; color: string; bg: string; ring: string }> = {
  gemini: { label: 'Gemini', color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-300' },
  deepseek: { label: 'DeepSeek', color: 'text-purple-600', bg: 'bg-purple-50', ring: 'ring-purple-300' },
  qwen: { label: 'Qwen', color: 'text-orange-600', bg: 'bg-orange-50', ring: 'ring-orange-300' },
};

interface AdminStats {
  todayTotal: number;
  todaySuccess: number;
  todayError: number;
  avgDurationMs: number;
  last7Days: { date: string; total: number; success: number; error: number }[];
  byEndpoint: { endpoint: string; total: number }[];
  byProvider: { provider: string; total: number }[];
  topCompanies: { company_name: string; total: number }[];
  topUsers: { user_email: string; total: number }[];
}

interface AdminLog {
  id: number;
  user_id: string | null;
  user_email: string | null;
  ip: string | null;
  endpoint: string;
  company_name: string | null;
  provider: string | null;
  status: string;
  error: string | null;
  duration_ms: number | null;
  created_at: number;
}

type Tab = 'config' | 'stats' | 'orders' | 'logs' | 'filings' | 'users';

const SESSION_KEY = 'gensight_admin_pwd';

export const AdminPanel: React.FC = () => {
  const [authed, setAuthed] = useState<boolean>(() => !!sessionStorage.getItem(SESSION_KEY));
  const [activeTab, setActiveTab] = useState<Tab>('config');

  // 检测 sessionStorage 跨标签同步（同源其他标签登录后此处也生效）
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) {
        setAuthed(!!e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // 若当前 session 用户是 admin（role='admin'），直接通过，无需再输管理员密码
  useEffect(() => {
    if (authed) return;
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.role === 'admin') {
          sessionStorage.setItem(SESSION_KEY, '__session_admin__');
          setAuthed(true);
        }
      })
      .catch(() => {});
  }, [authed]);

  if (!authed) {
    return <LoginGate onAuthed={() => setAuthed(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#FAFBF9] text-[#1F3437]">
      <header className="border-b border-[#E2E6E2] bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xs bg-[#1F3437] text-white font-serif font-bold flex items-center justify-center">
              鉴
            </div>
            <div>
              <div className="font-serif text-lg font-bold">鉴源 · GenSight 后台管理</div>
              <div className="text-xs text-[#627578]">AI Provider 配置 / 用户使用监控 / 调用日志</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/"
              className="text-xs text-[#627578] hover:text-[#1F3437] border border-[#E2E6E2] rounded-xs px-3 py-1.5 hover:bg-[#F6F7F5]"
            >
              返回主应用
            </a>
            <button
              onClick={() => {
                sessionStorage.removeItem(SESSION_KEY);
                setAuthed(false);
              }}
              className="text-xs text-[#A84A3E] border border-[#E2E6E2] rounded-xs px-3 py-1.5 hover:bg-[#FBEFEE]"
            >
              退出登录
            </button>
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-6 flex gap-1 -mb-px">
          {([
            { id: 'config' as const, label: '配置', icon: Settings },
            { id: 'users' as const, label: '用户管理', icon: Users },
            { id: 'stats' as const, label: '使用监控', icon: BarChart3 },
            { id: 'orders' as const, label: '报告订单', icon: ReceiptText },
            { id: 'logs' as const, label: '调用日志', icon: FileText },
            { id: 'filings' as const, label: '文件采集', icon: Database },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-[#1F3437] text-[#1F3437]'
                  : 'border-transparent text-[#627578] hover:text-[#1F3437]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'config' && <ConfigPanel />}
        {activeTab === 'users' && <UsersPanel />}
        {activeTab === 'stats' && <StatsPanel />}
        {activeTab === 'orders' && <OrdersPanel />}
        {activeTab === 'logs' && <LogsPanel />}
        {activeTab === 'filings' && <FilingsPanel />}
      </main>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 登录页
// ---------------------------------------------------------------------------

const LoginGate: React.FC<{ onAuthed: () => void }> = ({ onAuthed }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('请输入管理员密码');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '密码错误');
      }
      sessionStorage.setItem(SESSION_KEY, password);
      onAuthed();
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFBF9] flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white border border-[#E2E6E2] rounded-xs p-6 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-xs bg-[#1F3437] text-white font-serif font-bold flex items-center justify-center">
            鉴
          </div>
          <div>
            <div className="font-serif font-bold text-base">鉴源 · 后台登录</div>
            <div className="text-xs text-[#627578]">仅管理员可访问</div>
          </div>
        </div>

        <label className="block text-xs font-semibold text-[#1F3437] mb-1.5">
          管理员密码
        </label>
        <div className="relative">
          <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8C9E9F]" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            placeholder="ADMIN_PASSWORD"
            className="w-full rounded-xs border border-[#D4D9D4] bg-[#FAFBF9] pl-8 pr-3 py-2 text-sm font-mono focus:outline-none focus:border-[#3E6F73]"
          />
        </div>
        {error && (
          <div className="mt-2 text-xs text-[#A84A3E] flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-xs bg-[#1F3437] hover:bg-[#3E6F73] disabled:opacity-50 text-white font-serif font-medium py-2 text-sm transition-colors"
        >
          {loading ? '校验中...' : '进入后台'}
        </button>
        <div className="mt-3 text-[10px] text-[#8C9E9F] text-center">
          密码对应服务端 ADMIN_PASSWORD 环境变量
        </div>
      </form>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 配置面板
// ---------------------------------------------------------------------------

const ConfigPanel: React.FC = () => {
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [defaults, setDefaults] = useState<Record<string, string>>({});
  const [envFallbacks, setEnvFallbacks] = useState<Record<string, string>>({});
  const [providers, setProviders] = useState<{ provider: Provider; configured: boolean; model: string }[]>([]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [testing, setTesting] = useState<Provider | null>(null);
  const [testResult, setTestResult] = useState<Record<Provider, { ok: boolean; msg: string } | null>>(
    { gemini: null, deepseek: null, qwen: null }
  );

  const pwd = sessionStorage.getItem(SESSION_KEY) || '';

  const load = useCallback(async () => {
    try {
      const [cfgRes, pRes] = await Promise.all([
        fetch('/api/admin/config', { headers: { 'x-admin-password': pwd } }),
        fetch('/api/admin/providers', { headers: { 'x-admin-password': pwd } }),
      ]);
      if (!cfgRes.ok) throw new Error('读取配置失败');
      const cfg = await cfgRes.json();
      setConfigs(cfg.configs || {});
      setDefaults(cfg.defaults || {});
      setEnvFallbacks(cfg.envFallbacks || {});
      if (pRes.ok) {
        const p = await pRes.json();
        setProviders(p.providers || []);
      }
    } catch (e: any) {
      setErrorMsg(e.message || '加载失败');
    }
  }, [pwd]);

  useEffect(() => {
    load();
  }, [load]);

  const activeProvider = (editValues.AI_PROVIDER ?? configs.AI_PROVIDER ?? defaults.AI_PROVIDER ?? 'gemini') as Provider;

  const handleSave = async () => {
    setSaving(true);
    setSavedMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': pwd },
        body: JSON.stringify({ configs: editValues }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || '保存失败');
      }
      setEditValues({});
      await load();
      setSavedMsg('保存成功，新配置立即生效');
      setTimeout(() => setSavedMsg(null), 3000);
    } catch (e: any) {
      setErrorMsg(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (provider: Provider) => {
    setTesting(provider);
    setTestResult((prev) => ({ ...prev, [provider]: null }));
    try {
      const res = await fetch('/api/admin/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': pwd },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      setTestResult((prev) => ({
        ...prev,
        [provider]: {
          ok: data.ok,
          msg: data.ok
            ? `✓ 成功 (${data.durationMs}ms)`
            : `✗ 失败：${data.error || '未知错误'}`,
        },
      }));
    } catch (e: any) {
      setTestResult((prev) => ({
        ...prev,
        [provider]: { ok: false, msg: `✗ 失败：${e.message}` },
      }));
    } finally {
      setTesting(null);
    }
  };

  // 渲染单个字段
  const renderField = (key: string, label: string, opts?: { mono?: boolean; placeholder?: string; type?: string }) => {
    const dbVal = configs[key] ?? '';
    const envVal = envFallbacks[key] ?? '';
    const edited = editValues[key];
    const isEdited = edited !== undefined;
    const display = isEdited ? edited : dbVal;
    const isApiKey = key.endsWith('_API_KEY');
    return (
      <div key={key}>
        <label className="block text-xs font-semibold text-[#1F3437] mb-1">
          {label}
          {isApiKey && dbVal && <span className="ml-2 text-[10px] text-[#8C9E9F]">已保存（脱敏）</span>}
          {envVal && !dbVal && <span className="ml-2 text-[10px] text-[#3E6F73]">env: {envVal}</span>}
        </label>
        <input
          type={opts?.type || (isApiKey ? 'password' : 'text')}
          value={display ?? ''}
          placeholder={opts?.placeholder || defaults[key] || ''}
          onChange={(e) => setEditValues((prev) => ({ ...prev, [key]: e.target.value }))}
          className={`w-full rounded-xs border px-3 py-1.5 text-sm ${opts?.mono ? 'font-mono' : 'font-serif'} focus:outline-none transition-colors ${
            isEdited
              ? 'border-[#3E6F73] bg-[#F6F7F5]'
              : 'border-[#D4D9D4] bg-[#FAFBF9]'
          } focus:border-[#3E6F73]`}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Active Provider 选择 */}
      <section className="bg-white border border-[#E2E6E2] rounded-xs p-5">
        <div className="flex items-center gap-2 mb-4">
          <Power className="h-4 w-4 text-[#1F3437]" />
          <h2 className="font-serif font-bold text-sm">当前生效的 AI Provider</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(['gemini', 'deepseek', 'qwen'] as Provider[]).map((p) => {
            const meta = PROVIDER_META[p];
            const info = providers.find((x) => x.provider === p);
            const isActive = activeProvider === p;
            const isConfigured = info?.configured ?? false;
            return (
              <button
                key={p}
                onClick={() => setEditValues((prev) => ({ ...prev, AI_PROVIDER: p }))}
                className={`relative text-left rounded-xs border-2 p-3 transition-all ${
                  isActive
                    ? `border-[#1F3437] ${meta.bg} ring-2 ${meta.ring}`
                    : 'border-[#E2E6E2] hover:border-[#3E6F73]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`font-serif font-bold text-sm ${meta.color}`}>
                    {meta.label}
                  </div>
                  {isActive && (
                    <CheckCircle2 className="h-4 w-4 text-[#1F3437]" />
                  )}
                </div>
                <div className="text-[10px] text-[#627578] mt-1">
                  {info?.model || defaults[`${p.toUpperCase()}_MODEL`] || '-'}
                </div>
                <div className={`text-[10px] mt-0.5 ${isConfigured ? 'text-[#3E6F73]' : 'text-[#A84A3E]'}`}>
                  {isConfigured ? '✓ 已配置' : '✗ 未配置'}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Provider 配置 */}
      <section className="bg-white border border-[#E2E6E2] rounded-xs p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-4 w-4 text-[#1F3437]" />
          <h2 className="font-serif font-bold text-sm">Provider 详细配置</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Gemini */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-blue-600 border-b border-blue-100 pb-1">
              Gemini (Google)
            </div>
            {renderField('GEMINI_API_KEY', 'API Key', { mono: true })}
            {renderField('GEMINI_MODEL', 'Model', { placeholder: 'gemini-3.7-flash' })}
            {renderField('GEMINI_BASE_URL', 'Base URL（可选）')}
            <button
              onClick={() => handleTest('gemini')}
              disabled={testing === 'gemini'}
              className="flex items-center gap-1 text-xs rounded-xs border border-blue-300 text-blue-600 px-2.5 py-1 hover:bg-blue-50 disabled:opacity-50"
            >
              <TestTube2 className="h-3 w-3" />
              {testing === 'gemini' ? '测试中...' : '测试连接'}
            </button>
            {testResult.gemini && (
              <div className={`text-xs ${testResult.gemini.ok ? 'text-[#3E6F73]' : 'text-[#A84A3E]'}`}>
                {testResult.gemini.msg}
              </div>
            )}
          </div>

          {/* DeepSeek */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-purple-600 border-b border-purple-100 pb-1">
              DeepSeek (OpenAI 兼容)
            </div>
            {renderField('DEEPSEEK_API_KEY', 'API Key', { mono: true })}
            {renderField('DEEPSEEK_MODEL', 'Model', { placeholder: 'deepseek-chat' })}
            {renderField('DEEPSEEK_BASE_URL', 'Base URL', { placeholder: 'https://api.deepseek.com' })}
            <button
              onClick={() => handleTest('deepseek')}
              disabled={testing === 'deepseek'}
              className="flex items-center gap-1 text-xs rounded-xs border border-purple-300 text-purple-600 px-2.5 py-1 hover:bg-purple-50 disabled:opacity-50"
            >
              <TestTube2 className="h-3 w-3" />
              {testing === 'deepseek' ? '测试中...' : '测试连接'}
            </button>
            {testResult.deepseek && (
              <div className={`text-xs ${testResult.deepseek.ok ? 'text-[#3E6F73]' : 'text-[#A84A3E]'}`}>
                {testResult.deepseek.msg}
              </div>
            )}
          </div>

          {/* Qwen */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-orange-600 border-b border-orange-100 pb-1">
              Qwen / DashScope
            </div>
            {renderField('QWEN_API_KEY', 'API Key', { mono: true })}
            {renderField('QWEN_MODEL', 'Model', { placeholder: 'qwen-plus' })}
            {renderField('QWEN_BASE_URL', 'Base URL', { placeholder: 'https://dashscope.aliyuncs.com/compatible-mode/v1' })}
            <button
              onClick={() => handleTest('qwen')}
              disabled={testing === 'qwen'}
              className="flex items-center gap-1 text-xs rounded-xs border border-orange-300 text-orange-600 px-2.5 py-1 hover:bg-orange-50 disabled:opacity-50"
            >
              <TestTube2 className="h-3 w-3" />
              {testing === 'qwen' ? '测试中...' : '测试连接'}
            </button>
            {testResult.qwen && (
              <div className={`text-xs ${testResult.qwen.ok ? 'text-[#3E6F73]' : 'text-[#A84A3E]'}`}>
                {testResult.qwen.msg}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 限流配置 */}
      <section className="bg-white border border-[#E2E6E2] rounded-xs p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-[#1F3437]" />
          <h2 className="font-serif font-bold text-sm">用户配额</h2>
        </div>
        <div className="max-w-xs">
          {renderField('DAILY_FREE_LIMIT', '每人每日免费分析次数', { placeholder: '2' })}
        </div>
        <div className="mt-2 text-[10px] text-[#8C9E9F]">
          超过此次数后返回 429 提示「今日免费分析次数已用完」。仅深度分析端点（analyze-company / compare / stress-test / copilot）计配额。
        </div>
      </section>

      {/* 汽车行业与报告服务配置 */}
      <section className="bg-white border border-[#E2E6E2] rounded-xs p-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-4 w-4 text-[#1F3437]" />
          <h2 className="font-serif font-bold text-sm">汽车行业与报告服务</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-3">
            <div className="text-xs font-bold text-[#1F3437] border-b border-[#E2E6E2] pb-1">
              用户额度
            </div>
            {renderField('DAILY_FREE_BASIC_LIMIT', '每日免费基础分析次数', { placeholder: '10' })}
            {renderField('DAILY_FREE_DEEP_LIMIT', '每日免费深度报告份数', { placeholder: '1' })}
          </div>
          <div className="space-y-3">
            <div className="text-xs font-bold text-[#1F3437] border-b border-[#E2E6E2] pb-1">
              报告与数据
            </div>
            {renderField('REPORT_PRICE_CNY', '单份深度报告价格（元）', { placeholder: '8' })}
            {renderField('AUTO_INDUSTRY_REFRESH_DAYS', '汽车产业数据刷新周期（天）', { placeholder: '1' })}
            {renderField('PAYMENT_MODE', '支付模式 mock / production', { placeholder: 'mock' })}
          </div>
          <div className="space-y-3">
            <div className="text-xs font-bold text-[#1F3437] border-b border-[#E2E6E2] pb-1">
              邮件交付
            </div>
            {renderField('EMAIL_FROM', '发件邮箱', { placeholder: 'reports@example.com' })}
            {renderField('RESEND_API_KEY', '邮件服务 API Key', { mono: true })}
          </div>
        </div>
        <div className="mt-3 rounded-xs border border-[#EADFCB] bg-[#FAF8F3] px-3 py-2 text-[10px] text-[#7D612E]">
          当前版本完成界面与配置入口。正式发送报告前需要配置邮件域名、支付回调和服务端订单状态机。
        </div>
      </section>

      {/* 保存按钮 */}
      <div className="sticky bottom-4 flex items-center justify-end gap-3 bg-white border border-[#E2E6E2] rounded-xs p-3 shadow-md">
        {errorMsg && (
          <span className="text-xs text-[#A84A3E] flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5" />
            {errorMsg}
          </span>
        )}
        {savedMsg && (
          <span className="text-xs text-[#3E6F73] flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {savedMsg}
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving || Object.keys(editValues).length === 0}
          className="flex items-center gap-1.5 rounded-xs bg-[#1F3437] hover:bg-[#3E6F73] disabled:opacity-40 text-white px-4 py-2 text-xs font-serif font-medium transition-colors"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? '保存中...' : `保存配置${Object.keys(editValues).length > 0 ? ` (${Object.keys(editValues).length} 项)` : ''}`}
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 监控面板
// ---------------------------------------------------------------------------

const StatsPanel: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pwd = sessionStorage.getItem(SESSION_KEY) || '';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/stats', { headers: { 'x-admin-password': pwd } });
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setStats(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [pwd]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !stats) return <div className="text-sm text-[#627578]">加载中...</div>;
  if (error) return (
    <div className="text-sm text-[#A84A3E]">
      {error} <button onClick={load} className="underline ml-2">重试</button>
    </div>
  );
  if (!stats) return null;

  const max7d = Math.max(1, ...stats.last7Days.map((d) => d.total));

  return (
    <div className="space-y-6">
      {/* 顶部指标卡 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={TrendingUp} label="今日总数" value={stats.todayTotal} color="text-[#1F3437]" />
        <StatCard icon={CheckCircle2} label="今日成功" value={stats.todaySuccess} color="text-[#3E6F73]" />
        <StatCard icon={XCircle} label="今日失败" value={stats.todayError} color="text-[#A84A3E]" />
        <StatCard icon={Clock} label="平均耗时" value={`${stats.avgDurationMs}ms`} color="text-[#9C6E28]" />
      </div>

      {/* 近 7 天趋势柱状图 */}
      <section className="bg-white border border-[#E2E6E2] rounded-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#1F3437]" />
            <h2 className="font-serif font-bold text-sm">近 7 天调用趋势</h2>
          </div>
          <button onClick={load} className="text-xs text-[#627578] hover:text-[#1F3437] flex items-center gap-1">
            <RefreshCw className="h-3 w-3" /> 刷新
          </button>
        </div>
        {stats.last7Days.length === 0 ? (
          <div className="text-xs text-[#8C9E9F] py-8 text-center">暂无数据</div>
        ) : (
          <div className="flex items-end gap-2 h-40 border-b border-[#E2E6E2] pb-1">
            {stats.last7Days.map((d) => {
              const successH = (d.success / max7d) * 100;
              const errorH = (d.error / max7d) * 100;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex-1 flex flex-col justify-end w-full max-w-[40px] mx-auto">
                    <div className="bg-[#A84A3E] rounded-t-xs" style={{ height: `${errorH}%`, minHeight: d.error > 0 ? '2px' : 0 }} />
                    <div className="bg-[#3E6F73]" style={{ height: `${successH}%`, minHeight: d.success > 0 ? '2px' : 0 }} />
                  </div>
                  <div className="text-[10px] text-[#627578] font-mono">{d.date.slice(5)}</div>
                  <div className="text-[10px] text-[#1F3437] font-semibold">{d.total}</div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-2 flex items-center gap-3 text-[10px] text-[#627578]">
          <div className="flex items-center gap-1"><span className="h-2 w-2 bg-[#3E6F73] inline-block rounded-2xs" />成功</div>
          <div className="flex items-center gap-1"><span className="h-2 w-2 bg-[#A84A3E] inline-block rounded-2xs" />失败</div>
        </div>
      </section>

      {/* 两列：按端点 / 按 Provider */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RankList
          title="按端点（近 30 天）"
          icon={FileText}
          items={stats.byEndpoint.map((x) => ({ name: x.endpoint, total: x.total }))}
          totalLabel="次"
        />
        <RankList
          title="按 Provider（近 30 天）"
          icon={Power}
          items={stats.byProvider.map((x) => ({ name: x.provider || '(未知)', total: x.total }))}
          totalLabel="次"
        />
      </div>

      {/* 两列：热门公司 / 活跃用户 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RankList
          title="热门公司 Top 10（近 30 天）"
          icon={Building2}
          items={stats.topCompanies.map((x) => ({ name: x.company_name, total: x.total }))}
          totalLabel="次"
          emptyHint="暂无公司分析记录"
        />
        <RankList
          title="活跃用户 Top 10（近 30 天）"
          icon={Users}
          items={stats.topUsers.map((x) => ({ name: x.user_email, total: x.total }))}
          totalLabel="次"
          emptyHint="暂无用户记录"
        />
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: any; label: string; value: number | string; color: string }> = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white border border-[#E2E6E2] rounded-xs p-4">
    <div className="flex items-center justify-between">
      <span className="text-xs text-[#627578]">{label}</span>
      <Icon className={`h-4 w-4 ${color}`} />
    </div>
    <div className={`mt-2 text-2xl font-serif font-bold ${color}`}>{value}</div>
  </div>
);

const RankList: React.FC<{ title: string; icon: any; items: { name: string; total: number }[]; totalLabel?: string; emptyHint?: string }> = ({ title, icon: Icon, items, totalLabel = '', emptyHint }) => {
  const max = Math.max(1, ...items.map((x) => x.total));
  return (
    <section className="bg-white border border-[#E2E6E2] rounded-xs p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-[#1F3437]" />
        <h2 className="font-serif font-bold text-sm">{title}</h2>
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-[#8C9E9F] py-4 text-center">{emptyHint || '暂无数据'}</div>
      ) : (
        <div className="space-y-1.5">
          {items.map((x, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="text-[#8C9E9F] font-mono w-5 text-right">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[#1F3437] truncate font-medium">{x.name}</span>
                  <span className="text-[#627578] font-mono">{x.total} {totalLabel}</span>
                </div>
                <div className="h-1 bg-[#F0F2EF] rounded-2xs overflow-hidden">
                  <div className="h-full bg-[#3E6F73]" style={{ width: `${(x.total / max) * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

// ---------------------------------------------------------------------------
// 报告订单
// ---------------------------------------------------------------------------

interface ReportOrderAdmin {
  id: string;
  user_id: string | null;
  user_email: string;
  company_name: string;
  report_type: string;
  amount_cents: number;
  currency: string;
  status: string;
  payment_provider: string | null;
  error: string | null;
  created_at: number;
  delivered_at: number | null;
}

interface ReportOrderStats {
  todayOrders: number;
  todayPaidOrders: number;
  todayRevenueCents: number;
  pendingOrders: number;
  deliveredOrders: number;
  failedOrders: number;
  mockEmailDeliveries: number;
}

const OrdersPanel: React.FC = () => {
  const [stats, setStats] = useState<ReportOrderStats | null>(null);
  const [orders, setOrders] = useState<ReportOrderAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const pwd = sessionStorage.getItem(SESSION_KEY) || '';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/report-orders?limit=100', {
        headers: { 'x-admin-password': pwd },
      });
      if (!res.ok) throw new Error('加载报告订单失败');
      const data = await res.json();
      setStats(data.stats || null);
      setOrders(data.orders || []);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [pwd]);

  useEffect(() => {
    load();
  }, [load]);

  const resend = async (orderId: string) => {
    setSendingId(orderId);
    try {
      const res = await fetch(`/api/reports/orders/${orderId}/resend`, { method: 'POST' });
      if (!res.ok) throw new Error('重发失败');
      await load();
    } catch (e: any) {
      setError(e.message || '重发失败');
    } finally {
      setSendingId(null);
    }
  };

  const formatTime = (timestamp: number) =>
    new Date(timestamp).toLocaleString('zh-CN', { hour12: false });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ReceiptText className="h-4 w-4 text-[#1F3437]" />
          <h2 className="font-serif font-bold text-sm">报告订单与邮件交付</h2>
        </div>
        <button onClick={load} className="text-xs text-[#627578] hover:text-[#1F3437] flex items-center gap-1">
          <RefreshCw className="h-3 w-3" /> 刷新
        </button>
      </div>

      {error && <div className="text-xs text-[#A84A3E]">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={ReceiptText} label="今日订单" value={stats?.todayOrders || 0} color="text-[#1F3437]" />
        <StatCard icon={TrendingUp} label="今日收入" value={`¥${((stats?.todayRevenueCents || 0) / 100).toFixed(2)}`} color="text-[#2E6B56]" />
        <StatCard icon={Mail} label="待支付" value={stats?.pendingOrders || 0} color="text-[#9C6E28]" />
        <StatCard icon={XCircle} label="失败订单" value={stats?.failedOrders || 0} color="text-[#A84A3E]" />
      </div>

      <div className="bg-white border border-[#E2E6E2] rounded-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead className="bg-[#FAFBF9] border-b border-[#E2E6E2] text-left text-[#627578]">
              <tr>
                <th className="px-3 py-2.5">订单</th>
                <th className="px-3 py-2.5">用户</th>
                <th className="px-3 py-2.5">公司</th>
                <th className="px-3 py-2.5">金额</th>
                <th className="px-3 py-2.5">状态</th>
                <th className="px-3 py-2.5">交付时间</th>
                <th className="px-3 py-2.5">操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-[#8C9E9F]">
                    {loading ? '加载中...' : '暂无报告订单'}
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b border-[#F0F2EF] last:border-b-0 hover:bg-[#FAFBF9]">
                    <td className="px-3 py-2.5 font-mono text-[10px] text-[#627578]">{order.id}</td>
                    <td className="px-3 py-2.5">{order.user_email}</td>
                    <td className="px-3 py-2.5 font-medium text-[#1F3437]">{order.company_name}</td>
                    <td className="px-3 py-2.5 font-mono">
                      {order.amount_cents === 0 ? '免费' : `¥${(order.amount_cents / 100).toFixed(2)}`}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-xs border px-1.5 py-0.5 text-[10px] ${
                        order.status === 'delivered'
                          ? 'border-[#2E6B56]/30 bg-[#2E6B56]/10 text-[#2E6B56]'
                          : order.status === 'failed'
                          ? 'border-[#A84A3E]/30 bg-[#A84A3E]/10 text-[#A84A3E]'
                          : 'border-[#9C6E28]/30 bg-[#9C6E28]/10 text-[#9C6E28]'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[#627578]">
                      {order.delivered_at ? formatTime(order.delivered_at) : '-'}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => resend(order.id)}
                        disabled={sendingId === order.id || order.status !== 'delivered'}
                        className="inline-flex items-center gap-1 rounded-xs border border-[#E2E6E2] px-2 py-1 text-[10px] text-[#1F3437] hover:bg-[#F6F7F5] disabled:opacity-40"
                      >
                        <Send className="h-3 w-3" />
                        {sendingId === order.id ? '发送中' : '重发邮件'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 日志面板
// ---------------------------------------------------------------------------

const LogsPanel: React.FC = () => {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 50;
  const pwd = sessionStorage.getItem(SESSION_KEY) || '';

  const load = useCallback(async (offset = 0, append = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/logs?limit=${pageSize}&offset=${offset}`, {
        headers: { 'x-admin-password': pwd },
      });
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setLogs((prev) => (append ? [...prev, ...data.logs] : data.logs));
      setTotal(data.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [pwd]);

  useEffect(() => {
    load(0, false);
  }, [load]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#1F3437]" />
          <h2 className="font-serif font-bold text-sm">调用日志</h2>
          <span className="text-xs text-[#8C9E9F]">共 {total} 条</span>
        </div>
        <button onClick={() => load(0, false)} className="text-xs text-[#627578] hover:text-[#1F3437] flex items-center gap-1">
          <RefreshCw className="h-3 w-3" /> 刷新
        </button>
      </div>

      {error && <div className="text-sm text-[#A84A3E]">{error}</div>}

      <div className="bg-white border border-[#E2E6E2] rounded-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#FAFBF9] border-b border-[#E2E6E2]">
              <tr className="text-left text-[#627578] font-semibold">
                <th className="px-3 py-2">时间</th>
                <th className="px-3 py-2">用户</th>
                <th className="px-3 py-2">端点</th>
                <th className="px-3 py-2">公司</th>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">状态</th>
                <th className="px-3 py-2">耗时</th>
                <th className="px-3 py-2">错误</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-[#8C9E9F]">暂无日志</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="border-b border-[#F0F2EF] hover:bg-[#FAFBF9]">
                  <td className="px-3 py-2 font-mono text-[#627578] whitespace-nowrap">{formatTime(log.created_at)}</td>
                  <td className="px-3 py-2 truncate max-w-[160px]" title={log.user_email || log.user_id || ''}>
                    {log.user_email || log.user_id || <span className="text-[#8C9E9F]">-</span>}
                  </td>
                  <td className="px-3 py-2 font-mono">{log.endpoint}</td>
                  <td className="px-3 py-2 truncate max-w-[180px]" title={log.company_name || ''}>
                    {log.company_name || <span className="text-[#8C9E9F]">-</span>}
                  </td>
                  <td className="px-3 py-2">{log.provider || <span className="text-[#8C9E9F]">-</span>}</td>
                  <td className="px-3 py-2">
                    {log.status === 'success' ? (
                      <span className="inline-flex items-center gap-1 text-[#3E6F73]">
                        <CheckCircle2 className="h-3 w-3" /> 成功
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[#A84A3E]">
                        <XCircle className="h-3 w-3" /> 失败
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-[#627578]">
                    {log.duration_ms ? `${log.duration_ms}ms` : <span className="text-[#8C9E9F]">-</span>}
                  </td>
                  <td className="px-3 py-2 text-[#A84A3E] truncate max-w-[200px]" title={log.error || ''}>
                    {log.error || <span className="text-[#8C9E9F]">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length < total && (
          <div className="p-3 text-center border-t border-[#E2E6E2]">
            <button
              onClick={() => load(logs.length, true)}
              disabled={loading}
              className="text-xs text-[#1F3437] border border-[#E2E6E2] rounded-xs px-3 py-1.5 hover:bg-[#F6F7F5] disabled:opacity-50"
            >
              {loading ? '加载中...' : `加载更多（剩 ${total - logs.length} 条）`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 文件采集面板
// ---------------------------------------------------------------------------

interface Filing {
  id: string;
  company_name: string;
  exchange: string | null;
  ticker: string | null;
  filing_type: string;
  period: string | null;
  year: number | null;
  pdf_url: string | null;
  status: string;
  error: string | null;
  created_at: number;
  updated_at: number;
}

const EXCHANGE_OPTIONS = [
  { value: '', label: '美股（自动反查 CIK）' },
  { value: 'szse', label: 'A股 · 深交所' },
  { value: 'sse', label: 'A股 · 上交所' },
  { value: 'hkex', label: '港股 · 港交所' },
];

const FILING_TYPE_LABEL: Record<string, string> = {
  annual_report: '年报',
  quarterly_report: '季报',
  interim_report: '中期报告',
  year_report: '年度报告',
  prospectus: '招股书',
  announcement: '公告',
  '10-K': '10-K 年报',
  '10-Q': '10-Q 季报',
  '20-F': '20-F 年报',
  '6-K': '6-K 报告',
  '8-K': '8-K 公告',
};

const FILING_STATUS_LABEL: Record<string, string> = {
  pending: '待处理',
  downloading: '下载中',
  downloaded: '已下载',
  parsed: '已解析',
  error: '失败',
};

const FilingsPanel: React.FC = () => {
  const [companyName, setCompanyName] = useState('');
  const [stockCode, setStockCode] = useState('');
  const [exchange, setExchange] = useState('');
  const [cik, setCik] = useState('');
  const [filings, setFilings] = useState<Filing[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [processAllBusy, setProcessAllBusy] = useState(false);
  const pwd = sessionStorage.getItem(SESSION_KEY) || '';

  const load = useCallback(async () => {
    if (!companyName.trim()) {
      setFilings([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/filings?companyName=${encodeURIComponent(companyName.trim())}`, {
        headers: { 'x-admin-password': pwd },
      });
      if (!res.ok) throw new Error('加载 filings 失败');
      const data = await res.json();
      setFilings(data.filings || []);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [companyName, pwd]);

  const triggerSearch = async () => {
    if (!companyName.trim()) {
      setError('请输入公司名称');
      return;
    }
    setSearching(true);
    setError(null);
    setMessage(null);
    try {
      const body: Record<string, string> = { companyName: companyName.trim() };
      if (exchange) body.exchange = exchange;
      if (stockCode.trim()) body.stockCode = stockCode.trim();
      if (cik.trim()) body.cik = cik.trim();
      const res = await fetch('/api/admin/filings/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': pwd },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '采集失败');
      const count = typeof data.count === 'number' ? data.count : (data.filings?.length ?? 0);
      setMessage(`采集完成，新增 ${count} 条记录`);
      await load();
    } catch (e: any) {
      setError(e.message || '采集失败');
    } finally {
      setSearching(false);
    }
  };

  const processFiling = async (id: string) => {
    setProcessingId(id);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/filings/${id}/process`, {
        method: 'POST',
        headers: { 'x-admin-password': pwd },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '处理失败');
      setMessage(`已抽取文本 ${data.textLength} 字符`);
      await load();
    } catch (e: any) {
      setError(e.message || '处理失败');
    } finally {
      setProcessingId(null);
    }
  };

  const extractFiling = async (filing: Filing) => {
    setExtractingId(filing.id);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/filings/${filing.id}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': pwd },
        body: JSON.stringify({ companyName: filing.company_name, filingType: filing.filing_type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '抽取失败');
      const total = data.results?.length ?? 0;
      const ok = data.results?.filter((r: any) => r.success).length ?? 0;
      setMessage(`LLM 结构化抽取完成（${ok}/${total} 类成功）`);
    } catch (e: any) {
      setError(e.message || '抽取失败');
    } finally {
      setExtractingId(null);
    }
  };

  const triggerProcessAll = async () => {
    setProcessAllBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/filings/process-all', {
        method: 'POST',
        headers: { 'x-admin-password': pwd },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '批量处理失败');
      setMessage('批量处理已触发（下载 + 抽取全流程）');
    } catch (e: any) {
      setError(e.message || '批量处理失败');
    } finally {
      setProcessAllBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-[#1F3437]" />
        <h2 className="font-serif font-bold text-sm">公开披露文件采集</h2>
        <span className="text-xs text-[#8C9E9F]">巨潮(A股) · SEC EDGAR(美股) · 港交所披露易(港股)</span>
      </div>

      {/* 采集表单 */}
      <div className="bg-white border border-[#E2E6E2] rounded-xs p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] text-[#627578] mb-1">公司名称 *</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="如：比亚迪股份"
              className="w-full rounded-xs border border-[#D4D9D4] bg-[#FAFBF9] px-3 py-2 text-xs focus:outline-none focus:border-[#3E6F73]"
            />
          </div>
          <div>
            <label className="block text-[10px] text-[#627578] mb-1">交易所</label>
            <select
              value={exchange}
              onChange={(e) => setExchange(e.target.value)}
              className="w-full rounded-xs border border-[#D4D9D4] bg-[#FAFBF9] px-3 py-2 text-xs focus:outline-none focus:border-[#3E6F73]"
            >
              {EXCHANGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-[#627578] mb-1">股票代码（A股/港股）</label>
            <input
              value={stockCode}
              onChange={(e) => setStockCode(e.target.value)}
              placeholder="A股 002594 / 港股 01211"
              className="w-full rounded-xs border border-[#D4D9D4] bg-[#FAFBF9] px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#3E6F73]"
            />
          </div>
          <div>
            <label className="block text-[10px] text-[#627578] mb-1">CIK（美股可选）</label>
            <input
              value={cik}
              onChange={(e) => setCik(e.target.value)}
              placeholder="10 位数字"
              className="w-full rounded-xs border border-[#D4D9D4] bg-[#FAFBF9] px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#3E6F73]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={triggerSearch}
            disabled={searching}
            className="inline-flex items-center gap-1.5 rounded-xs bg-[#1F3437] px-3 py-2 text-xs font-bold text-white hover:bg-[#3E6F73] disabled:opacity-50"
          >
            <Search className="h-3.5 w-3.5" />
            {searching ? '采集中...' : '触发采集'}
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xs border border-[#E2E6E2] px-3 py-2 text-xs text-[#1F3437] hover:bg-[#F6F7F5] disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            刷新列表
          </button>
          <button
            onClick={triggerProcessAll}
            disabled={processAllBusy}
            className="inline-flex items-center gap-1.5 rounded-xs border border-[#E2E6E2] px-3 py-2 text-xs text-[#1F3437] hover:bg-[#F6F7F5] disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            批量处理 pending
          </button>
        </div>

        {message && <div className="text-xs text-[#2E6B56]">{message}</div>}
        {error && <div className="text-xs text-[#A84A3E]">{error}</div>}
      </div>

      {/* filings 列表 */}
      <div className="bg-white border border-[#E2E6E2] rounded-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-xs">
            <thead className="bg-[#FAFBF9] border-b border-[#E2E6E2] text-left text-[#627578]">
              <tr>
                <th className="px-3 py-2.5">类型</th>
                <th className="px-3 py-2.5">期间</th>
                <th className="px-3 py-2.5">年份</th>
                <th className="px-3 py-2.5">交易所</th>
                <th className="px-3 py-2.5">状态</th>
                <th className="px-3 py-2.5">来源</th>
                <th className="px-3 py-2.5">操作</th>
              </tr>
            </thead>
            <tbody>
              {filings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-[#8C9E9F]">
                    {loading ? '加载中...' : '暂无记录，请先输入公司名称触发采集'}
                  </td>
                </tr>
              ) : (
                filings.map((f) => (
                  <tr key={f.id} className="border-b border-[#F0F2EF] last:border-b-0 hover:bg-[#FAFBF9]">
                    <td className="px-3 py-2.5 font-medium text-[#1F3437]">
                      {FILING_TYPE_LABEL[f.filing_type] || f.filing_type}
                    </td>
                    <td className="px-3 py-2.5 text-[#627578]">{f.period || '-'}</td>
                    <td className="px-3 py-2.5 font-mono">{f.year ?? '-'}</td>
                    <td className="px-3 py-2.5 text-[#627578]">{f.exchange || '-'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-xs border px-1.5 py-0.5 text-[10px] ${
                        f.status === 'parsed'
                          ? 'border-[#2E6B56]/30 bg-[#2E6B56]/10 text-[#2E6B56]'
                          : f.status === 'error'
                          ? 'border-[#A84A3E]/30 bg-[#A84A3E]/10 text-[#A84A3E]'
                          : 'border-[#9C6E28]/30 bg-[#9C6E28]/10 text-[#9C6E28]'
                      }`}>
                        {FILING_STATUS_LABEL[f.status] || f.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {f.pdf_url ? (
                        <a
                          href={f.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#3E6F73] hover:underline truncate inline-block max-w-[200px]"
                          title={f.pdf_url}
                        >
                          {f.pdf_url.replace(/^https?:\/\//, '').slice(0, 32)}...
                        </a>
                      ) : (
                        <span className="text-[#8C9E9F]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => processFiling(f.id)}
                          disabled={processingId === f.id}
                          className="inline-flex items-center gap-1 rounded-xs border border-[#E2E6E2] px-2 py-1 text-[10px] text-[#1F3437] hover:bg-[#F6F7F5] disabled:opacity-40"
                          title="下载 PDF 并抽取文本"
                        >
                          <Download className="h-3 w-3" />
                          {processingId === f.id ? '处理中' : '解析'}
                        </button>
                        <button
                          onClick={() => extractFiling(f)}
                          disabled={extractingId === f.id}
                          className="inline-flex items-center gap-1 rounded-xs border border-[#E2E6E2] px-2 py-1 text-[10px] text-[#1F3437] hover:bg-[#F6F7F5] disabled:opacity-40"
                          title="LLM 结构化抽取（前五大供应商/客户/关联交易等）"
                        >
                          <Sparkles className="h-3 w-3" />
                          {extractingId === f.id ? '抽取中' : 'LLM 抽取'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 用户管理面板
// ---------------------------------------------------------------------------

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string | null;
  organization: string | null;
  tier: string;
  created_at: number;
  login_count: number;
  last_login_at: number | null;
}

const UsersPanel: React.FC = () => {
  const pwd = sessionStorage.getItem(SESSION_KEY) || '';
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editTier, setEditTier] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', { headers: { 'x-admin-password': pwd } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '加载失败');
      setUsers(data.users || []);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [pwd]);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (u: AdminUser) => {
    setEditingId(u.id);
    setEditRole(u.role || '');
    setEditTier(u.tier);
  };

  const saveEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': pwd },
        body: JSON.stringify({ role: editRole || null, tier: editTier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '更新失败');
      setMessage('已更新');
      setEditingId(null);
      load();
    } catch (e: any) {
      setError(e.message || '更新失败');
    }
  };

  const removeUser = async (u: AdminUser) => {
    if (!confirm(`确定删除用户 ${u.email} 吗？此操作不可撤销。`)) return;
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': pwd },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '删除失败');
      setMessage(`已删除 ${u.email}`);
      load();
    } catch (e: any) {
      setError(e.message || '删除失败');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-[#1F3437]" />
          <h2 className="font-serif font-bold text-sm">注册用户管理</h2>
          <span className="text-xs text-[#8C9E9F]">共 {users.length} 个用户</span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xs border border-[#E2E6E2] px-3 py-1.5 text-xs text-[#1F3437] hover:bg-[#F6F7F5] disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          刷新
        </button>
      </div>

      {message && <div className="text-xs text-[#2E6B56]">{message}</div>}
      {error && <div className="text-xs text-[#A84A3E]">{error}</div>}

      <div className="bg-white border border-[#E2E6E2] rounded-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-xs">
            <thead className="bg-[#FAFBF9] border-b border-[#E2E6E2] text-left text-[#627578]">
              <tr>
                <th className="px-3 py-2.5">姓名 / 邮箱</th>
                <th className="px-3 py-2.5">角色</th>
                <th className="px-3 py-2.5">套餐</th>
                <th className="px-3 py-2.5">登录次数</th>
                <th className="px-3 py-2.5">最近登录</th>
                <th className="px-3 py-2.5">注册时间</th>
                <th className="px-3 py-2.5">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-[#8C9E9F]">加载中...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-[#8C9E9F]">暂无用户</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-[#F0F2EF] last:border-b-0 hover:bg-[#FAFBF9]">
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-[#1F3437]">{u.name}</div>
                      <div className="text-[#8C9E9F] font-mono">{u.email}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      {editingId === u.id ? (
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="rounded-xs border border-[#D4D9D4] bg-[#FAFBF9] px-2 py-1 text-xs"
                        >
                          <option value="">普通用户</option>
                          <option value="admin">管理员</option>
                        </select>
                      ) : (
                        <span className={`rounded-xs border px-1.5 py-0.5 text-[10px] ${
                          u.role === 'admin'
                            ? 'border-[#1F3437]/30 bg-[#1F3437]/10 text-[#1F3437]'
                            : 'border-[#E2E6E2] text-[#627578]'
                        }`}>
                          {u.role === 'admin' ? '管理员' : '普通用户'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {editingId === u.id ? (
                        <select
                          value={editTier}
                          onChange={(e) => setEditTier(e.target.value)}
                          className="rounded-xs border border-[#D4D9D4] bg-[#FAFBF9] px-2 py-1 text-xs"
                        >
                          <option value="Free">Free</option>
                          <option value="Pro">Pro</option>
                          <option value="Enterprise">Enterprise</option>
                        </select>
                      ) : (
                        <span className="font-mono">{u.tier}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[#627578]">{u.login_count}</td>
                    <td className="px-3 py-2.5 text-[#627578]">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleString('zh-CN') : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-[#627578]">
                      {new Date(u.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-3 py-2.5">
                      {editingId === u.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => saveEdit(u.id)}
                            className="rounded-xs bg-[#1F3437] px-2 py-1 text-[10px] text-white hover:bg-[#3E6F73]"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded-xs border border-[#E2E6E2] px-2 py-1 text-[10px] text-[#627578] hover:bg-[#F6F7F5]"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => startEdit(u)}
                            className="rounded-xs border border-[#E2E6E2] px-2 py-1 text-[10px] text-[#1F3437] hover:bg-[#F6F7F5]"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => removeUser(u)}
                            className="rounded-xs border border-[#E2E6E2] px-2 py-1 text-[10px] text-[#A84A3E] hover:bg-[#FBEFEE]"
                          >
                            删除
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
