import React, { useState } from 'react';
import { Landmark, Handshake, Percent, Calendar, ShieldCheck, Sparkles, Building, ExternalLink } from 'lucide-react';
import { InvestmentEntity, JointVentureEntity } from '../types';

interface InvestmentsJvSectionProps {
  investments: InvestmentEntity[];
  jointVentures: JointVentureEntity[];
  onSelectEntity: (name: string, category: string, details?: string) => void;
}

export const InvestmentsJvSection: React.FC<InvestmentsJvSectionProps> = ({
  investments,
  jointVentures,
  onSelectEntity,
}) => {
  const [invFilter, setInvFilter] = useState<'all' | 'subsidiaries' | 'cvc'>('all');

  const filteredInvestments = investments.filter((item) => {
    if (invFilter === 'subsidiaries') return item.type === 'wholly_owned' || item.type === 'majority_owned';
    if (invFilter === 'cvc') return item.type === 'minority_cvc' || item.type === 'incubated';
    return true;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Investments & Subsidiaries Card */}
      <div className="rounded-xs border border-[#E2E6E2] bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-[#E2E6E2] mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xs bg-[#5E4D78]/10 text-[#5E4D78] border border-[#5E4D78]/30">
                <Landmark className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-serif text-base font-bold text-[#1F3437]">
                  对外投资与核心子公司
                </h2>
                <p className="text-[11px] text-[#627578]">
                  全资控股 · CVC战略孵化 · 少数股权参股
                </p>
              </div>
            </div>

            {/* Quick Filter */}
            <div className="flex items-center gap-0.5 text-xs bg-[#F0F2EF] p-0.5 rounded-xs border border-[#E2E6E2]">
              <button
                onClick={() => setInvFilter('all')}
                className={`px-2 py-0.5 rounded-xs font-serif transition-colors ${
                  invFilter === 'all' ? 'bg-[#1F3437] text-white font-medium shadow-xs' : 'text-[#627578] hover:text-[#1F3437]'
                }`}
              >
                全部 ({investments.length})
              </button>
              <button
                onClick={() => setInvFilter('subsidiaries')}
                className={`px-2 py-0.5 rounded-xs font-serif transition-colors ${
                  invFilter === 'subsidiaries' ? 'bg-[#1F3437] text-white font-medium shadow-xs' : 'text-[#627578] hover:text-[#1F3437]'
                }`}
              >
                控股子公司
              </button>
              <button
                onClick={() => setInvFilter('cvc')}
                className={`px-2 py-0.5 rounded-xs font-serif transition-colors ${
                  invFilter === 'cvc' ? 'bg-[#5E4D78] text-white font-medium shadow-xs' : 'text-[#627578] hover:text-[#1F3437]'
                }`}
              >
                CVC战投
              </button>
            </div>
          </div>

          {/* List of Investments */}
          <div className="space-y-3">
            {filteredInvestments.map((item) => {
              const isWholly = item.type === 'wholly_owned';
              return (
                <div
                  key={item.id}
                  onClick={() =>
                    onSelectEntity(
                      item.name,
                      item.typeLabel,
                      `所属赛道：${item.industryDomain}\n持股比例：${item.shareholdingRatio || '参股'}\n战略目的：${item.strategicGoal}`
                    )
                  }
                  className="group rounded-xs border border-[#E2E6E2] bg-[#FAFBF9] p-3.5 hover:border-[#5E4D78] hover:bg-white cursor-pointer transition-all shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-serif font-bold text-sm text-[#1F3437] group-hover:text-[#5E4D78] transition-colors">
                        {item.name}
                      </span>
                      <span
                        className={`rounded-xs px-2 py-0.5 text-[10px] font-medium border ${
                          isWholly
                            ? 'bg-[#5E4D78]/10 text-[#433557] border-[#5E4D78]/30'
                            : 'bg-white text-[#627578] border-[#E2E6E2]'
                        }`}
                      >
                        {item.typeLabel}
                      </span>
                    </div>

                    {item.shareholdingRatio && (
                      <span className="text-xs font-mono font-bold text-[#433557] bg-[#5E4D78]/10 px-2 py-0.5 rounded-xs border border-[#5E4D78]/25 shrink-0">
                        持股: {item.shareholdingRatio}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-[#2D4245] mb-2">
                    <strong className="text-[#5E4D78] font-medium">主营领域：</strong>
                    {item.industryDomain}
                  </div>

                  <div className="text-[11px] text-[#627578] pt-2 border-t border-[#EAECE8] flex items-start gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#3E6F73] shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-[#1F3437] font-medium">战略协同：</strong>
                      {item.strategicGoal}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Joint Ventures Card */}
      <div className="rounded-xs border border-[#E2E6E2] bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-[#E2E6E2] mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xs bg-[#9C6E28]/10 text-[#9C6E28] border border-[#9C6E28]/30">
                <Handshake className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-serif text-base font-bold text-[#1F3437]">
                  合资联营企业与战略联盟
                </h2>
                <p className="text-[11px] text-[#627578]">
                  强强联合 · 全球合资工厂 · 共建研发生态
                </p>
              </div>
            </div>

            <span className="text-xs font-serif text-[#734E14] bg-[#9C6E28]/10 px-2.5 py-1 rounded-xs border border-[#9C6E28]/30">
              共 {jointVentures.length} 个重点实体
            </span>
          </div>

          {/* List of JVs */}
          <div className="space-y-3">
            {jointVentures.map((item) => (
              <div
                key={item.id}
                onClick={() =>
                  onSelectEntity(
                    item.name,
                    '合资/联盟企业',
                    `合资伙伴：${item.partnerNames.join('、')}\n股权结构：${item.shareholdingSummary}\n合作范围：${item.cooperationScope}\n重点项目：${item.keyProductsOrProjects}\n战略价值：${item.strategicValue}`
                  )
                }
                className="group rounded-xs border border-[#E2E6E2] bg-[#FAFBF9] p-3.5 hover:border-[#9C6E28] hover:bg-white cursor-pointer transition-all shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif font-bold text-sm text-[#1F3437] group-hover:text-[#9C6E28] transition-colors">
                      {item.name}
                    </span>
                  </div>

                  <span className="text-xs font-mono font-bold text-[#734E14] bg-[#9C6E28]/10 px-2 py-0.5 rounded-xs border border-[#9C6E28]/30 shrink-0">
                    {item.shareholdingSummary}
                  </span>
                </div>

                <div className="text-xs text-[#2D4245] mb-1.5">
                  <strong className="text-[#9C6E28] font-medium">合作方：</strong>
                  {item.partnerNames.join('、')}
                </div>

                <div className="text-xs text-[#2D4245] mb-2">
                  <strong className="text-[#9C6E28] font-medium">核心业务/重点项目：</strong>
                  {item.keyProductsOrProjects}
                </div>

                <div className="text-[11px] text-[#627578] pt-2 border-t border-[#EAECE8] flex items-start gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#3E6F73] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-[#1F3437] font-medium">战略定位：</strong>
                    {item.strategicValue}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
