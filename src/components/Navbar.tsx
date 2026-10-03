import React, { useState } from 'react';
import {
  Network,
  Download,
  Sparkles,
  Search,
  ArrowRightLeft,
  ShieldAlert,
  BellRing,
  User,
  Menu,
  X,
  ScanSearch,
  ChevronRight,
  Lightbulb,
  Factory,
} from 'lucide-react';
import { CompanyPanoramaData } from '../types';
import { useAuth } from '../context/AuthContext';
import { AIProviderSelector } from './AIProviderSelector';

// 5 层递进导航：按"看懂一家公司"的认知路径组织
export type AppTabType =
  | 'overview'    // 第1层：公司全景 — 这是谁?
  | 'topology'    // 第2层：关系拓扑 — 它和谁有关?
  | 'automotive'  // 第3层：汽车产业 — 采购、入股和时间演化
  | 'insights'    // 第4层：深度洞察 — 核心竞争力与反常点?
  | 'risk'        // 第5层：风险推演 — 会出什么问题?
  | 'benchmark';  // 第6层：对标跟踪 — 和对手比如何?

interface NavbarProps {
  currentData: CompanyPanoramaData | null;
  onOpenSearch: () => void;
  onExport: () => void;
  onOpenPricing: () => void;
  activeTab: AppTabType;
  setActiveTab: (tab: AppTabType) => void;
  recentSearches: string[];
  onSelectRecent: (name: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentData,
  onOpenSearch,
  onExport,
  onOpenPricing,
  activeTab,
  setActiveTab,
  recentSearches,
  onSelectRecent,
}) => {
  const { user, openAuthModal, openProfileModal } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 5 层递进导航，每层回答一个问题，序号引导用户按认知路径深入
  const layers: { id: AppTabType; label: string; question: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'overview', label: '公司全景', question: '这是谁?', icon: ScanSearch },
    { id: 'topology', label: '关系拓扑', question: '它和谁有关?', icon: Network },
    { id: 'automotive', label: '汽车产业', question: '采购与入股?', icon: Factory },
    { id: 'insights', label: '深度洞察', question: '核心竞争力?', icon: Lightbulb },
    { id: 'risk', label: '风险推演', question: '会出什么问题?', icon: ShieldAlert },
    { id: 'benchmark', label: '对标跟踪', question: '对手如何?', icon: ArrowRightLeft },
  ];

  const activeIndex = layers.findIndex((l) => l.id === activeTab);

  const handleTabClick = (tab: AppTabType) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E2E6E2] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-xs bg-[#F6F7F5] border border-[#E2E6E2] text-[#1F3437] hover:bg-[#EAECE8] xl:hidden transition-colors"
            title="展开功能导航"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* New Chinese Minimalist Ink Seal Icon */}
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xs bg-[#1F3437] text-white shadow-xs shrink-0 border border-[#18292B]">
            <span className="font-serif font-bold text-base tracking-widest text-[#FAF8F5]">
              鉴
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-serif text-base sm:text-lg font-bold tracking-tight text-[#1F3437]">
                鉴源・GenSight
              </span>
              <span className="hidden sm:inline-block rounded-xs bg-[#3E6F73]/10 px-1.5 py-0.5 text-[10px] font-serif font-semibold text-[#3E6F73] border border-[#3E6F73]/20">
                商业洞察
              </span>
            </div>
            <p className="text-[11px] text-[#627578] font-serif hidden md:block">
              一鉴，见企业全貌 · 探查商业本源
            </p>
          </div>
        </div>

        {/* 5 层递进导航（桌面端） */}
        {currentData && (
          <nav className="hidden xl:flex items-stretch gap-0">
            {layers.map((layer, idx) => {
              const Icon = layer.icon;
              const isActive = activeTab === layer.id;
              const isDone = idx < activeIndex;
              return (
                <div key={layer.id} className="flex items-stretch">
                  <button
                    id={`tab-${layer.id}-btn`}
                    type="button"
                    onClick={() => setActiveTab(layer.id)}
                    className={`group flex items-center gap-1.5 px-2.5 py-1.5 font-serif transition-all ${
                      isActive
                        ? 'text-[#1F3437] font-bold'
                        : isDone
                        ? 'text-[#3E6F73] hover:text-[#1F3437]'
                        : 'text-[#8C9E9F] hover:text-[#3E6F73]'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold border transition-colors ${
                        isActive
                          ? 'bg-[#1F3437] text-white border-[#1F3437]'
                          : isDone
                          ? 'bg-[#3E6F73]/10 text-[#3E6F73] border-[#3E6F73]/30'
                          : 'bg-white text-[#8C9E9F] border-[#D4D9D4] group-hover:border-[#3E6F73]'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex flex-col items-start leading-tight">
                      <span className="text-xs">{layer.label}</span>
                      <span className={`text-[9px] ${isActive ? 'text-[#3E6F73]' : 'text-[#8C9E9F]'}`}>
                        {layer.question}
                      </span>
                    </span>
                  </button>
                  {idx < layers.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-[#D4D9D4] self-center shrink-0" />
                  )}
                </div>
              );
            })}
          </nav>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Quick Search trigger button */}
          <button
            id="nav-quick-search-btn"
            type="button"
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 sm:gap-2 rounded-xs border border-[#E2E6E2] bg-[#FBFBFA] px-2.5 sm:px-3 py-1.5 text-xs text-[#2D4245] transition-colors hover:border-[#3E6F73] hover:bg-white"
          >
            <Search className="h-3.5 w-3.5 text-[#3E6F73]" />
            <span className="hidden sm:inline font-serif">
              {currentData ? currentData.basicInfo.name : '输入企业名称...'}
            </span>
            <span className="sm:hidden text-[11px]">搜索</span>
            <kbd className="hidden rounded-xs bg-[#F0F2EF] px-1 py-0.2 text-[10px] text-[#627578] lg:inline-block font-mono">
              /
            </kbd>
          </button>

          {/* Pro Pricing & VIP Button */}
          <button
            id="nav-pro-pricing-btn"
            type="button"
            onClick={onOpenPricing}
            className="flex items-center gap-1 rounded-xs bg-[#FAF8F3] border border-[#DCD0B8] px-2.5 sm:px-3 py-1.5 text-xs font-serif font-medium text-[#7D612E] transition-all hover:bg-[#F5F0E4]"
            title="查看专业版方案"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#A6823C]" />
            <span className="hidden sm:inline">专业权益</span>
          </button>

          {/* AI Provider Selector */}
          <AIProviderSelector />

          {/* Export Report button */}
          {currentData && (
            <button
              id="nav-export-report-btn"
              type="button"
              onClick={onExport}
              className="hidden sm:flex items-center gap-1.5 rounded-xs border border-[#E2E6E2] bg-white px-2.5 sm:px-3 py-1.5 text-xs font-serif font-medium text-[#1F3437] transition-colors hover:border-[#3E6F73] hover:text-[#3E6F73]"
              title="导出卷宗研报"
            >
              <Download className="h-3.5 w-3.5 text-[#3E6F73]" />
              <span className="hidden md:inline">导出研报</span>
            </button>
          )}

          {/* User Auth Avatar / Login trigger */}
          {user ? (
            <button
              id="nav-user-profile-btn"
              type="button"
              onClick={openProfileModal}
              className="flex items-center gap-1.5 rounded-xs border border-[#E2E6E2] bg-white pl-1.5 pr-2.5 py-1 text-xs text-[#1F3437] hover:border-[#3E6F73] transition-all shadow-2xs"
              title="查看研报档案与权限"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-xs bg-[#1F3437] text-[11px] font-serif font-bold text-white">
                {user.name.charAt(0)}
              </div>
              <span className="hidden md:inline font-serif font-medium max-w-[90px] truncate">
                {user.name.split(' ')[0]}
              </span>
              <span className="hidden lg:inline rounded-xs px-1 py-0.2 text-[9px] font-mono font-bold bg-[#F6F7F5] text-[#627578] border border-[#E2E6E2]">
                {user.tier}
              </span>
            </button>
          ) : (
            <button
              id="nav-login-btn"
              type="button"
              onClick={() => openAuthModal('login')}
              className="flex items-center gap-1 rounded-xs bg-[#1F3437] hover:bg-[#3E6F73] text-white px-3 py-1.5 text-xs font-serif font-medium transition-colors"
            >
              <User className="h-3.5 w-3.5" />
              <span>登录 / 认证</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer Menu (Responsive Overlay) */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-[#E2E6E2] bg-white px-4 py-4 space-y-4 shadow-md animate-in fade-in duration-150">
          {/* User Status in Mobile Drawer */}
          <div className="flex items-center justify-between rounded-xs border border-[#E2E6E2] bg-[#FBFBFA] p-3">
            {user ? (
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xs bg-[#1F3437] font-serif font-bold text-white text-xs">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-serif font-bold text-xs text-[#1F3437]">
                      {user.name}
                    </span>
                    <span className="rounded-xs bg-[#F6F7F5] border border-[#E2E6E2] px-1 py-0.2 text-[10px] font-mono text-[#627578]">
                      {user.tier}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#627578]">{user.email}</p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#627578] font-serif">未登录分析师账号</div>
            )}

            {user ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openProfileModal();
                }}
                className="rounded-xs bg-white border border-[#E2E6E2] px-2.5 py-1.5 text-xs text-[#3E6F73] font-serif font-medium"
              >
                个人中心
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuthModal('login');
                }}
                className="rounded-xs bg-[#1F3437] px-3 py-1.5 text-xs text-white font-serif font-medium"
              >
                即刻登录
              </button>
            )}
          </div>

          {/* 5 层递进导航（移动端抽屉） */}
          {currentData && (
            <div className="space-y-1">
              <span className="text-[10px] font-serif font-semibold text-[#8C9E9F] uppercase tracking-wider px-1">
                逐层看懂一家公司
              </span>
              <div className="space-y-1.5 pt-1">
                {layers.map((layer, idx) => {
                  const Icon = layer.icon;
                  const isActive = activeTab === layer.id;
                  return (
                    <button
                      key={layer.id}
                      type="button"
                      onClick={() => handleTabClick(layer.id)}
                      className={`flex items-center gap-2.5 rounded-xs p-2.5 text-xs font-serif transition-colors border w-full text-left ${
                        isActive
                          ? 'bg-[#1F3437] border-[#1F3437] text-white'
                          : 'bg-[#FBFBFA] border-[#E2E6E2] text-[#2D4245] hover:bg-white'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold border shrink-0 ${
                          isActive
                            ? 'bg-white text-[#1F3437] border-white'
                            : 'bg-[#F6F7F5] text-[#8C9E9F] border-[#D4D9D4]'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex flex-col items-start leading-tight">
                        <span className={isActive ? 'font-bold' : ''}>{layer.label}</span>
                        <span className={`text-[10px] ${isActive ? 'text-[#9DB3B6]' : 'text-[#8C9E9F]'}`}>
                          {layer.question}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions in Mobile Drawer */}
          <div className="flex items-center gap-2 pt-2 border-t border-[#E2E6E2]">
            {currentData && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onExport();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xs border border-[#E2E6E2] bg-white py-2 text-xs font-serif font-medium text-[#1F3437]"
              >
                <Download className="h-3.5 w-3.5 text-[#3E6F73]" />
                <span>导出研报</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenPricing();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xs bg-[#FAF8F3] border border-[#DCD0B8] py-2 text-xs font-serif font-medium text-[#7D612E]"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#A6823C]" />
              <span>升级会员</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
