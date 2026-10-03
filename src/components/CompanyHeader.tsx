import React from 'react';
import {
  Building2,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Star,
  ShieldCheck,
  Tag,
  TrendingUp,
  PieChart,
  Sparkles,
  Clock,
} from 'lucide-react';
import { CompanyBasicInfo } from '../types';
import { DataSourceBadge } from './DataSourceBadge';

interface CompanyHeaderProps {
  info: CompanyBasicInfo;
  executiveSummary: string;
  /** 数据生成时间戳 */
  timestamp?: number;
  /** 是否为预设示例数据（来自 DEMO_COMPANIES） */
  isDemoData?: boolean;
}

export const CompanyHeader: React.FC<CompanyHeaderProps> = ({
  info,
  executiveSummary,
  timestamp,
  isDemoData = false,
}) => {
  return (
    <div className="w-full rounded-sm border border-[#E2E6E2] bg-white p-5 sm:p-7 shadow-xs space-y-6">
      {/* Top Header: Company Name, Ticker, Industry tags, Moat Rating */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-[#E2E6E2] pb-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1F3437] tracking-tight">
              {info.name}
            </h1>
            {info.englishName && (
              <span className="text-xs sm:text-sm text-[#627578] font-mono">
                {info.englishName}
              </span>
            )}
            {info.ticker && (
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-xs bg-[#F6F7F5] text-[#1F3437] border border-[#D4D9D4] font-medium">
                {info.ticker} {info.exchange ? `· ${info.exchange}` : ''}
              </span>
            )}
          </div>

          <p className="text-xs sm:text-sm text-[#2D4245] leading-relaxed max-w-4xl pt-1">
            {info.businessSummary}
          </p>

          {/* Industry Tags */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-xs text-[#8C9E9F]">主营领域:</span>
            <span className="text-xs font-serif font-semibold text-[#3E6F73] px-2 py-0.5 rounded-xs bg-[#3E6F73]/10 border border-[#3E6F73]/20">
              {info.industry}
            </span>
            {info.subIndustry && (
              <span className="text-xs text-[#627578] px-2 py-0.5 rounded-xs bg-[#F6F7F5] border border-[#E2E6E2]">
                {info.subIndustry}
              </span>
            )}
            {info.tags &&
              info.tags.slice(0, 4).map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs text-[#627578] px-2 py-0.5 rounded-xs bg-[#F6F7F5] border border-[#E2E6E2]"
                >
                  {tag}
                </span>
              ))}
          </div>
        </div>

        {/* Strategic Moat Rating Stamp + Data Source Badge */}
        <div className="flex flex-col items-end gap-2 self-start md:self-auto">
          <div className="flex shrink-0 items-center gap-3 rounded-xs border border-[#E2E6E2] bg-[#FBFBFA] px-4 py-3">
            <div>
              <div className="text-[10px] font-serif font-semibold uppercase tracking-wider text-[#627578]">
                护城河商业壁垒
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex text-[#3E6F73]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        i < info.moatScore
                          ? 'fill-[#3E6F73] text-[#3E6F73]'
                          : 'text-[#D4D9D4]'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-mono text-xs font-bold text-[#1F3437]">
                  {info.moatScore}.0 / 5.0
                </span>
              </div>
            </div>
          </div>

          {/* Data Source & Freshness Badge */}
          <div className="flex flex-col items-end gap-1">
            <DataSourceBadge sourceType={isDemoData ? 'demo' : 'hybrid'} />
            {timestamp && (
              <div className="flex items-center gap-1 text-[10px] text-[#8C9E9F] font-mono">
                <Clock className="h-3 w-3" />
                <span>数据生成于 {new Date(timestamp).toLocaleString('zh-CN')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Core Operational & Industrial Data Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Market Cap & Revenue */}
        <div className="rounded-xs border border-[#E2E6E2] bg-[#FAFBF9] p-3.5 space-y-1">
          <div className="flex items-center gap-1 text-[11px] text-[#627578]">
            <DollarSign className="h-3.5 w-3.5 text-[#3E6F73]" />
            <span>市值估值 / 年营收</span>
          </div>
          <div className="font-mono font-bold text-sm sm:text-base text-[#1F3437] leading-snug">
            {info.marketCapOrValuation || '领军规模'}
          </div>
          <div className="text-[11px] text-[#627578] leading-snug">
            {info.annualRevenue ? `营收：${info.annualRevenue}` : '未公开具体季度'}
          </div>
        </div>

        {/* Market Share & Stance */}
        <div className="rounded-xs border border-[#E2E6E2] bg-[#FAFBF9] p-3.5 space-y-1">
          <div className="flex items-center gap-1 text-[11px] text-[#627578]">
            <PieChart className="h-3.5 w-3.5 text-[#3E6F73]" />
            <span>细分市占率 & 排名</span>
          </div>
          <div className="font-serif font-semibold text-xs sm:text-sm text-[#1F3437] leading-snug">
            {info.marketShare || '行业前列头部领跑'}
          </div>
          <div className="text-[11px] text-[#627578] leading-snug">
            {info.keyCompetitorSummary || '全球/国内标准制定者'}
          </div>
        </div>

        {/* Headquarters & Founding */}
        <div className="rounded-xs border border-[#E2E6E2] bg-[#FAFBF9] p-3.5 space-y-1">
          <div className="flex items-center gap-1 text-[11px] text-[#627578]">
            <MapPin className="h-3.5 w-3.5 text-[#3E6F73]" />
            <span>注册总部 & 历程</span>
          </div>
          <div className="font-serif font-semibold text-xs sm:text-sm text-[#1F3437] leading-snug">
            {info.headquarters}
          </div>
          <div className="text-[11px] text-[#627578] leading-snug">
            {info.foundingYear || info.establishedYear
              ? `创立于 ${info.foundingYear || info.establishedYear}`
              : '成熟运营'}
          </div>
        </div>

        {/* Governance & Core Leadership */}
        <div className="rounded-xs border border-[#E2E6E2] bg-[#FAFBF9] p-3.5 space-y-1">
          <div className="flex items-center gap-1 text-[11px] text-[#627578]">
            <Users className="h-3.5 w-3.5 text-[#3E6F73]" />
            <span>核心决策领军团队</span>
          </div>
          <div className="font-serif font-semibold text-xs sm:text-sm text-[#1F3437] leading-snug">
            {info.keyLeaders && info.keyLeaders[0] ? info.keyLeaders[0] : '核心高管团队'}
          </div>
          <div className="text-[11px] text-[#627578] leading-snug">
            {info.keyLeaders && info.keyLeaders.length > 1
              ? info.keyLeaders.slice(1, 3).join(' · ')
              : '治理体系成熟'}
          </div>
        </div>
      </div>

      {/* Operational Dynamics & Trend Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xs border border-[#E2E6E2] bg-white p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#1F3437]">
            <TrendingUp className="h-3.5 w-3.5 text-[#3E6F73]" />
            <span>目前经营态势</span>
          </div>
          <p className="text-xs text-[#2D4245] leading-relaxed">
            {info.currentStatus || '核心业务产能充沛，产品周期稳健迭代，国内与海外渠道出海提速。'}
          </p>
        </div>

        <div className="rounded-xs border border-[#E2E6E2] bg-white p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#1F3437]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#3E6F73]" />
            <span>核心技术与商业壁垒</span>
          </div>
          <p className="text-xs text-[#2D4245] leading-relaxed">
            {info.strategicMoat || '具备全产业链垂直一体化优势与自主专利闭环，客户粘性高。'}
          </p>
        </div>

        <div className="rounded-xs border border-[#E2E6E2] bg-white p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#1F3437]">
            <Sparkles className="h-3.5 w-3.5 text-[#3E6F73]" />
            <span>未来 3-5 年战略演进</span>
          </div>
          <p className="text-xs text-[#2D4245] leading-relaxed">
            {info.futureTrend || '向高阶智能化、超低碳供应链与海外本地化制造纵深推进。'}
          </p>
        </div>
      </div>

      {/* Executive Summary Archive Card */}
      {executiveSummary && (
        <div className="p-4 rounded-xs bg-[#FBFBFA] border-l-3 border-[#3E6F73] border-t border-r border-b border-[#E2E6E2] space-y-1">
          <div className="text-xs font-serif font-bold text-[#1F3437] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3E6F73]" />
            <span>鉴源研判总述 (Executive Summary)</span>
          </div>
          <p className="text-xs sm:text-sm text-[#2D4245] leading-relaxed">
            {executiveSummary}
          </p>
        </div>
      )}
    </div>
  );
};
