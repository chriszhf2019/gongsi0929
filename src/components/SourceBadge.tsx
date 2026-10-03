import React, { useState } from 'react';
import { FileText, ExternalLink, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Evidence } from '../types';

interface SourceBadgeProps {
  evidence?: Evidence;
  /** 紧凑模式，只显示小图标 */
  compact?: boolean;
  className?: string;
}

/**
 * 来源角标组件
 * 点击可展开查看原始文件来源详情
 * 这是"鉴源"的核心交互：每个数字都能点开看原始 PDF 的那一页
 */
export const SourceBadge: React.FC<SourceBadgeProps> = ({
  evidence,
  compact = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!evidence) {
    if (compact) return null;
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] text-[#8C9E9F] font-mono ${className}`}>
        <AlertCircle className="h-3 w-3" />
        <span>暂无来源</span>
      </span>
    );
  }

  const sourceTypeLabels: Record<string, string> = {
    annual_report: '年报',
    quarterly_report: '季报',
    announcement: '公告',
    prospectus: '招股书',
    regulator: '监管文件',
    extracted: 'AI 抽取',
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs border transition-colors ${
          evidence.isEstimated
            ? 'bg-[#FFF8ED] border-[#C4883A]/30 text-[#C4883A] hover:bg-[#FFF8ED]/80'
            : 'bg-[#F0F7F7] border-[#3E6F73]/30 text-[#3E6F73] hover:bg-[#F0F7F7]/80'
        } ${className}`}
        title={`来源: ${evidence.sourceSection}`}
      >
        <FileText className="h-3 w-3" />
        {compact ? null : (
          <span className="text-[10px] font-serif font-medium">
            {evidence.isEstimated ? '估算' : '来源'}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F3437]/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-xs border border-[#1F3437] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 bg-[#1F3437] text-white flex items-center justify-between border-b border-[#2C4A4E]">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xs bg-[#FAF8F5] text-[#1F3437]">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-mono tracking-widest text-[#8C9E9F] uppercase">
                    EVIDENCE SOURCE
                  </div>
                  <div className="font-serif font-bold text-sm">数据来源核验</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xs hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Source Type Badge */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-xs bg-[#3E6F73]/10 text-[#3E6F73] border border-[#3E6F73]/20 font-serif font-medium">
                  {sourceTypeLabels[evidence.sourceType] || evidence.sourceType}
                </span>
                {evidence.isEstimated && (
                  <span className="text-[10px] px-2 py-0.5 rounded-xs bg-[#C4883A]/10 text-[#C4883A] border border-[#C4883A]/20 font-serif font-medium">
                    估算值
                  </span>
                )}
                {evidence.confidence !== undefined && (
                  <span className="text-[10px] px-2 py-0.5 rounded-xs bg-[#F6F7F5] text-[#627578] border border-[#E2E6E2] font-mono">
                    置信度 {evidence.confidence}%
                  </span>
                )}
              </div>

              {/* Source Section - 核心：可追溯到哪一页 */}
              <div className="space-y-2">
                <div className="text-xs font-serif font-bold text-[#1F3437] flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#3E6F73]" />
                  <span>来源位置</span>
                </div>
                <div className="p-3 rounded-xs bg-[#F6F7F5] border border-[#E2E6E2]">
                  <p className="text-sm font-mono text-[#1F3437] leading-relaxed">
                    {evidence.sourceSection}
                  </p>
                </div>
              </div>

              {/* Source Name */}
              {evidence.sourceName && (
                <div className="space-y-1">
                  <div className="text-xs font-serif text-[#627578]">来源文件</div>
                  <div className="text-sm text-[#1F3437]">{evidence.sourceName}</div>
                </div>
              )}

              {/* Extracted At */}
              {evidence.extractedAt && (
                <div className="space-y-1">
                  <div className="text-xs font-serif text-[#627578]">抽取时间</div>
                  <div className="text-xs font-mono text-[#627578]">
                    {new Date(evidence.extractedAt).toLocaleString('zh-CN')}
                  </div>
                </div>
              )}

              {/* Source URL */}
              {evidence.sourceUrl && (
                <a
                  href={evidence.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-[#1F3437] text-white text-xs font-serif hover:bg-[#3E6F73] transition-colors"
                >
                  <span>查看原始文件</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-[#F6F7F5] border-t border-[#E2E6E2]">
              <p className="text-[11px] text-[#627578] leading-relaxed">
                {evidence.isEstimated
                  ? '* 此数据为 AI 基于上下文估算，非直接披露数字，仅供参考。'
                  : '* 此数据直接摘录自上述来源文件，可点击链接查看原始文件核验。'}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * 带来源的数字展示组件
 * 用于在财务数字、采购金额等旁边显示来源角标
 */
export const NumberWithSource: React.FC<{
  value: string | number;
  evidence?: Evidence;
  unit?: string;
  className?: string;
}> = ({ value, evidence, unit, className = '' }) => {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="font-mono font-bold">
        {value}
        {unit && <span className="text-[#627578] font-normal text-xs ml-0.5">{unit}</span>}
      </span>
      <SourceBadge evidence={evidence} compact />
    </span>
  );
};
