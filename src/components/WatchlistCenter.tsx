import React, { useState, useEffect } from 'react';
import {
  BellRing,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Building2,
  TrendingUp,
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle2,
  Filter,
  Search,
  ChevronRight,
  Sparkles,
  Info,
} from 'lucide-react';
import { CompanyPanoramaData } from '../types';
import { useAuth } from '../context/AuthContext';

export interface WatchlistItem {
  id: string;
  name: string;
  ticker?: string;
  industry: string;
  riskRating: 'Low' | 'Medium' | 'High' | 'Critical';
  addedAt: string;
  tags: string[];
  alertCount: number;
}

export interface SupplyChainAlert {
  id: string;
  companyName: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  type: 'geopolitical' | 'supply_disruption' | 'financial_stress' | 'executive_change' | 'esg_compliance';
  typeLabel: string;
  title: string;
  summary: string;
  impactTier: 'Tier-1 直接' | 'Tier-2 原材料' | '下游需求' | '合资/参股';
  publishedAt: string;
  source: string;
  aiActionRecommendation: string;
  isRead?: boolean;
}

interface WatchlistCenterProps {
  currentData: CompanyPanoramaData | null;
  onSelectCompany: (name: string) => void;
}

// 模拟商业化动态预警数据库
const INITIAL_ALERTS: SupplyChainAlert[] = [
  {
    id: 'alt-001',
    companyName: '比亚迪',
    severity: 'High',
    type: 'geopolitical',
    typeLabel: '海外关税与地缘',
    title: '欧盟反补贴终裁税率落地，出海欧洲港口交付周期延长',
    summary: '针对中国制造纯电动汽车加征最高 35.3% 关税，德国与匈牙利本土化建厂进度成为对冲关键，预计 Q3 欧洲单车利润率微降 1.8%。',
    impactTier: '下游需求',
    publishedAt: '2 小时前',
    source: '欧盟官方公报 (OJEU) & 海关追踪',
    aiActionRecommendation: '建议加快匈牙利乘用车一期工厂投产上量，并通过 CKD 组装模式与当地经销商共享关税分摊方案。',
  },
  {
    id: 'alt-002',
    companyName: '宁德时代',
    severity: 'Medium',
    type: 'supply_disruption',
    typeLabel: '原料大宗波动',
    title: '南美某主要盐湖锂矿发生罢工，碳酸锂现货周环比反弹 4.2%',
    summary: '短期碳酸锂供给预期收紧，但因宁德时代拥有江西宜春锂云母与自建回收闭环，整体成本传导冲击处于可控阈值。',
    impactTier: 'Tier-2 原材料',
    publishedAt: '5 小时前',
    source: 'SMM 有色金属网 / Fastmarkets',
    aiActionRecommendation: '启动期货套期保值敞口对冲，释放宜丰锂矿自有原料储备，优先保供神行/麒麟电池产线。',
  },
  {
    id: 'alt-003',
    companyName: '特斯拉',
    severity: 'Critical',
    type: 'supply_disruption',
    typeLabel: '断供瓶颈预警',
    title: '墨西哥超级工厂二期延后，北美某传感器供应商产线良率下滑',
    summary: 'HW4.0 高清摄像头与毫米波雷达供应商因工艺调整交付延迟 3 周，或轻微影响得州 Model Y Cybertruck 产能爬坡。',
    impactTier: 'Tier-1 直接',
    publishedAt: '1 天前',
    source: '路透社供应链专栏 & SEC 8-K',
    aiActionRecommendation: '调配上海超级工厂供应商（联创电子/舜宇光学）建立海外平行备份仓，实施双轨采购。',
  },
  {
    id: 'alt-004',
    companyName: '台积电',
    severity: 'Medium',
    type: 'esg_compliance',
    typeLabel: '能源与ESG合规',
    title: '台湾厂区夏季绿电消纳达标率受限，RE100 跨国采购溢价走高',
    summary: '先进制程 2nm 极紫外 (EUV) 光刻机耗电量激增，需加速在美日德工厂采购当地离岸风电与核电 PPA 协议。',
    impactTier: 'Tier-1 直接',
    publishedAt: '2 天前',
    source: '彭博新能源财经 (BNEF)',
    aiActionRecommendation: '加快亚利桑那 Fab 21 太阳能微电网并网，提前锁定绿证 (REC) 远期对冲合约。',
  },
  {
    id: 'alt-005',
    companyName: '苹果',
    severity: 'Low',
    type: 'executive_change',
    typeLabel: '高管变动与战略',
    title: '硬件工程部前瞻技术副总裁离职，Vision 产线供应链策略微调',
    summary: '团队将进一步强化与立讯精密及歌尔股份在轻量化 micro-OLED 贴合领域的联合研发协议。',
    impactTier: '合资/参股',
    publishedAt: '3 天前',
    source: 'The Information',
    aiActionRecommendation: '跟踪立讯精密昆山研发中心新试产线排期，评估下一代产品定点份额。',
  },
];

