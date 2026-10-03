export type RelationshipCategory = 
  | 'core' 
  | 'upstream' 
  | 'downstream' 
  | 'investment' 
  | 'subsidiary' 
  | 'joint_venture' 
  | 'partner' 
  | 'competitor';

/**
 * 证据来源 - 每条数据都可追溯到原始文件
 * 这是"鉴源"的核心：每个数字都能点开看原始 PDF 的那一页
 */
export interface Evidence {
  /** 来源章节/页码，如 "2024年报 第四节 附注五 P.48" */
  sourceSection: string;
  /** 来源类型 */
  sourceType: 'annual_report' | 'quarterly_report' | 'announcement' | 'prospectus' | 'regulator' | 'extracted';
  /** 来源文件名称 */
  sourceName?: string;
  /** 来源文件 URL（如有） */
  sourceUrl?: string;
  /** 抽取时间 */
  extractedAt?: string;
  /** 置信度 0-100 */
  confidence?: number;
  /** 是否为估算值（非直接披露） */
  isEstimated?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  organization?: string;
  tier: 'Free' | 'Pro' | 'Enterprise';
  avatarUrl?: string;
  createdAt: string;
  expiresAt?: string;
  stats: {
    analyzedCompaniesCount: number;
    watchlistCount: number;
    exportedReportsCount: number;
    savedCustomNodesCount: number;
  };
}

export interface CompanyBasicInfo {
  name: string;
  englishName?: string;
  ticker?: string;
  exchange?: string;
  foundingYear?: string | number;
  establishedYear?: string | number;
  headquarters: string;
  keyLeaders: string[];
  industry: string;
  subIndustry: string;
  marketCapOrValuation: string;
  annualRevenue?: string;
  employeeCount?: string;
  website?: string;
  businessSummary: string;
  strategicMoat: string;
  moatScore: number; // 1 - 5
  developmentStage?: string; // e.g. "全球化扩张与技术成熟期"
  currentStatus?: string; // 目前经营状况与季度运行态势
  marketShare?: string; // 核心产品市场占有率与行业地位
  futureTrend?: string; // 未来 3-5 年技术与战略趋势演进
  keyCompetitorSummary?: string; // 核心竞争对手概览
  tags: string[];
}

export interface UpstreamEntity {
  id: string;
  name: string;
  category: 'raw_material' | 'core_component' | 'equipment_tools' | 'software_cloud' | 'oem_packaging' | 'other';
  categoryLabel: string;
  supplies: string;
  dependenceLevel: 'High' | 'Medium' | 'Low';
  originCountry: string;
  isDomestic: boolean;
  strategicImpact: string;
  cooperationYears?: string;
  cooperationStartYear?: string;
  currentStatus?: string;
  competitors?: string;
  futureTrend?: string;
  supplyVolumeRatio?: string;
  ticker?: string;
  /** 证据来源 - 可追溯到原始文件 */
  evidence?: Evidence;
}

export interface DownstreamEntity {
  id: string;
  name: string;
  segmentType: 'enterprise_b2b' | 'consumer_b2c' | 'distributor_channel' | 'government_public' | 'integrator';
  segmentLabel: string;
  productOrServicePurchased: string;
  revenueContributionEst: string;
  customerStickiness: 'High' | 'Medium' | 'Low';
  relationshipSummary: string;
  targetRegion: string;
  cooperationStartYear?: string;
  currentStatus?: string;
  competitorAlternatives?: string;
  futureTrend?: string;
  /** 证据来源 - 可追溯到原始文件 */
  evidence?: Evidence;
}

export interface InvestmentEntity {
  id: string;
  name: string;
  type: 'wholly_owned' | 'majority_owned' | 'minority_cvc' | 'incubated';
  typeLabel: string;
  shareholdingRatio?: string; // e.g. "100%", "24.5%"
  industryDomain: string;
  strategicGoal: string;
  roundOrStage?: string;
  investmentYear?: string;
  currentStatus?: string; // 目前运营协同成效
  futureTrend?: string; // 未来资本运作与扩张规划
}

