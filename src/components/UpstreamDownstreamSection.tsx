import React, { useState } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  Swords,
  Sparkles,
  Percent,
} from 'lucide-react';
import { UpstreamEntity, DownstreamEntity } from '../types';
import { SourceBadge } from './SourceBadge';

interface UpstreamDownstreamSectionProps {
  upstream: UpstreamEntity[];
  downstream: DownstreamEntity[];
  onSelectEntity: (name: string, category: string, details?: string) => void;
}

export const UpstreamDownstreamSection: React.FC<UpstreamDownstreamSectionProps> = ({
  upstream,
  downstream,
  onSelectEntity,
}) => {
  const [upstreamFilter, setUpstreamFilter] = useState<'all' | 'high_dependence' | 'domestic' | 'foreign'>('all');
  const [downstreamFilter, setDownstreamFilter] = useState<'all' | 'high_stickiness' | 'b2b' | 'b2c'>('all');

  const filteredUpstream = upstream.filter((item) => {
    if (upstreamFilter === 'high_dependence') return item.dependenceLevel === 'High';
    if (upstreamFilter === 'domestic') return item.isDomestic;
    if (upstreamFilter === 'foreign') return !item.isDomestic;
    return true;
  });

  const filteredDownstream = downstream.filter((item) => {
    if (downstreamFilter === 'high_stickiness') return item.customerStickiness === 'High';
    if (downstreamFilter === 'b2b') return item.segmentType === 'enterprise_b2b';
    if (downstreamFilter === 'b2c') return item.segmentType === 'consumer_b2c';
    return true;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Upstream Suppliers Card */}
      <div className="rounded-xs border border-[#E2E6E2] bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-[#E2E6E2] mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xs bg-[#3E6F73]/10 text-[#3E6F73] border border-[#3E6F73]/30 shrink-0">
                <ArrowUpRight className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-serif text-base font-bold text-[#1F3437]">
                  上游核心供应商链条
                </h2>
                <p className="text-[11px] text-[#627578]">
                  原材料 · 核心零部件 · 高端装备 · 基础软件与替代竞争
                </p>
              </div>
            </div>

            {/* Quick Filter */}
            <div className="flex items-center gap-0.5 text-xs bg-[#F0F2EF] p-0.5 rounded-xs border border-[#E2E6E2] shrink-0">
              <button
                onClick={() => setUpstreamFilter('all')}
                className={`px-2 py-0.5 rounded-xs font-serif transition-colors ${
                  upstreamFilter === 'all'
                    ? 'bg-[#1F3437] text-white font-medium shadow-xs'
                    : 'text-[#627578] hover:text-[#1F3437]'
                }`}
              >
                全部 ({upstream.length})
              </button>
              <button
                onClick={() => setUpstreamFilter('high_dependence')}
                className={`px-2 py-0.5 rounded-xs font-serif transition-colors ${
                  upstreamFilter === 'high_dependence'
                    ? 'bg-[#A84A3E] text-white font-medium shadow-xs'
                    : 'text-[#627578] hover:text-[#1F3437]'
                }`}
              >
                高依赖
              </button>
              <button
                onClick={() => setUpstreamFilter('foreign')}
                className={`px-2 py-0.5 rounded-xs font-serif transition-colors ${
                  upstreamFilter === 'foreign'
                    ? 'bg-[#1F3437] text-white font-medium shadow-xs'
                    : 'text-[#627578] hover:text-[#1F3437]'
                }`}
              >
                海外进口
              </button>
            </div>
          </div>

          {/* Supplier Cards List */}
          <div className="space-y-3">
            {filteredUpstream.map((item) => {
              const isHigh = item.dependenceLevel === 'High';
              return (
                <div
                  key={item.id}
                  onClick={() =>
                    onSelectEntity(
                      item.name,
                      `上游供应商 (${item.categoryLabel})`,
                      `供货内容：${item.supplies}\n合作起始：${item.cooperationStartYear || item.cooperationYears || '长期战略合作'}\n目前供货现状：${item.currentStatus || '正常保供'}\n主要竞争对手/替代：${item.competitors || '多渠道可比选'}\n未来趋势：${item.futureTrend || '持续工艺升级'}\n战略影响：${item.strategicImpact}`
                    )
                  }
                  className="group rounded-xs border border-[#E2E6E2] bg-[#FAFBF9] p-3.5 hover:border-[#3E6F73] hover:bg-white cursor-pointer transition-all shadow-2xs space-y-2.5"
                >
                  {/* Row 1: Name, Ticker, Category badge, Dependence badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-serif font-bold text-sm text-[#1F3437] group-hover:text-[#3E6F73] transition-colors">
                        {item.name}
                      </span>
                      {item.ticker && (
                        <span className="text-[10px] font-mono text-[#627578] bg-white px-1.5 py-0.5 rounded-xs border border-[#E2E6E2]">
                          {item.ticker}
                        </span>
                      )}
                      <span className="rounded-xs bg-[#3E6F73]/10 px-2 py-0.5 text-[10px] font-medium text-[#254E52] border border-[#3E6F73]/30">
                        {item.categoryLabel}
                      </span>
                      <SourceBadge evidence={item.evidence} compact />
                    </div>

                    {/* Dependence badge */}
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-xs shrink-0 border ${
                        isHigh
                          ? 'bg-[#A84A3E]/10 text-[#823329] border-[#A84A3E]/35'
                          : item.dependenceLevel === 'Medium'
                          ? 'bg-[#9C6E28]/10 text-[#734E14] border-[#9C6E28]/35'
                          : 'bg-white text-[#627578] border-[#E2E6E2]'
                      }`}
                    >
                      依赖度: {item.dependenceLevel === 'High' ? '高 (核心卡位)' : item.dependenceLevel === 'Medium' ? '中 (稳定供应)' : '低 (多源可替)'}
                    </span>
                  </div>

                  {/* Supply summary */}
                  <div className="text-xs text-[#2D4245]">
                    <strong className="text-[#3E6F73] font-medium">供给物料/方案：</strong>
                    {item.supplies}
                  </div>

                  {/* Enriched Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-xs border border-[#E2E6E2]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[#627578]">
                        <Calendar className="h-3 w-3 text-[#3E6F73] shrink-0" />
                        <span>合作历程: {item.cooperationStartYear || item.cooperationYears || '长期协同'}</span>
                      </div>
                      {item.currentStatus && (
                        <div className="text-[#2D4245] leading-tight">
                          <span className="text-[#627578]">供货现状: </span>
                          {item.currentStatus}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      {item.competitors && (
                        <div className="flex items-start gap-1 text-[#2D4245]">
                          <Swords className="h-3 w-3 text-[#9C6E28] shrink-0 mt-0.5" />
                          <span className="text-[#627578] shrink-0">替代对手: </span>
                          <span className="truncate">{item.competitors}</span>
                        </div>
                      )}
                      {item.futureTrend && (
                        <div className="flex items-start gap-1 text-[#2D4245]">
                          <Sparkles className="h-3 w-3 text-[#5E4D78] shrink-0 mt-0.5" />
                          <span className="text-[#627578] shrink-0">演进趋势: </span>
                          <span className="truncate">{item.futureTrend}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Country & Impact */}
                  <div className="flex items-center justify-between text-[11px] text-[#627578] pt-1 border-t border-[#EAECE8]">
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-3 w-3 text-[#8C9E9F]" />
                      <span>{item.originCountry} ({item.isDomestic ? '国内自主' : '跨国供应'})</span>
                    </div>
                    <span className="text-[#627578] text-right truncate max-w-[200px]" title={item.strategicImpact}>
                      {item.strategicImpact}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Downstream Customers Card */}
      <div className="rounded-xs border border-[#E2E6E2] bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-[#E2E6E2] mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xs bg-[#2E6B56]/10 text-[#2E6B56] border border-[#2E6B56]/30 shrink-0">
                <ArrowDownRight className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-serif text-base font-bold text-[#1F3437]">
                  下游客户与分销渠道
                </h2>
                <p className="text-[11px] text-[#627578]">
                  主流客群 · 核心企业采购 · 渠道网络 · 竞争替代与未来演进
                </p>
              </div>
            </div>

            {/* Quick Filter */}
            <div className="flex items-center gap-0.5 text-xs bg-[#F0F2EF] p-0.5 rounded-xs border border-[#E2E6E2] shrink-0">
              <button
                onClick={() => setDownstreamFilter('all')}
                className={`px-2 py-0.5 rounded-xs font-serif transition-colors ${
                  downstreamFilter === 'all'
                    ? 'bg-[#1F3437] text-white font-medium shadow-xs'
                    : 'text-[#627578] hover:text-[#1F3437]'
                }`}
              >
                全部 ({downstream.length})
              </button>
              <button
                onClick={() => setDownstreamFilter('b2b')}
                className={`px-2 py-0.5 rounded-xs font-serif transition-colors ${
                  downstreamFilter === 'b2b'
                    ? 'bg-[#1F3437] text-white font-medium shadow-xs'
                    : 'text-[#627578] hover:text-[#1F3437]'
                }`}
              >
                B2B企业
              </button>
              <button
                onClick={() => setDownstreamFilter('b2c')}
                className={`px-2 py-0.5 rounded-xs font-serif transition-colors ${
                  downstreamFilter === 'b2c'
                    ? 'bg-[#2E6B56] text-white font-medium shadow-xs'
                    : 'text-[#627578] hover:text-[#1F3437]'
                }`}
              >
                C端大众
              </button>
            </div>
          </div>

          {/* Customers Cards List */}
          <div className="space-y-3">
            {filteredDownstream.map((item) => (
              <div
                key={item.id}
                onClick={() =>
                  onSelectEntity(
                    item.name,
                    `下游客群 (${item.segmentLabel})`,
                    `采购品类：${item.productOrServicePurchased}\n收入贡献估算：${item.revenueContributionEst}\n合作起始：${item.cooperationStartYear || '长期合作'}\n目前订单与合作现状：${item.currentStatus || '稳定订单交付'}\n客户备选/竞品采购：${item.competitorAlternatives || '多供应商策略'}\n未来需求趋势：${item.futureTrend || '持续扩大采购需求'}\n合作概要：${item.relationshipSummary}`
                  )
                }
                className="group rounded-xs border border-[#E2E6E2] bg-[#FAFBF9] p-3.5 hover:border-[#2E6B56] hover:bg-white cursor-pointer transition-all shadow-2xs space-y-2.5"
              >
                {/* Row 1: Name, Segment, Revenue badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif font-bold text-sm text-[#1F3437] group-hover:text-[#2E6B56] transition-colors">
                      {item.name}
                    </span>
                    <span className="rounded-xs bg-[#2E6B56]/10 px-2 py-0.5 text-[10px] font-medium text-[#1D4739] border border-[#2E6B56]/30">
                      {item.segmentLabel}
                    </span>
                    <SourceBadge evidence={item.evidence} compact />
                  </div>

                  <span className="text-[10px] font-mono font-bold text-[#1D4739] bg-[#2E6B56]/10 px-2 py-0.5 rounded-xs border border-[#2E6B56]/30 shrink-0">
                    营收占比: {item.revenueContributionEst}
                  </span>
                </div>

                <div className="text-xs text-[#2D4245]">
                  <strong className="text-[#2E6B56] font-medium">采购产品/服务：</strong>
                  {item.productOrServicePurchased}
                </div>

                {/* Enriched Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-xs border border-[#E2E6E2]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[#627578]">
                      <Calendar className="h-3 w-3 text-[#2E6B56] shrink-0" />
                      <span>合作建立: {item.cooperationStartYear || '长期深耕'}</span>
                    </div>
                    {item.currentStatus && (
                      <div className="text-[#2D4245] leading-tight">
                        <span className="text-[#627578]">客群现状: </span>
                        {item.currentStatus}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    {item.competitorAlternatives && (
                      <div className="flex items-start gap-1 text-[#2D4245]">
                        <Swords className="h-3 w-3 text-[#9C6E28] shrink-0 mt-0.5" />
                        <span className="text-[#627578] shrink-0">其他备选: </span>
                        <span className="truncate">{item.competitorAlternatives}</span>
                      </div>
                    )}
                    {item.futureTrend && (
                      <div className="flex items-start gap-1 text-[#2D4245]">
                        <Sparkles className="h-3 w-3 text-[#5E4D78] shrink-0 mt-0.5" />
                        <span className="text-[#627578] shrink-0">需求演进: </span>
                        <span className="truncate">{item.futureTrend}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Stickiness & Region */}
                <div className="flex items-center justify-between text-[11px] text-[#627578] pt-1 border-t border-[#EAECE8]">
                  <div className="flex items-center gap-1.5">
                    <span>覆盖区域: {item.targetRegion}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#2D4245]">
                    <span>客群粘性:</span>
                    <span className={`font-semibold ${item.customerStickiness === 'High' ? 'text-[#2E6B56]' : 'text-[#627578]'}`}>
                      {item.customerStickiness === 'High' ? '极高 (深度绑定)' : item.customerStickiness === 'Medium' ? '中等' : '灵活'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
