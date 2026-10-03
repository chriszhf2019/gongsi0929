import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Factory,
  FileText,
  Filter,
  GitBranch,
  Info,
  Link2,
  LoaderCircle,
  Mail,
  Network,
  PieChart,
  Scale,
  Search,
  ShieldAlert,
  Table2,
  TrendingUp,
  X,
} from 'lucide-react';
import { AUTOMOTIVE_INDUSTRY_DATA } from '../data/automotiveIndustry';
import { useAuth } from '../context/AuthContext';
import {
  AutomotiveChainSegment,
  AutomotiveCompany,
  AutomotiveRelation,
  AutomotiveRelationType,
} from '../types';

type HubTab = 'network' | 'procurement' | 'equity' | 'timeline' | 'disclosures' | 'benchmark';
type RelationFilter = 'all' | 'supply' | 'equity' | 'related';

const TAB_CONFIG: { id: HubTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'network', label: '产业关系网络', icon: Network },
  { id: 'procurement', label: '采购与供货', icon: Banknote },
  { id: 'equity', label: '入股与合资', icon: GitBranch },
  { id: 'timeline', label: '事件时间线', icon: CalendarRange },
  { id: 'disclosures', label: '公开资料', icon: FileText },
  { id: 'benchmark', label: '横向对标', icon: Scale },
];

const SEGMENT_META: Record<AutomotiveChainSegment, { label: string; color: string; bg: string }> = {
  materials: { label: '材料资源', color: '#9C6E28', bg: '#FAF4E7' },
  battery: { label: '动力电池', color: '#2E6B56', bg: '#EDF6F1' },
  semiconductor: { label: '汽车芯片', color: '#5E4D78', bg: '#F2EEF8' },
  components: { label: '汽车零部件', color: '#3E6F73', bg: '#ECF3F3' },
  oem: { label: '整车', color: '#1F3437', bg: '#EDF0EF' },
  channel: { label: '渠道补能', color: '#A84A3E', bg: '#FBEFEE' },
  software: { label: '汽车软件', color: '#356183', bg: '#EDF4F8' },
  capital: { label: '产业资本', color: '#6B5B4B', bg: '#F5F1ED' },
};

const RELATION_LABELS: Record<AutomotiveRelationType, string> = {
  supply: '供应',
  customer: '采购',
  equity: '入股',
  joint_venture: '合资',
  co_development: '联合研发',
  technology_license: '技术授权',
  distribution: '渠道分销',
  competitor: '竞争',
};

const relationColor = (relation: AutomotiveRelation): string => {
  if (relation.relationTypes.includes('equity')) return '#9C6E28';
  if (relation.relationTypes.includes('supply')) return '#3E6F73';
  if (relation.relationTypes.includes('competitor')) return '#A84A3E';
  return '#627578';
};

const statusLabel = {
  disclosed: '已披露',
  estimated: '估算',
  undisclosed: '未披露',
} as const;

const relationMatchesFilter = (relation: AutomotiveRelation, filter: RelationFilter) => {
  if (filter === 'all') return true;
  if (filter === 'related') return relation.relatedParty;
  if (filter === 'equity') return relation.relationTypes.includes('equity');
  return relation.relationTypes.includes('supply') || relation.relationTypes.includes('customer');
};

interface ReportConfig {
  priceYuan: number;
  freeDeepLimit: number;
  paymentMode: 'mock' | 'production';
  currency: string;
}

interface ReportOrder {
  id: string;
  user_email: string;
  company_name: string;
  amount_cents: number;
  status: string;
  error: string | null;
  delivered_at: number | null;
}

