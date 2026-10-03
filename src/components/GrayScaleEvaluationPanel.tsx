import React, { useState } from 'react';
import { GrayScaleEvaluation } from '../types';
import { ShieldCheck, CheckCircle, XCircle, HelpCircle, Info } from 'lucide-react';
import { DataSourceBadge } from './DataSourceBadge';

interface GrayScaleEvaluationPanelProps {
  evaluation?: GrayScaleEvaluation;
  companyName: string;
}

export const GrayScaleEvaluationPanel: React.FC<GrayScaleEvaluationPanelProps> = ({
  evaluation,
  companyName,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'support' | 'oppose' | 'uncertain'>('all');

  if (!evaluation) {
    return null;
  }

  const {
    confidenceScore,
    confidenceRating,
    verdict,
    supportingEvidence,
    opposingEvidence,
    uncertainVariables,
  } = evaluation;

  // Determine score color strictly within low-saturation palette
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#3E6F73]';
    if (score >= 60) return 'text-[#1F3437]';
    return 'text-[#A84A3E]';
  };

  return (
    <section id="grayscale-evaluation-section" className="space-y-4">
      {/* Module Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#E2E6E2] pb-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-1.5 h-5 bg-[#1F3437] rounded-xs" />
          <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1F3437] tracking-wide">
            灰度评估与商业真实度核验
          </h3>
          <span className="text-xs text-[#627578] font-mono ml-1">
            (三栏对冲证伪模型)
          </span>
          <DataSourceBadge sourceType="ai" showDetail />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#627578]">综合置信度:</span>
          <span className={`font-mono font-bold text-sm ${getScoreColor(confidenceScore)}`}>
            {confidenceScore}/100
          </span>
          <span className="px-2 py-0.5 rounded-xs bg-[#1F3437]/5 text-[#1F3437] font-serif text-xs font-semibold border border-[#E2E6E2]">
            {confidenceRating}
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="rounded-sm bg-white border border-[#E2E6E2] p-4 sm:p-6 space-y-5">
        {/* Verdict & Confidence Score Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xs bg-[#FBFBFA] border border-[#E2E6E2]">
          <div className="space-y-1">
            <div className="text-xs font-serif font-semibold text-[#627578] flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#3E6F73]" />
              <span>【{companyName}】商业置信度综合裁定</span>
            </div>
            <p className="text-xs sm:text-sm text-[#1F3437] leading-relaxed">
              {verdict}
            </p>
          </div>

          {/* Minimalist Gauge Bar */}
          <div className="w-full md:w-56 shrink-0 space-y-1">
            <div className="flex justify-between text-[11px] text-[#627578] font-mono">
              <span>低置信 (0)</span>
              <span className="font-bold text-[#1F3437]">{confidenceScore} 分</span>
              <span>高置信 (100)</span>
            </div>
            <div className="h-2 w-full bg-[#E8EAE6] rounded-xs overflow-hidden">
              <div
                className="h-full bg-[#3E6F73] transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, confidenceScore))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Three Columns: Supporting Evidence | Opposing Evidence | Uncertain Variables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 1. Supporting Evidence (支持证据) */}
          <div className="rounded-xs border border-[#DFE6E1] bg-[#FAFBF9] p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#DFE6E1]">
              <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#3E6F73]">
                <CheckCircle className="h-4 w-4" />
                <span>支持证据 (佐证项)</span>
              </div>
              <span className="text-[11px] font-mono text-[#627578]">
                {supportingEvidence.length} 条
              </span>
            </div>

            <div className="space-y-2.5">
              {supportingEvidence.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-white rounded-xs border border-[#E2E6E2] hover:border-[#3E6F73]/50 transition-colors space-y-1 text-xs"
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="text-[#1F3437] font-medium leading-snug">
                      {item.point}
                    </span>
                    <span className="shrink-0 text-[10px] px-1 py-0.2 rounded-xs bg-[#3E6F73]/10 text-[#3E6F73]">
                      {item.weight}权重
                    </span>
                  </div>
                  <div className="text-[11px] text-[#627578] flex items-center gap-1">
                    <Info className="h-3 w-3 text-[#3E6F73]" />
                    <span>出处: {item.source}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Opposing Evidence (反方证据 / 存疑点) */}
          <div className="rounded-xs border border-[#E8DFDD] bg-[#FCFAF9] p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8DFDD]">
              <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#A84A3E]">
                <XCircle className="h-4 w-4" />
                <span>反方证据 (存疑项)</span>
              </div>
              <span className="text-[11px] font-mono text-[#627578]">
                {opposingEvidence.length} 条
              </span>
            </div>

            <div className="space-y-2.5">
              {opposingEvidence.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-white rounded-xs border border-[#E8DFDD] hover:border-[#A84A3E]/50 transition-colors space-y-1 text-xs"
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="text-[#1F3437] font-medium leading-snug">
                      {item.point}
                    </span>
                    <span className="shrink-0 text-[10px] px-1 py-0.2 rounded-xs bg-[#A84A3E]/10 text-[#A84A3E]">
                      {item.weight}权重
                    </span>
                  </div>
                  <div className="text-[11px] text-[#627578] flex items-center gap-1">
                    <Info className="h-3 w-3 text-[#A84A3E]" />
                    <span>出处: {item.source}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Uncertain Variables (不确定变量 / 监控触发条件) */}
          <div className="rounded-xs border border-[#E2E6E2] bg-[#F9FAF8] p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E6E2]">
              <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#627578]">
                <HelpCircle className="h-4 w-4 text-[#627578]" />
                <span>不确定变量 (监测点)</span>
              </div>
              <span className="text-[11px] font-mono text-[#627578]">
                {uncertainVariables.length} 条
              </span>
            </div>

            <div className="space-y-2.5">
              {uncertainVariables.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-white rounded-xs border border-[#E2E6E2] hover:border-[#627578]/60 transition-colors space-y-1 text-xs"
                >
                  <div className="text-[#1F3437] font-medium leading-snug">
                    {item.point}
                  </div>
                  <div className="text-[11px] text-[#53686B] bg-[#F6F7F5] p-1.5 rounded-xs border border-[#E2E6E2]">
                    <span className="font-semibold text-[#1F3437]">触发条件: </span>
                    {item.watchTrigger}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
