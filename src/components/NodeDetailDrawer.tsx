import React from 'react';
import { X, ArrowRight, Copy, Check, Building2, Sparkles } from 'lucide-react';

interface SelectedEntity {
  name: string;
  category: string;
  details?: string;
  subInfo?: string;
}

interface NodeDetailDrawerProps {
  entity: SelectedEntity | null;
  onClose: () => void;
  onPivotSearch: (name: string) => void;
}

export const NodeDetailDrawer: React.FC<NodeDetailDrawerProps> = ({
  entity,
  onClose,
  onPivotSearch,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!entity) return null;

  const handleCopy = () => {
    const text = `【${entity.name}】(${entity.category})\n${entity.details || ''}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse lines from details if formatted
  const detailLines = entity.details ? entity.details.split('\n').filter(Boolean) : [];

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-[#1F3437]/25 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-md bg-white border-l border-[#E2E6E2] shadow-xl p-5 sm:p-6 flex flex-col justify-between animate-in slide-in-from-right duration-250 max-h-screen overflow-y-auto">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E2E6E2]">
            <div className="flex items-center gap-2 text-[#3E6F73]">
              <Building2 className="h-4 w-4" />
              <span className="font-serif text-xs font-semibold text-[#627578]">
                实体深度档案速览
              </span>
            </div>
            <button
              onClick={onClose}
              className="rounded-xs p-1.5 text-[#627578] hover:text-[#1F3437] hover:bg-[#F6F7F5] border border-[#E2E6E2] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="mt-5 space-y-4">
            <div>
              <span className="inline-block rounded-xs bg-[#3E6F73]/10 px-2.5 py-0.5 text-xs font-serif font-medium text-[#254E52] border border-[#3E6F73]/30 mb-2">
                {entity.category}
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1F3437] tracking-tight">
                {entity.name}
              </h2>
            </div>

            {/* Parsed Detail Lines */}
            <div className="rounded-xs border border-[#E2E6E2] bg-[#FAFBF9] p-4 space-y-3">
              <div className="text-xs font-serif font-bold text-[#1F3437] pb-1 border-b border-[#EAECE8]">
                产业链与战略协同剖析
              </div>

              {detailLines.length > 0 ? (
                <div className="space-y-2 text-xs text-[#2D4245]">
                  {detailLines.map((line, idx) => {
                    const parts = line.split('：');
                    if (parts.length > 1) {
                      const label = parts[0];
                      const val = parts.slice(1).join('：');
                      return (
                        <div key={idx} className="rounded-xs bg-white p-2.5 border border-[#E2E6E2]">
                          <span className="font-serif font-semibold text-[#3E6F73] block mb-0.5">{label}</span>
                          <span className="text-[#2D4245] leading-relaxed">{val}</span>
                        </div>
                      );
                    }
                    return (
                      <p key={idx} className="leading-relaxed bg-white p-2.5 rounded-xs border border-[#E2E6E2]">
                        {line}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[#627578]">暂无进一步详细描述</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="space-y-2.5 pt-5 border-t border-[#E2E6E2] mt-6">
          <button
            onClick={() => {
              onPivotSearch(entity.name);
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xs bg-[#1F3437] hover:bg-[#3E6F73] px-4 py-2.5 text-xs sm:text-sm font-serif font-medium text-white shadow-xs transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            <span>以该实体为核心重新核验全景图</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 rounded-xs border border-[#E2E6E2] bg-[#FAFBF9] px-4 py-2 text-xs font-serif font-medium text-[#1F3437] hover:bg-white transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#2E6B56]" />
                <span className="text-[#2E6B56]">已复制实体档案至剪贴板</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-[#627578]" />
                <span>复制实体核心卷宗</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};
