import React, { useState, useEffect, useRef } from 'react';
import { Search, ArrowRight, Compass, ShieldCheck, FileText, ChevronRight } from 'lucide-react';

interface SearchHeroProps {
  onSearch: (companyName: string) => void;
  isLoading: boolean;
  recentSearches: string[];
  onClearRecent: () => void;
  compact?: boolean;
}

const FEATURED_SUGGESTIONS = [
  { name: '比亚迪', category: '新能源 / 垂直一体化', code: '002594' },
  { name: '宁德时代', category: '动力电池 / 储能基建', code: '300750' },
  { name: '台积电', category: '半导体晶圆制造', code: 'TSM' },
  { name: '苹果', category: '消费电子 / 闭环生态', code: 'AAPL' },
  { name: '华为', category: 'ICT通信 / 自研智驾', code: '非上市' },
  { name: '腾讯', category: '数字科技 / CVC版图', code: '0700.HK' },
];

export const SearchHero: React.FC<SearchHeroProps> = ({
  onSearch,
  isLoading,
  recentSearches,
  onClearRecent,
  compact = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSearch(inputValue.trim());
    }
  };

  const handleSelectTag = (name: string) => {
    setInputValue(name);
    onSearch(name);
  };

  // 1. Compact Search Bar (when user is viewing loaded company details)
  if (compact) {
    return (
      <div className="w-full bg-white border-b border-[#E2E6E2] py-3.5 px-4 sm:px-6 shadow-2xs">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <div className="absolute left-3.5 text-[#627578] pointer-events-none">
              <Search className="h-4 w-4 text-[#3E6F73]" />
            </div>
            <input
              ref={inputRef}
              id="compact-search-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="输入企业名称，探查商业本源（如：小米、英伟达、药明康德、ASML）..."
              className="w-full rounded-sm border border-[#E2E6E2] bg-[#FBFBFA] py-2 pl-10 pr-28 text-sm text-[#1F3437] placeholder-[#8C9E9F] focus:border-[#3E6F73] focus:bg-white focus:outline-none transition-colors"
              disabled={isLoading}
            />
            <button
              id="compact-search-submit-btn"
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="absolute right-1.5 flex items-center gap-1.5 rounded-xs bg-[#1F3437] px-3.5 py-1.5 text-xs font-medium text-white shadow-xs transition-colors hover:bg-[#3E6F73] disabled:opacity-40 disabled:pointer-events-none"
            >
              {isLoading ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>核验中...</span>
                </>
              ) : (
                <>
                  <span>探查核验</span>
                  <ArrowRight className="h-3 w-3" />
                </>
              )}
            </button>
          </form>

          {/* Quick preset links */}
          <div className="mt-2 flex items-center gap-2 overflow-x-auto text-xs text-[#627578] no-scrollbar">
            <span className="shrink-0 text-[#8C9E9F]">快速穿透:</span>
            {FEATURED_SUGGESTIONS.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => handleSelectTag(item.name)}
                className="shrink-0 px-2 py-0.5 rounded-xs bg-[#F6F7F5] border border-[#E2E6E2] text-[#2D4245] hover:border-[#3E6F73] hover:text-[#3E6F73] transition-colors"
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2. Full Search Homepage - Minimalist New Chinese Business + Low-saturation Tech
  return (
    <div className="w-full py-12 sm:py-16 text-center">
      <div className="max-w-3xl mx-auto px-4 space-y-6">
        {/* Brand Stamp & Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xs bg-white border border-[#E2E6E2] shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#3E6F73]" />
            <span className="font-serif text-xs font-semibold text-[#1F3437] tracking-widest">
              溯源 · 核验 · 洞察真相
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1F3437] tracking-tight">
            鉴源・GenSight
          </h1>

          <p className="font-serif text-base sm:text-lg text-[#3E6F73] font-medium tracking-wide">
            一鉴，见企业全貌
          </p>
        </div>

        {/* Minimalist Centered Search Box */}
        <div className="pt-2">
          <form onSubmit={handleSubmit} className="relative flex items-center shadow-xs">
            <div className="absolute left-4 text-[#8C9E9F] pointer-events-none">
              <Search className="h-5 w-5 text-[#3E6F73]" />
            </div>
            <input
              ref={inputRef}
              id="hero-search-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="输入企业名称，探查商业本源。"
              className="w-full rounded-sm border border-[#D4D9D4] bg-white py-4 pl-12 pr-32 text-base text-[#1F3437] placeholder-[#8C9E9F] focus:border-[#3E6F73] focus:outline-none transition-colors"
              disabled={isLoading}
              autoFocus
            />
            <button
              id="hero-search-submit-btn"
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="absolute right-2 flex items-center gap-2 rounded-xs bg-[#1F3437] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#3E6F73] disabled:opacity-40 disabled:pointer-events-none"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>核验中...</span>
                </>
              ) : (
                <>
                  <span>探查本源</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Subtext Prompt */}
          <div className="mt-2.5 text-left text-xs text-[#8C9E9F] flex items-center justify-between px-1">
            <span>支持 A股 / 港股 / 美股 / 独角兽及非公开发行实体</span>
            <span className="font-mono">按 / 键快速聚焦</span>
          </div>
        </div>

        {/* Benchmarking Enterprise Badges */}
        <div className="pt-4 text-left space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-serif text-xs font-semibold text-[#627578] tracking-wider">
              标杆案例检索
            </span>
            {recentSearches.length > 0 && (
              <button
                type="button"
                onClick={onClearRecent}
                className="text-xs text-[#8C9E9F] hover:text-[#1F3437] transition-colors"
              >
                清除历史
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {FEATURED_SUGGESTIONS.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => handleSelectTag(item.name)}
                className="p-3 bg-white border border-[#E2E6E2] rounded-xs text-left hover:border-[#3E6F73] hover:shadow-2xs transition-all group flex items-center justify-between"
              >
                <div>
                  <div className="font-serif font-bold text-sm text-[#1F3437] group-hover:text-[#3E6F73] transition-colors">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-[#627578] truncate mt-0.5">
                    {item.category}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#8C9E9F] border border-[#E8ECE8] px-1 py-0.5 rounded-xs">
                  {item.code}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Core Pillars (3 Capabilities) */}
        <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <div className="bg-white p-3.5 rounded-xs border border-[#E2E6E2] space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#A84A3E]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A84A3E]" />
              <span>反常点核验</span>
            </div>
            <p className="text-[11px] text-[#627578] leading-relaxed">
              独立标定财务反常与商业逻辑张力，揭示预期与现实的深层矛盾。
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xs border border-[#E2E6E2] space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#3E6F73]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3E6F73]" />
              <span>利益链路闭环</span>
            </div>
            <p className="text-[11px] text-[#627578] leading-relaxed">
              梳理采购款支付、代工赋能、终端销售与离岸分红的资金/业务闭环。
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xs border border-[#E2E6E2] space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#1F3437]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1F3437]" />
              <span>灰度证据模型</span>
            </div>
            <p className="text-[11px] text-[#627578] leading-relaxed">
              0~100 置信度科学量化打分，支持证据｜反方证据｜不确定变量三栏对冲。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