export interface JointVentureEntity {
  id: string;
  name: string;
  partnerNames: string[];
  shareholdingSummary: string;
  cooperationScope: string;
  establishedYear?: string;
  keyProductsOrProjects: string;
  strategicValue: string;
  currentStatus?: string; // 目前运营协同现状
  futureTrend?: string; // 未来合作发展重点
}

export interface CompetitorEntity {
  id: string;
  name: string;
  region: string;
  competingSegments: string[];
  rivalryStrength: 'Direct Rival' | 'Secondary Competitor' | 'Potential Disruptor';
  strengthsVsTarget: string;
  weaknessesVsTarget: string;
  marketShare?: string; // 市场份额预估与排名
  currentStatus?: string; // 目前竞争态势与近期动作
  futureTrend?: string; // 未来战略重心与破局点
}

export interface SupplyChainRisk {
  type: 'bottleneck' | 'geopolitical' | 'concentration' | 'regulatory' | 'technology_shift';
  title: string;
  severity: 'High' | 'Medium' | 'Low';
  description: string;
  mitigationMeasure: string;
}

export interface GraphNode {
  id: string;
  label: string;
  category: RelationshipCategory;
  groupLabel: string;
  details?: string;
  subInfo?: string;
  val?: number; // visual node weight
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  relation: string;
  category: RelationshipCategory;
  strength?: number;
}

export interface FieldInvestigationTask {
  id: string;
  action: string;
  targetEntity: string;
  keyDocumentToRequest: string;
  priority: '必查' | '建议' | '外围核实';
  done?: boolean;
  auditorNotes?: string;
}

export interface EvidenceCrossSource {
  /** 标记数据是否来自预写模板（非真实计算/采集） */
  _isSynthetic?: boolean;
  companyClaim: {
    statement: string;
    sourceDocument: string; // e.g. "2024年中报 P.48 附注五"
    claimedMetric: string; // e.g. "单车毛利率 23.8%"
    filingDate: string; // e.g. "2024-08-28"
    auditorSignoff?: string; // 审计机构结论
  };
  objectiveBenchmark: {
    finding: string;
    sourceType: 'customs' | 'industry_stat' | 'satellite_logistics' | 'judicial_equity' | 'supplier_counterpart';
    sourceTypeName: string; // e.g. "海关提单与离岸货值", "中汽协与高工锂电BOM拆解"
    discrepancyDelta: string; // e.g. "背离率 +38.5%", "剪刀差 4.2个百分点"
    benchmarkEvidence: string;
    sampleCoverage?: string;
  };
  auditVerdict: {
    confidenceScore: number; // 0 - 100
    suspicionLevel: '严重存疑' | '中度警示' | '合理解释待定' | '基本合规';
    forensicFormula?: string; // 神经符号财务勾稽公式 e.g. "经营现金流净额 / 净利润 < 0.65 且 应收增速 / 营收增速 > 1.8"
    formulaMathExplanation?: string;
    summary: string;
  };
  fieldInvestigationChecklist: FieldInvestigationTask[];
}

export interface AnomalyItem {
  id: string;
  tag: string; // e.g. "毛利异动", "存货周转", "关联采购", "资本化反常", "海外现金流"
  title: string;
  contradiction: {
    expectation: string; // 预期（市场常规/同行惯例/常理推断）
    reality: string; // 现实（财报审计、工商穿透或产业链实证呈现）
  };
  severity: 'high' | 'medium' | 'low'; // high -> 赭红 #A84A3E
  investigationClue: string; // 溯源核验线索与查证切入点
  deepAnalysis: string; // 深入剖析与商业实质
  forensicEvidence?: EvidenceCrossSource; // 反常证据双向交叉核验底稿
}

