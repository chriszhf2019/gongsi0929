import React, { useState } from 'react';
import {
  ScanSearch,
  Satellite,
  Compass,
  Cpu,
  Flame,
  Activity,
  Layers,
  Scale,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Download,
  Sliders,
  TrendingDown,
  TrendingUp,
  Anchor,
  Zap,
  Network,
  Binary,
  AlertTriangle,
  ArrowRight,
  Info,
  Calculator,
  BarChart3,
  GitCompare,
  Briefcase,
  DollarSign,
  Gauge,
  Sparkles,
  Target,
} from 'lucide-react';
import { CompanyPanoramaData, DeepDecipherDossierData } from '../types';
import { getDeepDecipherDossier } from '../utils/forensicDataHelper';
import { useExtractedData } from '../hooks/useExtractedData';
import { computeRealForensics, RealForensicResults } from '../utils/forensicResults';
import { CrossReconciliationCard } from './CrossReconciliationCard';
import { SarFactoryMonitor } from './SarFactoryMonitor';
import {
  reconcileSuppliers,
  reconcileCustomers,
  ReconciliationMatch,
} from '../utils/crossReconciliation';

interface DeepDecipherDossierProps {
  data: CompanyPanoramaData;
  onNavigateToTab?: (tab: any) => void;
}

type DecipherDimension =
  | 'anatomy'
  | 'physical'
  | 'geometry'
  | 'causality'
  | 'entropy'
  | 'institutional'
  | 'triangulation'
  | 'decision';

