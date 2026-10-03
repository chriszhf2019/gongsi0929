import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  FileText,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ReconciliationMatch, calculateReconciliationHealth } from '../utils/crossReconciliation';
import { SourceBadge } from './SourceBadge';
import { Evidence } from '../types';

interface CrossReconciliationCardProps {
  matches: ReconciliationMatch[];
  title?: string;
  type?: 'supplier' | 'customer';
}

const StatusIcon: React.FC<{ status: ReconciliationMatch['status'] }> = ({ status }) => {
  switch (status) {
    case 'matched':
      return <CheckCircle2 className="h-4 w-4 text-[#3E6F73]" />;
    case 'partial':
      return <AlertTriangle className="h-4 w-4 text-[#C4883A]" />;
    case 'mismatch':
      return <XCircle className="h-4 w-4 text-[#A84A3E]" />;
    case 'insufficient_data':
      return <HelpCircle className="h-4 w-4 text-[#8C9E9F]" />;
  }
};

const StatusBadge: React.FC<{ status: ReconciliationMatch['status']; label: string }> = ({
  status,
  label,
}) => {
  const colors = {
    matched: 'bg-[#3E6F73]/10 text-[#3E6F73] border-[#3E6F73]/30',
    partial: 'bg-[#C4883A]/10 text-[#C4883A] border-[#C4883A]/30',
    mismatch: 'bg-[#A84A3E]/10 text-[#A84A3E] border-[#A84A3E]/30',
    insufficient_data: 'bg-[#8C9E9F]/10 text-[#8C9E9F] border-[#8C9E9F]/30',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-serif font-medium border ${colors[status]}`}
    >
      <StatusIcon status={status} />
      {label}
    </span>
  );
};

const MatchRow: React.FC<{ match: ReconciliationMatch; type: 'supplier' | 'customer' }> = ({
  match,
  type,
}) => {
  const [expanded, setExpanded] = useState(false);

  const targetEvidence: Evidence | undefined = match.targetSourceSection
    ? {
        sourceSection: match.targetSourceSection,
        sourceType: 'annual_report',
      }
    : undefined;

  const counterpartyEvidence: Evidence | undefined =
    match.counterpartySourceSection && match.counterpartySourceSection !== '未获取对手方数据'
      ? {
          sourceSection: match.counterpartySourceSection,
          sourceType: 'annual_report',
        }
      : undefined;

  return (
    <div className="border border-[#E2E6E2] rounded-xs bg-white overflow-hidden">
      {/* Header Row */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-[#FAFBF9] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <StatusIcon status={match.status} />
          <span className="font-serif font-bold text-sm text-[#1F3437] truncate">
            {match.counterparty}
          </span>
          <StatusBadge status={match.status} label={match.statusLabel} />
        </div>

        <div className="flex items-center gap-4">
          {/* Match Rate */}
          {match.matchRate !== null && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#627578] font-serif">吻合度</span>
              <span
                className={`font-mono font-bold text-sm ${
                  match.matchRate >= 95
                    ? 'text-[#3E6F73]'
                    : match.matchRate >= 80
                    ? 'text-[#C4883A]'
                    : 'text-[#A84A3E]'
                }`}
              >
                {match.matchRate}%
              </span>
            </div>
          )}

          {/* Expand Icon */}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-[#8C9E9F]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#8C9E9F]" />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-[#E2E6E2] bg-[#FAFBF9] space-y-3">
          {/* Two Column Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Target Company Disclosure */}
            <div className="p-2.5 rounded-xs bg-white border border-[#E2E6E2] space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-serif font-bold text-[#3E6F73]">
                <FileText className="h-3 w-3" />
                <span>{type === 'supplier' ? '目标公司披露采购额' : '目标公司披露销售额'}</span>
              </div>
              <div className="font-mono font-bold text-sm text-[#1F3437]">
                {match.targetAmountText}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-[#627578]">来源:</span>
                <span className="text-[10px] font-mono text-[#3E6F73] truncate">
                  {match.targetSourceSection}
                </span>
                {targetEvidence && <SourceBadge evidence={targetEvidence} compact />}
              </div>
            </div>

            {/* Counterparty Disclosure */}
            <div className="p-2.5 rounded-xs bg-white border border-[#E2E6E2] space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-serif font-bold text-[#2E6B56]">
                <FileText className="h-3 w-3" />
                <span>{type === 'supplier' ? '对手方披露来自目标公司收入' : '对手方披露对目标公司采购'}</span>
              </div>
              <div className="font-mono font-bold text-sm text-[#1F3437]">
                {match.counterpartyAmountText}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-[#627578]">来源:</span>
                <span className="text-[10px] font-mono text-[#2E6B56] truncate">
                  {match.counterpartySourceSection}
                </span>
                {counterpartyEvidence && <SourceBadge evidence={counterpartyEvidence} compact />}
              </div>
            </div>
          </div>

          {/* Delta Info */}
          {match.delta !== null && (
            <div className="flex items-center gap-4 p-2 rounded-xs bg-[#F6F7F5] border border-[#E2E6E2]">
              <div className="flex items-center gap-1.5">
                {match.delta > 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-[#C4883A]" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-[#3E6F73]" />
                )}
                <span className="text-[10px] text-[#627578]">差异金额:</span>
                <span className="font-mono text-xs font-bold text-[#1F3437]">
                  {match.delta.toLocaleString()} 万元
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#627578]">差异率:</span>
                <span
                  className={`font-mono text-xs font-bold ${
                    match.deltaPercent! <= 5
                      ? 'text-[#3E6F73]'
                      : match.deltaPercent! <= 20
                      ? 'text-[#C4883A]'
                      : 'text-[#A84A3E]'
                  }`}
                >
                  {match.deltaPercent}%
                </span>
              </div>
            </div>
          )}

          {/* Forensic Note */}
          <div className="p-2 rounded-xs bg-[#F0F7F7] border border-[#3E6F73]/20">
            <p className="text-[11px] text-[#1F3437] leading-relaxed">{match.forensicNote}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export const CrossReconciliationCard: React.FC<CrossReconciliationCardProps> = ({
  matches,
  title = '交叉对账核验',
  type = 'supplier',
}) => {
  const health = calculateReconciliationHealth(matches);

  if (matches.length === 0) {
    return (
      <div className="p-4 rounded-xs border border-[#E2E6E2] bg-white">
        <div className="flex items-center gap-2 text-[#8C9E9F]">
          <HelpCircle className="h-4 w-4" />
          <span className="text-xs font-serif">暂无交叉对账数据</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Overall Health Score */}
      <div className="p-4 rounded-xs border border-[#1F3437] bg-white shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xs bg-[#3E6F73]/10 text-[#3E6F73] border border-[#3E6F73]/30">
              <ArrowLeftRight className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-[#1F3437]">{title}</h3>
              <p className="text-[11px] text-[#627578]">双方披露数据自动比对 · 吻合度核验</p>
            </div>
          </div>

          {/* Overall Score */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-[10px] text-[#627578] font-serif">整体健康度</div>
              <div
                className={`font-mono font-bold text-lg ${
                  health.overallScore >= 90
                    ? 'text-[#3E6F73]'
                    : health.overallScore >= 75
                    ? 'text-[#C4883A]'
                    : 'text-[#A84A3E]'
                }`}
              >
                {health.overallScore}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="p-2 rounded-xs bg-[#3E6F73]/5 border border-[#3E6F73]/20 text-center">
            <div className="font-mono font-bold text-sm text-[#3E6F73]">{health.matchedCount}</div>
            <div className="text-[10px] text-[#627578]">高度吻合</div>
          </div>
          <div className="p-2 rounded-xs bg-[#C4883A]/5 border border-[#C4883A]/20 text-center">
            <div className="font-mono font-bold text-sm text-[#C4883A]">{health.partialCount}</div>
            <div className="text-[10px] text-[#627578]">部分吻合</div>
          </div>
          <div className="p-2 rounded-xs bg-[#A84A3E]/5 border border-[#A84A3E]/20 text-center">
            <div className="font-mono font-bold text-sm text-[#A84A3E]">{health.mismatchCount}</div>
            <div className="text-[10px] text-[#627578]">显著差异</div>
          </div>
          <div className="p-2 rounded-xs bg-[#8C9E9F]/5 border border-[#8C9E9F]/20 text-center">
            <div className="font-mono font-bold text-sm text-[#8C9E9F]">
              {health.insufficientCount}
            </div>
            <div className="text-[10px] text-[#627578]">数据不足</div>
          </div>
        </div>

        {/* Verdict */}
        <div className="p-2.5 rounded-xs bg-[#F6F7F5] border border-[#E2E6E2]">
          <p className="text-xs text-[#1F3437] leading-relaxed">{health.verdict}</p>
        </div>
      </div>

      {/* Match List */}
      <div className="space-y-2">
        {matches.map((match, idx) => (
          <MatchRow key={idx} match={match} type={type} />
        ))}
      </div>
    </div>
  );
};