export interface CascadeShockStage {
  stageId: string;
  dayRange: string; // e.g. "第 1 - 7 天", "第 8 - 21 天", "第 22 - 45 天", "第 46 - 90 天"
  stageTitle: string; // e.g. "震中突发：晶圆断供与核心原材料断流"
  impactRadius: '震中核心' | '一级模组网络' | '整车制造总装' | '终端交付与资本市场';
  affectedNodes: {
    nodeId: string;
    name: string;
    role: string;
    status: 'halted' | 'strained' | 'stockout' | 'alternative_activated';
    statusLabel: string;
    metricHit: string; // e.g. "产线开工率降至 35%", "存货缓冲剩余 4 天"
  }[];
  systemicDamageMetrics: {
    deliveryDelayWeeksCumulative: number;
    grossMarginHitPercentCumulative: number;
    directFinancialLossEst: string; // e.g. "约 18.5 亿元"
    defaultRiskRate: string; // e.g. "12.4%"
  };
  transmissionMechanism: string; // 传导物理路径
  countermeasureAction: string; // 应急对冲方案
}

export interface CascadeShockSimulationData {
  scenarioId: string;
  title: string;
  disruptionTrigger: string;
  disruptedEntity: string;
  /** 标记数据是否来自预写模板（非真实计算/采集） */
  _isSynthetic?: boolean;
  initiatorType: 'geopolitical_export_ban' | 'raw_material_spike' | 'key_foundry_earthquake' | 'overseas_tariff_embargo';
  totalDurationDays: number;
  overallResilienceRating: '韧性极高 (AAA)' | '良好对冲 (AA)' | '中度脆断 (BBB)' | '高度脆断 (CCC)';
  stages: CascadeShockStage[];
  mitigationPlaybook: {
    tierAction: string;
    bufferDaysGained: number;
    costImpact: string;
  }[];
}

export interface InterestFlowNode {
  id: string;
  name: string;
  role: string;
  type: 'upstream' | 'core' | 'downstream' | 'capital' | 'offshore';
}

export interface InterestFlowStep {
  from: string;
  to: string;
  flowType: 'capital' | 'goods' | 'dividend' | 'equity';
  label: string;
  description: string;
  isClosedLoop?: boolean;
}

export interface InterestFlowCircuit {
  circuitName: string;
  description: string;
  nodes: InterestFlowNode[];
  steps: InterestFlowStep[];
  closedLoopSummary: string;
}

export interface GrayScaleEvaluation {
  confidenceScore: number; // 0 - 100 置信度打分
  confidenceRating: '高置信 (A)' | '良好 (B)' | '中度存疑 (C)' | '高风险 (D)';
  verdict: string;
  supportingEvidence: {
    point: string;
    source: string;
    weight: '强' | '中' | '弱';
  }[];
  opposingEvidence: {
    point: string;
    source: string;
    weight: '强' | '中' | '弱';
  }[];
  uncertainVariables: {
    point: string;
    watchTrigger: string;
  }[];
}

export interface CompanyPanoramaData {
  query: string;
  timestamp: number;
  basicInfo: CompanyBasicInfo;
  upstream: UpstreamEntity[];
  downstream: DownstreamEntity[];
  investments: InvestmentEntity[];
  jointVentures: JointVentureEntity[];
  competitors: CompetitorEntity[];
  risks: SupplyChainRisk[];
  anomalies?: AnomalyItem[];
  interestFlow?: InterestFlowCircuit;
  grayScaleEvaluation?: GrayScaleEvaluation;
  executiveSummary: string;
  valueChainSummary: {
    rawMaterialsInput: string[];
    coreManufacturingProcess: string[];
    finalProductsServices: string[];
    endMarkets: string[];
  };
  financialBreakdown?: {
    segments: { name: string; value: number; unit?: string }[];
    regions: { name: string; value: number }[];
    rdExpenseRatio?: string;
    grossMargin?: string;
  };
  cascadeSimulation?: CascadeShockSimulationData;
  deepDecipher?: DeepDecipherDossierData;
  /** 真实抽取的证据数据（来自巨潮/SEC/港交所披露文件） */
  extractedEvidence?: {
    hasData: boolean;
    keyFinancials?: {
      sourceSection: string;
      sourceType: Evidence['sourceType'];
      revenue?: string;
      grossMargin?: string;
      netProfit?: string;
      rdExpense?: string;
    };
    topSuppliers?: {
      name: string;
      amount?: string;
      sourceSection: string;
      isEstimated?: boolean;
    }[];
    topCustomers?: {
      name: string;
      revenueContribution?: string;
      sourceSection: string;
      isEstimated?: boolean;
    }[];
  };
}