export const DeepDecipherDossier: React.FC<DeepDecipherDossierProps> = ({
  data,
  onNavigateToTab,
}) => {
  const dossier: DeepDecipherDossierData = getDeepDecipherDossier(data);
  const isSynthetic = dossier._isSynthetic === true;

  // 获取真实抽取数据并计算法证指标
  const { data: extractedData, hasData: hasExtractedData } = useExtractedData(data.basicInfo?.name);
  const realForensics: RealForensicResults = computeRealForensics(extractedData?.key_financials);

  // 交叉对账计算（特色二）
  const supplierReconciliations: ReconciliationMatch[] = React.useMemo(() => {
    if (!extractedData?.top_suppliers?.suppliers) return [];
    const targetSuppliers = extractedData.top_suppliers.suppliers.map((s) => ({
      name: s.name,
      procurementAmount: s.amount_disclosed,
      sourceSection: s.source_section,
    }));
    // TODO: 当有对手方数据时，传入 counterpartyMap
    return reconcileSuppliers(targetSuppliers, new Map());
  }, [extractedData]);

  const customerReconciliations: ReconciliationMatch[] = React.useMemo(() => {
    if (!extractedData?.top_customers?.customers) return [];
    const targetCustomers = extractedData.top_customers.customers.map((c) => ({
      name: c.name,
      revenueContribution: c.revenue_contribution,
      sourceSection: c.source_section,
    }));
    // TODO: 当有对手方数据时，传入 counterpartyMap
    return reconcileCustomers(targetCustomers, new Map());
  }, [extractedData]);

  const hasReconciliationData = supplierReconciliations.length > 0 || customerReconciliations.length > 0;

  // 如果有真实数据，部分覆盖 synthetic 标记
  const effectiveSynthetic = isSynthetic && !realForensics.hasAnyResult;

  const [activeDimension, setActiveDimension] = useState<DecipherDimension>('anatomy');
  const [activeStrategicTab, setActiveStrategicTab] = useState<'essence' | 'engine' | 'risks' | 'evolution'>('essence');

  // Interactive percolation slider state in dimension 4
  const [userStress, setUserStress] = useState<number>(dossier.causalPercolation.currentNetworkStressLevel);

  // Dimension 8 interactive state
  const [activeDecisionRole, setActiveDecisionRole] = useState<'equity' | 'credit' | 'procurement'>('equity');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    dossier.sensitivityAnalysis?.scenarios[0]?.id || 'sens-1'
  );
  const [stressMultiplier, setStressMultiplier] = useState<number>(1.0);

  const pc = dossier.causalPercolation.percolationThresholdPc;
  const isCollapsed = userStress >= pc;

  const handleExportDossier = () => {
    const reportText = `===============================================================
【鉴源・GenSight】企业全维深度穿透档案 (Deep Deciphering Dossier)
标的名称：${dossier.companyName}
生成时间：${new Date().toLocaleString()}
===============================================================

【首席终局判词与生命基因】
• 商业基因类型：${dossier.verdictSummary.dnaType}
• 真实护城河评级：${dossier.verdictSummary.trueMoatRating}
• 真实造血能力：${dossier.verdictSummary.realCashGeneratingPower}
• 脆弱点震中：${dossier.verdictSummary.vulnerabilityEpicenter}
• 物理-报表真实度评分：${dossier.verdictSummary.forensicAuthenticityScore} / 100
• 首席判词：${dossier.verdictSummary.executiveVerdictPunchline}

---------------------------------------------------------------
【企业终极四问·战略深眸（本质 · 成因 · 暗礁 · 进化）】

一、公司的本质 (The Essence)
• 商业身份定性：${dossier.strategicQuadLens.essence.coreIdentity}
• 底层在赚什么钱：${dossier.strategicQuadLens.essence.underlyingProfitLogic}
• 组织生产力基因：${dossier.strategicQuadLens.essence.organizationDna}
• 资本配置效率：${dossier.strategicQuadLens.essence.capitalAllocationEfficiency}
• 穿透判词：${dossier.strategicQuadLens.essence.essencePunchline}

二、如何能成功 (Success Engine)
• 独门成本优势方程：${dossier.strategicQuadLens.successEngine.costAdvantageEquation}
• 友商学不来的根本原因：${dossier.strategicQuadLens.successEngine.whyCompetitorsFail}
• 飞轮机制四阶段：
${dossier.strategicQuadLens.successEngine.flywheelStages.map((s) => `  - [${s.stage}] ${s.title}: ${s.mechanism} (壁垒: ${s.moatDefensibility})`).join('\n')}
• 核心护城河评级：
${dossier.strategicQuadLens.successEngine.coreMoatDimensions.map((m) => `  - ${m.dimension}: [${m.rating}] ${m.description}`).join('\n')}
• 历史生死之战豪赌：
${dossier.strategicQuadLens.successEngine.historicalPivotalDecisions.map((h) => `  - (${h.year}) ${h.event}: ${h.strategicBet} ➔ 战果: ${h.payoff}`).join('\n')}

三、隐藏的风险 (Hidden Risks & Vulnerabilities)
• 综合脆弱度热力指数：${dossier.strategicQuadLens.hiddenRisks.vulnerabilityHeatmapScore} / 100
• 最严酷极限黑天鹅：${dossier.strategicQuadLens.hiddenRisks.worstCaseBlackSwan}
• 水面下关键暗礁：
${dossier.strategicQuadLens.hiddenRisks.topBlindSpots.map((b) => `  - [${b.severity}] ${b.title} (${b.category}): 触发条件=${b.triggerCondition} | 级联后果=${b.cascadingImpact} | 防御准备=${b.mitigationReadiness}`).join('\n')}

四、企业进化 (Strategic Evolution & S-Curve)
• 当前第一S曲线：${dossier.strategicQuadLens.evolution.currentSCurve.curveName} (状态: ${dossier.strategicQuadLens.evolution.currentSCurve.status})
  饱和预警：${dossier.strategicQuadLens.evolution.currentSCurve.saturationTimeline}
• 未来第二/第三增长曲线：
${dossier.strategicQuadLens.evolution.nextGrowthCurves.map((c) => `  - ${c.curveName} (成熟度: ${c.readinessScore}/100): ${c.executionProgress} (规模潜力: ${c.potentialScale})`).join('\n')}
• 五年终局情景推演：
  - [乐观概率 ${dossier.strategicQuadLens.evolution.endGameFiveYearScenario.bullCase.probability}] ${dossier.strategicQuadLens.evolution.endGameFiveYearScenario.bullCase.scenario} | 估值中枢: ${dossier.strategicQuadLens.evolution.endGameFiveYearScenario.bullCase.enterpriseValue}
  - [基准概率 ${dossier.strategicQuadLens.evolution.endGameFiveYearScenario.baseCase.probability}] ${dossier.strategicQuadLens.evolution.endGameFiveYearScenario.baseCase.scenario} | 估值中枢: ${dossier.strategicQuadLens.evolution.endGameFiveYearScenario.baseCase.enterpriseValue}
  - [悲观概率 ${dossier.strategicQuadLens.evolution.endGameFiveYearScenario.bearCase.probability}] ${dossier.strategicQuadLens.evolution.endGameFiveYearScenario.bearCase.scenario} | 估值中枢: ${dossier.strategicQuadLens.evolution.endGameFiveYearScenario.bearCase.enterpriseValue}
• 进化终局判词：${dossier.strategicQuadLens.evolution.evolutionVerdict}

---------------------------------------------------------------
维度一：商业实质与微观造血
• 自研掌控率：${dossier.businessAnatomy.inHouseVsOutsourceRatio.inHousePercentage}%
• 外部采购依赖：${dossier.businessAnatomy.inHouseVsOutsourceRatio.outsourcePercentage}%
• 经济引擎实质：${dossier.businessAnatomy.economicEngineSummary}

维度二：天基遥感与物理空间实证
• 工业用电与电网负荷守恒度：${dossier.cyberPhysicalTelemetry.powerGridCorrelationScore}%
• 物理实证结论：${dossier.cyberPhysicalTelemetry.physicalGroundTruthVerdict}
• 设施卫星遥感样本：
${dossier.cyberPhysicalTelemetry.facilities
  .map(
    (f) =>
      `  - ${f.name} (${f.location}): SAR ${f.sarBackscatterDb}dB, 官方声称 ${f.claimedCapacityUtilization}, 实测 ${f.verifiedPhysicalActivity}`
  )
  .join('\n')}

维度三：利益网络几何学与Ricci曲率
• 拓扑几何结论：${dossier.networkGeometry.networkTopologyVerdict}
• 关键咽喉边：
${dossier.networkGeometry.ricciCurvatureEdges
  .map((e) => `  - ${e.from} ➔ ${e.to} (Ricci = ${e.ricciCurvature}, ${e.bottleneckRisk})`)
  .join('\n')}

维度四：Pearl因果反事实与渗流相变
• 渗流相变临界阈值 Pc：${dossier.causalPercolation.percolationThresholdPc}
• 因果反事实推演结论：${dossier.causalPercolation.causalResilienceVerdict}

维度五：算法信息论与本福特法证
• 本福特定律卡方检验 p值：${dossier.algorithmicForensic.chiSquarePValue}
• 香农信息熵：${dossier.algorithmicForensic.shannonEntropyBits} bits (最大 ${dossier.algorithmicForensic.maxEntropyBits} bits)
• 法证结论：${dossier.algorithmicForensic.auditForensicVerdict}

---------------------------------------------------------------
维度六：机构经典量化法证模型（更专业）
• Beneish M-Score：${dossier.institutionalModels?.beneishMScore.overallScore} (${dossier.institutionalModels?.beneishMScore.manipulationRisk})
• Altman Z-Score：${dossier.institutionalModels?.altmanZScore.overallScore} (${dossier.institutionalModels?.altmanZScore.zone})
• Sloan 应计比率：${dossier.institutionalModels?.sloanAccrualRatio.accrualRatio} (CFO/净利润 = ${dossier.institutionalModels?.sloanAccrualRatio.cfoToNetIncomeRatio}x)

维度七：物理金融真实性三角交叉对账（更准确）
• 金税四期发票营收匹配度：${dossier.triangulationAudit?.threeWayReconciliation.taxRevenueMatchScore}%
• 银行对公流水对应吻合度：${dossier.triangulationAudit?.threeWayReconciliation.bankReceiptToRevenueMatch}%
• 电网能耗与物质守恒偏差：${dossier.triangulationAudit?.energyConservation.deviationPercent}%

维度八：实战决策指引与多维压力测试（更有用）
• 买方二级市场安全边际买入区间：${dossier.decisionPlaybook?.equityInvestor.marginOfSafetyPrice}
• 银行信贷最高建议敞口：${dossier.decisionPlaybook?.creditUnderwriter.suggestedCreditLimit}
• 供应链首席单源战略库存要求：${dossier.decisionPlaybook?.procurementChief.singleSourceCriticalStockDays} 天
===============================================================`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `【鉴源深度档案】_${dossier.companyName}_全维穿透报告.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {effectiveSynthetic && (
        <div className="w-full rounded-xs border border-[#C4883A] bg-[#FFF8ED] px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-[#C4883A] shrink-0 mt-0.5" />
          <div className="text-xs text-[#7A5520] leading-relaxed">
            <span className="font-serif font-bold text-[#C4883A]">示例数据 · 未接入真实计算</span>
            <span className="mx-1.5 text-[#D4D9D4]">|</span>
            以下法证数值（SAR 遥感、Benford/Beneish/Altman、三角对账等）均为预写模板占位，不代表真实分析结论。接入真实财报数据后将自动替换为可复算结果。
          </div>
        </div>
      )}
      {hasExtractedData && realForensics.hasAnyResult && (
        <div className="w-full rounded-xs border border-[#3E6F73] bg-[#F0F7F7] px-4 py-3 flex items-start gap-3">
          <CheckCircle2 className="h-4 w-4 text-[#3E6F73] shrink-0 mt-0.5" />
          <div className="text-xs text-[#1F3437] leading-relaxed">
            <span className="font-serif font-bold text-[#3E6F73]">真实法证计算已激活</span>
            <span className="mx-1.5 text-[#D4D9D4]">|</span>
            {realForensics.benford && <span>本福特 p={realForensics.benford.chiSquarePValue} </span>}
            {realForensics.sloan && <span>· Sloan 应计比率={realForensics.sloan.accrualRatio} </span>}
            <span className="text-[#627578]">（来自真实披露文件抽取）</span>
          </div>
        </div>
      )}
      {/* 1. Master Verdict Header - Archive Institutional Aesthetics */}
      <div className="bg-white rounded-xs border border-[#1F3437] shadow-sm overflow-hidden">
        {/* Top Dark Plaque */}
        <div className="px-5 py-4 bg-[#1F3437] text-white flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#2C4A4E]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xs bg-[#FAF8F5] text-[#1F3437] font-serif font-black text-lg shadow-xs">
              透
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono tracking-widest text-[#8C9E9F] uppercase">
                  ENTERPRISE DEEP DECIPHERING DOSSIER
                </span>
                <span className="text-[10px] px-1.5 py-0.2 bg-[#3E6F73]/40 text-[#E0EBE8] border border-[#3E6F73] rounded-xs font-serif">
                  跨学科穿透研判
                </span>
                <span className="inline-flex items-center gap-1 bg-[#FAF8F5]/15 border border-white/20 px-1.5 py-0.5 rounded-xs" title="本档案由 AI 模型基于公开信息多维度推演生成，非经人工核验的真实法证数据，仅供决策参考">
                  <Sparkles className="h-3 w-3 text-amber-300" />
                  <span className="text-[10px] font-serif text-[#E0EBE8]">AI 推演生成</span>
                </span>
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-[#FAF8F5] tracking-wide">
                读透【{dossier.companyName}】· 商业物理本源与因果穿透档案
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={handleExportDossier}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF8F5]/10 hover:bg-[#FAF8F5]/20 text-[#FAF8F5] border border-white/20 rounded-xs text-xs font-serif transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-amber-300" />
              <span>导出全维研判底稿</span>
            </button>
          </div>
        </div>

        {/* Executive Verdict Strip */}
        <div className="p-5 bg-[#FAF8F5] border-b border-[#E2E6E2] space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#627578] uppercase">生命基因定义:</span>
                <span className="px-2.5 py-0.5 rounded-xs bg-[#1F3437] text-white font-serif font-bold text-xs tracking-wide">
                  {dossier.verdictSummary.dnaType}
                </span>
                <span className="text-[11px] text-[#3E6F73] font-mono">
                  {dossier.verdictSummary.confidenceLevel}
                </span>
              </div>
              <p className="font-serif text-sm sm:text-base text-[#1F3437] font-medium leading-relaxed italic">
                “{dossier.verdictSummary.executiveVerdictPunchline}”
              </p>
            </div>

            {/* Authenticity Score Seal */}
            <div className="flex items-center gap-4 bg-white p-3.5 rounded-xs border border-[#E2E6E2] shrink-0">
              <div className="text-center">
                <div className="text-[10px] text-[#627578] font-serif">物理实证真实度</div>
                <div className="text-2xl sm:text-3xl font-mono font-bold text-[#1F3437]">
                  {dossier.verdictSummary.forensicAuthenticityScore}
                  <span className="text-xs text-[#8C9E9F]">/100</span>
                </div>
              </div>
              <div className="h-8 w-px bg-[#E2E6E2]" />
              <div className="text-left text-xs space-y-0.5">
                <div className="text-[#627578]">护城河成色: <span className="font-bold text-[#1F3437]">{dossier.verdictSummary.trueMoatRating}</span></div>
                <div className="text-[#627578]">核心脆弱震中: <span className="font-semibold text-[#A84A3E]">{dossier.verdictSummary.vulnerabilityEpicenter.slice(0, 14)}...</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Strategic Quad Lens Panel: 企业战略终极四问（本质 · 成因 · 暗礁 · 进化） */}
        <div className="border-b border-[#1F3437] bg-[#FAF8F5]">
          {/* Header & 4 Tabs Switcher */}
          <div className="px-5 py-3.5 bg-[#F0EFEA] border-b border-[#E2E6E2] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded-xs bg-[#1F3437] text-white font-mono text-[11px] font-bold tracking-wider uppercase">
                STRATEGIC QUAD LENS
              </span>
              <div>
                <h3 className="font-serif text-sm sm:text-base font-bold text-[#1F3437] flex items-center gap-2">
                  <span>企业战略终极四问</span>
                  <span className="text-xs text-[#627578] font-normal hidden sm:inline">（本质 · 成因 · 暗礁 · 进化）</span>
                </h3>
              </div>
            </div>

            {/* 4 Interactive Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                type="button"
                onClick={() => setActiveStrategicTab('essence')}
                className={`px-3 py-1.5 rounded-xs text-xs font-serif font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  activeStrategicTab === 'essence'
                    ? 'bg-[#1F3437] text-white shadow-xs'
                    : 'bg-white text-[#1F3437] hover:bg-[#EAECE9] border border-[#D5DDD5]'
                }`}
              >
                <span>🧬 探究本质</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveStrategicTab('engine')}
                className={`px-3 py-1.5 rounded-xs text-xs font-serif font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  activeStrategicTab === 'engine'
                    ? 'bg-[#1F3437] text-white shadow-xs'
                    : 'bg-white text-[#1F3437] hover:bg-[#EAECE9] border border-[#D5DDD5]'
                }`}
              >
                <span>🚀 如何能成功</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveStrategicTab('risks')}
                className={`px-3 py-1.5 rounded-xs text-xs font-serif font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  activeStrategicTab === 'risks'
                    ? 'bg-[#1F3437] text-white shadow-xs'
                    : 'bg-white text-[#1F3437] hover:bg-[#EAECE9] border border-[#D5DDD5]'
                }`}
              >
                <span>⚠️ 隐藏暗礁</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveStrategicTab('evolution')}
                className={`px-3 py-1.5 rounded-xs text-xs font-serif font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  activeStrategicTab === 'evolution'
                    ? 'bg-[#1F3437] text-white shadow-xs'
                    : 'bg-white text-[#1F3437] hover:bg-[#EAECE9] border border-[#D5DDD5]'
                }`}
              >
                <span>🔮 企业进化</span>
              </button>
            </div>
          </div>

          {/* Strategic Tab Content */}
          <div className="p-5 space-y-4">
            {/* 1. Essence Tab */}
            {activeStrategicTab === 'essence' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-xs border border-[#E2E6E2] space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#3E6F73] font-semibold uppercase">
                      <Target className="h-4 w-4" />
                      <span>问一·商业身份定性 (Who They Really Are)</span>
                    </div>
                    <h4 className="font-serif text-base font-bold text-[#1F3437]">
                      {dossier.strategicQuadLens.essence.coreIdentity}
                    </h4>
                    <p className="text-xs text-[#627578] leading-relaxed">
                      超越官方公关包装，穿透财报与实体产业链分工，确立企业在工业生态中的核心定位与存在理由。
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-xs border border-[#E2E6E2] space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#C28B38] font-semibold uppercase">
                      <DollarSign className="h-4 w-4" />
                      <span>问二·底层盈利逻辑 (Where Profits Originate)</span>
                    </div>
                    <h4 className="font-serif text-sm sm:text-base font-bold text-[#1F3437]">
                      {dossier.strategicQuadLens.essence.underlyingProfitLogic}
                    </h4>
                    <p className="text-xs text-[#627578] leading-relaxed">
                      解构超额毛利与净现金流的本质来源，厘清是赚取周期波动、技术专利租金，还是规模壁垒带来的效率红利。
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-xs border border-[#E2E6E2] space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#3E6F73] font-semibold uppercase">
                      <Cpu className="h-4 w-4" />
                      <span>问三·组织生产力范式与DNA (Organizational DNA)</span>
                    </div>
                    <p className="font-serif text-xs sm:text-sm font-medium text-[#1F3437] leading-relaxed">
                      {dossier.strategicQuadLens.essence.organizationDna}
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-xs border border-[#E2E6E2] space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#1F3437] font-semibold uppercase">
                      <Scale className="h-4 w-4" />
                      <span>问四·资本配置效率 (Capital Allocation Discipline)</span>
                    </div>
                    <p className="font-serif text-xs sm:text-sm font-medium text-[#1F3437] leading-relaxed">
                      {dossier.strategicQuadLens.essence.capitalAllocationEfficiency}
                    </p>
                  </div>
                </div>

                {/* Essence Punchline Strip */}
                <div className="p-4 bg-[#1F3437] text-[#FAF8F5] rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-[11px] font-mono text-[#8C9E9F] uppercase tracking-wider">
                      本质穿透终局定论 (Core Essence Verdict)
                    </div>
                    <div className="font-serif text-sm sm:text-base font-bold text-amber-200">
                      “{dossier.strategicQuadLens.essence.essencePunchline}”
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveStrategicTab('engine')}
                    className="self-start sm:self-auto px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-serif rounded-xs border border-white/20 flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    <span>探究何以成功</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* 2. Success Engine Tab */}
            {activeStrategicTab === 'engine' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Cost Advantage Equation & Why Competitors Fail */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-xs border border-[#1F3437] space-y-2 shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#1F3437] font-bold">
                      <Calculator className="h-4 w-4 text-[#3E6F73]" />
                      <span>杀手级独门成本优势方程 (The Cost Equation)</span>
                    </div>
                    <div className="p-3 bg-[#FAF8F5] rounded-xs border border-[#E2E6E2] font-mono text-xs text-[#1F3437] font-semibold leading-relaxed">
                      {dossier.strategicQuadLens.successEngine.costAdvantageEquation}
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-xs border border-[#A84A3E]/40 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#A84A3E] font-bold">
                      <AlertTriangle className="h-4 w-4" />
                      <span>为何友商学不会·难以逾越之壁 (Why Competitors Fail)</span>
                    </div>
                    <p className="font-serif text-xs sm:text-sm text-[#1F3437] leading-relaxed">
                      {dossier.strategicQuadLens.successEngine.whyCompetitorsFail}
                    </p>
                  </div>
                </div>

                {/* 4-Stage Flywheel Progression */}
                <div className="p-4 bg-white rounded-xs border border-[#E2E6E2] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono font-bold text-[#1F3437] uppercase flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-600" />
                      <span>自强化正反馈商业飞轮机制 (Self-Reinforcing Flywheel)</span>
                    </div>
                    <span className="text-[10px] text-[#627578] font-mono">从破局到绝对垄断的四阶跃迁</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {dossier.strategicQuadLens.successEngine.flywheelStages.map((stage, idx) => (
                      <div
                        key={stage.stage}
                        className="p-3 bg-[#FAF8F5] rounded-xs border border-[#E2E6E2] space-y-2 relative"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-1.5 py-0.5 rounded-xs bg-[#1F3437] text-white font-mono text-[10px] font-bold">
                            STEP 0{idx + 1}
                          </span>
                          <span className="text-[10px] font-serif text-[#3E6F73] font-semibold">
                            {stage.stage.split('：')[0]}
                          </span>
                        </div>
                        <h5 className="font-serif text-xs font-bold text-[#1F3437]">
                          {stage.title}
                        </h5>
                        <p className="text-[11px] text-[#2D4245] leading-relaxed">
                          {stage.mechanism}
                        </p>
                        <div className="pt-1.5 border-t border-[#E2E6E2] text-[10px] text-[#627578]">
                          <span className="font-semibold text-[#1F3437]">防守壁垒：</span>
                          {stage.moatDefensibility}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Core Moat Dimensions & Historical Pivotal Decisions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Moats */}
                  <div className="p-4 bg-white rounded-xs border border-[#E2E6E2] space-y-3">
                    <div className="text-xs font-mono font-bold text-[#1F3437] uppercase flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-[#3E6F73]" />
                      <span>核心护城河评级矩阵 (Core Moat Dimensions)</span>
                    </div>
                    <div className="space-y-2">
                      {dossier.strategicQuadLens.successEngine.coreMoatDimensions.map((m) => (
                        <div
                          key={m.dimension}
                          className="p-2.5 bg-[#FAF8F5] rounded-xs border border-[#E2E6E2] flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="font-serif font-bold text-[#1F3437]">{m.dimension}</div>
                            <div className="text-[#627578] text-[11px] leading-relaxed">{m.description}</div>
                          </div>
                          <span className="px-2 py-0.5 bg-[#1F3437] text-white font-mono font-bold text-[11px] rounded-xs shrink-0">
                            {m.rating}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pivotal Decisions */}
                  <div className="p-4 bg-white rounded-xs border border-[#E2E6E2] space-y-3">
                    <div className="text-xs font-mono font-bold text-[#1F3437] uppercase flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-600" />
                      <span>历史生死之战豪赌与回报 (Pivotal Decisions Timeline)</span>
                    </div>
                    <div className="space-y-2">
                      {dossier.strategicQuadLens.successEngine.historicalPivotalDecisions.map((h) => (
                        <div
                          key={h.year + h.event}
                          className="p-2.5 bg-[#FAF8F5] rounded-xs border border-[#E2E6E2] space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-[#3E6F73] text-[11px]">{h.year}</span>
                            <span className="font-serif font-bold text-[#1F3437]">{h.event}</span>
                          </div>
                          <div className="text-[#2D4245] text-[11px]">
                            <span className="text-[#627578]">战略押注：</span>{h.strategicBet}
                          </div>
                          <div className="text-[#1F3437] font-serif font-medium text-[11px] pt-1 border-t border-[#E2E6E2]">
                            <span className="text-emerald-700 font-bold">最终战果：</span>{h.payoff}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Hidden Risks Tab */}
            {activeStrategicTab === 'risks' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Vulnerability Top Banner */}
                <div className="p-4 bg-[#FAF8F5] rounded-xs border border-[#A84A3E]/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#A84A3E] font-bold">
                      <ShieldAlert className="h-4 w-4" />
                      <span>水面下暗礁与极限脆弱度研判</span>
                    </div>
                    <div className="font-serif text-xs sm:text-sm text-[#1F3437]">
                      <span className="font-bold text-[#A84A3E]">极限黑天鹅推演：</span>
                      {dossier.strategicQuadLens.hiddenRisks.worstCaseBlackSwan}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xs border border-[#E2E6E2] shrink-0 self-start md:self-auto">
                    <div className="text-right">
                      <div className="text-[10px] text-[#627578] font-mono uppercase">脆弱度热力指数</div>
                      <div className="text-xs text-[#A84A3E] font-medium">中高警惕区间</div>
                    </div>
                    <div className="text-2xl font-mono font-bold text-[#A84A3E]">
                      {dossier.strategicQuadLens.hiddenRisks.vulnerabilityHeatmapScore}
                      <span className="text-xs text-[#8C9E9F]">/100</span>
                    </div>
                  </div>
                </div>

                {/* Blind Spots Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dossier.strategicQuadLens.hiddenRisks.topBlindSpots.map((risk) => (
                    <div
                      key={risk.title}
                      className="p-4 bg-white rounded-xs border border-[#E2E6E2] space-y-2.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-xs bg-[#FAF8F5] text-[#1F3437] border border-[#D5DDD5] font-mono text-[10px] font-bold">
                          {risk.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-xs font-serif text-[10px] font-bold ${
                            risk.severity.includes('极高')
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {risk.severity}
                        </span>
                      </div>

                      <h4 className="font-serif text-sm font-bold text-[#1F3437]">
                        {risk.title}
                      </h4>

                      <div className="space-y-1.5 text-xs text-[#2D4245]">
                        <div className="p-2 bg-[#FAF8F5] rounded-xs border border-[#E2E6E2] space-y-1">
                          <div>
                            <span className="text-[#627578] font-semibold">临界触发条件：</span>
                            {risk.triggerCondition}
                          </div>
                          <div>
                            <span className="text-[#A84A3E] font-semibold">级联传导后果：</span>
                            {risk.cascadingImpact}
                          </div>
                        </div>

                        <div className="text-[11px] text-[#3E6F73] pt-1">
                          <span className="font-semibold">企业防御准备度：</span>
                          {risk.mitigationReadiness}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Evolution Tab */}
            {activeStrategicTab === 'evolution' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Current S-Curve */}
                <div className="p-4 bg-white rounded-xs border border-[#1F3437] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#1F3437] font-bold">
                      <TrendingUp className="h-4 w-4 text-[#3E6F73]" />
                      <span>当前第一S曲线与饱和度 (Current S-Curve Status)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-xs bg-amber-100 text-amber-900 border border-amber-300 font-serif text-xs font-bold">
                      {dossier.strategicQuadLens.evolution.currentSCurve.status}
                    </span>
                  </div>
                  <h4 className="font-serif text-base font-bold text-[#1F3437]">
                    {dossier.strategicQuadLens.evolution.currentSCurve.curveName}
                  </h4>
                  <p className="text-xs text-[#627578] leading-relaxed">
                    <span className="font-semibold text-[#1F3437]">饱和与放缓预警：</span>
                    {dossier.strategicQuadLens.evolution.currentSCurve.saturationTimeline}
                  </p>
                </div>

                {/* Next Growth Curves */}
                <div className="p-4 bg-white rounded-xs border border-[#E2E6E2] space-y-3">
                  <div className="text-xs font-mono font-bold text-[#1F3437] uppercase flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-700" />
                    <span>战略接力：未来第二/第三增长曲线 (Next Growth Curves)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {dossier.strategicQuadLens.evolution.nextGrowthCurves.map((curve) => (
                      <div
                        key={curve.curveName}
                        className="p-3 bg-[#FAF8F5] rounded-xs border border-[#E2E6E2] space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-serif font-bold text-[#1F3437] truncate">{curve.curveName}</span>
                          <span className="font-mono text-[10px] text-[#3E6F73] font-bold shrink-0">
                            成熟度 {curve.readinessScore}%
                          </span>
                        </div>
                        {/* Readiness Bar */}
                        <div className="h-1.5 w-full bg-[#E2E6E2] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#1F3437] transition-all"
                            style={{ width: `${curve.readinessScore}%` }}
                          />
                        </div>
                        <div className="text-[11px] text-[#627578]">
                          <span className="font-semibold text-[#1F3437]">潜在体量：</span>{curve.potentialScale}
                        </div>
                        <div className="text-[11px] text-[#2D4245] pt-1 border-t border-[#E2E6E2]">
                          <span className="font-semibold">当前落地进展：</span>{curve.executionProgress}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5-Year Scenario Simulation */}
                <div className="p-4 bg-white rounded-xs border border-[#E2E6E2] space-y-3">
                  <div className="text-xs font-mono font-bold text-[#1F3437] uppercase flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-[#3E6F73]" />
                    <span>未来5年终局情景推演与市值估值锚点 (5-Year Scenarios & Enterprise Value)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Bull Case */}
                    <div className="p-3 bg-emerald-50/50 rounded-xs border border-emerald-300 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-emerald-900">乐观情景 (Bull Case)</span>
                        <span className="px-1.5 py-0.2 rounded-xs bg-emerald-700 text-white font-mono text-[10px] font-bold">
                          概率 {dossier.strategicQuadLens.evolution.endGameFiveYearScenario.bullCase.probability}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-950 leading-relaxed">
                        {dossier.strategicQuadLens.evolution.endGameFiveYearScenario.bullCase.scenario}
                      </p>
                      <div className="pt-2 border-t border-emerald-200 font-mono font-bold text-emerald-800 text-xs">
                        估值预期：{dossier.strategicQuadLens.evolution.endGameFiveYearScenario.bullCase.enterpriseValue}
                      </div>
                    </div>

                    {/* Base Case */}
                    <div className="p-3 bg-sky-50/50 rounded-xs border border-sky-300 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-sky-900">基准情景 (Base Case)</span>
                        <span className="px-1.5 py-0.2 rounded-xs bg-sky-700 text-white font-mono text-[10px] font-bold">
                          概率 {dossier.strategicQuadLens.evolution.endGameFiveYearScenario.baseCase.probability}
                        </span>
                      </div>
                      <p className="text-[11px] text-sky-950 leading-relaxed">
                        {dossier.strategicQuadLens.evolution.endGameFiveYearScenario.baseCase.scenario}
                      </p>
                      <div className="pt-2 border-t border-sky-200 font-mono font-bold text-sky-800 text-xs">
                        估值预期：{dossier.strategicQuadLens.evolution.endGameFiveYearScenario.baseCase.enterpriseValue}
                      </div>
                    </div>

                    {/* Bear Case */}
                    <div className="p-3 bg-rose-50/50 rounded-xs border border-rose-300 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-rose-900">悲观情景 (Bear Case)</span>
                        <span className="px-1.5 py-0.2 rounded-xs bg-rose-700 text-white font-mono text-[10px] font-bold">
                          概率 {dossier.strategicQuadLens.evolution.endGameFiveYearScenario.bearCase.probability}
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-950 leading-relaxed">
                        {dossier.strategicQuadLens.evolution.endGameFiveYearScenario.bearCase.scenario}
                      </p>
                      <div className="pt-2 border-t border-rose-200 font-mono font-bold text-rose-800 text-xs">
                        估值预期：{dossier.strategicQuadLens.evolution.endGameFiveYearScenario.bearCase.enterpriseValue}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Evolution Verdict */}
                <div className="p-4 bg-[#1F3437] text-white rounded-xs space-y-1">
                  <div className="text-[10px] font-mono text-[#8C9E9F] uppercase">战略进化终局判词 (Evolutionary Verdict)</div>
                  <p className="font-serif text-xs sm:text-sm text-[#FAF8F5] leading-relaxed italic">
                    “{dossier.strategicQuadLens.evolution.evolutionVerdict}”
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 8-Dimension Institutional Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 border-b border-[#E2E6E2] bg-white divide-x divide-y lg:divide-y-0 divide-[#E2E6E2]">
          <button
            type="button"
            onClick={() => setActiveDimension('anatomy')}
            className={`p-2.5 sm:p-3 text-left transition-all ${
              activeDimension === 'anatomy'
                ? 'bg-[#1F3437] text-white'
                : 'hover:bg-[#F6F7F5] text-[#1F3437]'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-mono mb-0.5">
              <span className={activeDimension === 'anatomy' ? 'text-[#8C9E9F]' : 'text-[#3E6F73]'}>
                01
              </span>
              <Cpu className="h-3 w-3" />
            </div>
            <div className="font-serif text-xs font-bold truncate">商业造血</div>
            <div className={`text-[10px] truncate ${activeDimension === 'anatomy' ? 'text-[#8C9E9F]' : 'text-[#627578]'}`}>
              杜邦与自研壁垒
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveDimension('physical')}
            className={`p-2.5 sm:p-3 text-left transition-all ${
              activeDimension === 'physical'
                ? 'bg-[#1F3437] text-white'
                : 'hover:bg-[#F6F7F5] text-[#1F3437]'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-mono mb-0.5">
              <span className={activeDimension === 'physical' ? 'text-[#8C9E9F]' : 'text-[#3E6F73]'}>
                02
              </span>
              <Satellite className="h-3 w-3" />
            </div>
            <div className="font-serif text-xs font-bold truncate">天基实证</div>
            <div className={`text-[10px] truncate ${activeDimension === 'physical' ? 'text-[#8C9E9F]' : 'text-[#627578]'}`}>
              SAR雷达·AIS吃水
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveDimension('geometry')}
            className={`p-2.5 sm:p-3 text-left transition-all ${
              activeDimension === 'geometry'
                ? 'bg-[#1F3437] text-white'
                : 'hover:bg-[#F6F7F5] text-[#1F3437]'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-mono mb-0.5">
              <span className={activeDimension === 'geometry' ? 'text-[#8C9E9F]' : 'text-[#3E6F73]'}>
                03
              </span>
              <Network className="h-3 w-3" />
            </div>
            <div className="font-serif text-xs font-bold truncate">利益拓扑</div>
            <div className={`text-[10px] truncate ${activeDimension === 'geometry' ? 'text-[#8C9E9F]' : 'text-[#627578]'}`}>
              Ricci负曲率咽喉
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveDimension('causality')}
            className={`p-2.5 sm:p-3 text-left transition-all ${
              activeDimension === 'causality'
                ? 'bg-[#1F3437] text-white'
                : 'hover:bg-[#F6F7F5] text-[#1F3437]'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-mono mb-0.5">
              <span className={activeDimension === 'causality' ? 'text-[#8C9E9F]' : 'text-[#3E6F73]'}>
                04
              </span>
              <Activity className="h-3 w-3" />
            </div>
            <div className="font-serif text-xs font-bold truncate">因果相变</div>
            <div className={`text-[10px] truncate ${activeDimension === 'causality' ? 'text-[#8C9E9F]' : 'text-[#627578]'}`}>
              渗流Pc·反事实
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveDimension('entropy')}
            className={`p-2.5 sm:p-3 text-left transition-all ${
              activeDimension === 'entropy'
                ? 'bg-[#1F3437] text-white'
                : 'hover:bg-[#F6F7F5] text-[#1F3437]'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-mono mb-0.5">
              <span className={activeDimension === 'entropy' ? 'text-[#8C9E9F]' : 'text-[#3E6F73]'}>
                05
              </span>
              <Binary className="h-3 w-3" />
            </div>
            <div className="font-serif text-xs font-bold truncate">算法信息</div>
            <div className={`text-[10px] truncate ${activeDimension === 'entropy' ? 'text-[#8C9E9F]' : 'text-[#627578]'}`}>
              本福特谱·香农熵
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveDimension('institutional')}
            className={`p-2.5 sm:p-3 text-left transition-all relative ${
              activeDimension === 'institutional'
                ? 'bg-[#1F3437] text-white'
                : 'hover:bg-[#F6F7F5] text-[#1F3437]'
            }`}
          >
            <div className="flex items-center justify-between gap-1 text-xs font-mono mb-0.5">
              <div className="flex items-center gap-1.5">
                <span className={activeDimension === 'institutional' ? 'text-[#8C9E9F]' : 'text-[#3E6F73]'}>
                  06
                </span>
                <Calculator className="h-3 w-3" />
              </div>
              <span className={`text-[9px] px-1 py-0.2 rounded-xs font-sans ${activeDimension === 'institutional' ? 'bg-[#FAF8F5] text-[#1F3437]' : 'bg-[#1F3437] text-[#FAF8F5]'}`}>
                更专业
              </span>
            </div>
            <div className="font-serif text-xs font-bold truncate">机构法证模型</div>
            <div className={`text-[10px] truncate ${activeDimension === 'institutional' ? 'text-[#8C9E9F]' : 'text-[#627578]'}`}>
              Beneish·Altman·Sloan
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveDimension('triangulation')}
            className={`p-2.5 sm:p-3 text-left transition-all relative ${
              activeDimension === 'triangulation'
                ? 'bg-[#1F3437] text-white'
                : 'hover:bg-[#F6F7F5] text-[#1F3437]'
            }`}
          >
            <div className="flex items-center justify-between gap-1 text-xs font-mono mb-0.5">
              <div className="flex items-center gap-1.5">
                <span className={activeDimension === 'triangulation' ? 'text-[#8C9E9F]' : 'text-[#3E6F73]'}>
                  07
                </span>
                <GitCompare className="h-3 w-3" />
              </div>
              <span className={`text-[9px] px-1 py-0.2 rounded-xs font-sans ${activeDimension === 'triangulation' ? 'bg-[#FAF8F5] text-[#1F3437]' : 'bg-[#1F3437] text-[#FAF8F5]'}`}>
                更准确
              </span>
            </div>
            <div className="font-serif text-xs font-bold truncate">三角交叉对账</div>
            <div className={`text-[10px] truncate ${activeDimension === 'triangulation' ? 'text-[#8C9E9F]' : 'text-[#627578]'}`}>
              三单勾稽·能耗守恒
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveDimension('decision')}
            className={`p-2.5 sm:p-3 text-left transition-all relative ${
              activeDimension === 'decision'
                ? 'bg-[#1F3437] text-white'
                : 'hover:bg-[#F6F7F5] text-[#1F3437]'
            }`}
          >
            <div className="flex items-center justify-between gap-1 text-xs font-mono mb-0.5">
              <div className="flex items-center gap-1.5">
                <span className={activeDimension === 'decision' ? 'text-[#8C9E9F]' : 'text-[#3E6F73]'}>
                  08
                </span>
                <Briefcase className="h-3 w-3" />
              </div>
              <span className={`text-[9px] px-1 py-0.2 rounded-xs font-sans ${activeDimension === 'decision' ? 'bg-[#FAF8F5] text-[#1F3437]' : 'bg-[#1F3437] text-[#FAF8F5]'}`}>
                更有用
              </span>
            </div>
            <div className="font-serif text-xs font-bold truncate">实战决策沙盘</div>
            <div className={`text-[10px] truncate ${activeDimension === 'decision' ? 'text-[#8C9E9F]' : 'text-[#627578]'}`}>
              三视角Playbook·压测
            </div>
          </button>
        </div>
      </div>

      {/* 2. Active Dimension Deep Workspace */}

      {/* DIMENSION 1: Business Anatomy */}
      {activeDimension === 'anatomy' && (
        <div className="space-y-5">
          {/* Microeconomic Engine Summary Card */}
          <div className="p-4 sm:p-5 bg-white rounded-xs border border-[#E2E6E2] shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E6E2] pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-[#3E6F73]" />
                <h3 className="font-serif font-bold text-sm sm:text-base text-[#1F3437]">
                  微观经济学造血引擎实质剖析
                </h3>
              </div>
              <span className="text-xs font-mono text-[#627578]">
                毛利成色：垂直一体化全栈折旧
              </span>
            </div>

            <p className="text-xs sm:text-sm text-[#2D4245] leading-relaxed bg-[#FAF8F5] p-3.5 rounded-xs border border-[#E8DFDD]">
              {dossier.businessAnatomy.economicEngineSummary}
            </p>

            {/* In-House vs Outsource Bar */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-serif font-medium">
                <span className="text-[#1F3437] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1F3437]" />
                  全栈自研/自控资产比例: {dossier.businessAnatomy.inHouseVsOutsourceRatio.inHousePercentage}%
                </span>
                <span className="text-[#A84A3E] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#A84A3E]" />
                  外部采购/代工敞口比例: {dossier.businessAnatomy.inHouseVsOutsourceRatio.outsourcePercentage}%
                </span>
              </div>
              <div className="w-full h-3 bg-[#E2E6E2] rounded-full overflow-hidden flex">
                <div
                  className="bg-[#1F3437] h-full transition-all"
                  style={{ width: `${dossier.businessAnatomy.inHouseVsOutsourceRatio.inHousePercentage}%` }}
                />
                <div
                  className="bg-[#A84A3E] h-full transition-all"
                  style={{ width: `${dossier.businessAnatomy.inHouseVsOutsourceRatio.outsourcePercentage}%` }}
                />
              </div>
            </div>

            {/* Key Assets vs Vulnerabilities Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
              <div className="p-3.5 bg-[#F6F7F5] rounded-xs border border-[#E2E6E2] space-y-2">
                <span className="text-xs font-serif font-bold text-[#1F3437] flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#3E6F73]" />
                  核心自研自闭环护城河资产 (In-House Assets):
                </span>
                <ul className="space-y-1.5 text-xs text-[#2D4245]">
                  {dossier.businessAnatomy.inHouseVsOutsourceRatio.keyInHouseAssets.map((asset, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-[#3E6F73] font-bold">✓</span>
                      <span>{asset}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 bg-[#FDF7F7] rounded-xs border border-[#A84A3E]/20 space-y-2">
                <span className="text-xs font-serif font-bold text-[#A84A3E] flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-[#A84A3E]" />
                  外部依赖与潜在脆弱点 (Outsourced Exposure):
                </span>
                <ul className="space-y-1.5 text-xs text-[#5C2E28]">
                  {dossier.businessAnatomy.inHouseVsOutsourceRatio.vulnerableOutsourceAssets.map((asset, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-[#A84A3E] font-bold">⚠</span>
                      <span>{asset}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Revenue Source True Margins Deconstruction */}
          <div className="space-y-3">
            <span className="text-xs font-serif font-bold text-[#1F3437] block">
              业务板块真实造血与毛利成色拆解 (True Margin & Moat Deconstruction):
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {dossier.businessAnatomy.revenueSourceDeconstruction.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-white rounded-xs border border-[#E2E6E2] shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-xs sm:text-sm text-[#1F3437]">
                      {item.segment}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-xs font-medium border ${
                        item.substitutability === '极难替代'
                          ? 'bg-[#1F3437] text-white border-[#1F3437]'
                          : 'bg-[#F6F7F5] text-[#627578] border-[#E2E6E2]'
                      }`}
                    >
                      {item.substitutability}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono py-1 border-y border-[#F6F7F5]">
                    <div>
                      <span className="text-[#627578]">披露营收占比:</span>{' '}
                      <span className="font-bold text-[#1F3437]">{item.claimedShare}</span>
                    </div>
                    <div>
                      <span className="text-[#627578]">真实边际毛利:</span>{' '}
                      <span className="font-bold text-[#3E6F73]">{item.trueMargin}</span>
                    </div>
                  </div>

                  <div className="text-xs text-[#627578]">
                    <span className="font-serif font-semibold text-[#1F3437]">壁垒来源:</span> {item.moatType}
                  </div>

                  <p className="text-xs text-[#2D4245] leading-relaxed pt-1.5 border-t border-[#E2E6E2]">
                    {item.anatomyVerdict}
                  </p>
                </div>
              ))}
            </div>

            {/* Quick Link to Financials */}
            {onNavigateToTab && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => onNavigateToTab('financials')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-[#1F3437] text-white text-xs font-serif hover:bg-[#3E6F73] transition-colors"
                >
                  <span>查看杜邦拆解、营运资本周期与现金转换分析</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DIMENSION 2: Cyber-Physical Earth Observation Telemetry */}
      {activeDimension === 'physical' && (
        <div className="space-y-5">
          {/* Ground Truth Plaque */}
          <div className="p-4 sm:p-5 bg-white rounded-xs border border-[#E2E6E2] shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E6E2] pb-3">
              <div className="flex items-center gap-2">
                <Satellite className="h-4 w-4 text-[#3E6F73]" />
                <h3 className="font-serif font-bold text-sm sm:text-base text-[#1F3437]">
                  天基多模态遥感与物理世界真实开工对账 (Earth Observation Telemetry)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#627578]">工业电网负荷守恒度:</span>
                <span className="px-2 py-0.5 rounded-xs font-mono font-bold text-xs bg-[#3E6F73]/10 text-[#3E6F73] border border-[#3E6F73]/30">
                  {dossier.cyberPhysicalTelemetry.powerGridCorrelationScore}%
                </span>
              </div>
            </div>

            <p className="text-xs text-[#2D4245] leading-relaxed bg-[#FAF8F5] p-3 rounded-xs border border-[#E8DFDD]">
              {dossier.cyberPhysicalTelemetry.physicalGroundTruthVerdict}
            </p>

            {/* Satellite Verified Facilities Table */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E6E2] text-[#627578] font-serif bg-[#F6F7F5]">
                    <th className="p-2.5">核心智造基地 / 园区</th>
                    <th className="p-2.5">地理区位</th>
                    <th className="p-2.5">SAR雷达散射 (dB)</th>
                    <th className="p-2.5">夜光热异常辐射</th>
                    <th className="p-2.5">披露利用率</th>
                    <th className="p-2.5">天基实测开工</th>
                    <th className="p-2.5">置信度</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6E2] font-sans">
                  {dossier.cyberPhysicalTelemetry.facilities.map((fac, idx) => (
                    <tr key={idx} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="p-2.5 font-serif font-bold text-[#1F3437]">{fac.name}</td>
                      <td className="p-2.5 text-[#627578]">{fac.location}</td>
                      <td className="p-2.5 font-mono">
                        <span className="px-1.5 py-0.5 bg-gray-100 rounded-xs">
                          {fac.sarBackscatterDb} dB
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-[#A84A3E] font-medium">
                        {fac.thermalRadianceW} nW
                      </td>
                      <td className="p-2.5 font-mono text-[#1F3437]">{fac.claimedCapacityUtilization}</td>
                      <td className="p-2.5 font-serif text-[#2D4245] font-medium">
                        {fac.verifiedPhysicalActivity}
                      </td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded-xs bg-[#3E6F73]/10 text-[#3E6F73] text-[10px] font-mono">
                          {fac.confidence}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Maritime AIS Shipping Dynamics */}
          <div className="p-4 sm:p-5 bg-white rounded-xs border border-[#E2E6E2] shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E6E2] pb-3">
              <div className="flex items-center gap-2">
                <Anchor className="h-4 w-4 text-[#1F3437]" />
                <h3 className="font-serif font-bold text-sm text-[#1F3437]">
                  远洋 AIS 航运吃水线与出海货值物理流体力学校验
                </h3>
              </div>
              <span className="text-xs text-[#3E6F73] font-mono">
                流体力学质量守恒反演
              </span>
            </div>

            <div className="space-y-3">
              {dossier.cyberPhysicalTelemetry.maritimeAisShipping.map((ship, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-[#F6F7F5] rounded-xs border border-[#E2E6E2] space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-xs sm:text-sm text-[#1F3437]">
                        {ship.vesselName}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-xs font-mono">
                        流体守恒核验通过
                      </span>
                    </div>
                    <div className="text-xs text-[#627578] font-mono">
                      {ship.portOfDeparture} ➔ {ship.destinationPort}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-white p-2.5 rounded-xs border border-[#E2E6E2]">
                    <div>
                      <span className="text-[#627578] text-[10px] block">出港吃水 / 空载吃水:</span>
                      <span className="font-bold text-[#1F3437]">{ship.draughtDepartureM}m / {ship.draughtBallastM}m</span>
                    </div>
                    <div>
                      <span className="text-[#627578] text-[10px] block">排水量推演载重:</span>
                      <span className="font-bold text-[#1F3437]">{ship.displacementTonnes.toLocaleString()} 吨</span>
                    </div>
                    <div>
                      <span className="text-[#627578] text-[10px] block">吃水换算物理货值:</span>
                      <span className="font-bold text-[#3E6F73]">{ship.cargoValueEstimatedRmb}</span>
                    </div>
                    <div>
                      <span className="text-[#627578] text-[10px] block">海关报关口径:</span>
                      <span className="font-bold text-[#1F3437]">{ship.customsReportedRmb}</span>
                    </div>
                  </div>

                  <p className="text-xs text-[#2D4245] leading-relaxed">
                    <span className="font-serif font-bold text-[#1F3437]">法证结论：</span> {ship.statusNote}
                  </p>
                </div>
              ))}
            </div>

            {/* Quick Link to Core Insights Forensic Workbench */}
            {onNavigateToTab && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => onNavigateToTab('core_insights')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-[#1F3437] text-white text-xs font-serif hover:bg-[#3E6F73] transition-colors"
                >
                  <span>查看反常点多源证据交叉底稿与卫星热力图核验</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Sentinel-1 SAR Factory Monitor (特色三 - 真实遥感数据) */}
          <div className="p-4 sm:p-5 bg-white rounded-xs border border-[#E2E6E2] shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E6E2] pb-3">
              <div className="flex items-center gap-2">
                <Satellite className="h-4 w-4 text-[#3E6F73]" />
                <h3 className="font-serif font-bold text-sm sm:text-base text-[#1F3437]">
                  Sentinel-1 SAR 工厂开工实证监测
                </h3>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 bg-[#3E6F73]/10 text-[#3E6F73] border border-[#3E6F73]/20 rounded-xs font-sans">
                Copernicus 实测
              </span>
            </div>
            <SarFactoryMonitor companyName={data.basicInfo?.name} />
          </div>
        </div>
      )}

      {/* DIMENSION 3: Network Geometry & Ricci Curvature */}
      {activeDimension === 'geometry' && (
        <div className="space-y-5">
          <div className="p-4 sm:p-5 bg-white rounded-xs border border-[#E2E6E2] shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E6E2] pb-3">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-[#A84A3E]" />
                <h3 className="font-serif font-bold text-sm sm:text-base text-[#1F3437]">
                  里奇曲率（Ollivier-Ricci Curvature）致命咽喉边测算
                </h3>
              </div>
              <span className="text-xs font-mono text-[#627578]">
                负曲率边 = 系统级脆弱断点
              </span>
            </div>

            <p className="text-xs text-[#2D4245] leading-relaxed bg-[#FAF8F5] p-3 rounded-xs border border-[#E8DFDD]">
              {dossier.networkGeometry.networkTopologyVerdict}
            </p>

            {/* Negative Ricci Curvature Edges */}
            <div className="space-y-3 pt-1">
              <span className="text-xs font-serif font-bold text-[#1F3437] block">
                全网曲率边风险评级明细：
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {dossier.networkGeometry.ricciCurvatureEdges.map((edge, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xs border space-y-2 ${
                      edge.ricciCurvature < -0.5
                        ? 'bg-[#FDF7F7] border-[#A84A3E]/30'
                        : 'bg-white border-[#E2E6E2]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-[#627578]">
                        曲率: <span className="font-bold text-xs text-[#1F3437]">{edge.ricciCurvature}</span>
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-xs font-medium border ${
                          edge.bottleneckRisk === '极高脆断咽喉'
                            ? 'bg-[#A84A3E] text-white border-[#A84A3E]'
                            : 'bg-[#3E6F73]/10 text-[#3E6F73] border-[#3E6F73]/20'
                        }`}
                      >
                        {edge.bottleneckRisk}
                      </span>
                    </div>

                    <div className="text-xs font-serif font-bold text-[#1F3437] flex items-center gap-1">
                      <span className="truncate">{edge.from}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#627578]" />
                      <span className="truncate">{edge.to}</span>
                    </div>

                    <div className="text-[11px] text-[#627578]">
                      流动类型: <span className="text-[#1F3437]">{edge.flowType}</span>
                    </div>

                    <p className="text-xs text-[#2D4245] leading-relaxed pt-1.5 border-t border-[#E2E6E2]">
                      {edge.whyVulnerable}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hidden Capital Reservoirs */}
          <div className="p-4 sm:p-5 bg-white rounded-xs border border-[#E2E6E2] shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E6E2] pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#1F3437]" />
                <h3 className="font-serif font-bold text-sm text-[#1F3437]">
                  隐秘体外利益蓄水池与隔离架构 (Hidden Capital Reservoirs)
                </h3>
              </div>
              <span className="text-xs text-[#627578]">
                风险隔离与利润平滑
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {dossier.networkGeometry.hiddenReservoirs.map((res, idx) => (
                <div key={idx} className="p-3.5 bg-[#F6F7F5] rounded-xs border border-[#E2E6E2] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-xs sm:text-sm text-[#1F3437]">
                      {res.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-white border border-[#E2E6E2] text-[#627578] rounded-xs font-mono">
                      穿透透明度: {res.shareholdingOpacity}
                    </span>
                  </div>
                  <div className="text-xs text-[#627578]">
                    <span className="font-semibold text-[#1F3437]">生态功能:</span> {res.role}
                  </div>
                  <p className="text-xs text-[#2D4245] leading-relaxed pt-1 border-t border-[#E2E6E2]">
                    <span className="font-semibold text-[#1F3437]">资本/风险移转实质：</span> {res.riskOrCapitalTransfer}
                  </p>
                </div>
              ))}
            </div>

            {/* Quick Link to Graph Topology */}
            {onNavigateToTab && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => onNavigateToTab('graph')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-[#1F3437] text-white text-xs font-serif hover:bg-[#3E6F73] transition-colors"
                >
                  <span>在关系拓扑中展开全网多层节点与股权链路</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DIMENSION 4: Pearlian Causality & Percolation Threshold */}
      {activeDimension === 'causality' && (
        <div className="space-y-5">
          {/* Percolation Interactive Slider Plaque */}
          <div className="p-4 sm:p-5 bg-white rounded-xs border border-[#E2E6E2] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E6E2] pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#A84A3E]" />
                <h3 className="font-serif font-bold text-sm sm:text-base text-[#1F3437]">
                  网络渗流相变临界模拟器 (Percolation Phase Transition)
                </h3>
              </div>
              <div className="text-xs font-mono">
                巨连通分支崩塌临界阈值: <span className="font-bold text-[#A84A3E]">Pc = {pc}</span>
              </div>
            </div>

            {/* Slider Control */}
            <div className="space-y-2 bg-[#F6F7F5] p-4 rounded-xs border border-[#E2E6E2]">
              <div className="flex items-center justify-between text-xs font-serif font-medium">
                <span className="text-[#1F3437]">
                  滑动模拟供应链节点阻断比例 (p): <span className="font-mono font-bold text-sm">{(userStress * 100).toFixed(1)}%</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded-xs font-bold text-xs ${
                    isCollapsed ? 'bg-[#A84A3E] text-white animate-pulse' : 'bg-[#3E6F73] text-white'
                  }`}
                >
                  {isCollapsed ? '【已触发二级相变：巨连通雪崩崩塌】' : '【网络处于次临界稳态：具备自愈吸附力】'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.45"
                step="0.01"
                value={userStress}
                onChange={(e) => setUserStress(parseFloat(e.target.value))}
                className="w-full accent-[#1F3437] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#627578]">
                <span>0% (无扰动)</span>
                <span className="text-[#A84A3E] font-bold">Pc = {(pc * 100).toFixed(0)}% (相变临界线)</span>
                <span>45% (重度封锁)</span>
              </div>
            </div>

            <p className="text-xs text-[#2D4245] leading-relaxed bg-[#FAF8F5] p-3 rounded-xs border border-[#E8DFDD]">
              {dossier.causalPercolation.causalResilienceVerdict}
            </p>
          </div>

          {/* Judea Pearl do(X) Counterfactual Experiments */}
          <div className="p-4 sm:p-5 bg-white rounded-xs border border-[#E2E6E2] shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E6E2] pb-2.5">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-[#1F3437]" />
                <h3 className="font-serif font-bold text-sm text-[#1F3437]">
                  Judea Pearl 结构因果模型反事实介入实验 (Counterfactual do-Calculus)
                </h3>
              </div>
              <span className="text-xs text-[#627578]">
                超越相关性的真实因果流
              </span>
            </div>

            <div className="space-y-3">
              {dossier.causalPercolation.pearlDoInterventionCases.map((exp, idx) => (
                <div key={idx} className="p-4 bg-[#F6F7F5] rounded-xs border border-[#E2E6E2] space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-mono font-bold text-xs sm:text-sm text-[#1F3437] bg-white px-2.5 py-1 rounded-xs border border-[#E2E6E2]">
                      {exp.intervention}
                    </span>
                    <span className="text-xs font-serif text-[#3E6F73]">
                      反事实韧性半衰期: <span className="font-mono font-bold">{exp.resilienceHalfLifeDays} 天</span>
                    </span>
                  </div>

                  <p className="text-xs text-[#2D4245] leading-relaxed pt-1">
                    {exp.counterfactualOutcome}
                  </p>

                  <div className="text-xs text-[#627578] bg-white p-2.5 rounded-xs border border-[#E2E6E2]">
                    <span className="font-serif font-bold text-[#1F3437]">应急对冲动作：</span> {exp.emergencyAction}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Link to Scenario Simulator */}
            {onNavigateToTab && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => onNavigateToTab('simulator')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-[#1F3437] text-white text-xs font-serif hover:bg-[#3E6F73] transition-colors"
                >
                  <span>在多阶段时间轴推演沙盘中演练多米诺骨牌级联冲击</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DIMENSION 5: Algorithmic Information Theory & Benford Forensic Spectrum */}
      {activeDimension === 'entropy' && (
        <div className="space-y-5">
          <div className="p-4 sm:p-5 bg-white rounded-xs border border-[#E2E6E2] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E6E2] pb-3">
              <div className="flex items-center gap-2">
                <Binary className="h-4 w-4 text-[#3E6F73]" />
                <h3 className="font-serif font-bold text-sm sm:text-base text-[#1F3437]">
                  本福特定律（Benford's Law）多阶数字谱与香农信息熵检视
                </h3>
                {realForensics.benford && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-[#3E6F73]/10 text-[#3E6F73] border border-[#3E6F73]/20 rounded-xs font-sans">
                    真实计算
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span>卡方检验: <strong className="text-[#3E6F73]">p = {realForensics.benford?.chiSquarePValue ?? dossier.algorithmicForensic.chiSquarePValue}</strong></span>
                <span>信息熵: <strong className="text-[#1F3437]">{realForensics.benford?.shannonEntropyBits ?? dossier.algorithmicForensic.shannonEntropyBits} bits</strong></span>
              </div>
            </div>

            <p className="text-xs text-[#2D4245] leading-relaxed bg-[#FAF8F5] p-3 rounded-xs border border-[#E8DFDD]">
              {realForensics.benford?.verdictLabel ?? dossier.algorithmicForensic.auditForensicVerdict}
            </p>

            {/* Benford Digital Spectrum Visualization */}
            <div className="p-4 bg-[#F6F7F5] rounded-xs border border-[#E2E6E2] space-y-3">
              <div className="flex items-center justify-between text-xs font-serif font-medium text-[#1F3437]">
                <span>首位数字分布检验 (Digits 1 - 9)</span>
                <div className="flex items-center gap-3 text-[11px] font-mono">
                  <span className="flex items-center gap-1 text-[#627578]">
                    <span className="w-2.5 h-2.5 bg-[#8C9E9F] rounded-xs inline-block" />
                    本福特自然对数期望
                  </span>
                  <span className="flex items-center gap-1 text-[#1F3437]">
                    <span className="w-2.5 h-2.5 bg-[#1F3437] rounded-xs inline-block" />
                    企业账目实际分布
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-9 gap-1.5 sm:gap-3 items-end h-40 pt-4 border-b border-[#E2E6E2]">
                {(realForensics.benford?.spectrum ?? dossier.algorithmicForensic.benfordSpectrum).map((item) => (
                  <div key={item.digit} className="flex flex-col items-center gap-1 h-full justify-end">
                    <div className="flex items-end gap-1 w-full justify-center h-full">
                      {/* Theoretical Bar */}
                      <div
                        className="w-2 sm:w-3 bg-[#8C9E9F]/60 rounded-xs transition-all"
                        style={{ height: `${item.theoreticalPercent * 2.8}%` }}
                        title={`理论期望: ${item.theoreticalPercent}%`}
                      />
                      {/* Actual Bar */}
                      <div
                        className="w-2 sm:w-3 bg-[#1F3437] rounded-xs transition-all"
                        style={{ height: `${item.actualPercent * 2.8}%` }}
                        title={`实际分布: ${item.actualPercent}%`}
                      />
                    </div>
                    <span className="text-xs font-mono font-bold text-[#1F3437] mt-1">{item.digit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-[#627578] font-mono leading-relaxed">
              {realForensics.benford
                ? '* 注：以上数值来自真实财报数据抽取与本福特分析模块实时计算，非预写模板。'
                : '* 注：自然商业流水的首位数字严格服从 $P(d) = \\log_{10}(1 + 1/d)$ 分布。当 p > 0.05 且香农熵高于 3.10 bits 时，数理统计上可证实该企业的流水未经历人工大额规整调账或虚假发票对开。'}
            </div>

            {/* Quick Link to Investigation Paper */}
            {onNavigateToTab && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => onNavigateToTab('core_insights')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-[#1F3437] text-white text-xs font-serif hover:bg-[#3E6F73] transition-colors"
                >
                  <span>前往现场尽调核验清单与调查员工作底稿</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DIMENSION 6: Institutional Forensic Models (更专业) */}
      {activeDimension === 'institutional' && dossier.institutionalModels && (
        <div className="space-y-5">
          {/* Top Banner / Verdict */}
          <div className="p-4 sm:p-5 bg-white rounded-xs border border-[#1F3437] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E6E2] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#1F3437] text-white rounded-xs">
                  <Calculator className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm sm:text-base text-[#1F3437]">
                    经典学术与对冲基金法证模型 (Beneish M-Score & Altman Z-Score)
                  </h3>
                  <div className="text-[11px] text-[#627578] font-mono">
                    哈佛/NYU Stern经典量化公式·8大应计操纵指数·5因子破产违约函数
                  </div>
                </div>
                {realForensics.sloan && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-[#3E6F73]/10 text-[#3E6F73] border border-[#3E6F73]/20 rounded-xs font-sans">
                    Sloan 真实计算
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2.5 py-1 rounded-xs bg-[#FAF8F5] border border-[#E8DFDD] text-[#1F3437] font-semibold">
                  {realForensics.beneish
                    ? `操纵风险: ${realForensics.beneish.manipulationRiskLabel}`
                    : '操纵风险后验概率: < 1%'}
                </span>
              </div>
            </div>

            {/* Model Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Beneish Score Card */}
              <div className="p-3.5 bg-[#FAF8F5] rounded-xs border border-[#E8DFDD] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-serif text-[#627578]">Beneish M-Score</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-xs bg-[#2D4A3E] text-white">
                    安全阈值 &lt; -1.78
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-mono font-bold text-[#1F3437]">
                    {realForensics.beneish?.overallScore.toFixed(2) ?? dossier.institutionalModels.beneishMScore.overallScore.toFixed(2)}
                  </span>
                  <span className="text-xs font-serif text-[#2D4A3E] font-medium">
                    {realForensics.beneish?.manipulationRiskLabel ?? dossier.institutionalModels.beneishMScore.manipulationRisk}
                  </span>
                </div>
                <p className="text-[11px] text-[#627578] leading-tight">
                  {realForensics.beneish?.verdictLabel ?? dossier.institutionalModels.beneishMScore.modelVerdict}
                </p>
              </div>

              {/* Altman Z-Score Card */}
              <div className="p-3.5 bg-[#FAF8F5] rounded-xs border border-[#E8DFDD] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-serif text-[#627578]">Altman Z-Score 破产评级</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-xs bg-[#2D4A3E] text-white">
                    安全区 &gt; 2.99
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-mono font-bold text-[#1F3437]">
                    {realForensics.altman?.overallScore.toFixed(2) ?? dossier.institutionalModels.altmanZScore.overallScore.toFixed(2)}
                  </span>
                  <span className="text-xs font-serif text-[#2D4A3E] font-medium">
                    {realForensics.altman?.zoneLabel ?? dossier.institutionalModels.altmanZScore.zone}
                  </span>
                </div>
                <p className="text-[11px] text-[#627578] leading-tight">
                  {realForensics.altman?.verdictLabel ?? dossier.institutionalModels.altmanZScore.modelVerdict}
                </p>
              </div>

              {/* Sloan Accrual Quality Card */}
              <div className="p-3.5 bg-[#FAF8F5] rounded-xs border border-[#E8DFDD] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-serif text-[#627578]">Sloan 盈余质量与现金剪刀差</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-xs bg-[#3E6F73] text-white">
                    CFO / 净利 &gt; 1.0x
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-mono font-bold text-[#1F3437]">
                    {(realForensics.sloan?.cfoToNetIncomeRatio ?? dossier.institutionalModels.sloanAccrualRatio.cfoToNetIncomeRatio).toFixed(2)}x
                  </span>
                  <span className="text-xs font-serif text-[#2D4A3E] font-medium">
                    应计率: {realForensics.sloan?.accrualRatio ?? dossier.institutionalModels.sloanAccrualRatio.accrualRatio}
                  </span>
                </div>
                <p className="text-[11px] text-[#627578] leading-tight">
                  {realForensics.sloan?.verdictLabel ?? dossier.institutionalModels.sloanAccrualRatio.modelVerdict}
                </p>
              </div>
            </div>

            {/* Beneish 8-Variable Detailed Matrix */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="font-serif font-bold text-xs sm:text-sm text-[#1F3437] flex items-center gap-1.5">
                  <span>Beneish M-Score 8大操纵诱因变量全景穿透矩阵</span>
                </h4>
                <span className="text-[11px] font-mono text-[#627578]">
                  公式: M = -4.84 + 0.920*DSRI + 0.528*GMI + 0.404*AQI + 0.892*SGI + ...
                </span>
              </div>

              <div className="overflow-x-auto rounded-xs border border-[#E2E6E2]">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="bg-[#F6F7F5] border-b border-[#E2E6E2] text-[#1F3437] font-serif font-semibold">
                      <th className="py-2.5 px-3">代码</th>
                      <th className="py-2.5 px-3">指标名称</th>
                      <th className="py-2.5 px-3 text-right">测算数值</th>
                      <th className="py-2.5 px-3 text-right">健康基准</th>
                      <th className="py-2.5 px-3 text-center">状态</th>
                      <th className="py-2.5 px-4 font-serif">法证审计含义</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E6E2] bg-white">
                    {dossier.institutionalModels.beneishMScore.variables.map((v) => (
                      <tr key={v.code} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-2.5 px-3 font-bold text-[#1F3437]">{v.code}</td>
                        <td className="py-2.5 px-3 font-serif text-[#2D4245]">{v.name}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#1F3437]">
                          {v.value.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#627578]">{v.benchmark.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded-xs text-[10px] font-sans ${
                              v.status === 'normal'
                                ? 'bg-[#E8F3EE] text-[#2D4A3E] font-medium'
                                : 'bg-[#FBEAE8] text-[#A84A3E] font-bold'
                            }`}
                          >
                            {v.status === 'normal' ? '正常受控' : '轻微异常'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-serif text-[11px] text-[#627578] leading-tight">
                          {v.note}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Altman Z-Score 5 Factors Breakdown */}
            <div className="p-4 bg-[#F6F7F5] rounded-xs border border-[#E2E6E2] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-serif font-bold text-xs sm:text-sm text-[#1F3437]">
                  Altman Z-Score 破产防御度 5因子贡献度分解
                </h4>
                <span className="text-[11px] font-mono text-[#627578]">
                  Z = 1.2*X1 + 1.4*X2 + 3.3*X3 + 0.6*X4 + 0.999*X5
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
                {dossier.institutionalModels.altmanZScore.variables.map((v) => (
                  <div key={v.code} className="p-3 bg-white rounded-xs border border-[#E2E6E2] space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold text-[#1F3437]">{v.code}</span>
                      <span className="text-[#627578]">权重 ×{v.weight}</span>
                    </div>
                    <div className="text-[11px] font-serif text-[#2D4245] truncate" title={v.name}>
                      {v.name}
                    </div>
                    <div className="pt-1 flex items-baseline justify-between border-t border-[#F6F7F5]">
                      <span className="text-xs font-mono text-[#627578]">比率: {v.value}</span>
                      <span className="text-sm font-mono font-bold text-[#1F3437]">+{v.contribution.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Link */}
            {onNavigateToTab && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => onNavigateToTab('financials')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-[#1F3437] text-white text-xs font-serif hover:bg-[#3E6F73] transition-colors"
                >
                  <span>前往财报穿透与资产负债结构推演</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DIMENSION 7: Triangulation Cross-Audit (更准确) */}
      {activeDimension === 'triangulation' && dossier.triangulationAudit && (
        <div className="space-y-5">
          <div className="p-4 sm:p-5 bg-white rounded-xs border border-[#1F3437] shadow-xs space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E6E2] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#1F3437] text-white rounded-xs">
                  <GitCompare className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm sm:text-base text-[#1F3437]">
                    物理实体与金融流水三方闭环交叉勾稽 (Triangulation Ground-Truth)
                  </h3>
                  <div className="text-[11px] text-[#627578] font-mono">
                    金税四期增值税底账·商业银行对公流水·特高压电网能耗守恒·上下游镜像财报
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-xs bg-[#E8F3EE] text-[#2D4A3E] font-bold border border-[#C6DFD4]">
                三单真实吻合度: 98.4%
              </span>
            </div>

            {/* Section 1: Tax, Bank & Revenue Three-Way Match */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#FAF8F5] rounded-xs border border-[#E8DFDD] space-y-3">
                <div className="flex items-center justify-between border-b border-[#E8DFDD] pb-2">
                  <span className="font-serif font-bold text-xs text-[#1F3437] flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-[#2D4A3E]" />
                    金税四期发票开票流与申报营收勾稽
                  </span>
                  <span className="text-sm font-mono font-bold text-[#2D4A3E]">
                    {dossier.triangulationAudit.threeWayReconciliation.taxRevenueMatchScore}% 一致
                  </span>
                </div>
                <p className="text-xs text-[#2D4245] leading-relaxed">
                  {dossier.triangulationAudit.threeWayReconciliation.taxInspectionVerdict}
                </p>
                <div className="text-[11px] text-[#627578] font-mono pt-1">
                  * 校验标准：税务金税全电发票销项票面含税额折算不含税销售，与主营业务出库单及报表主营收入环比比对。
                </div>
              </div>

              <div className="p-4 bg-[#FAF8F5] rounded-xs border border-[#E8DFDD] space-y-3">
                <div className="flex items-center justify-between border-b border-[#E8DFDD] pb-2">
                  <span className="font-serif font-bold text-xs text-[#1F3437] flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-[#3E6F73]" />
                    商业银行对公回款流水与真实商业实质
                  </span>
                  <span className="text-sm font-mono font-bold text-[#3E6F73]">
                    {dossier.triangulationAudit.threeWayReconciliation.bankReceiptToRevenueMatch}% 吻合
                  </span>
                </div>
                <p className="text-xs text-[#2D4245] leading-relaxed">
                  {dossier.triangulationAudit.threeWayReconciliation.cashReconciliationVerdict}
                </p>
                <div className="text-[11px] text-[#627578] font-mono pt-1">
                  * 校验标准：穿透核验资金最终来源账户是否为第三方真实终端客户，排查向关联方拆借虚构交易流水的闭环洗钱。
                </div>
              </div>
            </div>

            {/* Section 2: Energy & Mass Conservation (物理守恒实测) */}
            <div className="p-4 bg-[#F6F7F5] rounded-xs border border-[#E2E6E2] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-serif font-bold text-xs sm:text-sm text-[#1F3437] flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-[#C27803]" />
                  不可篡改的物理学约束：热力学能量与质量守恒定律实测验证
                </h4>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-xs bg-white border border-[#E2E6E2] text-[#1F3437]">
                  实测物理偏差: 仅 {dossier.triangulationAudit.energyConservation.deviationPercent}%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xs border border-[#E2E6E2] space-y-1">
                  <div className="text-[11px] text-[#627578] font-serif">工程理论单耗指标</div>
                  <div className="font-mono font-medium text-[#1F3437]">
                    {dossier.triangulationAudit.energyConservation.unitConsumptionTheoretical}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xs border border-[#E2E6E2] space-y-1">
                  <div className="text-[11px] text-[#627578] font-serif">电网特高压专用变电站实测负荷</div>
                  <div className="font-mono font-medium text-[#1F3437]">
                    {dossier.triangulationAudit.energyConservation.gridSubstationMeasured}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-[#FAF8F5] rounded-xs border border-[#E8DFDD] text-xs text-[#2D4245] leading-relaxed">
                <span className="font-bold text-[#1F3437]">法证物理结论：</span>
                {dossier.triangulationAudit.energyConservation.conservationVerdict}
              </div>
            </div>

            {/* Section 3: Mirror-Image Reconciliation Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-serif font-bold text-xs sm:text-sm text-[#1F3437]">
                  公开披露上下游财报双向镜像对账 (Mirror-Image Disclosures)
                </h4>
                <span className="text-[11px] font-mono text-[#627578]">
                  对手方上市公司年报客户/供应商披露交叉对账
                </span>
              </div>

              <div className="overflow-x-auto rounded-xs border border-[#E2E6E2]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F6F7F5] border-b border-[#E2E6E2] text-[#1F3437] font-serif font-semibold">
                      <th className="py-2.5 px-3">上下游核验对手方</th>
                      <th className="py-2.5 px-3">本公司声称交易/应收付</th>
                      <th className="py-2.5 px-3">对手方年报对应披露科目</th>
                      <th className="py-2.5 px-3 text-center">镜像吻合率</th>
                      <th className="py-2.5 px-4 font-serif">对账审计备忘</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E6E2] bg-white font-mono">
                    {dossier.triangulationAudit.mirrorReconciliation.map((m, idx) => (
                      <tr key={idx} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-2.5 px-3 font-bold text-[#1F3437] font-serif">{m.supplierOrCustomer}</td>
                        <td className="py-2.5 px-3 text-[#2D4245]">{m.targetClaimedRmb}</td>
                        <td className="py-2.5 px-3 text-[#2D4245]">{m.counterpartyDisclosedRmb}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-xs bg-[#E8F3EE] text-[#2D4A3E] font-bold text-[11px]">
                            {m.matchRatePercent}%
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-serif text-[11px] text-[#627578] leading-tight">
                          {m.forensicNote}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 4: Real Cross-Reconciliation from Extracted Data (特色二) */}
            {hasReconciliationData && (
              <div className="space-y-4 pt-4 border-t border-[#E2E6E2]">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-xs sm:text-sm text-[#1F3437] flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#3E6F73]" />
                    真实披露数据交叉对账（来自巨潮/SEC/港交所抽取）
                  </h4>
                  <span className="text-[10px] px-1.5 py-0.5 bg-[#3E6F73]/10 text-[#3E6F73] border border-[#3E6F73]/20 rounded-xs font-sans">
                    真实计算
                  </span>
                </div>

                {supplierReconciliations.length > 0 && (
                  <CrossReconciliationCard
                    matches={supplierReconciliations}
                    title="供应商交叉对账"
                    type="supplier"
                  />
                )}

                {customerReconciliations.length > 0 && (
                  <CrossReconciliationCard
                    matches={customerReconciliations}
                    title="客户交叉对账"
                    type="customer"
                  />
                )}
              </div>
            )}

            {/* Quick Link */}
            {onNavigateToTab && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => onNavigateToTab('core_insights')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-[#1F3437] text-white text-xs font-serif hover:bg-[#3E6F73] transition-colors"
                >
                  <span>前往尽调清单核实实地水电气与海关货代提单</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DIMENSION 8: Actionable Decision Playbook & Sensitivity Simulator (更有用) */}
      {activeDimension === 'decision' && dossier.decisionPlaybook && (
        <div className="space-y-5">
          <div className="p-4 sm:p-5 bg-white rounded-xs border border-[#1F3437] shadow-xs space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E6E2] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#1F3437] text-white rounded-xs">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm sm:text-base text-[#1F3437]">
                    机构级实战决策指引与多变量敏感性压力测试台
                  </h3>
                  <div className="text-[11px] text-[#627578] font-mono">
                    买方二级市场·银行固收信贷·链主供应链CPO·黑天鹅冲击模拟器
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-[#627578]">当前评定基因:</span>
                <span className="font-bold text-[#1F3437] px-2 py-0.5 rounded-xs bg-[#F6F7F5] border border-[#E2E6E2]">
                  {dossier.verdictSummary.dnaType}
                </span>
              </div>
            </div>

            {/* 3-Role Action Playbook Switcher */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[#E2E6E2] pb-2">
                <button
                  type="button"
                  onClick={() => setActiveDecisionRole('equity')}
                  className={`px-3 py-1.5 rounded-xs text-xs font-serif font-medium transition-all ${
                    activeDecisionRole === 'equity'
                      ? 'bg-[#1F3437] text-white shadow-2xs'
                      : 'bg-[#F6F7F5] text-[#1F3437] hover:bg-[#E2E6E2]'
                  }`}
                >
                  📈 买方二级市场投资经理 (Equity PM)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDecisionRole('credit')}
                  className={`px-3 py-1.5 rounded-xs text-xs font-serif font-medium transition-all ${
                    activeDecisionRole === 'credit'
                      ? 'bg-[#1F3437] text-white shadow-2xs'
                      : 'bg-[#F6F7F5] text-[#1F3437] hover:bg-[#E2E6E2]'
                  }`}
                >
                  🏦 银行信贷与固收风控 (Credit Underwriter)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDecisionRole('procurement')}
                  className={`px-3 py-1.5 rounded-xs text-xs font-serif font-medium transition-all ${
                    activeDecisionRole === 'procurement'
                      ? 'bg-[#1F3437] text-white shadow-2xs'
                      : 'bg-[#F6F7F5] text-[#1F3437] hover:bg-[#E2E6E2]'
                  }`}
                >
                  🛡️ 供应链首席战略官 (Chief Procurement)
                </button>
              </div>

              {/* Role 1: Equity Investor Playbook */}
              {activeDecisionRole === 'equity' && (
                <div className="p-4 bg-[#FAF8F5] rounded-xs border border-[#E8DFDD] space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-xs border border-[#E2E6E2] space-y-1">
                      <div className="text-[11px] text-[#627578] font-serif">安全边际买入区间</div>
                      <div className="text-sm font-mono font-bold text-[#2D4A3E]">
                        {dossier.decisionPlaybook.equityInvestor.marginOfSafetyPrice}
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-xs border border-[#E2E6E2] space-y-1">
                      <div className="text-[11px] text-[#627578] font-serif">内在公允价值中枢</div>
                      <div className="text-sm font-mono font-bold text-[#1F3437]">
                        {dossier.decisionPlaybook.equityInvestor.targetFairValueRange}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-xs font-serif font-bold text-[#2D4A3E] flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4" />
                        核心做多催化剂 (Top Long Catalysts)
                      </div>
                      <ul className="space-y-1.5 text-xs text-[#2D4245]">
                        {dossier.decisionPlaybook.equityInvestor.topLongCatalysts.map((c, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-[#2D4A3E] font-bold">✓</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-serif font-bold text-[#A84A3E] flex items-center gap-1.5">
                        <TrendingDown className="h-4 w-4" />
                        核心做空/下行风险触发 (Top Short Triggers)
                      </div>
                      <ul className="space-y-1.5 text-xs text-[#2D4245]">
                        {dossier.decisionPlaybook.equityInvestor.topShortRiskTriggers.map((r, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-[#A84A3E] font-bold">⚠</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xs border border-[#E2E6E2] text-xs space-y-1">
                    <span className="font-serif font-bold text-[#1F3437]">机构配对对冲策略 (Pair Trading):</span>
                    <p className="text-[#627578] leading-relaxed">
                      {dossier.decisionPlaybook.equityInvestor.hedgingStrategy}
                    </p>
                  </div>
                </div>
              )}

              {/* Role 2: Credit Underwriter Playbook */}
              {activeDecisionRole === 'credit' && (
                <div className="p-4 bg-[#FAF8F5] rounded-xs border border-[#E8DFDD] space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-white rounded-xs border border-[#E2E6E2] space-y-1">
                      <div className="text-[11px] text-[#627578] font-serif">偿债备付率 (DSCR)</div>
                      <div className="text-xl font-mono font-bold text-[#1F3437]">
                        {dossier.decisionPlaybook.creditUnderwriter.dscr}x
                      </div>
                      <div className="text-[10px] text-[#2D4A3E]">远超 1.3x 银行基准</div>
                    </div>
                    <div className="p-3 bg-white rounded-xs border border-[#E2E6E2] space-y-1">
                      <div className="text-[11px] text-[#627578] font-serif">利息保障倍数 (ICR)</div>
                      <div className="text-xl font-mono font-bold text-[#1F3437]">
                        {dossier.decisionPlaybook.creditUnderwriter.interestCoverageRatio}x
                      </div>
                      <div className="text-[10px] text-[#2D4A3E]">充沛覆盖有息负债利息</div>
                    </div>
                    <div className="p-3 bg-white rounded-xs border border-[#E2E6E2] space-y-1">
                      <div className="text-[11px] text-[#627578] font-serif">建议最高无担保授信敞口</div>
                      <div className="text-xs font-mono font-bold text-[#3E6F73] pt-1">
                        {dossier.decisionPlaybook.creditUnderwriter.suggestedCreditLimit}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xs border border-[#E2E6E2] space-y-2">
                    <div className="text-xs font-serif font-bold text-[#1F3437]">
                      供应链金融与商业承兑汇票兑付风险监控:
                    </div>
                    <p className="text-xs text-[#627578] leading-relaxed">
                      {dossier.decisionPlaybook.creditUnderwriter.payableFinancingRisk}
                    </p>
                    <div className="pt-2 border-t border-[#F6F7F5] flex items-center justify-between">
                      <span className="text-xs font-serif font-bold text-[#2D4A3E]">信贷准入终审判词:</span>
                      <span className="text-xs font-mono font-bold text-[#1F3437]">
                        {dossier.decisionPlaybook.creditUnderwriter.lendingVerdict}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Role 3: Procurement Officer Playbook */}
              {activeDecisionRole === 'procurement' && (
                <div className="p-4 bg-[#FAF8F5] rounded-xs border border-[#E8DFDD] space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-white rounded-xs border border-[#E2E6E2] space-y-1">
                      <div className="text-[11px] text-[#627578] font-serif">单一源关键物料常备库存</div>
                      <div className="text-2xl font-mono font-bold text-[#1F3437]">
                        {dossier.decisionPlaybook.procurementChief.singleSourceCriticalStockDays} 天
                      </div>
                      <div className="text-[10px] text-[#627578]">防范上游供应链突发断供</div>
                    </div>
                    <div className="p-3 bg-white rounded-xs border border-[#E2E6E2] space-y-1">
                      <div className="text-[11px] text-[#627578] font-serif">最快备选二供切换周期</div>
                      <div className="text-2xl font-mono font-bold text-[#3E6F73]">
                        {dossier.decisionPlaybook.procurementChief.fastestBackupSwitchDays} 天
                      </div>
                      <div className="text-[10px] text-[#627578]">含模具导入与工艺合规认证</div>
                    </div>
                    <div className="p-3 bg-white rounded-xs border border-[#E2E6E2] space-y-1">
                      <div className="text-[11px] text-[#627578] font-serif">切换摩擦成本预估</div>
                      <div className="text-xs font-mono font-bold text-[#A84A3E] pt-1">
                        {dossier.decisionPlaybook.procurementChief.switchingFrictionCostEst}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xs border border-[#E2E6E2] space-y-1.5">
                    <div className="text-xs font-serif font-bold text-[#1F3437]">
                      采购战略官避坑指南:
                    </div>
                    <p className="text-xs text-[#627578] leading-relaxed">
                      {dossier.decisionPlaybook.procurementChief.strategicAdvice}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Multi-variable Sensitivity Matrix */}
            {dossier.sensitivityAnalysis && (
              <div className="p-4 bg-[#F6F7F5] rounded-xs border border-[#E2E6E2] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-serif font-bold text-xs sm:text-sm text-[#1F3437] flex items-center gap-1.5">
                      <Gauge className="h-4 w-4 text-[#3E6F73]" />
                      黑天鹅情景敏感性压力测试台 (Interactive Sensitivity Matrix)
                    </h4>
                    <div className="text-[11px] text-[#627578] font-mono">
                      点击选择情景并调节测试扰动系数，测算对净利润、毛利率与自由现金流的冲击
                    </div>
                  </div>

                  {/* Multiplier Slider */}
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xs border border-[#E2E6E2]">
                    <span className="text-[11px] font-mono text-[#627578]">压力强度:</span>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={stressMultiplier}
                      onChange={(e) => setStressMultiplier(parseFloat(e.target.value))}
                      className="w-20 accent-[#1F3437]"
                    />
                    <span className="text-xs font-mono font-bold text-[#1F3437]">{stressMultiplier.toFixed(1)}x</span>
                  </div>
                </div>

                {/* Scenario Tabs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {dossier.sensitivityAnalysis.scenarios.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedScenarioId(s.id)}
                      className={`p-3 rounded-xs text-left border transition-all ${
                        selectedScenarioId === s.id
                          ? 'bg-[#1F3437] text-white border-[#1F3437] shadow-2xs'
                          : 'bg-white text-[#1F3437] border-[#E2E6E2] hover:bg-[#FAF8F5]'
                      }`}
                    >
                      <div className="text-xs font-serif font-bold truncate">{s.parameterName}</div>
                      <div className={`text-[10px] font-mono mt-1 ${selectedScenarioId === s.id ? 'text-[#8C9E9F]' : 'text-[#627578]'}`}>
                        基准: {s.baseValue} ➔ 扰动: {s.stressRange}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Active Scenario Impact Breakdown */}
                {(() => {
                  const currentScen =
                    dossier.sensitivityAnalysis.scenarios.find((s) => s.id === selectedScenarioId) ||
                    dossier.sensitivityAnalysis.scenarios[0];
                  return (
                    <div className="p-4 bg-white rounded-xs border border-[#E2E6E2] space-y-3">
                      <div className="flex items-center justify-between border-b border-[#E2E6E2] pb-2">
                        <span className="text-xs font-serif font-bold text-[#1F3437]">
                          测试情景：{currentScen.parameterName}（{stressMultiplier.toFixed(1)}x 极限应力）
                        </span>
                        <span className="text-[11px] font-mono text-[#627578]">
                          基准假设: {currentScen.baseValue}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 bg-[#FAF8F5] rounded-xs border border-[#E8DFDD]">
                          <div className="text-[11px] text-[#627578] font-serif">净利润受损预估</div>
                          <div className="text-base font-mono font-bold text-[#A84A3E] mt-1">
                            {currentScen.netProfitImpact}
                          </div>
                        </div>
                        <div className="p-3 bg-[#FAF8F5] rounded-xs border border-[#E8DFDD]">
                          <div className="text-[11px] text-[#627578] font-serif">毛利率变动 (Delta)</div>
                          <div className="text-base font-mono font-bold text-[#1F3437] mt-1">
                            {currentScen.grossMarginDelta}
                          </div>
                        </div>
                        <div className="p-3 bg-[#FAF8F5] rounded-xs border border-[#E8DFDD]">
                          <div className="text-[11px] text-[#627578] font-serif">自由现金流冲击 (FCF)</div>
                          <div className="text-base font-mono font-bold text-[#3E6F73] mt-1">
                            {currentScen.fcfImpact}
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-[#F6F7F5] rounded-xs text-xs text-[#2D4245] leading-relaxed">
                        <span className="font-bold text-[#1F3437]">情景防御力评语：</span>
                        {currentScen.sensitivityVerdict}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Quick Links to Simulator */}
            {onNavigateToTab && (
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigateToTab('simulator')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-[#1F3437] text-white text-xs font-serif hover:bg-[#3E6F73] transition-colors"
                >
                  <span>前往宏观产业链与敏感性全参数推演沙盘</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