export const AutomotiveIndustryHub: React.FC = () => {
  const data = AUTOMOTIVE_INDUSTRY_DATA;
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<HubTab>('network');
  const [selectedCompanyId, setSelectedCompanyId] = useState('byd');
  const [selectedRelationId, setSelectedRelationId] = useState<string | null>('rel-byd-fudi-equity');
  const [relationFilter, setRelationFilter] = useState<RelationFilter>('all');
  const [timelineCompanyOnly, setTimelineCompanyOnly] = useState(true);
  const [companyQuery, setCompanyQuery] = useState('');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportEmail, setReportEmail] = useState(user?.email || '');
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    priceYuan: 8,
    freeDeepLimit: 1,
    paymentMode: 'mock',
    currency: 'CNY',
  });
  const [reportOrder, setReportOrder] = useState<ReportOrder | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/reports/config')
      .then((response) => response.json())
      .then((config) => setReportConfig(config))
      .catch(() => {
        // Keep safe local defaults when the server is unavailable.
      });
  }, []);

  const companyMap = useMemo(
    () => new Map(data.companies.map((company) => [company.id, company])),
    [data.companies]
  );
  const selectedCompany = companyMap.get(selectedCompanyId) || data.companies[0];

  const relatedRelations = useMemo(
    () =>
      data.relations.filter(
        (relation) =>
          (relation.fromCompanyId === selectedCompany.id || relation.toCompanyId === selectedCompany.id) &&
          relationMatchesFilter(relation, relationFilter)
      ),
    [data.relations, relationFilter, selectedCompany.id]
  );

  const selectedRelation =
    data.relations.find((relation) => relation.id === selectedRelationId) || relatedRelations[0] || null;

  const procurementRelations = useMemo(
    () => relatedRelations.filter((relation) => relation.procurement),
    [relatedRelations]
  );
  const equityRelations = useMemo(
    () => relatedRelations.filter((relation) => relation.equity),
    [relatedRelations]
  );
  const companyTimeline = useMemo(
    () =>
      data.timeline
        .filter((event) => !timelineCompanyOnly || event.companyIds.includes(selectedCompany.id))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data.timeline, selectedCompany.id, timelineCompanyOnly]
  );
  const companyDisclosures = useMemo(
    () => data.disclosures.filter((document) => document.companyId === selectedCompany.id),
    [data.disclosures, selectedCompany.id]
  );
  const peerSnapshots = useMemo(
    () =>
      data.financials
        .filter((snapshot) => {
          const company = companyMap.get(snapshot.companyId);
          return company && (company.id === selectedCompany.id || company.segment === selectedCompany.segment);
        })
        .slice(0, 4),
    [companyMap, data.financials, selectedCompany]
  );

  const searchableCompanies = data.companies.filter((company) => {
    const query = companyQuery.trim().toLowerCase();
    if (!query) return true;
    return `${company.name} ${company.shortName} ${company.ticker || ''} ${company.segmentLabel}`
      .toLowerCase()
      .includes(query);
  });

  const relationCount = relatedRelations.length;
  const equityCount = equityRelations.length;
  const relatedPartyCount = relatedRelations.filter((relation) => relation.relatedParty).length;
  const highRiskCount = procurementRelations.filter(
    (relation) => relation.procurement?.singleSourceRisk === 'High'
  ).length;

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setSelectedRelationId(null);
    setCompanyQuery('');
  };

  const openReportModal = () => {
    setReportEmail(user?.email || reportEmail);
    setReportOrder(null);
    setReportError(null);
    setReportModalOpen(true);
  };

  const createReportOrder = async () => {
    if (!reportEmail.trim()) {
      setReportError('请输入用于接收报告的邮箱');
      return;
    }
    setReportLoading(true);
    setReportError(null);
    try {
      const response = await fetch('/api/reports/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          userEmail: reportEmail.trim(),
          companyName: selectedCompany.name,
          reportType: 'automotive_deep',
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || '创建报告订单失败');
      setReportOrder(payload.order);
    } catch (error: any) {
      setReportError(error?.message || '创建报告订单失败');
    } finally {
      setReportLoading(false);
    }
  };

  const mockPayAndGenerate = async () => {
    if (!reportOrder) return;
    setReportLoading(true);
    setReportError(null);
    try {
      const response = await fetch(`/api/reports/orders/${reportOrder.id}/mock-pay`, {
        method: 'POST',
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || '支付或生成失败');
      setReportOrder(payload.order);
    } catch (error: any) {
      setReportError(error?.message || '支付或生成失败');
    } finally {
      setReportLoading(false);
    }
  };

  const graph = useMemo(() => {
    const visibleIds = new Set<string>([selectedCompany.id]);
    relatedRelations.forEach((relation) => {
      visibleIds.add(relation.fromCompanyId);
      visibleIds.add(relation.toCompanyId);
    });
    const nodes = [...visibleIds]
      .map((id) => companyMap.get(id))
      .filter((company): company is AutomotiveCompany => Boolean(company));
    const center = { x: 390, y: 225 };
    const positions = new Map<string, { x: number; y: number }>();
    positions.set(selectedCompany.id, center);

    const satellites = nodes.filter((company) => company.id !== selectedCompany.id);
    satellites.forEach((company, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(1, satellites.length) - Math.PI / 2;
      const radius = satellites.length > 7 ? 164 : 145;
      positions.set(company.id, {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
      });
    });
    return { nodes, positions };
  }, [companyMap, relatedRelations, selectedCompany]);

  return (
    <>
    <section className="space-y-5">
      <div className="rounded-sm border border-[#1F3437] bg-[#1F3437] text-white overflow-hidden shadow-sm">
        <div className="px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xs bg-[#FAF8F5] text-[#1F3437] shrink-0">
              <Factory className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-serif text-lg font-bold tracking-wide">汽车及相关产业关系中心</h2>
                <span className="rounded-xs border border-white/20 bg-white/5 px-2 py-0.5 text-[10px] text-[#C6D4D3]">
                  采购量 · 入股 · 时间线
                </span>
              </div>
              <p className="mt-1 text-xs text-[#B7C7C7] font-serif">
                从供应、采购、股权、合资和公开披露中还原产业利益链。金额和比例均标注披露状态，不把估算写成事实。
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#C6D4D3]">
              <span>AS OF {data.asOf}</span>
              <span className="h-1 w-1 rounded-full bg-[#8C9E9F]" />
              <span>演示数据版</span>
            </div>
            <button
              onClick={openReportModal}
              className="inline-flex items-center gap-1.5 rounded-xs border border-[#DCD0B8] bg-[#FAF8F3] px-3 py-1.5 text-xs font-serif font-medium text-[#7D612E] hover:bg-[#F5F0E4]"
            >
              <Mail className="h-3.5 w-3.5" />
              生成深度报告
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-white/10">
          <HeaderMetric label="关联企业" value={relationCount} unit="条关系" />
          <HeaderMetric label="入股/合资" value={equityCount} unit="条资本关系" />
          <HeaderMetric label="关联交易" value={relatedPartyCount} unit="条待核验" warning={relatedPartyCount > 0} />
          <HeaderMetric label="高风险单源" value={highRiskCount} unit="项供应风险" warning={highRiskCount > 0} />
        </div>
      </div>

      <div className="rounded-sm border border-[#E2E6E2] bg-white p-4">
        <div className="flex flex-col xl:flex-row xl:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C9E9F]" />
            <input
              value={companyQuery}
              onChange={(event) => setCompanyQuery(event.target.value)}
              placeholder="搜索汽车产业链公司、股票代码或环节..."
              className="w-full rounded-xs border border-[#D4D9D4] bg-[#FAFBF9] py-2 pl-9 pr-3 text-xs text-[#1F3437] focus:border-[#3E6F73] focus:outline-none"
            />
            {companyQuery && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xs border border-[#D4D9D4] bg-white shadow-xl">
                {searchableCompanies.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-[#8C9E9F]">未找到匹配的公司</div>
                ) : (
                  searchableCompanies.slice(0, 10).map((company) => (
                    <button
                      key={company.id}
                      onClick={() => handleSelectCompany(company.id)}
                      className="flex w-full items-center justify-between gap-3 border-b border-[#F0F2EF] px-3 py-2.5 text-left last:border-b-0 hover:bg-[#FAFBF9]"
                    >
                      <span>
                        <span className="block text-xs font-medium text-[#1F3437]">{company.shortName}</span>
                        <span className="block text-[10px] text-[#627578]">{company.segmentLabel} · {company.ticker || '非上市'}</span>
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-[#8C9E9F]" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {(['all', 'supply', 'equity', 'related'] as RelationFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setRelationFilter(filter)}
                className={`shrink-0 rounded-xs border px-3 py-1.5 text-xs font-serif transition-colors ${
                  relationFilter === filter
                    ? 'border-[#1F3437] bg-[#1F3437] text-white'
                    : 'border-[#E2E6E2] bg-white text-[#627578] hover:border-[#3E6F73]'
                }`}
              >
                {filter === 'all' ? '全部关系' : filter === 'supply' ? '供应采购' : filter === 'equity' ? '入股合资' : '关联交易'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#F0F2EF] pt-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xs text-xs font-bold"
              style={{
                color: SEGMENT_META[selectedCompany.segment].color,
                backgroundColor: SEGMENT_META[selectedCompany.segment].bg,
              }}
            >
              {selectedCompany.shortName.slice(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-sm font-bold text-[#1F3437]">{selectedCompany.shortName}</span>
                <span className="rounded-xs border border-[#E2E6E2] bg-[#F6F7F5] px-1.5 py-0.5 text-[10px] text-[#627578]">
                  {selectedCompany.segmentLabel}
                </span>
              </div>
              <p className="text-[11px] text-[#627578]">{selectedCompany.role}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#627578]">
            {selectedCompany.tags.map((tag) => (
              <span key={tag} className="rounded-xs border border-[#E2E6E2] bg-[#FAFBF9] px-2 py-0.5">{tag}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="border-b border-[#E2E6E2]">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs font-serif transition-colors ${
                  active
                    ? 'border-[#1F3437] text-[#1F3437] font-bold'
                    : 'border-transparent text-[#627578] hover:text-[#1F3437]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'network' && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)] gap-5">
          <div className="overflow-hidden rounded-sm border border-[#E2E6E2] bg-white">
            <div className="flex items-center justify-between border-b border-[#E2E6E2] px-4 py-3">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-[#3E6F73]" />
                <h3 className="font-serif text-sm font-bold text-[#1F3437]">产业关系拓扑</h3>
              </div>
              <span className="text-[10px] text-[#8C9E9F]">点击节点切换公司，点击连线查看关系证据</span>
            </div>
            <div className="bg-[#FAFBF9] p-2 sm:p-4">
              <svg viewBox="0 0 780 450" className="w-full min-h-[360px]" role="img" aria-label="汽车产业关系网络">
                <defs>
                  <marker id="auto-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto">
                    <polygon points="0 0, 8 3.5, 0 7" fill="#8C9E9F" />
                  </marker>
                </defs>
                {relatedRelations.map((relation) => {
                  const from = graph.positions.get(relation.fromCompanyId);
                  const to = graph.positions.get(relation.toCompanyId);
                  if (!from || !to) return null;
                  const isSelected = selectedRelation?.id === relation.id;
                  return (
                    <g key={relation.id} className="cursor-pointer" onClick={() => setSelectedRelationId(relation.id)}>
                      <line
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke={isSelected ? '#1F3437' : relationColor(relation)}
                        strokeWidth={isSelected ? 3 : relation.relationTypes.includes('equity') ? 2.5 : 1.6}
                        strokeDasharray={relation.relatedParty ? '7 4' : undefined}
                        opacity={isSelected ? 1 : 0.68}
                        markerEnd="url(#auto-arrow)"
                      />
                      <circle
                        cx={(from.x + to.x) / 2}
                        cy={(from.y + to.y) / 2}
                        r={isSelected ? 21 : 17}
                        fill={isSelected ? '#1F3437' : '#FFFFFF'}
                        stroke={relationColor(relation)}
                        strokeWidth="1.5"
                      />
                      <text
                        x={(from.x + to.x) / 2}
                        y={(from.y + to.y) / 2 + 3}
                        textAnchor="middle"
                        fontSize="9"
                        fill={isSelected ? '#FFFFFF' : '#627578'}
                        fontWeight="700"
                      >
                        {relation.relationTypes.includes('equity')
                          ? '股'
                          : relation.relationTypes.includes('competitor')
                          ? '竞'
                          : '供'}
                      </text>
                    </g>
                  );
                })}
                {graph.nodes.map((company) => {
                  const position = graph.positions.get(company.id);
                  if (!position) return null;
                  const isFocus = company.id === selectedCompany.id;
                  const meta = SEGMENT_META[company.segment];
                  return (
                    <g
                      key={company.id}
                      className="cursor-pointer"
                      onClick={() => handleSelectCompany(company.id)}
                    >
                      <circle
                        cx={position.x}
                        cy={position.y}
                        r={isFocus ? 34 : 23}
                        fill={isFocus ? '#1F3437' : meta.bg}
                        stroke={isFocus ? '#1F3437' : meta.color}
                        strokeWidth={isFocus ? 3 : 2}
                      />
                      <text
                        x={position.x}
                        y={position.y + 4}
                        textAnchor="middle"
                        fontSize={isFocus ? 12 : 9}
                        fill={isFocus ? '#FFFFFF' : meta.color}
                        fontWeight="800"
                      >
                        {company.shortName.slice(0, 4)}
                      </text>
                      <text
                        x={position.x}
                        y={position.y + (isFocus ? 51 : 39)}
                        textAnchor="middle"
                        fontSize="9"
                        fill="#627578"
                      >
                        {company.segmentLabel}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="flex flex-wrap items-center gap-4 border-t border-[#E2E6E2] px-4 py-3 text-[10px] text-[#627578]">
              <LegendDot color="#3E6F73" label="供应/采购" />
              <LegendDot color="#9C6E28" label="入股/合资" />
              <LegendDot color="#A84A3E" label="竞争" />
              <span className="inline-flex items-center gap-1"><span className="h-px w-5 border-t border-dashed border-[#627578]" />关联交易</span>
            </div>
          </div>

          <RelationDetail relation={selectedRelation} companyMap={companyMap} onSelectCompany={handleSelectCompany} />
        </div>
      )}

      {activeTab === 'procurement' && (
        <div className="space-y-4">
          <AnalysisNotice
            icon={Banknote}
            title="采购量是时间序列，不是单一数字"
            text="系统区分已披露金额、区间估算和未披露关系。任何估算值都必须同时展示来源、期间和置信度。"
          />
          <div className="overflow-hidden rounded-sm border border-[#E2E6E2] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-xs">
                <thead className="border-b border-[#E2E6E2] bg-[#FAFBF9] text-left text-[#627578]">
                  <tr>
                    <th className="px-4 py-3 font-medium">供应商 → 采购方</th>
                    <th className="px-4 py-3 font-medium">产品/物料</th>
                    <th className="px-4 py-3 font-medium">期间与规模</th>
                    <th className="px-4 py-3 font-medium">金额口径</th>
                    <th className="px-4 py-3 font-medium">依赖程度</th>
                    <th className="px-4 py-3 font-medium">核验</th>
                  </tr>
                </thead>
                <tbody>
                  {procurementRelations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-[#8C9E9F]">当前筛选条件下暂无采购关系</td>
                    </tr>
                  ) : (
                    procurementRelations.map((relation) => {
                      const procurement = relation.procurement!;
                      return (
                        <tr key={relation.id} className="border-b border-[#F0F2EF] last:border-b-0 hover:bg-[#FAFBF9]">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setSelectedRelationId(relation.id)}
                              className="text-left font-serif font-medium text-[#1F3437] hover:text-[#3E6F73]"
                            >
                              {companyMap.get(relation.fromCompanyId)?.shortName}
                              <span className="mx-2 text-[#8C9E9F]">→</span>
                              {companyMap.get(relation.toCompanyId)?.shortName}
                            </button>
                            {relation.relatedParty && (
                              <span className="ml-2 rounded-xs bg-[#A84A3E]/10 px-1.5 py-0.5 text-[9px] text-[#A84A3E]">关联交易</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[#2D4245]">{procurement.product}</td>
                          <td className="px-4 py-3 text-[#627578]">
                            <div>{procurement.period}</div>
                            <div className="mt-0.5 text-[10px]">{procurement.volumeLabel}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-[#1F3437]">{procurement.amountLabel}</div>
                            <AmountStatus status={procurement.amountStatus} />
                          </td>
                          <td className="px-4 py-3">
                            <RiskBadge risk={procurement.singleSourceRisk} />
                            {(procurement.shareOfSupplierRevenue || procurement.shareOfBuyerCost) && (
                              <div className="mt-1 text-[10px] text-[#627578]">
                                {procurement.shareOfSupplierRevenue || procurement.shareOfBuyerCost}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <EvidenceBadge relation={relation} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'equity' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {equityRelations.length === 0 ? (
              <div className="rounded-sm border border-[#E2E6E2] bg-white px-4 py-10 text-center text-xs text-[#8C9E9F]">
                当前公司暂无入股或合资关系记录
              </div>
            ) : (
              equityRelations.map((relation) => {
                const investor = companyMap.get(relation.fromCompanyId);
                const investee = companyMap.get(relation.toCompanyId);
                const equity = relation.equity!;
                return (
                  <button
                    key={relation.id}
                    onClick={() => setSelectedRelationId(relation.id)}
                    className={`w-full rounded-sm border bg-white p-4 text-left transition-all hover:border-[#9C6E28] ${
                      selectedRelation?.id === relation.id ? 'border-[#9C6E28] ring-1 ring-[#9C6E28]/20' : 'border-[#E2E6E2]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xs bg-[#FAF4E7] text-[#9C6E28]">
                          <CircleDollarSign className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-serif text-sm font-bold text-[#1F3437]">
                            {investor?.shortName}
                            <span className="mx-2 text-[#9C6E28]">参股/合作</span>
                            {investee?.shortName}
                          </div>
                          <p className="mt-0.5 text-[11px] text-[#627578]">{relation.title}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-mono text-xl font-bold text-[#9C6E28]">
                            {equity.percentage != null ? `${equity.percentage}%` : '比例未知'}
                          </div>
                          <div className="text-[10px] text-[#8C9E9F]">{equity.investmentYear || '年份待核验'}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-[#8C9E9F]" />
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-[#F0F2EF] pt-3 text-[10px]">
                      <InfoCell label="控制类型" value={equity.controlType} />
                      <InfoCell label="直接持股" value={equity.direct ? '是' : '间接/待核验'} />
                      <InfoCell label="投资金额" value={equity.investmentAmountLabel} />
                      <InfoCell label="当前状态" value={equity.status} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <RelationDetail relation={selectedRelation} companyMap={companyMap} onSelectCompany={handleSelectCompany} />
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-sm border border-[#E2E6E2] bg-white px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-[#627578]">
              <Filter className="h-4 w-4 text-[#3E6F73]" />
              <span>时间线图层</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTimelineCompanyOnly(true)}
                className={`rounded-xs border px-3 py-1.5 text-xs ${
                  timelineCompanyOnly ? 'border-[#1F3437] bg-[#1F3437] text-white' : 'border-[#E2E6E2] text-[#627578]'
                }`}
              >
                {selectedCompany.shortName} 相关
              </button>
              <button
                onClick={() => setTimelineCompanyOnly(false)}
                className={`rounded-xs border px-3 py-1.5 text-xs ${
                  !timelineCompanyOnly ? 'border-[#1F3437] bg-[#1F3437] text-white' : 'border-[#E2E6E2] text-[#627578]'
                }`}
              >
                全行业事件
              </button>
            </div>
          </div>
          <div className="rounded-sm border border-[#E2E6E2] bg-white p-4 sm:p-6">
            <div className="relative space-y-0 before:absolute before:bottom-4 before:left-[17px] before:top-4 before:w-px before:bg-[#D4D9D4]">
              {companyTimeline.length === 0 ? (
                <div className="py-10 text-center text-xs text-[#8C9E9F]">暂无时间线事件</div>
              ) : (
                companyTimeline.map((event, index) => (
                  <div key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
                    <div
                      className={`relative z-10 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-white ${
                        event.impact === 'negative'
                          ? 'border-[#A84A3E] text-[#A84A3E]'
                          : event.impact === 'positive'
                          ? 'border-[#2E6B56] text-[#2E6B56]'
                          : 'border-[#9C6E28] text-[#9C6E28]'
                      }`}
                    >
                      <TimelineIcon type={event.type} />
                    </div>
                    <div className="min-w-0 flex-1 border-b border-[#F0F2EF] pb-5 last:border-b-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#1F3437]">{event.date}</span>
                        <span className="rounded-xs border border-[#E2E6E2] bg-[#F6F7F5] px-1.5 py-0.5 text-[9px] text-[#627578]">
                          {event.type}
                        </span>
                        <span className="rounded-xs bg-[#3E6F73]/10 px-1.5 py-0.5 text-[9px] text-[#3E6F73]">
                          证据 {event.evidenceLevel} 级
                        </span>
                      </div>
                      <h4 className="mt-2 font-serif text-sm font-bold text-[#1F3437]">{event.title}</h4>
                      <p className="mt-1 text-xs leading-relaxed text-[#627578]">{event.summary}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[#8C9E9F]">
                        <span>来源：{event.sourceName}</span>
                        <span>·</span>
                        <span>{event.companyIds.map((id) => companyMap.get(id)?.shortName).filter(Boolean).join(' / ')}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'disclosures' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            {companyDisclosures.length === 0 ? (
              <div className="rounded-sm border border-[#E2E6E2] bg-white px-4 py-10 text-center text-xs text-[#8C9E9F]">
                当前公司暂无已导入的公开资料
              </div>
            ) : (
              companyDisclosures.map((document) => (
                <div key={document.id} className="rounded-sm border border-[#E2E6E2] bg-white p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xs bg-[#EDF3F3] text-[#3E6F73]">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-serif text-sm font-bold text-[#1F3437]">{document.title}</h4>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[#627578]">
                          <span>{document.period}</span>
                          <span>·</span>
                          <span>{document.sourceName}</span>
                          <span>·</span>
                          <span>归档 {document.filedAt}</span>
                        </div>
                      </div>
                    </div>
                    <ExtractionBadge status={document.extractionStatus} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#F0F2EF] pt-3 text-[10px]">
                    <InfoCell label="文件类型" value={document.documentType} />
                    <InfoCell label="公司" value={companyMap.get(document.companyId)?.shortName || '-'} />
                    <InfoCell label="可追溯" value="来源名称与期间完整" />
                  </div>
                </div>
              ))
            )}
          </div>
          <AnalysisNotice
            icon={Table2}
            title="资料入库只是第一步"
            text="正式版本需要继续完成 PDF 页码、财务表格、附注、原文引用和版本差异。未解析资料不能进入确定性结论。"
          />
        </div>
      )}

      {activeTab === 'benchmark' && (
        <div className="space-y-4">
          <AnalysisNotice
            icon={Scale}
            title="汽车行业对标必须先校验可比性"
            text="当前样例按产业链环节筛选可比公司。币种、会计期间、业务口径和客户结构不同，直接比较前必须显示数据限制。"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {peerSnapshots.map((snapshot) => {
              const company = companyMap.get(snapshot.companyId);
              if (!company) return null;
              return (
                <div
                  key={snapshot.companyId}
                  className={`rounded-sm border bg-white p-4 ${
                    snapshot.companyId === selectedCompany.id ? 'border-[#1F3437]' : 'border-[#E2E6E2]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-serif text-sm font-bold text-[#1F3437]">{company.shortName}</div>
                      <div className="text-[10px] text-[#627578]">{company.segmentLabel} · {snapshot.period}</div>
                    </div>
                    {snapshot.companyId === selectedCompany.id && (
                      <span className="rounded-xs bg-[#1F3437] px-1.5 py-0.5 text-[9px] text-white">当前</span>
                    )}
                  </div>
                  <div className="mt-4 space-y-3">
                    <MetricBar label="毛利率" value={snapshot.grossMargin} max={45} unit="%" />
                    <MetricBar label="现金转化" value={snapshot.cashConversion} max={120} unit="%" />
                    <MetricBar label="研发费用率" value={snapshot.rdRatio} max={10} unit="%" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#F0F2EF] pt-3">
                    <InfoCell label="客户集中" value={snapshot.customerConcentration != null ? `${snapshot.customerConcentration}%` : '-'} />
                    <InfoCell label="供应集中" value={snapshot.supplierConcentration != null ? `${snapshot.supplierConcentration}%` : '-'} />
                  </div>
                  {snapshot.isIllustrative && (
                    <div className="mt-3 text-[9px] text-[#9C6E28]">示例指标，需用最新财报替换</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
    {reportModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F3437]/60 p-4 backdrop-blur-xs">
        <div className="w-full max-w-lg rounded-sm border border-[#E2E6E2] bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#E2E6E2] px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#3E6F73]" />
                <h3 className="font-serif text-sm font-bold text-[#1F3437]">生成汽车产业深度报告</h3>
              </div>
              <p className="mt-1 text-[11px] text-[#627578]">
                每日首份免费，超出后 ¥{reportConfig.priceYuan} / 份，通过邮箱交付。
              </p>
            </div>
            <button onClick={() => setReportModalOpen(false)} className="rounded-xs border border-[#E2E6E2] p-1.5 text-[#627578] hover:bg-[#F6F7F5]">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 p-5">
            <div className="rounded-xs border border-[#E2E6E2] bg-[#FAFBF9] p-3">
              <div className="text-[10px] text-[#8C9E9F]">当前报告对象</div>
              <div className="mt-1 font-serif text-sm font-bold text-[#1F3437]">{selectedCompany.name}</div>
              <div className="mt-0.5 text-[10px] text-[#627578]">{selectedCompany.segmentLabel} · {selectedCompany.role}</div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#1F3437]">接收邮箱</label>
              <input
                type="email"
                value={reportEmail}
                onChange={(event) => setReportEmail(event.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xs border border-[#D4D9D4] bg-[#FAFBF9] px-3 py-2 text-sm focus:border-[#3E6F73] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xs border border-[#E2E6E2] p-3">
                <div className="text-[10px] text-[#8C9E9F]">免费额度</div>
                <div className="mt-1 font-serif font-bold text-[#1F3437]">每日 {reportConfig.freeDeepLimit} 份</div>
              </div>
              <div className="rounded-xs border border-[#E2E6E2] p-3">
                <div className="text-[10px] text-[#8C9E9F]">超出价格</div>
                <div className="mt-1 font-serif font-bold text-[#1F3437]">¥{reportConfig.priceYuan} / 份</div>
              </div>
            </div>

            {reportError && (
              <div className="rounded-xs border border-[#A84A3E]/30 bg-[#FBEFEE] px-3 py-2 text-xs text-[#A84A3E]">
                {reportError}
              </div>
            )}

            {reportOrder && (
              <div className="rounded-xs border border-[#DCE5E5] bg-[#F6FAFA] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] text-[#8C9E9F]">订单 {reportOrder.id}</div>
                    <div className="mt-1 text-xs font-medium text-[#1F3437]">
                      {reportOrder.status === 'delivered'
                        ? `报告已发送至 ${reportOrder.user_email}`
                        : reportOrder.status === 'pending_payment'
                        ? `待支付 ¥${(reportOrder.amount_cents / 100).toFixed(2)}`
                        : `订单状态：${reportOrder.status}`}
                    </div>
                  </div>
                  {reportOrder.status === 'delivered' ? (
                    <CheckCircle2 className="h-5 w-5 text-[#2E6B56]" />
                  ) : (
                    <LoaderCircle className="h-5 w-5 text-[#9C6E28]" />
                  )}
                </div>
                {reportOrder.error && (
                  <div className="mt-2 text-[10px] text-[#A84A3E]">{reportOrder.error}</div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-[#E2E6E2] pt-4">
              <button
                onClick={() => setReportModalOpen(false)}
                className="rounded-xs border border-[#E2E6E2] px-4 py-2 text-xs text-[#627578] hover:bg-[#F6F7F5]"
              >
                关闭
              </button>
              {!reportOrder && (
                <button
                  onClick={createReportOrder}
                  disabled={reportLoading}
                  className="inline-flex items-center gap-1.5 rounded-xs bg-[#1F3437] px-4 py-2 text-xs font-bold text-white hover:bg-[#3E6F73] disabled:opacity-50"
                >
                  {reportLoading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                  {reportLoading ? '生成中...' : '领取或购买报告'}
                </button>
              )}
              {reportOrder?.status === 'pending_payment' && reportConfig.paymentMode === 'mock' && (
                <button
                  onClick={mockPayAndGenerate}
                  disabled={reportLoading}
                  className="inline-flex items-center gap-1.5 rounded-xs bg-[#9C6E28] px-4 py-2 text-xs font-bold text-white hover:bg-[#855B1E] disabled:opacity-50"
                >
                  {reportLoading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <CircleDollarSign className="h-3.5 w-3.5" />}
                  模拟支付并生成
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

const HeaderMetric: React.FC<{ label: string; value: number; unit: string; warning?: boolean }> = ({
  label,
  value,
  unit,
  warning,
}) => (
  <div className="px-5 py-4">
    <div className="text-[10px] text-[#9DB3B6]">{label}</div>
    <div className={`mt-1 font-serif text-xl font-bold ${warning ? 'text-[#E8A59E]' : 'text-white'}`}>
      {value}
      <span className="ml-1 text-[10px] font-normal text-[#9DB3B6]">{unit}</span>
    </div>
  </div>
);

const LegendDot: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
    {label}
  </span>
);

const RelationDetail: React.FC<{
  relation: AutomotiveRelation | null;
  companyMap: Map<string, AutomotiveCompany>;
  onSelectCompany: (id: string) => void;
}> = ({ relation, companyMap, onSelectCompany }) => {
  if (!relation) {
    return (
      <div className="rounded-sm border border-[#E2E6E2] bg-white p-5 text-xs text-[#8C9E9F]">
        选择一条关系查看采购量、入股和证据。
      </div>
    );
  }
  const from = companyMap.get(relation.fromCompanyId);
  const to = companyMap.get(relation.toCompanyId);
  return (
    <aside className="rounded-sm border border-[#E2E6E2] bg-white overflow-hidden">
      <div className="border-b border-[#E2E6E2] bg-[#FAFBF9] px-4 py-3">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-[#3E6F73]" />
          <span className="font-serif text-sm font-bold text-[#1F3437]">关系详情</span>
          {relation.relatedParty && (
            <span className="ml-auto rounded-xs bg-[#A84A3E]/10 px-1.5 py-0.5 text-[9px] text-[#A84A3E]">关联交易</span>
          )}
        </div>
      </div>
      <div className="space-y-4 p-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button onClick={() => onSelectCompany(relation.fromCompanyId)} className="font-serif font-bold text-[#1F3437] hover:text-[#3E6F73]">
              {from?.shortName}
            </button>
            <ArrowUpRight className="h-4 w-4 text-[#9C6E28]" />
            <button onClick={() => onSelectCompany(relation.toCompanyId)} className="font-serif font-bold text-[#1F3437] hover:text-[#3E6F73]">
              {to?.shortName}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {relation.relationTypes.map((type) => (
              <span key={type} className="rounded-xs border border-[#E2E6E2] bg-[#F6F7F5] px-1.5 py-0.5 text-[9px] text-[#627578]">
                {RELATION_LABELS[type]}
              </span>
            ))}
          </div>
          <h3 className="mt-3 font-serif text-sm font-bold leading-snug text-[#1F3437]">{relation.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-[#627578]">{relation.summary}</p>
        </div>

        {relation.equity && (
          <div className="rounded-xs border border-[#EADFCB] bg-[#FAF8F3] p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#9C6E28]">
              <CircleDollarSign className="h-3.5 w-3.5" />
              入股 / 合作关系
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <InfoCell label="持股比例" value={relation.equity.percentage != null ? `${relation.equity.percentage}%` : '未知'} emphasis />
              <InfoCell label="投资年份" value={relation.equity.investmentYear || '待核验'} />
              <InfoCell label="控制类型" value={relation.equity.controlType} />
              <InfoCell label="投资金额" value={relation.equity.investmentAmountLabel} />
            </div>
          </div>
        )}

        {relation.procurement && (
          <div className="rounded-xs border border-[#DCE5E5] bg-[#F6FAFA] p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#3E6F73]">
                <Banknote className="h-3.5 w-3.5" />
                采购 / 供货关系
              </div>
              <AmountStatus status={relation.procurement.amountStatus} />
            </div>
            <div className="mt-3 space-y-3">
              <InfoCell label="产品" value={relation.procurement.product} emphasis />
              <InfoCell label="期间" value={`${relation.procurement.period} · ${relation.procurement.volumeLabel}`} />
              <InfoCell label="金额口径" value={relation.procurement.amountLabel} />
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] text-[#627578]">单一来源风险</span>
                <RiskBadge risk={relation.procurement.singleSourceRisk} />
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1F3437]">证据与核验</span>
            <span className="text-[10px] text-[#8C9E9F]">置信度 {relation.confidence}</span>
          </div>
          <div className="space-y-2">
            {relation.evidence.map((evidence) => (
              <div key={evidence.id} className="rounded-xs border border-[#E2E6E2] bg-[#FBFBFA] p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-medium text-[#1F3437]">{evidence.sourceName}</span>
                  <span className="shrink-0 rounded-xs bg-[#1F3437] px-1.5 py-0.5 text-[9px] text-white">
                    {evidence.level} 级
                  </span>
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-[#627578]">{evidence.note}</p>
                <div className="mt-1 text-[9px] text-[#8C9E9F]">{evidence.sourceType} · {evidence.filedAt}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xs border border-dashed border-[#D4D9D4] bg-[#FAFBF9] p-3 text-[10px] leading-relaxed text-[#8C9E9F]">
          <div className="mb-1 flex items-center gap-1 text-[#9C6E28]">
            <Info className="h-3 w-3" />
            当前为结构演示数据
          </div>
          关系存在性和公开资料已经结构化，但采购金额多数没有单独披露，正式上线前必须逐条接入原始文件并完成人工核验。
        </div>
      </div>
    </aside>
  );
};

const AnalysisNotice: React.FC<{ icon: React.FC<{ className?: string }>; title: string; text: string }> = ({
  icon: Icon,
  title,
  text,
}) => (
  <div className="rounded-sm border border-[#E2E6E2] bg-[#FAFBF9] p-4">
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs bg-[#1F3437] text-white">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="font-serif text-sm font-bold text-[#1F3437]">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-[#627578]">{text}</p>
      </div>
    </div>
  </div>
);

const AmountStatus: React.FC<{ status: 'disclosed' | 'estimated' | 'undisclosed' }> = ({ status }) => (
  <span
    className={`inline-flex rounded-xs border px-1.5 py-0.5 text-[9px] font-medium ${
      status === 'disclosed'
        ? 'border-[#2E6B56]/30 bg-[#2E6B56]/10 text-[#2E6B56]'
        : status === 'estimated'
        ? 'border-[#9C6E28]/30 bg-[#9C6E28]/10 text-[#9C6E28]'
        : 'border-[#D4D9D4] bg-[#F6F7F5] text-[#8C9E9F]'
    }`}
  >
    {statusLabel[status]}
  </span>
);

const RiskBadge: React.FC<{ risk: 'High' | 'Medium' | 'Low' }> = ({ risk }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-xs border px-1.5 py-0.5 text-[9px] font-medium ${
      risk === 'High'
        ? 'border-[#A84A3E]/30 bg-[#A84A3E]/10 text-[#A84A3E]'
        : risk === 'Medium'
        ? 'border-[#9C6E28]/30 bg-[#9C6E28]/10 text-[#9C6E28]'
        : 'border-[#2E6B56]/30 bg-[#2E6B56]/10 text-[#2E6B56]'
    }`}
  >
    {risk === 'High' ? <ShieldAlert className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
    {risk} 风险
  </span>
);

const EvidenceBadge: React.FC<{ relation: AutomotiveRelation }> = ({ relation }) => {
  const best = [...relation.evidence].sort((a, b) => a.level.localeCompare(b.level))[0];
  return (
    <div className="flex items-center gap-1.5">
      <BadgeCheck className="h-3.5 w-3.5 text-[#3E6F73]" />
      <div>
        <div className="text-[10px] text-[#1F3437]">{best?.level || 'D'} 级证据</div>
        <div className="text-[9px] text-[#8C9E9F]">{best?.sourceName || '待补充'}</div>
      </div>
    </div>
  );
};

const InfoCell: React.FC<{ label: string; value: string; emphasis?: boolean }> = ({ label, value, emphasis }) => (
  <div className="min-w-0">
    <div className="text-[9px] text-[#8C9E9F]">{label}</div>
    <div className={`mt-0.5 break-words text-[10px] ${emphasis ? 'font-semibold text-[#1F3437]' : 'text-[#627578]'}`}>
      {value}
    </div>
  </div>
);

const MetricBar: React.FC<{ label: string; value: number; max: number; unit: string }> = ({
  label,
  value,
  max,
  unit,
}) => (
  <div>
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-[#627578]">{label}</span>
      <span className="font-mono font-semibold text-[#1F3437]">{value}{unit}</span>
    </div>
    <div className="mt-1 h-1.5 overflow-hidden rounded-2xs bg-[#F0F2EF]">
      <div className="h-full bg-[#3E6F73]" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  </div>
);

const ExtractionBadge: React.FC<{ status: 'parsed' | 'pending' | 'manual_review' }> = ({ status }) => (
  <span
    className={`inline-flex shrink-0 items-center gap-1 rounded-xs border px-2 py-1 text-[10px] ${
      status === 'parsed'
        ? 'border-[#2E6B56]/30 bg-[#2E6B56]/10 text-[#2E6B56]'
        : status === 'manual_review'
        ? 'border-[#9C6E28]/30 bg-[#9C6E28]/10 text-[#9C6E28]'
        : 'border-[#D4D9D4] bg-[#F6F7F5] text-[#8C9E9F]'
    }`}
  >
    {status === 'parsed' ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
    {status === 'parsed' ? '已解析' : status === 'manual_review' ? '待人工复核' : '待解析'}
  </span>
);

const TimelineIcon: React.FC<{ type: 'financial' | 'capacity' | 'product' | 'capital' | 'supply' | 'policy' | 'risk' }> = ({
  type,
}) => {
  if (type === 'financial') return <TrendingUp className="h-4 w-4" />;
  if (type === 'capacity') return <Factory className="h-4 w-4" />;
  if (type === 'capital') return <CircleDollarSign className="h-4 w-4" />;
  if (type === 'supply') return <Network className="h-4 w-4" />;
  if (type === 'risk') return <ShieldAlert className="h-4 w-4" />;
  if (type === 'policy') return <FileText className="h-4 w-4" />;
  return <PieChart className="h-4 w-4" />;
};
