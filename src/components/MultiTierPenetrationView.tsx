import React, { useState } from 'react';
import {
  Layers,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { CompanyPanoramaData } from '../types';

export interface TierNode {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  category: string;
  material: string;
  originCountry: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  bottleneckType?: '地缘垄断' | '专利壁垒' | '纯单源外采' | '产能紧缺' | '自给率高';
  subSuppliers?: TierNode[];
  impactDescription: string;
  substitutionDifficulty: '极高' | '中等' | '容易';
}

interface MultiTierPenetrationViewProps {
  data: CompanyPanoramaData;
  onSelectEntity: (name: string, category: string, details?: string) => void;
}

export const MultiTierPenetrationView: React.FC<MultiTierPenetrationViewProps> = ({
  data,
  onSelectEntity,
}) => {
  const [selectedTier, setSelectedTier] = useState<number | 'all'>('all');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    't1-0': true,
    't1-1': true,
    't1-2': true,
  });
  const [searchTerm, setSearchTerm] = useState<string>('');

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const multiTierData: TierNode[] = (data.upstream || []).slice(0, 4).map((up, idx) => {
    const isDomestic = up.isDomestic;
    const tier2Nodes: TierNode[] = [
      {
        id: `t2-${idx}-0`,
        name: isDomestic ? `${up.name}·高纯前驱体/晶圆基底` : '海外专精精细化工/基础晶圆母材',
        tier: 2,
        category: 'Tier-2 核心中间品',
        material: '高纯度化学原料 / 关键模组',
        originCountry: isDomestic ? '中国' : up.originCountry || '海外',
        riskLevel: up.dependenceLevel === 'High' ? 'High' : 'Medium',
        bottleneckType: isDomestic ? '自给率高' : '专利壁垒',
        substitutionDifficulty: up.dependenceLevel === 'High' ? '极高' : '中等',
        impactDescription: '直接影响 Tier-1 零部件交付良率与批次一致性。',
        subSuppliers: [
          {
            id: `t3-${idx}-0`,
            name: '高纯石英砂 / 锂辉石 / 稀土原矿区',
            tier: 3,
            category: 'Tier-3 矿产/大宗母材',
            material: '工业级基础原矿与大宗贵金属',
            originCountry: '澳大利亚 / 南美 / 中国江西',
            riskLevel: 'Medium',
            bottleneckType: '地缘垄断',
            substitutionDifficulty: '中等',
            impactDescription: '受全球大宗周期与海运关税壁垒影响较大。',
          },
        ],
      },
    ];

    return {
      id: `t1-${idx}`,
      name: up.name,
      tier: 1,
      category: up.categoryLabel,
      material: up.supplies,
      originCountry: up.originCountry || '中国',
      riskLevel: up.dependenceLevel === 'High' ? 'High' : up.dependenceLevel === 'Medium' ? 'Medium' : 'Low',
      bottleneckType: up.dependenceLevel === 'High' ? '纯单源外采' : '自给率高',
      substitutionDifficulty: up.dependenceLevel === 'High' ? '极高' : '中等',
      impactDescription: up.strategicImpact,
      subSuppliers: tier2Nodes,
    };
  });

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'Critical':
      case 'High':
        return 'bg-[#A84A3E]/10 text-[#823329] border-[#A84A3E]/30';
      case 'Medium':
        return 'bg-[#9C6E28]/10 text-[#734E14] border-[#9C6E28]/30';
      default:
        return 'bg-[#2E6B56]/10 text-[#1D4739] border-[#2E6B56]/30';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Info */}
      <div className="rounded-xs border border-[#E2E6E2] bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5 text-[#1F3437] font-serif font-bold text-base">
            <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-[#3E6F73]/10 text-[#3E6F73] border border-[#3E6F73]/30">
              <Layers className="h-4 w-4" />
            </div>
            <span>三级供应链多层深度穿透 (Multi-Tier Supply Penetration)</span>
          </div>
          <span className="text-xs text-[#627578] bg-[#F6F7F5] px-3 py-1 rounded-xs border border-[#E2E6E2] font-mono">
            Tier-1 直接 ➔ Tier-2 中间品 ➔ Tier-3 基础母材
          </span>
        </div>
        <p className="text-xs text-[#627578] leading-relaxed">
          超越表层一级供应商名单，深度穿透发现隐蔽的“隐形单源依赖”（例如表面上由不同的 Tier-1 供应，但底层皆依赖同一个海外 Tier-3 矿区或基础晶圆厂）。
        </p>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-[#E2E6E2]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-serif text-[#627578]">层级过滤:</span>
            {[
              { label: '全部穿透层', val: 'all' },
              { label: 'Tier-1 直接供应商', val: 1 },
              { label: 'Tier-2 中间元器件', val: 2 },
              { label: 'Tier-3 原料/矿产', val: 3 },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => setSelectedTier(item.val as any)}
                className={`rounded-xs px-2.5 py-1 text-xs font-serif transition-colors ${
                  selectedTier === item.val
                    ? 'bg-[#1F3437] text-white font-medium shadow-xs'
                    : 'bg-[#F6F7F5] text-[#627578] hover:text-[#1F3437] border border-[#E2E6E2]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8C9E9F]" />
            <input
              type="text"
              placeholder="搜索穿透链路中的实体..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xs bg-[#FAFBF9] border border-[#D4D9D4] pl-8 pr-3 py-1.5 text-xs text-[#1F3437] placeholder-[#8C9E9F] focus:outline-none focus:border-[#3E6F73]"
            />
          </div>
        </div>
      </div>

      {/* Multi-Tier Tree Stream */}
      <div className="space-y-4">
        {multiTierData.map((t1) => (
          <div
            key={t1.id}
            className="rounded-xs border border-[#E2E6E2] bg-white p-5 shadow-xs space-y-4"
          >
            {/* Tier-1 Card Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#E2E6E2]">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleExpand(t1.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-xs bg-[#F6F7F5] hover:bg-[#EAECE8] text-[#3E6F73] border border-[#E2E6E2] transition-colors"
                >
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${
                      expandedNodes[t1.id] ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-xs bg-[#3E6F73]/10 text-[#254E52] border border-[#3E6F73]/30 px-2 py-0.5 text-[10px] font-medium">
                      Tier-1 直接供应
                    </span>
                    <button
                      onClick={() => onSelectEntity(t1.name, '上游供应商', t1.impactDescription)}
                      className="font-serif text-sm font-bold text-[#1F3437] hover:text-[#3E6F73] transition-colors"
                    >
                      {t1.name}
                    </button>
                    <span className="text-xs text-[#627578]">({t1.originCountry})</span>
                    <span
                      className={`rounded-xs border px-2 py-0.5 text-[10px] font-medium ${getRiskBadge(
                        t1.riskLevel
                      )}`}
                    >
                      {t1.riskLevel} 依赖风险
                    </span>
                  </div>
                  <p className="text-xs text-[#627578] mt-0.5">
                    供给物料：<span className="text-[#1F3437] font-medium">{t1.material}</span> · {t1.impactDescription}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto text-xs">
                <span className="text-[#627578]">替代难度:</span>
                <span className="font-semibold text-[#1F3437]">{t1.substitutionDifficulty}</span>
              </div>
            </div>

            {/* Expanded Child Tiers (Tier-2 & Tier-3) */}
            {expandedNodes[t1.id] && (
              <div className="pl-6 sm:pl-10 space-y-4 border-l-2 border-[#3E6F73]/30 relative">
                {t1.subSuppliers?.map((t2) => (
                  <div key={t2.id} className="space-y-3">
                    {/* Tier-2 Box */}
                    <div className="rounded-xs border border-[#E2E6E2] bg-[#FAFBF9] p-4 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-xs bg-[#5E4D78]/10 text-[#433557] border border-[#5E4D78]/30 px-2 py-0.5 text-[10px] font-medium">
                            Tier-2 核心中间品
                          </span>
                          <span className="font-serif text-xs font-bold text-[#1F3437]">{t2.name}</span>
                          <span className="text-[11px] text-[#627578]">({t2.originCountry})</span>
                        </div>
                        <span className="text-[10px] bg-white text-[#627578] px-2 py-0.5 rounded-xs border border-[#E2E6E2]">
                          瓶颈特征: {t2.bottleneckType}
                        </span>
                      </div>
                      <p className="text-xs text-[#2D4245]">{t2.impactDescription}</p>
                    </div>

                    {/* Tier-3 Box */}
                    {t2.subSuppliers && (
                      <div className="pl-6 space-y-2 border-l-2 border-[#5E4D78]/30">
                        {t2.subSuppliers.map((t3) => (
                          <div
                            key={t3.id}
                            className="rounded-xs border border-[#E2E6E2] bg-[#FAFBF9] p-3.5 space-y-1.5"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="rounded-xs bg-[#9C6E28]/10 text-[#734E14] border border-[#9C6E28]/30 px-2 py-0.5 text-[10px] font-medium">
                                  Tier-3 矿产/大宗母材
                                </span>
                                <span className="font-serif text-xs font-semibold text-[#1F3437]">
                                  {t3.name}
                                </span>
                                <span className="text-[11px] text-[#627578]">({t3.originCountry})</span>
                              </div>
                              <span className="text-[10px] text-[#3E6F73] font-serif">
                                产地溯源与环保核查
                              </span>
                            </div>
                            <p className="text-xs text-[#627578]">{t3.impactDescription}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
