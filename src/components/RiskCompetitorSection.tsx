import React from 'react';
import { ShieldAlert, AlertTriangle, ShieldCheck, Swords, TrendingUp, Sparkles, Scale } from 'lucide-react';
import { SupplyChainRisk, CompetitorEntity } from '../types';

interface RiskCompetitorSectionProps {
  risks: SupplyChainRisk[];
  competitors: CompetitorEntity[];
  onSelectEntity: (name: string, category: string, details?: string) => void;
}

export const RiskCompetitorSection: React.FC<RiskCompetitorSectionProps> = ({
  risks,
  competitors,
  onSelectEntity,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Risks Assessment Card */}
      <div className="rounded-xs border border-[#E2E6E2] bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center gap-2.5 pb-3.5 border-b border-[#E2E6E2] mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xs bg-[#A84A3E]/10 text-[#A84A3E] border border-[#A84A3E]/30 shrink-0">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-[#1F3437]">
                供应链脆弱性与风险雷达
              </h2>
              <p className="text-[11px] text-[#627578]">
                卡脖子环节 · 地缘关税 · 集中度风险 · 应对举措
              </p>
            </div>
          </div>

          {/* List of Risks */}
          <div className="space-y-3">
            {risks.map((risk, idx) => {
              const isHigh = risk.severity === 'High';
              return (
                <div
                  key={idx}
                  className="rounded-xs border border-[#E2E6E2] bg-[#FAFBF9] p-3.5 shadow-2xs space-y-2.5 hover:border-[#A84A3E]/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className={`h-4 w-4 shrink-0 ${
                          isHigh ? 'text-[#A84A3E]' : 'text-[#9C6E28]'
                        }`}
                      />
                      <span className="font-serif font-bold text-sm text-[#1F3437]">
                        {risk.title}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-xs shrink-0 border ${
                        isHigh
                          ? 'bg-[#A84A3E]/10 text-[#823329] border-[#A84A3E]/35'
                          : 'bg-[#9C6E28]/10 text-[#734E14] border-[#9C6E28]/35'
                      }`}
                    >
                      风险级别: {risk.severity === 'High' ? '高 (严密监控)' : '中 (结构性)'}
                    </span>
                  </div>

                  <p className="text-xs text-[#2D4245] leading-relaxed">
                    {risk.description}
                  </p>

                  <div className="rounded-xs bg-white p-2.5 border border-[#E2E6E2] text-[11px] text-[#2D4245] flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#3E6F73] shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-[#3E6F73] font-medium">应对与对冲举措：</strong>
                      {risk.mitigationMeasure}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Competitor Benchmarks Card */}
      <div className="rounded-xs border border-[#E2E6E2] bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center gap-2.5 pb-3.5 border-b border-[#E2E6E2] mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xs bg-[#1F3437]/10 text-[#1F3437] border border-[#1F3437]/20 shrink-0">
              <Swords className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-[#1F3437]">
                行业对标与竞争格局
              </h2>
              <p className="text-[11px] text-[#627578]">
                直接对手 · 市占份额 · 当前竞争态势 · 相对竞优分析
              </p>
            </div>
          </div>

          {/* List of Competitors */}
          <div className="space-y-3">
            {competitors.map((comp) => (
              <div
                key={comp.id}
                onClick={() =>
                  onSelectEntity(
                    comp.name,
                    '竞争对手',
                    `所属区域：${comp.region}\n竞争定位：${comp.rivalryStrength}\n竞争领域：${comp.competingSegments.join('、')}\n市场份额：${comp.marketShare || '头部梯队'}\n目前竞争态势：${comp.currentStatus || '激烈竞争'}\n未来趋势：${comp.futureTrend || '持续加大研发'}\n优势：${comp.strengthsVsTarget}\n劣势：${comp.weaknessesVsTarget}`
                  )
                }
                className="group rounded-xs border border-[#E2E6E2] bg-[#FAFBF9] p-3.5 hover:border-[#1F3437] hover:bg-white cursor-pointer transition-all shadow-2xs space-y-2.5"
              >
                {/* Row 1: Name, Region, Rivalry Strength */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif font-bold text-sm text-[#1F3437] group-hover:text-[#3E6F73] transition-colors">
                      {comp.name}
                    </span>
                    <span className="text-[10px] text-[#627578] bg-white px-2 py-0.5 rounded-xs border border-[#E2E6E2]">
                      {comp.region}
                    </span>
                    {comp.marketShare && (
                      <span className="text-[10px] text-[#254E52] bg-[#3E6F73]/10 px-2 py-0.5 rounded-xs border border-[#3E6F73]/30">
                        {comp.marketShare}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-medium text-[#823329] bg-[#A84A3E]/10 px-2 py-0.5 rounded-xs border border-[#A84A3E]/30 shrink-0">
                    {comp.rivalryStrength}
                  </span>
                </div>

                <div className="text-xs text-[#627578]">
                  <strong className="text-[#1F3437] font-medium">重合竞争业务：</strong>
                  {comp.competingSegments.join(' · ')}
                </div>

                {/* Enriched Current Status & Future Trend */}
                {(comp.currentStatus || comp.futureTrend) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-xs border border-[#E2E6E2]">
                    {comp.currentStatus && (
                      <div className="text-[#2D4245] leading-tight">
                        <span className="text-[#3E6F73] font-medium">目前态势: </span>
                        {comp.currentStatus}
                      </div>
                    )}
                    {comp.futureTrend && (
                      <div className="text-[#2D4245] leading-tight">
                        <span className="text-[#5E4D78] font-medium">未来趋势: </span>
                        {comp.futureTrend}
                      </div>
                    )}
                  </div>
                )}

                {/* Relative Strengths and Weaknesses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="rounded-xs bg-[#2E6B56]/5 p-2.5 border border-[#2E6B56]/20 text-[#2D4245]">
                    <span className="font-serif font-semibold text-[#1D4739] block mb-0.5">对手相对优势：</span>
                    {comp.strengthsVsTarget}
                  </div>
                  <div className="rounded-xs bg-[#A84A3E]/5 p-2.5 border border-[#A84A3E]/20 text-[#2D4245]">
                    <span className="font-serif font-semibold text-[#823329] block mb-0.5">对手相对短板：</span>
                    {comp.weaknessesVsTarget}
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
