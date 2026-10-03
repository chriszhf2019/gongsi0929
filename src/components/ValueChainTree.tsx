import React from 'react';
import { Box, Cpu, Sparkles, Building, Landmark, Handshake, CheckCircle2 } from 'lucide-react';
import { CompanyPanoramaData } from '../types';

interface ValueChainTreeProps {
  data: CompanyPanoramaData;
  onSelectEntity: (name: string, category: string, details?: string) => void;
}

export const ValueChainTree: React.FC<ValueChainTreeProps> = ({ data, onSelectEntity }) => {
  const { valueChainSummary, upstream, downstream, investments, jointVentures, basicInfo } = data;

  return (
    <div className="w-full space-y-6">
      {/* Header Banner */}
      <div className="rounded-xs border border-[#E2E6E2] bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5 text-[#1F3437] font-serif font-bold text-base">
            <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-[#3E6F73]/10 text-[#3E6F73] border border-[#3E6F73]/30">
              <Sparkles className="h-4 w-4" />
            </div>
            <span>产业链价值流动与业务全景矩阵</span>
          </div>
          <span className="text-xs text-[#627578] bg-[#F6F7F5] px-3 py-1 rounded-xs border border-[#E2E6E2] font-serif">
            全价值链穿透模型 (Value Stream Mapping)
          </span>
        </div>
        <p className="text-xs text-[#627578] leading-relaxed">
          展示从“上游原材料与基础要素” ➔ “{basicInfo.name} 核心研发/制造工序” ➔ “核心产出品/服务” ➔ “终端客户与分销渠道” 的全链条流向，以及资本与合资生态延伸。
        </p>
      </div>

      {/* Main 4-Stage Value Chain Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
        {/* Stage 1: Raw Materials & Inputs */}
        <div className="rounded-xs border border-[#E2E6E2] bg-white p-4 relative flex flex-col justify-between shadow-2xs hover:border-[#3E6F73] transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E6E2] mb-3">
              <span className="font-serif text-xs font-bold text-[#3E6F73] flex items-center gap-1.5">
                <Box className="h-4 w-4" />
                1. 上游要素与原料投入
              </span>
              <span className="text-[10px] bg-[#3E6F73]/10 text-[#254E52] px-2 py-0.5 rounded-xs font-mono border border-[#3E6F73]/25">
                Inputs
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="text-[11px] font-serif font-semibold text-[#627578]">核心供应物料/要素：</div>
              <ul className="space-y-1.5">
                {(valueChainSummary?.rawMaterialsInput || ['基础材料与核心原件', '关键零部件', '生产设备工具']).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-xs text-[#2D4245]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#3E6F73] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Key Suppliers List */}
          <div className="mt-4 pt-3 border-t border-[#EAECE8]">
            <div className="text-[11px] font-serif font-semibold text-[#3E6F73] mb-2">代表性核心供应商：</div>
            <div className="flex flex-wrap gap-1.5">
              {upstream.slice(0, 4).map((up) => (
                <button
                  key={up.id}
                  onClick={() => onSelectEntity(up.name, '上游供应商', `${up.supplies} (依赖度:${up.dependenceLevel})`)}
                  className="rounded-xs bg-[#FAFBF9] hover:bg-[#3E6F73]/10 px-2 py-1 text-[11px] text-[#1F3437] hover:text-[#3E6F73] border border-[#E2E6E2] transition-colors text-left truncate max-w-full"
                >
                  {up.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stage 2: Core Processing & Innovation */}
        <div className="rounded-xs border border-[#E2E6E2] bg-white p-4 relative flex flex-col justify-between shadow-2xs hover:border-[#1F3437] transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E6E2] mb-3">
              <span className="font-serif text-xs font-bold text-[#1F3437] flex items-center gap-1.5">
                <Cpu className="h-4 w-4 text-[#3E6F73]" />
                2. 核心制造 / 研发工序
              </span>
              <span className="text-[10px] bg-[#1F3437]/10 text-[#1F3437] px-2 py-0.5 rounded-xs font-mono border border-[#1F3437]/20">
                Process
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="text-[11px] font-serif font-semibold text-[#627578]">核心工序与技术壁垒：</div>
              <ul className="space-y-1.5">
                {(valueChainSummary?.coreManufacturingProcess || ['核心系统研发', '精密封装与自动化制造', '品质控制与规模集成']).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-xs text-[#2D4245]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#1F3437] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#EAECE8]">
            <div className="text-[11px] font-serif font-semibold text-[#1F3437] mb-1">自研与整合能力：</div>
            <p className="text-[11px] text-[#627578] leading-relaxed line-clamp-2">
              {basicInfo.strategicMoat}
            </p>
          </div>
        </div>

        {/* Stage 3: Products & Offerings */}
        <div className="rounded-xs border border-[#E2E6E2] bg-white p-4 relative flex flex-col justify-between shadow-2xs hover:border-[#5E4D78] transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E6E2] mb-3">
              <span className="font-serif text-xs font-bold text-[#5E4D78] flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" />
                3. 终端产品与服务矩阵
              </span>
              <span className="text-[10px] bg-[#5E4D78]/10 text-[#433557] px-2 py-0.5 rounded-xs font-mono border border-[#5E4D78]/25">
                Outputs
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="text-[11px] font-serif font-semibold text-[#627578]">主力产品线与解决方案：</div>
              <ul className="space-y-1.5">
                {(valueChainSummary?.finalProductsServices || ['核心终端产品', '增值订阅生态', '系统级解决方案']).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-xs text-[#2D4245]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#5E4D78] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#EAECE8]">
            <div className="text-[11px] font-serif font-semibold text-[#5E4D78] mb-1">业务架构定位：</div>
            <div className="text-[11px] text-[#627578] truncate">
              {basicInfo.subIndustry}
            </div>
          </div>
        </div>

        {/* Stage 4: End Markets & Customers */}
        <div className="rounded-xs border border-[#E2E6E2] bg-white p-4 relative flex flex-col justify-between shadow-2xs hover:border-[#2E6B56] transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E6E2] mb-3">
              <span className="font-serif text-xs font-bold text-[#2E6B56] flex items-center gap-1.5">
                <Building className="h-4 w-4" />
                4. 终端客户与分销渠道
              </span>
              <span className="text-[10px] bg-[#2E6B56]/10 text-[#1D4739] px-2 py-0.5 rounded-xs font-mono border border-[#2E6B56]/25">
                Markets
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="text-[11px] font-serif font-semibold text-[#627578]">主要目标客群与市场：</div>
              <ul className="space-y-1.5">
                {(valueChainSummary?.endMarkets || ['大众消费者群体', '企业级大客户采购', '全球分销零售网络']).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-xs text-[#2D4245]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#2E6B56] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#EAECE8]">
            <div className="text-[11px] font-serif font-semibold text-[#2E6B56] mb-2">代表性核心客群/伙伴：</div>
            <div className="flex flex-wrap gap-1.5">
              {downstream.slice(0, 3).map((down) => (
                <button
                  key={down.id}
                  onClick={() => onSelectEntity(down.name, '下游客户', `${down.productOrServicePurchased} (粘性:${down.customerStickiness})`)}
                  className="rounded-xs bg-[#FAFBF9] hover:bg-[#2E6B56]/10 px-2 py-1 text-[11px] text-[#1F3437] hover:text-[#2E6B56] border border-[#E2E6E2] transition-colors text-left truncate max-w-full"
                >
                  {down.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Extended Ecosystem: Capital & Joint Ventures Dual Wings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Wing: Investment & Subsidiaries */}
        <div className="rounded-xs border border-[#E2E6E2] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E6E2] mb-4">
            <div className="flex items-center gap-2 text-[#433557] font-serif font-bold text-sm">
              <Landmark className="h-4 w-4 text-[#5E4D78]" />
              <span>资本与投资生态翼 (CVC & Subsidiaries)</span>
            </div>
            <span className="text-xs font-serif text-[#433557] bg-[#5E4D78]/10 px-2 py-0.5 rounded-xs border border-[#5E4D78]/25">
              共 {investments.length} 个重点实体
            </span>
          </div>

          <div className="space-y-2">
            {investments.slice(0, 4).map((inv) => (
              <div
                key={inv.id}
                onClick={() => onSelectEntity(inv.name, inv.typeLabel, `持股：${inv.shareholdingRatio || '参股'} | ${inv.strategicGoal}`)}
                className="group flex items-start justify-between p-2.5 rounded-xs bg-[#FAFBF9] border border-[#E2E6E2] hover:border-[#5E4D78] cursor-pointer transition-all hover:bg-white"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-semibold text-xs text-[#1F3437] group-hover:text-[#5E4D78] transition-colors truncate">
                      {inv.name}
                    </span>
                    <span className="rounded-xs bg-[#5E4D78]/10 px-1.5 py-0.5 text-[10px] text-[#433557] border border-[#5E4D78]/20 shrink-0">
                      {inv.typeLabel}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#627578] truncate mt-0.5">
                    {inv.industryDomain} · {inv.strategicGoal}
                  </div>
                </div>
                {inv.shareholdingRatio && (
                  <span className="font-mono text-xs font-bold text-[#433557] shrink-0">
                    {inv.shareholdingRatio}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Wing: Joint Ventures & Alliances */}
        <div className="rounded-xs border border-[#E2E6E2] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E6E2] mb-4">
            <div className="flex items-center gap-2 text-[#734E14] font-serif font-bold text-sm">
              <Handshake className="h-4 w-4 text-[#9C6E28]" />
              <span>战略联盟与合资生态翼 (Joint Ventures)</span>
            </div>
            <span className="text-xs font-serif text-[#734E14] bg-[#9C6E28]/10 px-2 py-0.5 rounded-xs border border-[#9C6E28]/25">
              共 {jointVentures.length} 个重点合作
            </span>
          </div>

          <div className="space-y-2">
            {jointVentures.map((jv) => (
              <div
                key={jv.id}
                onClick={() => onSelectEntity(jv.name, '合资合作', `合作方：${jv.partnerNames.join(', ')} | ${jv.cooperationScope}`)}
                className="group flex flex-col p-2.5 rounded-xs bg-[#FAFBF9] border border-[#E2E6E2] hover:border-[#9C6E28] cursor-pointer transition-all hover:bg-white"
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif font-semibold text-xs text-[#1F3437] group-hover:text-[#9C6E28] transition-colors truncate">
                    {jv.name}
                  </span>
                  <span className="text-[10px] text-[#734E14] font-mono">
                    {jv.shareholdingSummary}
                  </span>
                </div>
                <div className="text-[11px] text-[#627578] truncate mt-1">
                  合资方：{jv.partnerNames.join('、')}
                </div>
                <div className="text-[11px] text-[#627578] mt-0.5 line-clamp-1">
                  项目：{jv.keyProductsOrProjects}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