export type GraphLayoutMode = 'force' | 'concentric' | 'pipeline';

export interface CompanyComparisonData {
  companyA: {
    name: string;
    industry: string;
    marketCap: string;
    revenue: string;
    moatScore: number;
    strategicSummary: string;
    radarScores: {
      supplyChainSelfReliance: number; // 0-100
      coreTechInHouseRate: number; // 0-100
      globalMarketCoverage: number; // 0-100
      verticalIntegrationDepth: number; // 0-100
      cvcEcosystemSynergy: number; // 0-100
      riskResilience: number; // 0-100
    };
    keyAdvantages: string[];
    vulnerabilities: string[];
  };
  companyB: {
    name: string;
    industry: string;
    marketCap: string;
    revenue: string;
    moatScore: number;
    strategicSummary: string;
    radarScores: {
      supplyChainSelfReliance: number;
      coreTechInHouseRate: number;
      globalMarketCoverage: number;
      verticalIntegrationDepth: number;
      cvcEcosystemSynergy: number;
      riskResilience: number;
    };
    keyAdvantages: string[];
    vulnerabilities: string[];
  };
  sharedSuppliers: {
    name: string;
    category: string;
    roleInA: string;
    roleInB: string;
  }[];
  differentiatedUpstream: {
    companyAName: string;
    companyASuppliers: string[];
    companyBName: string;
    companyBSuppliers: string[];
  };
  downstreamChannelComparison: {
    dimension: string;
    companyAStrategy: string;
    companyBStrategy: string;
  }[];
  strategicVerdict: string;
}

