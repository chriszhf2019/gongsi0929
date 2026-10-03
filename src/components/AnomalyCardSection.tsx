import React, { useState } from 'react';
import { AnomalyItem } from '../types';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  Compass,
  HelpCircle,
  Scale,
  FileCheck2,
  ExternalLink,
} from 'lucide-react';
import { EvidenceWorkbenchModal } from './EvidenceWorkbenchModal';
import { DataSourceBadge } from './DataSourceBadge';

interface AnomalyCardSectionProps {
  anomalies?: AnomalyItem[];
  companyName?: string;
}

export const AnomalyCardSection: React.FC<AnomalyCardSectionProps> = ({
  anomalies = [],
  companyName = '目标企业',
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(
    anomalies.length > 0 ? anomalies[0].id : null
  );
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'high' | 'medium'>('all');
  const [selectedAnomalyForWorkbench, setSelectedAnomalyForWorkbench] = useState<AnomalyItem | null>(null);

  if (!anomalies || anomalies.length === 0) {
    return null;
  }

  const filtered = anomalies.filter((item) => {
    if (filterSeverity === 'all') return true;
    return item.severity === filterSeverity;
  });

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <section id="anomaly-section" className="space-y-4">
      {/* Evidence Workbench Modal */}
      <EvidenceWorkbenchModal
        isOpen={!!selectedAnomalyForWorkbench}
        onClose={() => setSelectedAnomalyForWorkbench(null)}
        anomaly={selectedAnomalyForWorkbench}
        companyName={companyName}
      />

      {/* Module Title Header - Minimalist New Chinese Archive Style */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#E2E6E2] pb-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-1.5 h-5 bg-[#A84A3E] rounded-xs" />
          <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1F3437] tracking-wide">
            反常点核验与矛盾洞察
          </h3>
          <span className="text-xs text-[#627578] font-mono ml-1">
            ({anomalies.length} 处关键特征)
          </span>
          <DataSourceBadge sourceType="ai" showDetail />
        </div>

        {/* Action and Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {anomalies.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedAnomalyForWorkbench(filtered[0] || anomalies[0])}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#1F3437] text-white rounded-xs font-serif font-medium hover:bg-[#3E6F73] transition-colors shadow-2xs"
            >
              <Scale className="h-3.5 w-3.5 text-[#8C9E9F]" />
              <span>多源交叉核验台 (Workbench)</span>
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-[#627578] mr-1 hidden sm:inline">筛查等级:</span>
            <button
              type="button"
              onClick={() => setFilterSeverity('all')}
              className={`px-2.5 py-1 rounded-sm border transition-colors ${
                filterSeverity === 'all'
                  ? 'bg-[#1F3437] text-white border-[#1F3437]'
                  : 'bg-white text-[#627578] border-[#E2E6E2] hover:border-[#3E6F73]'
              }`}
            >
              全部 ({anomalies.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterSeverity('high')}
              className={`px-2.5 py-1 rounded-sm border transition-colors ${
                filterSeverity === 'high'
                  ? 'bg-[#A84A3E] text-white border-[#A84A3E]'
                  : 'bg-white text-[#A84A3E] border-[#E2E6E2] hover:border-[#A84A3E]'
              }`}
            >
              高关注 ({anomalies.filter((a) => a.severity === 'high').length})
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-[#627578] leading-relaxed">
        比对常规商业逻辑与真实财报/产业链透视结果，提炼出【{companyName}】预期与现实存在张力的反常现象；支持点击进入多源交叉核验台进行左栏披露 vs 右栏海关/同行BOM实证核查。
      </p>

      {/* Cards Grid / List */}
      <div className="space-y-3">
        {filtered.map((item) => {
          const isExpanded = expandedId === item.id;
          const isHigh = item.severity === 'high';

          return (
            <div
              key={item.id}
              className={`rounded-sm bg-white border transition-all duration-200 ${
                isHigh
                  ? 'border-[#E5D7D5] hover:border-[#A84A3E]/70 shadow-xs'
                  : 'border-[#E2E6E2] hover:border-[#3E6F73]/70 shadow-xs'
              }`}
            >
              {/* Header Row */}
              <div
                onClick={() => toggleExpand(item.id)}
                className="p-4 sm:p-5 flex items-start justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Anomaly Tag */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-xs border ${
                        isHigh
                          ? 'bg-[#A84A3E]/10 text-[#A84A3E] border-[#A84A3E]/30'
                          : 'bg-[#3E6F73]/10 text-[#3E6F73] border-[#3E6F73]/30'
                      }`}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {item.tag}
                    </span>

                    {/* Severity Badge */}
                    <span className="text-[11px] text-[#627578]">
                      {isHigh ? '高度反常' : '温和张力'}
                    </span>

                    {/* Quick Workbench Pill */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAnomalyForWorkbench(item);
                      }}
                      className="ml-auto inline-flex items-center gap-1 text-[11px] font-serif text-[#3E6F73] hover:text-[#1F3437] hover:underline bg-[#F6F7F5] hover:bg-[#EAECE8] px-2 py-0.5 rounded-xs border border-[#E2E6E2]"
                    >
                      <Scale className="h-3 w-3" />
                      <span>交叉核验台 ➔</span>
                    </button>
                  </div>

                  <h4 className="font-serif text-base sm:text-lg font-semibold text-[#1F3437] tracking-tight">
                    {item.title}
                  </h4>

                  {/* Summary Comparison: Expectation vs Reality */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                    <div className="bg-[#F6F7F5] p-2.5 rounded-xs border border-[#E2E6E2]">
                      <span className="text-[#627578] font-medium block mb-0.5">
                        常规商业预期 (Expectation):
                      </span>
                      <span className="text-[#2D4245] leading-relaxed">
                        {item.contradiction.expectation}
                      </span>
                    </div>

                    <div className="bg-[#F8F5F4] p-2.5 rounded-xs border border-[#E8DFDD]">
                      <span className="text-[#A84A3E] font-medium block mb-0.5">
                        实证数据矛盾 (Reality):
                      </span>
                      <span className="text-[#1F3437] font-medium leading-relaxed">
                        {item.contradiction.reality}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-1 p-1 text-[#627578] hover:text-[#1F3437] transition-colors"
                  aria-label={isExpanded ? '收起详情' : '展开核验详情'}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Collapsible Detail Panel */}
              {isExpanded && (
                <div className="px-4 pb-5 sm:px-5 border-t border-[#F0F2EF] pt-4 bg-[#FBFBFA] space-y-3.5 animate-in fade-in duration-200">
                  {/* Quick Action to open workbench */}
                  <div className="flex items-center justify-between p-2.5 rounded-xs bg-[#F6F7F5] border border-[#E2E6E2]">
                    <div className="flex items-center gap-2 text-xs text-[#1F3437]">
                      <Scale className="h-4 w-4 text-[#3E6F73]" />
                      <span className="font-serif font-bold">
                        【{companyName}】反常证据多源交叉核验卷宗已就绪
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedAnomalyForWorkbench(item)}
                      className="flex items-center gap-1 px-3 py-1 bg-[#1F3437] text-white rounded-xs text-xs font-serif font-medium hover:bg-[#3E6F73] transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>启动双向核验台 & 尽调清单</span>
                    </button>
                  </div>

                  {/* Investigation Clue */}
                  <div className="bg-white p-3 rounded-xs border border-[#E2E6E2] space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#3E6F73]">
                      <Compass className="h-3.5 w-3.5" />
                      <span>溯源核验线索与查证抓手</span>
                    </div>
                    <p className="text-xs text-[#2D4245] leading-relaxed pl-5">
                      {item.investigationClue}
                    </p>
                  </div>

                  {/* Deep Analysis */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1F3437]">
                      <Eye className="h-3.5 w-3.5 text-[#3E6F73]" />
                      <span>深度透视与商业实质</span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#2D4245] leading-relaxed pl-5 bg-white p-3 rounded-xs border border-[#E2E6E2]">
                      {item.deepAnalysis}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