const INITIAL_WATCHLIST: WatchlistItem[] = [
  {
    id: 'w-1',
    name: '比亚迪',
    ticker: '002594.SZ / 1211.HK',
    industry: '新能源汽车与动力电池',
    riskRating: 'Low',
    addedAt: '2025-01-15',
    tags: ['垂直一体化', '自研芯片', '海外建厂'],
    alertCount: 2,
  },
  {
    id: 'w-2',
    name: '宁德时代',
    ticker: '300750.SZ',
    industry: '储能与锂离子动力电池',
    riskRating: 'Low',
    addedAt: '2025-02-01',
    tags: ['全球市占第一', 'LRS授权模式'],
    alertCount: 1,
  },
  {
    id: 'w-3',
    name: '特斯拉',
    ticker: 'TSLA.US',
    industry: '智能电动车与算力机器人',
    riskRating: 'Medium',
    addedAt: '2025-02-10',
    tags: ['4680电池', 'FSD自动驾驶', '一体化压铸'],
    alertCount: 3,
  },
  {
    id: 'w-4',
    name: '台积电',
    ticker: 'TSM.US / 2330.TW',
    industry: '半导体先进制程代工',
    riskRating: 'High',
    addedAt: '2025-02-18',
    tags: ['CoWoS先进封装', '2nm制程', '地缘敏感'],
    alertCount: 1,
  },
];