export interface StressTestScenarioResult {
  scenarioTitle: string;
  disruptionEntity: string;
  disruptionType: string;
  severityLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  estimatedDeliveryDelayWeeks: number;
  estimatedGrossMarginHitPercent: number;
  affectedCoreProducts: string[];
  alternativeSuppliers: {
    name: string;
    readiness: 'Immediate' | '3-6 Months' | '1+ Year';
    costDifference: string;
  }[];
  strategicRecoveryActions: string[];
  aiResilienceAnalysis: string;
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface StrategicQuadLens {
  // 1. 公司本质 (The Essence)
  essence: {
    coreIdentity: string; // 终极商业身份定性
    underlyingProfitLogic: string; // 究竟在赚什么钱？研发溢价、制造极限压榨、供应链金融贴现、还是网络/规模租金？
    organizationDna: string; // 组织生产力范式
    capitalAllocationEfficiency: string; // 资本配置效率与投向
    essencePunchline: string; // 穿透一句话判词
  };
  // 2. 如何能成功 (Success Engine / Why It Wins)
  successEngine: {
    flywheelStages: {
      stage: string;
      title: string;
      mechanism: string;
      moatDefensibility: string;
    }[];
    coreMoatDimensions: {
      dimension: string;
      rating: string;
      description: string;
    }[];
    historicalPivotalDecisions: {
      year: string;
      event: string;
      strategicBet: string;
      payoff: string;
    }[];
    costAdvantageEquation: string; // 杀手级成本/规模方程解析
    whyCompetitorsFail: string; // 为什么友商抄不会、学不来、追不上？
  };
  // 3. 隐藏的风险 (Hidden Risks & Vulnerabilities)
  hiddenRisks: {
    topBlindSpots: {
      category: '供应链暗礁' | '技术颠覆断层' | '地缘与准入封杀' | '内部组织钝化' | '流动性与金融隐患';
      title: string;
      severity: '极高风险' | '高风险' | '中度警惕';
      triggerCondition: string; // 触发临界条件
      cascadingImpact: string; // 级联传导后果
      mitigationReadiness: string; // 当前公司防御准备度
    }[];
    vulnerabilityHeatmapScore: number; // 0-100
    worstCaseBlackSwan: string; // 最严酷黑天鹅情景推演
  };
  // 4. 企业进化路径 (Strategic Evolution & S-Curve)
  evolution: {
    currentSCurve: {
      curveName: string;
      status: '成熟期' | '爆发期' | '衰退初显';
      saturationTimeline: string;
    };
    nextGrowthCurves: {
      curveName: string;
      potentialScale: string;
      readinessScore: number; // 0-100
      executionProgress: string;
    }[];
    endGameFiveYearScenario: {
      bullCase: { scenario: string; probability: string; enterpriseValue: string };
      baseCase: { scenario: string; probability: string; enterpriseValue: string };
      bearCase: { scenario: string; probability: string; enterpriseValue: string };
    };
    evolutionVerdict: string; // 进化终局战略判词
  };
}

export interface DeepDecipherDossierData {
  companyName: string;
  /** 标记数据是否来自预写模板（非真实计算/采集） */
  _isSynthetic?: boolean;
  // 企业终极四问框架：本质 · 成因 · 暗礁 · 进化
  strategicQuadLens: StrategicQuadLens;
  verdictSummary: {
    dnaType: string; // e.g. "超级垂直一体化制造霸权"
    trueMoatRating: string; // e.g. "S级（物理工程与规模双重垄断）"
    realCashGeneratingPower: string; // e.g. "极强（主业造血率高，但对上下游账期占款依赖高）"
    vulnerabilityEpicenter: string; // e.g. "海外反补贴关税与先进制程车规主控SoC"
    forensicAuthenticityScore: number; // 0-100 (e.g. 89)
    executiveVerdictPunchline: string; // 终局一句话透视判词
    confidenceLevel: string; // "高置信度（多源交叉检验无断裂）"
  };
  // 维度 1: 商业实质与微观经济学造血引擎
  businessAnatomy: {
    revenueSourceDeconstruction: {
      segment: string;
      claimedShare: string;
      trueMargin: string;
      moatType: string;
      substitutability: '极难替代' | '中度替代' | '易被替代';
      anatomyVerdict: string;
    }[];
    inHouseVsOutsourceRatio: {
      inHousePercentage: number;
      outsourcePercentage: number;
      keyInHouseAssets: string[];
      vulnerableOutsourceAssets: string[];
    };
    economicEngineSummary: string;
  };
  // 维度 2: 天基遥感与物理空间实证 (Cyber-Physical Telemetry)
  cyberPhysicalTelemetry: {
    facilities: {
      name: string;
      location: string;
      sarBackscatterDb: number; // e.g. -7.8 dB (SAR雷达散射)
      sarStatus: '满负荷' | '高运转' | '部分运转' | '停工减速';
      thermalRadianceW: number; // e.g. 154.2 nW/cm²·sr (夜光热异常辐射)
      claimedCapacityUtilization: string;
      verifiedPhysicalActivity: string;
      deviationDelta: string;
      confidence: string;
    }[];
    maritimeAisShipping: {
      vesselName: string;
      portOfDeparture: string;
      destinationPort: string;
      draughtDepartureM: number;
      draughtBallastM: number;
      displacementTonnes: number;
      cargoValueEstimatedRmb: string;
      customsReportedRmb: string;
      isVerified: boolean;
      statusNote: string;
    }[];
    powerGridCorrelationScore: number; // 94% (用电负荷与产量守恒度)
    physicalGroundTruthVerdict: string;
  };
  // 维度 3: 利益网络几何学与Ricci曲率咽喉 (Network Geometry & Interest Flow)
  networkGeometry: {
    ricciCurvatureEdges: {
      from: string;
      to: string;
      flowType: string;
      ricciCurvature: number; // 负值越小越脆弱，单点咽喉
      bottleneckRisk: '极高脆断咽喉' | '中度结构瓶颈' | '充裕网络冗余';
      whyVulnerable: string;
    }[];
    hiddenReservoirs: {
      name: string;
      role: string;
      riskOrCapitalTransfer: string;
      shareholdingOpacity: '高' | '中' | '低';
    }[];
    networkTopologyVerdict: string;
  };
  // 维度 4: Pearl结构因果律与渗流临界相变 (Pearlian Causality & Percolation)
  causalPercolation: {
    percolationThresholdPc: number; // e.g. 0.22 (当22%关键节点失效，网络相变崩溃)
    currentNetworkStressLevel: number;
    pearlDoInterventionCases: {
      intervention: string; // do(X)
      counterfactualOutcome: string;
      resilienceHalfLifeDays: number;
      emergencyAction: string;
    }[];
    causalResilienceVerdict: string;
  };
  // 维度 5: 算法信息论与本福特法证熵谱 (Information Entropy & Benford Forensic)
  algorithmicForensic: {
    benfordSpectrum: {
      digit: number;
      theoreticalPercent: number;
      actualPercent: number;
    }[];
    chiSquarePValue: number; // p > 0.05 表明遵从自然分布
    shannonEntropyBits: number; // 接近3.17 bits表明高熵自然离散
    maxEntropyBits: number; // 3.17
    auditForensicVerdict: string;
  };
  // 维度 6: 机构级经典法证量化模型 (Beneish M-Score & Altman Z-Score & Sloan Accruals)
  institutionalModels: {
    beneishMScore: {
      overallScore: number;
      manipulationRisk: '安全区间（极低操纵风险）' | '灰色警戒' | '高概率操纵';
      variables: {
        code: string;
        name: string;
        value: number;
        benchmark: number;
        status: 'normal' | 'caution' | 'alert';
        note: string;
      }[];
      modelVerdict: string;
    };
    altmanZScore: {
      overallScore: number;
      zone: '安全区 (Safe Zone)' | '灰色区 (Grey Zone)' | '财务困境预警 (Distress Zone)';
      variables: {
        code: string;
        name: string;
        value: number;
        weight: number;
        contribution: number;
      }[];
      modelVerdict: string;
    };
    sloanAccrualRatio: {
      accrualRatio: number;
      earningsQuality: '极高（现金流充分支撑净利）' | '正常' | '应计质量恶化';
      cfoToNetIncomeRatio: number;
      modelVerdict: string;
    };
  };
  // 维度 7: 物理实体与金融流水真实性三角对账 (Multi-Source Triangulation)
  triangulationAudit: {
    threeWayReconciliation: {
      taxRevenueMatchScore: number; // 98%
      bankReceiptToRevenueMatch: number; // 96%
      taxInspectionVerdict: string;
      cashReconciliationVerdict: string;
    };
    energyConservation: {
      unitConsumptionTheoretical: string;
      gridSubstationMeasured: string;
      deviationPercent: number;
      conservationVerdict: string;
    };
    mirrorReconciliation: {
      supplierOrCustomer: string;
      targetClaimedRmb: string;
      counterpartyDisclosedRmb: string;
      matchRatePercent: number;
      forensicNote: string;
    }[];
  };
  // 维度 8: 三重角色实战决策行动指引 (Actionable Decision Matrix)
  decisionPlaybook: {
    equityInvestor: {
      marginOfSafetyPrice: string;
      targetFairValueRange: string;
      topLongCatalysts: string[];
      topShortRiskTriggers: string[];
      hedgingStrategy: string;
    };
    creditUnderwriter: {
      dscr: number;
      interestCoverageRatio: number;
      payableFinancingRisk: string;
      suggestedCreditLimit: string;
      lendingVerdict: string;
    };
    procurementChief: {
      singleSourceCriticalStockDays: number;
      fastestBackupSwitchDays: number;
      switchingFrictionCostEst: string;
      strategicAdvice: string;
    };
  };
  // 维度 9: 动态交互式敏感性压力测试矩阵 (Sensitivity Stress Test)
  sensitivityAnalysis: {
    scenarios: {
      id: string;
      parameterName: string;
      baseValue: string;
      stressRange: string;
      netProfitImpact: string;
      grossMarginDelta: string;
      fcfImpact: string;
      sensitivityVerdict: string;
    }[];
  };
}

// ---------------------------------------------------------------------------
// Automotive industry intelligence
// ---------------------------------------------------------------------------

export type AutomotiveChainSegment =
  | 'materials'
  | 'battery'
  | 'semiconductor'
  | 'components'
  | 'oem'
  | 'channel'
  | 'software'
  | 'capital';

export type AutomotiveRelationType =
  | 'supply'
  | 'customer'
  | 'equity'
  | 'joint_venture'
  | 'co_development'
  | 'technology_license'
  | 'distribution'
  | 'competitor';

export interface AutomotiveCompany {
  id: string;
  name: string;
  shortName: string;
  ticker?: string;
  segment: AutomotiveChainSegment;
  segmentLabel: string;
  role: string;
  region: string;
  tags: string[];
}

export interface AutomotiveEvidence {
  id: string;
  sourceName: string;
  sourceType: 'annual_report' | 'announcement' | 'prospectus' | 'regulator' | 'industry' | 'demo';
  filedAt: string;
  level: 'A' | 'B' | 'C' | 'D';
  note: string;
}

export interface AutomotiveProcurementRecord {
  product: string;
  period: string;
  amountCny?: number;
  amountLabel: string;
  amountStatus: 'disclosed' | 'estimated' | 'undisclosed';
  volumeLabel: string;
  shareOfSupplierRevenue?: string;
  shareOfBuyerCost?: string;
  contractStatus: 'active' | 'ramping' | 'ended' | 'unknown';
  singleSourceRisk: 'High' | 'Medium' | 'Low';
}

export interface AutomotiveEquityRecord {
  percentage?: number;
  direct: boolean;
  investmentYear?: string;
  investmentAmountLabel: string;
  controlType: 'control' | 'significant_influence' | 'minority' | 'unknown';
  status: 'active' | 'exited' | 'unknown';
}

export interface AutomotiveRelation {
  id: string;
  fromCompanyId: string;
  toCompanyId: string;
  relationTypes: AutomotiveRelationType[];
  title: string;
  summary: string;
  relatedParty: boolean;
  confidence: 'high' | 'medium' | 'low';
  procurement?: AutomotiveProcurementRecord;
  equity?: AutomotiveEquityRecord;
  evidence: AutomotiveEvidence[];
}

export interface AutomotiveTimelineEvent {
  id: string;
  date: string;
  companyIds: string[];
  type: 'financial' | 'capacity' | 'product' | 'capital' | 'supply' | 'policy' | 'risk';
  title: string;
  summary: string;
  impact: 'positive' | 'neutral' | 'negative';
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
  sourceName: string;
}

export interface AutomotiveDisclosure {
  id: string;
  companyId: string;
  documentType: 'annual_report' | 'quarterly_report' | 'announcement' | 'prospectus' | 'regulatory';
  title: string;
  period: string;
  filedAt: string;
  sourceName: string;
  sourceUrl?: string;
  extractionStatus: 'parsed' | 'pending' | 'manual_review';
}

export interface AutomotiveFinancialSnapshot {
  companyId: string;
  period: string;
  revenueLabel: string;
  netProfitLabel: string;
  grossMargin: number;
  vehicleGrossMargin?: number;
  cashConversion: number;
  rdRatio: number;
  capacityUtilization?: number;
  exportShare?: number;
  customerConcentration?: number;
  supplierConcentration?: number;
  isIllustrative: boolean;
}

export interface AutomotiveIndustryData {
  asOf: string;
  companies: AutomotiveCompany[];
  relations: AutomotiveRelation[];
  timeline: AutomotiveTimelineEvent[];
  disclosures: AutomotiveDisclosure[];
  financials: AutomotiveFinancialSnapshot[];
}

