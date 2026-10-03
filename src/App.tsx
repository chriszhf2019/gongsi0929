import React, { useState, useEffect } from 'react';
import { Navbar, AppTabType } from './components/Navbar';
import { SearchHero } from './components/SearchHero';
import { CompanyHeader } from './components/CompanyHeader';
import { PanoramicGraph } from './components/PanoramicGraph';
import { AnomalyCardSection } from './components/AnomalyCardSection';
import { InterestFlowDiagram } from './components/InterestFlowDiagram';
import { GrayScaleEvaluationPanel } from './components/GrayScaleEvaluationPanel';
import { ValueChainTree } from './components/ValueChainTree';
import { MultiTierPenetrationView } from './components/MultiTierPenetrationView';
import { WatchlistCenter } from './components/WatchlistCenter';
import { FinancialSegments } from './components/FinancialSegments';
import { CompanyComparison } from './components/CompanyComparison';
import { ScenarioSimulator } from './components/ScenarioSimulator';
import { DeepDecipherDossier } from './components/DeepDecipherDossier';
import { UpstreamDownstreamSection } from './components/UpstreamDownstreamSection';
import { InvestmentsJvSection } from './components/InvestmentsJvSection';
import { RiskCompetitorSection } from './components/RiskCompetitorSection';
import { ChainCopilot } from './components/ChainCopilot';
import { AutomotiveIndustryHub } from './components/AutomotiveIndustryHub';
import { NodeDetailDrawer } from './components/NodeDetailDrawer';
import { ExportModal } from './components/ExportModal';
import { PricingModal } from './components/PricingModal';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DEMO_COMPANIES } from './data/mockTemplates';
import { CompanyPanoramaData, GraphNode } from './types';
import { useExtractedData, buildSupplierEvidenceMap, buildCustomerEvidenceMap } from './hooks/useExtractedData';
import {
  ChevronRight,
  AlertCircle,
  RefreshCw,
  ArrowUp,
  FileCheck2,
  HelpCircle,
  ScanSearch,
  Network,
  Lightbulb,
  ShieldAlert,
  ArrowRightLeft,
  Factory,
} from 'lucide-react';

const RECENT_SEARCHES_KEY = 'company_panorama_recent_searches_v1';

/** 层级标题：序号 + 名称 + 问题，强化"逐层深入"的认知引导 */
const LayerHeader: React.FC<{ num: number; title: string; question: string }> = ({ num, title, question }) => (
  <div className="flex items-center gap-3 border-b border-[#E2E6E2] pb-3">
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1F3437] text-white font-serif font-bold text-sm shrink-0">
      {num}
    </span>
    <div className="min-w-0">
      <div className="font-serif font-bold text-base text-[#1F3437]">{title}</div>
      <div className="text-xs text-[#627578] font-serif truncate">{question}</div>
    </div>
  </div>
);