export const WatchlistCenter: React.FC<WatchlistCenterProps> = ({
  currentData,
  onSelectCompany,
}) => {
  const { user } = useAuth();
  const userId = user?.id || 'anonymous';
  const WATCHLIST_STORAGE_KEY = `gensight_watchlist_${userId}`;

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    try {
      const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore parse errors
    }
    return INITIAL_WATCHLIST;
  });
  const [alerts, setAlerts] = useState<SupplyChainAlert[]>(INITIAL_ALERTS);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [newCompanyName, setNewCompanyName] = useState<string>('');
  const [showAddSuccess, setShowAddSuccess] = useState<boolean>(false);

  // Persist watchlist to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
    } catch (e) {
      console.warn('Failed to persist watchlist to localStorage', e);
    }
  }, [watchlist, WATCHLIST_STORAGE_KEY]);

  // 添加当前公司到自选库
  const handleAddCurrentToWatchlist = () => {
    if (!currentData) return;
    const exists = watchlist.some(
      (item) => item.name.toLowerCase() === currentData.basicInfo.name.toLowerCase()
    );
    if (exists) return;

    const newItem: WatchlistItem = {
      id: `w-${Date.now()}`,
      name: currentData.basicInfo.name,
      ticker: currentData.basicInfo.ticker || '未上市/私有',
      industry: currentData.basicInfo.industry,
      riskRating: currentData.risks?.some((r) => r.severity === 'High') ? 'Medium' : 'Low',
      addedAt: new Date().toISOString().split('T')[0],
      tags: currentData.basicInfo.tags?.slice(0, 3) || ['核心标的'],
      alertCount: 1,
    };

    setWatchlist([newItem, ...watchlist]);
    setShowAddSuccess(true);
    setTimeout(() => setShowAddSuccess(false), 3000);
  };

  const handleAddNewManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    const name = newCompanyName.trim();
    if (watchlist.some((w) => w.name.toLowerCase() === name.toLowerCase())) {
      setNewCompanyName('');
      return;
    }
    const newItem: WatchlistItem = {
      id: `w-${Date.now()}`,
      name,
      ticker: '待同步',
      industry: '智能制造/科技',
      riskRating: 'Low',
      addedAt: new Date().toISOString().split('T')[0],
      tags: ['手动添加'],
      alertCount: 0,
    };
    setWatchlist([newItem, ...watchlist]);
    setNewCompanyName('');
  };

  const handleRemoveFromWatchlist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWatchlist(watchlist.filter((item) => item.id !== id));
  };

  const filteredAlerts = alerts.filter((alt) => {
    if (selectedSeverity !== 'all' && alt.severity !== selectedSeverity) return false;
    if (selectedType !== 'all' && alt.type !== selectedType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        alt.companyName.toLowerCase().includes(q) ||
        alt.title.toLowerCase().includes(q) ||
        alt.summary.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'Critical':
        return 'bg-rose-950 text-rose-300 border-rose-800';
      case 'High':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'Medium':
        return 'bg-yellow-950 text-yellow-300 border-yellow-800';
      default:
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
    }
  };

  const isCurrentInWatchlist = currentData
    ? watchlist.some(
        (w) => w.name.toLowerCase() === currentData.basicInfo.name.toLowerCase()
      )
    : false;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner: Real-time Monitor Cockpit */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <BellRing className="h-4 w-4 animate-bounce" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                企业自选库与全球供应链实时预警中台
              </h2>
              <span className="rounded-full bg-cyan-900/60 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-300 border border-cyan-700/60">
                商业版实时监控
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 max-w-2xl">
              7x24 小时全天候巡检全球监管披露、海关提单、突发断供与大宗原料异动，AI 即时推演供应链 Tier-1/Tier-2 穿透影响并下发应对策略。
            </p>
          </div>

          {currentData && !isCurrentInWatchlist && (
            <button
              onClick={handleAddCurrentToWatchlist}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 transition-all shrink-0"
            >
              <Plus className="h-4 w-4" />
              添加当前企业【{currentData.basicInfo.name}】至监控库
            </button>
          )}

          {isCurrentInWatchlist && (
            <div className="flex items-center gap-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800 px-3.5 py-2 text-xs font-medium text-emerald-300 shrink-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              已纳入【{currentData?.basicInfo.name}】实时预警雷达
            </div>
          )}
        </div>

        {showAddSuccess && (
          <div className="mt-4 rounded-lg bg-cyan-900/50 border border-cyan-700/70 px-4 py-2 text-xs text-cyan-200 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
            <span>成功将企业添加至自选监控库，实时舆情与供应链黑天鹅将第一时间通知！</span>
          </div>
        )}
      </div>

      {/* Main Grid: Left Watchlist Cards | Right Live Alert Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Watchlist Management (4 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">我的自选标的库 ({watchlist.length})</h3>
              </div>
              <span className="text-[11px] text-slate-500">点击卡片直达图谱</span>
            </div>

            {/* Quick Add Input */}
            <form onSubmit={handleAddNewManual} className="flex gap-2">
              <input
                type="text"
                placeholder="输入股票代码或企业全称添加..."
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="submit"
                className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 text-xs font-semibold text-cyan-300 transition-colors shrink-0"
              >
                添加
              </button>
            </form>

            {/* Watchlist Items */}
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {watchlist.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectCompany(item.name)}
                  className="group relative rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 hover:border-cyan-700 hover:bg-slate-900/90 transition-all cursor-pointer shadow-sm hover:shadow-cyan-500/10 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {item.name}
                        </span>
                        {item.ticker && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                            {item.ticker}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{item.industry}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.alertCount > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-rose-950/80 border border-rose-800 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                          <Flame className="h-3 w-3 text-rose-400" />
                          {item.alertCount}
                        </span>
                      )}
                      <button
                        onClick={(e) => handleRemoveFromWatchlist(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-all"
                        title="移出自选库"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-900 text-[11px]">
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-400"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center text-cyan-400 group-hover:translate-x-0.5 transition-transform text-[11px] font-medium">
                      <span>钻取全景</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Real-time Alert Stream & Filter (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white">供应链突发与黑天鹅预警流</h3>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400 font-mono">
                  实时聚合 {filteredAlerts.length} 条
                </span>
              </div>

              {/* Search in alerts */}
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="搜索预警动态..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="flex items-center gap-1 text-[11px] text-slate-500 mr-1">
                <Filter className="h-3 w-3" />
                <span>风险等级:</span>
              </div>
              {['all', 'Critical', 'High', 'Medium', 'Low'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSelectedSeverity(sev)}
                  className={`rounded-lg px-2.5 py-1 text-xs transition-all ${
                    selectedSeverity === sev
                      ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {sev === 'all' ? '全部等级' : sev}
                </button>
              ))}
            </div>

            {/* Alert Cards Stream */}
            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {filteredAlerts.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-8 text-center text-xs text-slate-500">
                  当前筛选条件下暂无未处理的重大供应链风险预警
                </div>
              ) : (
                filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-xl border border-slate-800/90 bg-slate-950/70 p-4 hover:border-slate-700 transition-all space-y-3"
                  >
                    {/* Header: Company + Severity + Type */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => onSelectCompany(alert.companyName)}
                            className="text-xs font-bold text-cyan-300 hover:underline flex items-center gap-1"
                          >
                            {alert.companyName}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </button>
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${getSeverityBadge(
                              alert.severity
                            )}`}
                          >
                            {alert.severity} 风险
                          </span>
                          <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 border border-slate-700">
                            {alert.typeLabel}
                          </span>
                          <span className="rounded-md bg-cyan-950/60 px-2 py-0.5 text-[10px] text-cyan-300 border border-cyan-800/60">
                            影响环节: {alert.impactTier}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-white leading-snug">
                          {alert.title}
                        </h4>
                      </div>

                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {alert.publishedAt}
                      </span>
                    </div>

                    {/* Summary Context */}
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                      {alert.summary}
                    </p>

                    {/* AI Copilot Recommended Actions */}
                    <div className="rounded-lg bg-gradient-to-r from-cyan-950/50 to-blue-950/40 border border-cyan-800/50 p-2.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-300">
                        <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                        <span>AI 智能研判与应对策略建议：</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {alert.aiActionRecommendation}
                      </p>
                    </div>

                    {/* Footer Info: Source */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span>数据源与公报：{alert.source}</span>
                      <button
                        onClick={() => onSelectCompany(alert.companyName)}
                        className="text-cyan-400 hover:text-cyan-300 font-medium"
                      >
                        穿透查看关联图谱 →
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
