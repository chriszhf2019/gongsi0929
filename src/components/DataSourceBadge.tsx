import React from 'react';
import { Info, Sparkles, Database } from 'lucide-react';

type SourceType = 'ai' | 'demo' | 'hybrid';

interface DataSourceBadgeProps {
  /** 数据来源类型 */
  sourceType?: SourceType;
  /** 是否显示详细说明文字 */
  showDetail?: boolean;
  /** 自定义提示文本，覆盖默认 */
  label?: string;
  className?: string;
}

const SOURCE_CONFIG: Record<
  SourceType,
  { label: string; icon: React.FC<{ className?: string }>; color: string; bg: string; border: string }
> = {
  ai: {
    label: 'AI 生成推演',
    icon: Sparkles,
    color: 'text-[#7D612E]',
    bg: 'bg-[#FAF8F3]',
    border: 'border-[#DCD0B8]',
  },
  demo: {
    label: '预设示例数据',
    icon: Database,
    color: 'text-[#3E6F73]',
    bg: 'bg-[#3E6F73]/8',
    border: 'border-[#3E6F73]/25',
  },
  hybrid: {
    label: 'AI 推演 + 公开披露',
    icon: Info,
    color: 'text-[#1F3437]',
    bg: 'bg-[#F6F7F5]',
    border: 'border-[#E2E6E2]',
  },
};

/**
 * 数据来源标识组件
 * 用于在法证分析、灰度评估等面板上明确标注数据来源性质，
 * 避免用户将 AI 推演内容误认为真实核验数据。
 */
export const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({
  sourceType = 'ai',
  showDetail = false,
  label,
  className = '',
}) => {
  const config = SOURCE_CONFIG[sourceType];
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${config.bg} ${config.border} border px-2 py-0.5 rounded-xs ${className}`}
      title={
        sourceType === 'ai'
          ? '本模块数据由 AI 模型基于公开信息推演生成，非经人工核验的真实法证数据，仅供决策参考'
          : sourceType === 'demo'
          ? '本模块为预设示例数据，用于演示产品功能，不代表真实企业状况'
          : '本模块综合 AI 推演与公开披露信息，关键结论仍需人工交叉核验'
      }
    >
      <Icon className={`h-3 w-3 ${config.color}`} />
      <span className={`text-[10px] font-serif font-medium ${config.color}`}>
        {label || config.label}
      </span>
      {showDetail && (
        <span className="text-[10px] text-[#8C9E9F] hidden sm:inline">
          · 仅供参考，需人工核验
        </span>
      )}
    </div>
  );
};