export default function App() {
  const { recordSearch, recordExport } = useAuth();
  // Start with default demo (比亚迪) for immediate rich interactive preview
  const [currentData, setCurrentData] = useState<CompanyPanoramaData | null>(
    () => DEMO_COMPANIES['比亚迪']
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingCompany, setLoadingCompany] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AppTabType>('overview');

  // 获取真实抽取数据（用于证据下钻）
  const { data: extractedData, hasData: hasExtractedData } = useExtractedData(currentData?.basicInfo?.name);

  // 当抽取数据变化时，合并 evidence 到 currentData
  useEffect(() => {
    if (!currentData || !extractedData) return;

    const supplierEvidenceMap = buildSupplierEvidenceMap(extractedData);
    const customerEvidenceMap = buildCustomerEvidenceMap(extractedData);

    // 更新上游供应商的 evidence
    const updatedUpstream = currentData.upstream.map((u) => ({
      ...u,
      evidence: supplierEvidenceMap.get(u.name) || u.evidence,
    }));

    // 更新下游客户的 evidence
    const updatedDownstream = currentData.downstream.map((d) => ({
      ...d,
      evidence: customerEvidenceMap.get(d.name) || d.evidence,
    }));

    // 构建 extractedEvidence
    const extractedEvidence = hasExtractedData
      ? {
          hasData: true,
          keyFinancials: extractedData.key_financials
            ? {
                sourceSection: extractedData.key_financials.source_section || '年报财务摘要',
                sourceType: 'annual_report' as const,
                revenue: extractedData.key_financials.revenue,
                grossMargin: extractedData.key_financials.gross_margin,
                netProfit: extractedData.key_financials.net_profit,
                rdExpense: extractedData.key_financials.rd_expense,
              }
            : undefined,
          topSuppliers: extractedData.top_suppliers?.suppliers?.map((s) => ({
            name: s.name,
            amount: s.amount_disclosed,
            sourceSection: s.source_section || '',
            isEstimated: s.is_estimated,
          })),
          topCustomers: extractedData.top_customers?.customers?.map((c) => ({
            name: c.name,
            revenueContribution: c.revenue_contribution,
            sourceSection: c.source_section || '',
            isEstimated: c.is_estimated,
          })),
        }
      : undefined;

    // 只有当有变化时才更新
    if (updatedUpstream.some((u, i) => u.evidence !== currentData.upstream[i]?.evidence) ||
        updatedDownstream.some((d, i) => d.evidence !== currentData.downstream[i]?.evidence) ||
        extractedEvidence !== currentData.extractedEvidence) {
      setCurrentData({
        ...currentData,
        upstream: updatedUpstream,
        downstream: updatedDownstream,
        extractedEvidence,
      });
    }
  }, [extractedData, hasExtractedData]);

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      return saved ? JSON.parse(saved) : ['比亚迪', '宁德时代', '苹果', '台积电'];
    } catch {
      return ['比亚迪', '宁德时代', '苹果'];
    }
  });

  const [selectedEntity, setSelectedEntity] = useState<{
    name: string;
    category: string;
    details?: string;
    subInfo?: string;
  } | null>(null);

  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isPricingOpen, setIsPricingOpen] = useState<boolean>(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Monitor scroll for back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const saveRecentSearch = (name: string) => {
    try {
      const updated = [name, ...recentSearches.filter((item) => item !== name)].slice(0, 8);
      setRecentSearches(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save recent searches', e);
    }
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const handleSearch = async (companyName: string) => {
    const trimmed = companyName.trim();
    if (!trimmed) return;

    setError(null);
    setLoadingCompany(trimmed);

    // Check if it's already in our rich demo library for instant response
    if (DEMO_COMPANIES[trimmed]) {
      setCurrentData(DEMO_COMPANIES[trimmed]);
      saveRecentSearch(trimmed);
      recordSearch();
      return;
    }

    // 否则调用后端 AI 分析（带 90 秒超时防止永久挂起）
    setIsLoading(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 90_000);
      const response = await fetch('/api/analyze-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: trimmed }),
        signal: controller.signal as any,
      });
      clearTimeout(timer);

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `请求失败 (${response.status})`);
      }

      const data: CompanyPanoramaData = await response.json();
      setCurrentData(data);
      saveRecentSearch(trimmed);
      recordSearch();
    } catch (err: any) {
      console.error('Error in handleSearch:', err);
      setError(
        err.message ||
          '未能成功生成该公司的全景图谱。请检查网络连接或尝试预设企业（例如：比亚迪、宁德时代、苹果）。'
      );
    } finally {
      setIsLoading(false);
      setLoadingCompany('');
    }
  };

  const handleNodeClick = (node: GraphNode) => {
    if (node.category === 'core') return;
    setSelectedEntity({
      name: node.label,
      category: node.category,
      details: node.details,
      subInfo: node.subInfo,
    });
  };

  const handleSelectEntity = (name: string, category: string, details?: string) => {
    setSelectedEntity({
      name,
      category,
      details,
    });
  };

  const handlePivotSearch = (name: string) => {
    setSelectedEntity(null);
    handleSearch(name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F6F7F5] text-[#1F3437] flex flex-col font-sans selection:bg-[#3E6F73]/20 selection:text-[#1F3437]">
      {/* Top Navbar */}
      <Navbar
        currentData={currentData}
        onOpenSearch={scrollToTop}
        onExport={() => setIsExportOpen(true)}
        onOpenPricing={() => setIsPricingOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        recentSearches={recentSearches}
        onSelectRecent={handleSearch}
      />

      {/* Main Content Body */}
      <ErrorBoundary>
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-7">
          {/* Compact Search Bar if data is present, else Hero Search */}
          <SearchHero
            onSearch={handleSearch}
            isLoading={isLoading}
            recentSearches={recentSearches}
            onClearRecent={handleClearRecent}
            compact={!!currentData}
          />

          {/* Loading Overlay State in Minimalist Style */}
          {isLoading && (
          <div className="w-full rounded-xs border border-[#E2E6E2] bg-white p-8 sm:p-12 shadow-xs text-center space-y-4 animate-in fade-in duration-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xs bg-[#F6F7F5] border border-[#E2E6E2]">
              <RefreshCw className="h-6 w-6 text-[#1F3437] animate-spin" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1F3437] tracking-tight">
                正在深度核验【{loadingCompany}】卷宗与产业链数据...
              </h3>
              <p className="text-xs text-[#627578] max-w-md mx-auto leading-relaxed">
                鉴源引擎正调取工商底档、上下游核心供应商依存度、反常点核验及资金商业闭环...
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-[#3E6F73] pt-2 font-mono">
              <span className="inline-block h-2 w-2 rounded-full bg-[#3E6F73] animate-pulse" />
              <span>知识图谱拓扑构建中 · 灰度置信度计算中</span>
            </div>
          </div>
        )}

        {/* Error State with Retry */}
        {error && !isLoading && (
          <div className="w-full rounded-xs border border-[#A84A3E]/40 bg-[#FDF7F7] p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5 text-[#A84A3E] font-serif font-bold text-base">
              <AlertCircle className="h-5 w-5" />
              <span>剖析企业卷宗遇到问题</span>
            </div>
            <p className="text-xs sm:text-sm text-[#5C2E28] leading-relaxed">{error}</p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleSearch(loadingCompany || '比亚迪')}
                className="flex items-center gap-1.5 rounded-xs bg-[#A84A3E] px-3.5 py-1.5 text-xs font-serif font-medium text-white transition-colors hover:bg-[#8F3E33]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                重新尝试
              </button>
              <button
                type="button"
                onClick={() => handleSearch('比亚迪')}
                className="rounded-xs border border-[#E2E6E2] bg-white px-3 py-1.5 text-xs font-serif font-medium text-[#1F3437] hover:bg-[#F6F7F5] transition-colors"
              >
                加载标杆示例 (比亚迪)
              </button>
            </div>
          </div>
        )}

        {/* Loaded Panorama View */}
        {currentData && !isLoading && (
          <div className="space-y-7 animate-in fade-in duration-200">
            {/* 1. Header Profile - Enterprise Overview Card */}
            <CompanyHeader
              info={currentData.basicInfo}
              executiveSummary={currentData.executiveSummary}
              timestamp={currentData.timestamp}
              isDemoData={!!DEMO_COMPANIES[currentData.query]}
            />

            {/* Mobile / Tablet 5 层递进导航条 */}
            <div className="flex xl:hidden items-center gap-0.5 overflow-x-auto p-1.5 bg-white rounded-xs border border-[#E2E6E2] text-xs no-scrollbar">
              {[
                { id: 'overview' as const, label: '全景', icon: ScanSearch },
                { id: 'topology' as const, label: '拓扑', icon: Network },
                { id: 'automotive' as const, label: '汽车', icon: Factory },
                { id: 'insights' as const, label: '洞察', icon: Lightbulb },
                { id: 'risk' as const, label: '风险', icon: ShieldAlert },
                { id: 'benchmark' as const, label: '对标', icon: ArrowRightLeft },
              ].map((layer, idx) => {
                const Icon = layer.icon;
                const isActive = activeTab === layer.id;
                return (
                  <React.Fragment key={layer.id}>
                    <button
                      type="button"
                      onClick={() => setActiveTab(layer.id)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xs font-serif shrink-0 transition-colors ${
                        isActive ? 'bg-[#1F3437] text-white font-bold' : 'text-[#627578] hover:bg-[#F6F7F5]'
                      }`}
                    >
                      <Icon className="h-3 w-3 shrink-0" />
                      {layer.label}
                    </button>
                    {idx < 4 && <ChevronRight className="h-3 w-3 text-[#D4D9D4] shrink-0" />}
                  </React.Fragment>
                );
              })}
            </div>

            {/* 5 层递进内容，每层聚焦一个问题 */}

            {/* 第 1 层：公司全景 — 这是谁? */}
            {activeTab === 'overview' && (
              <div className="space-y-7">
                <LayerHeader num={1} title="公司全景" question="这是谁?— 一句话看懂公司基本面、护城河与财务结构" />
                <DeepDecipherDossier
                  data={currentData}
                  onNavigateToTab={(tab: string) => {
                    // 旧 tab 名 → 新 5 层映射
                    const map: Record<string, AppTabType> = {
                      deep_read: 'overview',
                      financials: 'overview',
                      graph: 'topology',
                      details: 'topology',
                      multi_tier: 'topology',
                      automotive: 'automotive',
                      core_insights: 'insights',
                      value_chain: 'insights',
                      risks: 'risk',
                      simulator: 'risk',
                      comparison: 'benchmark',
                      watchlist: 'benchmark',
                    };
                    setActiveTab(map[tab] || 'overview');
                  }}
                />
                <FinancialSegments data={currentData} />
              </div>
            )}

            {/* 第 2 层：关系拓扑 — 它和谁有关? */}
            {activeTab === 'topology' && (
              <div className="space-y-7">
                <LayerHeader num={2} title="关系拓扑" question="它和谁有关?— 上下游、投资、子公司全图谱" />
                <PanoramicGraph data={currentData} onNodeClick={handleNodeClick} />
                <UpstreamDownstreamSection
                  upstream={currentData.upstream}
                  downstream={currentData.downstream}
                  onSelectEntity={handleSelectEntity}
                />
                <InvestmentsJvSection
                  investments={currentData.investments}
                  jointVentures={currentData.jointVentures}
                  onSelectEntity={handleSelectEntity}
                />
                <MultiTierPenetrationView data={currentData} onSelectEntity={handleSelectEntity} />
              </div>
            )}

            {/* 第 3 层：汽车及相关产业 — 采购、入股与时间演化 */}
            {activeTab === 'automotive' && (
              <div className="space-y-7">
                <LayerHeader num={3} title="汽车产业" question="谁供应谁、采购多少、谁入股?— 公开资料驱动的产业利益链" />
                <AutomotiveIndustryHub />
              </div>
            )}

            {/* 第 4 层：深度洞察 — 核心竞争力与反常点? */}
            {activeTab === 'insights' && (
              <div className="space-y-7">
                <LayerHeader num={4} title="深度洞察" question="核心竞争力与反常点?— 灰度评级、异动归因、利益流向" />
                {currentData.grayScaleEvaluation && (
                  <GrayScaleEvaluationPanel
                    evaluation={currentData.grayScaleEvaluation}
                    companyName={currentData.basicInfo.name}
                  />
                )}
                {currentData.anomalies && (
                  <AnomalyCardSection
                    anomalies={currentData.anomalies}
                    companyName={currentData.basicInfo.name}
                  />
                )}
                {currentData.interestFlow && (
                  <InterestFlowDiagram interestFlow={currentData.interestFlow} companyName={currentData.basicInfo.name} />
                )}
                <ValueChainTree data={currentData} onSelectEntity={handleSelectEntity} />
              </div>
            )}

            {/* 第 5 层：风险推演 — 会出什么问题? */}
            {activeTab === 'risk' && (
              <div className="space-y-7">
                <LayerHeader num={5} title="风险推演" question="会出什么问题?— 风险全景、竞争格局、压力模拟" />
                <RiskCompetitorSection
                  risks={currentData.risks}
                  competitors={currentData.competitors}
                  onSelectEntity={handleSelectEntity}
                />
                <ScenarioSimulator data={currentData} />
              </div>
            )}

            {/* 第 6 层：对标跟踪 — 和对手比如何? */}
            {activeTab === 'benchmark' && (
              <div className="space-y-7">
                <LayerHeader num={6} title="对标跟踪" question="和对手比如何?— 横向对标 + 自选股持续跟踪" />
                <CompanyComparison
                  initialCompanyA={currentData.basicInfo.name}
                  onSelectEntity={handleSelectEntity}
                />
                <WatchlistCenter
                  currentData={currentData}
                  onSelectCompany={handleSearch}
                />
              </div>
            )}
          </div>
        )}
      </main>
      </ErrorBoundary>

      {/* Floating AI Chain Copilot Assistant */}
      {currentData && (
        <ErrorBoundary>
          <ChainCopilot companyData={currentData} />
        </ErrorBoundary>
      )}

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-6 left-6 z-40 rounded-xs bg-[#1F3437] border border-[#3E6F73] p-3 text-white shadow-md hover:bg-[#3E6F73] transition-all hover:scale-105"
          title="回到顶部"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}

      {/* Node Detail Popout Drawer */}
      {selectedEntity && (
        <NodeDetailDrawer
          entity={selectedEntity}
          onClose={() => setSelectedEntity(null)}
          onPivotSearch={handlePivotSearch}
        />
      )}

      {/* Export Report Modal */}
      {isExportOpen && currentData && (
        <ExportModal
          data={currentData}
          onClose={() => setIsExportOpen(false)}
          onExportSuccess={() => recordExport()}
        />
      )}

      {/* Auth Modal (Login / Register / Fast Demo Switch) */}
      <AuthModal />

      {/* User Profile / Usage Stats Modal */}
      <UserProfileModal onOpenPricing={() => setIsPricingOpen(true)} />

      {/* Pricing / Pro Upgrade Modal */}
      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        onSelectPlan={(planId) => {
          console.log(`User selected plan: ${planId}`);
          setIsPricingOpen(false);
        }}
      />

      {/* Footer in Minimalist New Chinese Business Style */}
      <footer className="mt-16 border-t border-[#E2E6E2] bg-white py-8 text-center text-xs text-[#627578]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#1F3437]">
            <span className="flex h-5 w-5 items-center justify-center rounded-xs bg-[#1F3437] text-white text-[10px] font-serif font-bold">
              鉴
            </span>
            <span className="font-serif font-bold text-[#1F3437]">鉴源・GenSight</span>
            <span className="text-[#8C9E9F]">· 一鉴，见企业全貌</span>
          </div>
          <p className="text-[#627578] font-serif text-[11px]">
            溯源 · 核验 · 洞察真相 · 涵盖商业矛盾点检视、利益运转闭环、产业链穿透与灰度证据评估
          </p>
        </div>
      </footer>
    </div>
  );
}
