import React, { useState } from 'react';
import { InterestFlowCircuit, InterestFlowNode, InterestFlowStep } from '../types';
import { ArrowRight, RefreshCw, Layers, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { DataSourceBadge } from './DataSourceBadge';

interface InterestFlowDiagramProps {
  interestFlow?: InterestFlowCircuit;
  companyName: string;
}

export const InterestFlowDiagram: React.FC<InterestFlowDiagramProps> = ({
  interestFlow,
  companyName,
}) => {
  const [selectedStep, setSelectedStep] = useState<InterestFlowStep | null>(null);

  if (!interestFlow || !interestFlow.nodes || interestFlow.nodes.length === 0) {
    return null;
  }

  const { circuitName, description, nodes, steps, closedLoopSummary } = interestFlow;

  return (
    <section id="interest-flow-section" className="space-y-4">
      {/* Module Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#E2E6E2] pb-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-1.5 h-5 bg-[#3E6F73] rounded-xs" />
          <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1F3437] tracking-wide">
            利益链路与资金/业务闭环透视
          </h3>
          <span className="text-xs text-[#627578] font-mono ml-1">
            ({circuitName || '核心商业闭环'})
          </span>
          <DataSourceBadge sourceType="ai" />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[#627578]">
          <span className="inline-block w-2 h-2 rounded-full bg-[#3E6F73]" />
          <span>点击链路步进节点查看资金及商业确权</span>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-[#627578] leading-relaxed">
        {description || `系统化梳理【${companyName}】从供应链采购支付、生产赋能、渠道交付到资本利润回流的完整利益拓扑闭环。`}
      </p>

      {/* Main Flow Canvas Card */}
      <div className="rounded-sm bg-white border border-[#E2E6E2] p-4 sm:p-6 space-y-6">
        {/* Nodes Horizontal Pipeline / Stepper */}
        <div className="overflow-x-auto pb-3 no-scrollbar">
          <div className="flex items-center justify-between min-w-[620px] gap-2">
            {nodes.map((node, index) => {
              const isCore = node.type === 'core';
              const isCapital = node.type === 'capital' || node.type === 'offshore';

              return (
                <React.Fragment key={node.id}>
                  {/* Entity Node Box */}
                  <div
                    className={`flex-1 p-3 rounded-xs border text-center transition-all ${
                      isCore
                        ? 'bg-[#1F3437] text-white border-[#1F3437] shadow-xs'
                        : isCapital
                        ? 'bg-[#FAF8F5] text-[#1F3437] border-[#DCD6CE]'
                        : 'bg-[#F6F7F5] text-[#1F3437] border-[#E2E6E2]'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-mono tracking-wider mb-1 opacity-75">
                      {node.role}
                    </div>
                    <div className="font-serif font-semibold text-sm truncate">
                      {node.name}
                    </div>
                  </div>

                  {/* Flow Arrow with Step Summary */}
                  {index < nodes.length - 1 && (
                    <div className="flex flex-col items-center px-1 text-center shrink-0">
                      <ArrowRight className="h-4 w-4 text-[#3E6F73]" />
                      <span className="text-[10px] text-[#627578] mt-0.5">
                        {steps[index]?.label || '流动'}
                      </span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Detailed Step Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {steps.map((step, idx) => {
            const isSelected = selectedStep === step;

            return (
              <div
                key={idx}
                onClick={() => setSelectedStep(isSelected ? null : step)}
                className={`p-3 rounded-xs border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[#3E6F73] bg-[#F3F6F6]'
                    : 'border-[#E2E6E2] bg-[#FBFBFA] hover:border-[#3E6F73]/60'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-mono text-[#627578]">步骤 0{idx + 1}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-xs font-medium ${
                      step.flowType === 'capital'
                        ? 'bg-[#A84A3E]/10 text-[#A84A3E]'
                        : 'bg-[#3E6F73]/10 text-[#3E6F73]'
                    }`}
                  >
                    {step.flowType === 'capital' ? '资金/回款' : '业务/物料'}
                  </span>
                </div>

                <div className="font-serif text-xs font-semibold text-[#1F3437] mb-1">
                  {step.label}
                </div>

                <div className="text-[11px] text-[#627578] line-clamp-2 leading-normal">
                  {step.description}
                </div>
              </div>
            );
          })}
        </div>

        {/* Highlighted Step Inspector if selected */}
        {selectedStep && (
          <div className="p-3.5 bg-[#F6F7F5] border border-[#3E6F73]/40 rounded-xs space-y-1.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs">
              <span className="font-serif font-bold text-[#1F3437]">
                【链路聚焦】{selectedStep.label}
              </span>
              <button
                type="button"
                onClick={() => setSelectedStep(null)}
                className="text-[#627578] hover:text-[#1F3437]"
              >
                关闭
              </button>
            </div>
            <p className="text-xs text-[#2D4245] leading-relaxed">
              {selectedStep.description}
            </p>
          </div>
        )}

        {/* Closed-loop Summary Box */}
        {closedLoopSummary && (
          <div className="p-4 bg-[#F8F9F7] border-l-2 border-[#1F3437] rounded-r-xs flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-[#3E6F73] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-serif text-xs font-bold text-[#1F3437]">
                商业实质与利益闭环总述
              </div>
              <div className="text-xs text-[#2D4245] leading-relaxed">
                {closedLoopSummary}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
