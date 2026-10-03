import {
  AnomalyItem,
  EvidenceCrossSource,
  FieldInvestigationTask,
  CascadeShockSimulationData,
  CascadeShockStage,
  CompanyPanoramaData,
  DeepDecipherDossierData,
} from '../types';

/**
 * Generate deep forensic cross-verification evidence for an anomaly if not already embedded
 */
export function getForensicEvidenceForAnomaly(
  item: AnomalyItem,
  companyName: string
): EvidenceCrossSource {
  if (item.forensicEvidence) {
    return item.forensicEvidence;
  }

  const isHigh = item.severity === 'high';

  // Customized realistic forensic scenarios based on anomaly tag/title
  if (item.tag.includes('毛利') || item.title.includes('毛利') || item.title.includes('利润')) {
    return {
      _isSynthetic: true as const,
      companyClaim: {
        statement: `${companyName}在最新年度披露中陈述，主营业务毛利率保持行业领跑主要得益于技术创新驱动、制造成本极致优化及高端产品结构占比提升。`,
        sourceDocument: '2024年半年度报告 第四节【管理层讨论与分析】P.42-45',
        claimedMetric: '主营毛利率 22.8% ~ 25.1%（同业均值仅 16.4%）',
        filingDate: '2024-08-28',
        auditorSignoff: '普华永道/安永 标准无保留审计意见（关键审计事项包含收入确认与存货跌价计提）',
      },
      objectiveBenchmark: {
        finding: '行业同类可比上市公司在相同口径下的BOM原材料成本与销售折让测算表明，行业综合毛利中位数为 16.2%。目标公司比行业均值高出 6.6~8.9 个百分点，且在终端指导价多次下调阶段毛利未见同步下滑。',
        sourceType: 'industry_stat',
        sourceTypeName: '行业协会权威产业链BOM拆解报告与公开同业季报汇总数据库',
        discrepancyDelta: '同业均值剪刀差 +7.2 个百分点（偏离度 +44.4%）',
        benchmarkEvidence: '样本覆盖 12 家主流同赛道企业，上游碳酸锂及关键零部件跌价传导至终端具有 3-5 个月滞后，但该司利润率体现为即时留存。',
        sampleCoverage: '覆盖同业可比企业 12 家，BOM样本拆解 48 批次',
      },
      auditVerdict: {
        confidenceScore: 82,
        suspicionLevel: isHigh ? '严重存疑' : '合理解释待定',
        forensicFormula: '|GM_target - GM_industry_median| > 2.5σ ∧ (OCF / NetProfit < 0.85)',
        formulaMathExplanation: '当目标公司毛利率超出行业中位数2.5倍标准差，且经营活动现金流量净额与净利润比例出现阶段性背离时，表明内部结算转移定价或供应链占款具备极高核验必要。',
        summary: `经勾稽核验，该毛利剪刀差在商业上合理逻辑为【全产业链垂直整合与核心零部件自研】，但存在【内部关联子公司间转移定价未完全市场化公允列示】的潜在会计弹性。`,
      },
      fieldInvestigationChecklist: [
        {
          id: 'chk-1',
          action: '调阅核心零部件内部往来结算清单及合并抵销底稿',
          targetEntity: `${companyName}本部及核心零部件全资/控股制造子公司`,
          keyDocumentToRequest: '《内部关联交易公允定价备忘录》与各子公司增值税发票抵扣台账',
          priority: '必查',
          done: false,
        },
        {
          id: 'chk-2',
          action: '核对上游主要大宗原材料采购长协协议与锁定价格条款',
          targetEntity: '上游前五大原材料及矿产供应商',
          keyDocumentToRequest: '采购年度框架协议、浮动对赌定价机制及供应商未开票暂估入库单',
          priority: '必查',
          done: false,
        },
        {
          id: 'chk-3',
          action: '抽查下游经销商月度提车返利、销售折让及库存周转真实性',
          targetEntity: '核心直营店与一二级授权销售网络',
          keyDocumentToRequest: '返利计提明细表、期末经销商实际终端上牌出库率核查表',
          priority: '建议',
          done: false,
        },
      ],
    };
  }

  if (item.tag.includes('资本化') || item.title.includes('研发')) {
    return {
      _isSynthetic: true as const,
      companyClaim: {
        statement: `${companyName}披露研发支出近 400 亿元，研发费用全部计入当期管理与研发费用损益，开发支出期末余额为零。`,
        sourceDocument: '2024年度审计报告财务报表附注【开发支出与无形资产】',
        claimedMetric: '研发支出资本化率 0.00%（全额费用化）',
        filingDate: '2024-03-27',
        auditorSignoff: '会计师事务所关键审计事项强调：研发项目费用化与资本化划分的审慎性。',
      },
      objectiveBenchmark: {
        finding: '同业可比龙头企业普遍将符合资本化条件的重大新车型或关键技术平台的研发支出进行 15%~35% 的资本化处理，以平滑当期利润波动。',
        sourceType: 'industry_stat',
        sourceTypeName: 'Wind 金融终端高科技制造板块财报统计分析模块',
        discrepancyDelta: '资本化率偏离度 -100%（极端审慎特征）',
        benchmarkEvidence: '全行业资本化中位数约为 22.4%，全额费用化将当期净利润压低约 60-80 亿元。',
        sampleCoverage: '高科技与先进制造板块 35 家上市主体对比',
      },
      auditVerdict: {
        confidenceScore: 91,
        suspicionLevel: '基本合规',
        forensicFormula: 'R&D_cap_ratio = 0 ∧ R&D_exp / Revenue > 6.5%',
        formulaMathExplanation: '研发支出全额计入损益且占比超营收6.5%，在财务审计中属于高标准防御型记账，不仅未粉饰利润，反而积蓄了未来经营利润的爆发弹性。',
        summary: '全额费用化属于高度保守财务策略，消除了无形资产大额减值暴雷风险，证实企业当期经营现金造血能力强劲，无需借由资产化修饰报表。',
      },
      fieldInvestigationChecklist: [
        {
          id: 'chk-rnd-1',
          action: '核实各重点研发中心工时记录与薪酬分摊明细表',
          targetEntity: '智能驾驶研究院、电池工程院、新材料实验室',
          keyDocumentToRequest: '《研发项目阶段性评审验收单》及专职研发人员个税与社保流水',
          priority: '建议',
          done: false,
        },
        {
          id: 'chk-rnd-2',
          action: '比对公开专利公开号与实际量产技术工程映射关系',
          targetEntity: '国家知识产权局公开专利库及公司知识产权部',
          keyDocumentToRequest: '发明专利申请清单、已授权专利转化实施证明书',
          priority: '外围核实',
          done: false,
        },
      ],
    };
  }

  if (item.tag.includes('出海') || item.tag.includes('地缘') || item.title.includes('关税') || item.title.includes('海外')) {
    return {
      _isSynthetic: true as const,
      companyClaim: {
        statement: `${companyName}公告积极实施全球化布局，斥资百亿设立海外制造基地并自建海运滚装船队，直接投资拉动海外交付。`,
        sourceDocument: '重大境外投资专项公告及海外分支机构设立决议案',
        claimedMetric: '海外市场销量高增 100%+，境外资产规模超 400 亿元',
        filingDate: '2024-06-18',
        auditorSignoff: '境外资产合规审计报告与东道国税收居民身份备忘录',
      },
      objectiveBenchmark: {
        finding: '海关总署及海外口岸进口报关数据交叉比对显示，从国内主要沿海港口向目标口岸运送的车辆与关键散件总值，与上市公司境外营业收入折算汇率后存在约 8%~12% 的在途与保税仓暂估敞口。',
        sourceType: 'customs',
        sourceTypeName: '中国海关出口提单数据库、联合国商品贸易统计（UN Comtrade）',
        discrepancyDelta: '申报货值与财务入账剪刀差 9.4%（主要为在途物流时间差）',
        benchmarkEvidence: '远洋滚装航运周期通常需 35-50 天，期末存在规模化海运在途存货。',
        sampleCoverage: '覆盖 18 个月主要滚装货轮航次及提单记录',
      },
      auditVerdict: {
        confidenceScore: 78,
        suspicionLevel: '合理解释待定',
        forensicFormula: '|Revenue_overseas - Customs_export_val| ≤ Inventory_in_transit + Local_markup',
        formulaMathExplanation: '跨国经营核验核心在于：海外确认收入应当与海关离岸申报值在合理加成率与航运在途周期之内实现守恒平衡。',
        summary: '海外业务扩张具备真实物流与船舶航迹印证，但由于欧盟反补贴税与东道国准入新规频发，需重点穿透海外本地销售实体的最终终端消纳真实度。',
      },
      fieldInvestigationChecklist: [
        {
          id: 'chk-sea-1',
          action: '核验海运提单 (Bill of Lading) 与海外保税仓入库单',
          targetEntity: '海外自建物流航运子公司及港口货代机构',
          keyDocumentToRequest: '全程海运提单原件、口岸清关放行通知书、保税仓月度盘点底稿',
          priority: '必查',
          done: false,
        },
        {
          id: 'chk-sea-2',
          action: '调查海外全资经销商终端实际上牌登记量与回款真实性',
          targetEntity: '欧洲/东南亚区域总代理商与本地零售法人',
          keyDocumentToRequest: '当地车辆监管局上牌数据、外汇离岸结算水单、质保注册记录',
          priority: '必查',
          done: false,
        },
      ],
    };
  }

  // Generic forensic cross-source evidence template
  return {
    _isSynthetic: true as const,
    companyClaim: {
      statement: `${companyName}官方文件强调该业务板块严格遵守上市公司信息披露准则与行业通行业务操作规程。`,
      sourceDocument: '最近一期公开披露财务报告及董事会决议说明',
      claimedMetric: '披露指标符合既定内部经营考核与审计要求',
      filingDate: '2024-04-15',
      auditorSignoff: '会计师事务所标准无保留意见',
    },
    objectiveBenchmark: {
      finding: `第三方产业链穿透与公开工商司法大数据表明，${item.contradiction.reality}`,
      sourceType: 'judicial_equity',
      sourceTypeName: '国家企业信用信息公示系统、天眼查司法穿透及行业招投标数据',
      discrepancyDelta: '表内陈述与外围证据链存在显著张力',
      benchmarkEvidence: item.investigationClue,
      sampleCoverage: '全量司法与工商历史变更轨迹回溯',
    },
    auditVerdict: {
      confidenceScore: isHigh ? 65 : 85,
      suspicionLevel: isHigh ? '严重存疑' : '中度警示',
      forensicFormula: 'Veracity_Score = f(Claim_consistency, Counterparty_confirmation, Physical_audit)',
      formulaMathExplanation: '通过反洗钱资金链、物流提单以及商业上下游对账三单一致性原则进行神经符号勾稽裁判。',
      summary: item.deepAnalysis,
    },
    fieldInvestigationChecklist: [
      {
        id: 'chk-gen-1',
        action: '前往核心供应商/客户现场实施突击走访与工位物料盘点',
        targetEntity: '业务合同交易相对方实际经营场所',
        keyDocumentToRequest: '出入库地磅称重单、安防门禁货物出入记录、员工社保工伤缴纳凭证',
        priority: '必查',
        done: false,
      },
      {
        id: 'chk-gen-2',
        action: '调取大额资金往来银行对账单并穿透最终资金回流方',
        targetEntity: `${companyName}及关联账户开户银行柜台`,
        keyDocumentToRequest: '带银行电子回单专用章的全流水明细、保证金与票据质押合同',
        priority: '必查',
        done: false,
      },
    ],
  };
}

/**
 * Generate deep 4-stage time-series cascade shock simulation for a company
 */
export function getCascadeSimulationForCompany(
  company: CompanyPanoramaData,
  customTrigger?: { entity: string; type: string }
): CascadeShockSimulationData {
  const companyName = company.basicInfo.name;
  const topUpstream = company.upstream[0]?.name || '关键核心半导体与主控元器件';
  const secondUpstream = company.upstream[1]?.name || '高纯度化学品与上游原材料';
  const topDownstream = company.downstream[0]?.name || '全球汽车整车制造与终端市场';

  const entity = customTrigger?.entity || topUpstream;
  const triggerType = customTrigger?.type || '关键晶圆代工地震停产与先进半导体出口管制升级';

  const stages: CascadeShockStage[] = [
    {
      stageId: 'stage-1',
      dayRange: '第 1 - 7 天',
      stageTitle: '震中休克：核心元器件供给瞬间归零',
      impactRadius: '震中核心',
      affectedNodes: [
        {
          nodeId: 'node-epicenter',
          name: entity,
          role: '上游独家/高壁垒供应源头',
          status: 'halted',
          statusLabel: '产线全面休克停供',
          metricHit: '发货交付能力瞬间归零，在途海运货物被紧急扣关/叫停',
        },
        {
          nodeId: 'node-raw',
          name: secondUpstream,
          role: '关联辅助原料配套商',
          status: 'strained',
          statusLabel: '排产严重积压',
          metricHit: '采购订单突发冻结，上游原料库存积压 +35%',
        },
      ],
      systemicDamageMetrics: {
        deliveryDelayWeeksCumulative: 0.5,
        grossMarginHitPercentCumulative: 0.3,
        directFinancialLossEst: '约 1.2 亿元 (主要是紧急锁定备用物料的现货溢价)',
        defaultRiskRate: '2.1%',
      },
      transmissionMechanism:
        '震中实体遭遇不可抗力或管制制裁，全球现货市场现货价格瞬间飙升 300%，企业现有厂区现货安全库存仅能维持 7~10 天生产节拍。',
      countermeasureAction:
        '立即成立 CEO 直管供应链应急指挥作战室，盘活全球区域保税仓现有现货，冻结非核心产品线的芯片配额。',
    },
    {
      stageId: 'stage-2',
      dayRange: '第 8 - 21 天',
      stageTitle: '一级模组蔓延：Tier-1 模组厂商产线面临断料',
      impactRadius: '一级模组网络',
      affectedNodes: [
        {
          nodeId: 'node-tier1-a',
          name: 'Tier-1 智能座舱/电驱总成集成中心',
          role: '一级核心系统模组总成商',
          status: 'stockout',
          statusLabel: '关键芯片断料缺货',
          metricHit: '模组产线开工率骤降至 38%，启动半成品下线封存',
        },
        {
          nodeId: 'node-tier1-b',
          name: '高压线束与传感器总成工厂',
          role: '一级底盘执行模组供应商',
          status: 'strained',
          statusLabel: '跨产线调度混乱',
          metricHit: '配套交付履约率跌至 62%，产生额外仓储滞留成本',
        },
      ],
      systemicDamageMetrics: {
        deliveryDelayWeeksCumulative: 2.5,
        grossMarginHitPercentCumulative: 1.8,
        directFinancialLossEst: '约 5.6 亿元 (产线闲置折旧、空运现货加价及违约金)',
        defaultRiskRate: '6.8%',
      },
      transmissionMechanism:
        '由于现代精益生产（JIT）追求极低库存，Tier-1 供应商的缓冲垫在第 14 天耗尽，引发多米诺骨牌效应，整车厂的套料（Kitting）匹配率严重跌破警戒线。',
      countermeasureAction:
        '紧急启动二供（Secondary Source）备用芯片方案并线认证，向工信部门与权威检测机构申请“绿色快速测试通道”。',
    },
    {
      stageId: 'stage-3',
      dayRange: '第 22 - 45 天',
      stageTitle: '整车总装危机：整机制造厂因“缺件”被迫降速减产',
      impactRadius: '整车制造总装',
      affectedNodes: [
        {
          nodeId: 'node-oem',
          name: companyName + ' 核心整车总装总厂',
          role: '核心生产与集成制造枢纽',
          status: 'halted',
          statusLabel: '核心产线降速轮休',
          metricHit: '日产能下滑 45%，工厂被迫转为单班生产，未完工半成品堆满待检场',
        },
        {
          nodeId: 'node-logistics',
          name: '全国干线与远洋滚装物流编队',
          role: '出海与内销干线物流枢纽',
          status: 'strained',
          statusLabel: '集港计划打乱',
          metricHit: '滚装船舶空载率攀升至 28%，产生港口滞泊罚金',
        },
      ],
      systemicDamageMetrics: {
        deliveryDelayWeeksCumulative: 5.5,
        grossMarginHitPercentCumulative: 3.6,
        directFinancialLossEst: '约 14.8 亿元 (订单延期交付罚金、单车固定成本摊薄丧失)',
        defaultRiskRate: '14.5%',
      },
      transmissionMechanism:
        '总装车间由于缺少高精度控制模组无法完成整车下线（俗称“缺芯少件”），整车积压占用大量流动资金，经销商预定客户提车等待期翻倍，退单率激增。',
      countermeasureAction:
        '推行“减配交付、后续OTA升级补齐”或降级配置过渡版；协调自研替代芯片全面上车压测，全力保障主力销量爆款车型不停线。',
    },
    {
      stageId: 'stage-4',
      dayRange: '第 46 - 90 天',
      stageTitle: '终端与资本共振：毛利侵蚀、市占率承压与二供重组',
      impactRadius: '终端交付与资本市场',
      affectedNodes: [
        {
          nodeId: 'node-down-client',
          name: topDownstream,
          role: '全球零售终端与大型政企车队客户',
          status: 'alternative_activated',
          statusLabel: '部分流失至竞争对手',
          metricHit: '季度新订单交付延期，部分紧迫客户分流至现货充沛的竞品',
        },
        {
          nodeId: 'node-substitute',
          name: '自研替代方案 / 本土二供联合体',
          role: '全新供应链重组核心',
          status: 'alternative_activated',
          statusLabel: '全面接管并线产能',
          metricHit: '二供产能爬坡至 85%，实现核心部件 100% 国产化/自主化替代',
        },
      ],
      systemicDamageMetrics: {
        deliveryDelayWeeksCumulative: 7.0,
        grossMarginHitPercentCumulative: 4.5,
        directFinancialLossEst: '约 26.5 亿元 (综合毛利折损、客户流失损失与新开模Capex)',
        defaultRiskRate: '22.0% (若无二供储备) / 4.5% (凭借自研储备成功对冲)',
      },
      transmissionMechanism:
        '在经历约 2 个月的阵痛后，企业依靠前期在垂直一体化自研（如自研碳化硅/自研电池）与备用二供的深度储备，完成全新零部件方案的软硬件适配并全面量产，供应链恢复韧性。',
      countermeasureAction:
        '重新签订全球长协采购多中心分散化条款，永久提高战略安全元器件库存至 90 天，并将核心零部件自制率由 65% 提升至 85%。',
    },
  ];

  const scenarioId = 'shock-' + Date.now();
  const title = '【' + companyName + '】因果级联脆断推演沙盘：' + entity + ' 突发断供传导分析';

  return {
    scenarioId,
    title,
    disruptionTrigger: triggerType,
    disruptedEntity: entity,
    _isSynthetic: true as const,
    initiatorType: 'geopolitical_export_ban',
    totalDurationDays: 90,
    overallResilienceRating: company.basicInfo.strategicMoat && company.basicInfo.strategicMoat.includes('垂直') ? '良好对冲 (AA)' : '中度脆断 (BBB)',
    stages,
    mitigationPlaybook: [
      {
        tierAction: '战略级安全库存缓冲垫调用 (Buffer Stock Release)',
        bufferDaysGained: 14,
        costImpact: '低 (仅需库存资金利息)',
      },
      {
        tierAction: '本土二供备选企业紧急产线切换与绿色检测通道',
        bufferDaysGained: 30,
        costImpact: '中 (+6%~+10% 调试溢价)',
      },
      {
        tierAction: '全栈自研垂直总成软硬件平替方案装车',
        bufferDaysGained: 45,
        costImpact: '中高 (前期模具研发 Capex，中长期大幅摊薄)',
      },
    ],
  };
}

/**
 * Generate 5-Dimensional Comprehensive Deciphering Dossier
 * 读透企业・全维穿透档案与天地因果实证中枢
 */
export function getDeepDecipherDossier(data: CompanyPanoramaData): DeepDecipherDossierData {
  if (data.deepDecipher) {
    return data.deepDecipher;
  }

  const name = data.basicInfo.name;

  // Archetype 1: 比亚迪 (BYD)
  if (name.includes('比亚迪') || name.toUpperCase().includes('BYD')) {
    return {
      companyName: name,
      _isSynthetic: true as const,
      strategicQuadLens: {
        essence: {
          coreIdentity: '超级垂直一体化精密工程与制造自闭环实体（非传统代工与组装型主机厂）',
          underlyingProfitLogic:
            '赚取垂直整合带来的研发与制造全链条超额中间利润消除（零中间商加价）+ 庞大工程师红利 + 核心零部件物理自制规模效应与折旧摊薄。',
          organizationDna:
            '工程师主导大兵团作战文化（超10万研发工程技术团队），以“技术自研+垂直制造自闭环”为底座，具备极强的战略定力与创始人极权工程决断力。',
          capitalAllocationEfficiency:
            '极为激进且高度聚焦的硬核物理资产与底层技术自研投入（自研刀片电池、DM混动动力总成、IGBT/SiC碳化硅功率芯片、自建远洋汽车滚装船队），绝不外包高利润与卡脖子核心环节。',
          essencePunchline:
            '用制造电池和半导体的精密化学与工程逻辑重新定义整车成本学，以全产业链自闭环形成全球友商在同价位下无法复制的“成本与迭代速度双重黑洞”。',
        },
        successEngine: {
          flywheelStages: [
            {
              stage: '阶段一：核心三电与半导体100%垂直全自研',
              title: '打破外部Tier 1加价与研发阻隔',
              mechanism: '电池、电机、电控、IGBT芯片、车身冲压模具内部闭环，研发迭代协同无组织墙壁垒。',
              moatDefensibility: '研发到量产迭代周期比传统合资车企缩短40%以上。',
            },
            {
              stage: '阶段二：杀手级颠覆性核心技术规模化落地',
              title: '刀片电池与DM超级混动击穿市场认知',
              mechanism: '以结构创新解决磷酸铁锂能量密度与针刺安全痛点，实现“电比油低”且依然享有20%+毛利空间。',
              moatDefensibility: '在10万-25万主流国民消费区间形成不可替代的心智霸权。',
            },
            {
              stage: '阶段三：爆款多车型矩阵引发极限规模效应',
              title: '百万级销量摊薄巨额研发与重资产折旧',
              mechanism: '王朝、海洋双网月销破数十万台，采购规模与产线稼动率达到巅峰，单车边际制造分摊成本极限骤降。',
              moatDefensibility: '令依赖外采总成的竞品陷入“降价即亏损、不降价即边缘化”的死循环。',
            },
            {
              stage: '阶段四：超级造血反哺万名工程师军团与全球出海',
              title: '自研技术代差与自建航运打通全球内生循环',
              mechanism: '充沛的经营现金流支持易四方、云辇、全栈智驾研发，自建大型滚装船队直插欧美东南亚高利润腹地。',
              moatDefensibility: '形成技术、产能、航运、终端网络四位一体的自增强飞轮。',
            },
          ],
          coreMoatDimensions: [
            { dimension: '供应链垂直整合度', rating: 'S+ 级', description: '自研自制率高达75%以上，几乎掌控新能源整车物理价值链全部核心环节。' },
            { dimension: '动力电池与三电工程', rating: 'S 级', description: '刀片电池与CTB车身一体化技术拥有独立自主知识产权与全球极高良率保障。' },
            { dimension: '极限制造规模方程', rating: 'S 级', description: '年销400万辆级规模带来全球首屈一指的原材料谈判议价与产线开工摊薄。' },
            { dimension: '全球自主航运物流', rating: 'A+ 级', description: '自购建造多艘7000+车位远洋汽车滚装船，绕开国际航运涨价与运力卡脖子。' },
            { dimension: '高阶智驾算法与算力', rating: 'B+ 级（加速跃升）', description: '正从依赖外部采购英伟达芯片，加速推进“天神之眼”全系标配与自研智驾芯片平权。' },
          ],
          historicalPivotalDecisions: [
            { year: '2003年', event: '逆势跨界收购秦川汽车', strategicBet: '遭受资本市场恐慌抛售但坚决确立“造车+三电自研”战略底座', payoff: '为后续20年新能源汽车技术自主打下不可逆的工程基础。' },
            { year: '2020年', event: '发布刀片电池', strategicBet: '以空间利用率结构创新重塑磷酸铁锂路线，粉碎三元锂垄断神话', payoff: '彻底破除动力电池易自燃心智障碍，单车成本直降20%。' },
            { year: '2021年', event: '发布DM-i超级混动', strategicBet: '以电为主、多用电少用油颠覆传统燃油发动机变速箱壁垒', payoff: '直接击溃合资燃油车在国民家用车市场的统治壁垒。' },
            { year: '2022年', event: '全球首家停产纯燃油车', strategicBet: '彻底斩断传统燃油车既得利益包袱，全力压注全系新能源', payoff: '树立全球新能源纯正心智，年销量实现现象级指数级暴增。' },
            { year: '2024年', event: '“电比油低”总攻与自建船队出海', strategicBet: '以DM5.0实现2L百公里油耗与2000km续航，首艘“开拓者1号”首航欧洲', payoff: '加速燃油车出清，打开海外单车高溢价净利空间。' },
          ],
          costAdvantageEquation:
            '总成本优势 = (零部件自研去中间商溢价 15%-20%) + (自制模具与通用化平台平摊 8%) + (超大规模采购议价 6%) - (垂直重资产折旧与庞大人员管理摩擦 5%) ≈ 净成本壁垒领先传统组装主机厂 20% 以上。',
          whyCompetitorsFail:
            '友商学不会的根本原因：传统合资车企被既有供应商体系利益捆绑，无法自断手臂投资重资产制造；新势力缺乏千亿级资本累积与20年精密模具和电池工程沉淀；谁也无法在短期内承受10万研发工程师的人力协同与全产业链自研的试错成本。',
        },
        hiddenRisks: {
          topBlindSpots: [
            {
              category: '供应链暗礁',
              title: '供应链账期（迪链与承兑票据）拉长至130+天引发上游流动性反弹',
              severity: '高风险',
              triggerCondition: '终端乘用车价格战再度恶化逼迫进一步向上游压价，或宏观货币环境阶段性收紧。',
              cascadingImpact: '中小零部件供应商经营困难甚至断供违约，引发供应链合规舆情与政策规范风险。',
              mitigationReadiness: '正通过提高现金支付比例、建立战略合作伙伴准入机制与白名单融资纾困化解。',
            },
            {
              category: '地缘与准入封杀',
              title: '欧美对华电动车惩罚性关税顶格加征与地缘政治壁垒',
              severity: '极高风险',
              triggerCondition: '海外关税超40%或对关键电池零部件产地实施追溯禁令。',
              cascadingImpact: '整车直接出口单车利润腰斩，海外销量增速受挫，甚至直接阻断北美等大市场。',
              mitigationReadiness: '正在匈牙利、巴西、泰国、土耳其大规模推进属地化组装工厂，以本地生产对冲直接关税。',
            },
            {
              category: '技术颠覆断层',
              title: '高阶智驾先进制程算力芯片的外采单源依赖',
              severity: '高风险',
              triggerCondition: '外部高算力芯片供应遭受出口管制，或竞争对手全自动驾驶端到端出现断代领先。',
              cascadingImpact: '高端车型（仰望、腾势）智能化标签弱化，错失下半场全自动驾驶价值重估。',
              mitigationReadiness: '正在自研全栈智驾算法并深度协同国产车规大算力芯片代工，加速算法追平。',
            },
            {
              category: '内部组织钝化',
              title: '员工规模突破70万人带来的管理熵增与多车型冗余内耗',
              severity: '中度警惕',
              triggerCondition: '车型内部互搏与平台研发资源重复配置，导致组织决策链条拉长。',
              cascadingImpact: '部分小众细分车型资源利用率低下，侵蚀整体净利润率。',
              mitigationReadiness: '启动事业部独立核算，严控立项ROI，推动平台化高度模块化通用共用。',
            },
          ],
          vulnerabilityHeatmapScore: 68,
          worstCaseBlackSwan:
            '海外核心发达国家建立全面排他性地缘关税壁垒 + 国内汽车行业价格战极致演化为全行业亏损泥潭 + 先进车规大算力芯片实施完全断供。',
        },
        evolution: {
          currentSCurve: {
            curveName: '国民级主流新能源汽车（王朝/海洋系列在10-25万大众市场的普及替代）',
            status: '成熟期',
            saturationTimeline: '国内新能源渗透率突破50%后增速由爆发式转为存量结构性替换（预计2-3年内步入平稳期）。',
          },
          nextGrowthCurves: [
            {
              curveName: '第二曲线：全球化海外属地化制造与出海高溢价收割',
              potentialScale: '年海外出口及属地化销售突破 100-150 万辆，单车净利达国内 2-3 倍',
              readinessScore: 88,
              executionProgress: '泰国基地已投产，匈牙利与土耳其欧洲基地在建，自建船队常态化运营。',
            },
            {
              curveName: '第三曲线：仰望/腾势/方程豹高端豪华与技术溢价破圈',
              potentialScale: '占领 30万-100万+ 豪华硬派越野与高端行政市场，重塑品牌心智天花板',
              readinessScore: 78,
              executionProgress: '仰望U8稳居百万级硬派越野头部，腾势D9成为豪华MPV销冠，方程豹全系发力。',
            },
            {
              curveName: '第四曲线：全栈智能化平权与商用车/海外电网级大型储能',
              potentialScale: '年营收贡献可达千亿级，构成第二支柱型高现金流业务',
              readinessScore: 82,
              executionProgress: '全球储能出货量位列前二，商用车大巴出海成熟，智驾全面普及上车。',
            },
          ],
          endGameFiveYearScenario: {
            bullCase: {
              scenario: '海外欧洲与东南亚工厂顺利落成，全球年销达 650-700 万辆，跃居全球汽车制造业前二，智能化完全补齐并享有海外高净利。',
              probability: '35%',
              enterpriseValue: '市值突破 1.5 - 2.0 万亿元人民币',
            },
            baseCase: {
              scenario: '国内维持400-450万辆基本盘霸权，海外年销稳定在100万辆左右，全球年销突破550万辆稳居全球前四。',
              probability: '50%',
              enterpriseValue: '市值维持在 1.0 - 1.3 万亿元人民币',
            },
            bearCase: {
              scenario: '欧美关税与地缘封锁严苛，海外拓展受阻，国内深陷极致价格战，年利润被压缩至 250-300 亿元。',
              probability: '15%',
              enterpriseValue: '估值承压回撤至 6000 - 7500 亿元人民币',
            },
          },
          evolutionVerdict:
            '比亚迪正从“中国新能源汽车代际颠覆者”向“全球多极化制造与清洁能源生态超级集团”进化。其成败关键不在于国内销量的继续膨胀，而在于能否以跨国经营能力跨越海外地缘政治的高墙，以及能否在智能化下半场摆脱单源供应链依赖实现软硬一体自立。',
        },
      },
      verdictSummary: {
        dnaType: '超级垂直一体化工程制造霸权',
        trueMoatRating: 'S级（物理工程全自研与超大制造规模双重壁垒）',
        realCashGeneratingPower: '极高（主业自我造血充沛，但上下游供应链账期占款拉长至 130+ 天）',
        vulnerabilityEpicenter: '海外关税/反补贴政策壁垒与先进制程高阶智驾算力芯片外采',
        forensicAuthenticityScore: 91,
        executiveVerdictPunchline:
          '这绝非一家传统的造车企业，而是一家披着整车外衣的“巨型精密化学与功率半导体垂直制造联合体”。它的核心安全垫来自于高达 78% 的零部件全自研物理自闭环，最大潜在暗礁在于海外地缘关税阻隔与先进制程智驾芯片的单源依赖。',
        confidenceLevel: '极高置信度（卫星SAR雷达、滚装船吃水线与财报多源交叉印证）',
      },
      businessAnatomy: {
        revenueSourceDeconstruction: [
          {
            segment: '新能源汽车与电池业务 (含弗迪系动力总成)',
            claimedShare: '80.3%',
            trueMargin: '23.5%',
            moatType: '刀片电池+DM-i混动+易四方三电自研底层垂直定价权',
            substitutability: '极难替代',
            anatomyVerdict: '具备物理级成本护城河，单车毛利率在价格战中因自研电池及IGBT优势逆势维持高位。',
          },
          {
            segment: '手机部件及其他组装业务 (比亚迪电子)',
            claimedShare: '19.7%',
            trueMargin: '8.4%',
            moatType: '高精密金属结构件与苹果/安卓代工客户协同',
            substitutability: '中度替代',
            anatomyVerdict: '提供充沛经营活动现金流底座，但毛利弹性较低，属劳动密集型稳健护盾。',
          },
        ],
        inHouseVsOutsourceRatio: {
          inHousePercentage: 78,
          outsourcePercentage: 22,
          keyInHouseAssets: [
            '刀片动力电池与储能电芯 (弗迪电池 100% 自研自造)',
            '高压电驱/混动专用发动机/变速箱 (弗迪动力 100% 自研)',
            '车规级 SiC / IGBT 功率芯片模组 (比亚迪半导体 100% 自控)',
            '高压线束、车身冲压模具与热管理系统 (全栈内供)',
          ],
          vulnerableOutsourceAssets: [
            '高阶自动驾驶算力 SoC 芯片 (英伟达 Orin-X / 地平线 J6 依赖)',
            '车规先进制程 MCU 与晶圆代工产能 (台积电/联电外部代工)',
            '海外本地化汽车工人工会政策与合规团队',
          ],
        },
        economicEngineSummary:
          '微观经济学实质：通过将传统车企外包给博世、大陆的 Tier-1/Tier-2 利润全部在体表内部化（弗迪系），实现“研发一次折旧、多车型平摊”的极限边际成本递减飞轮。',
      },
      cyberPhysicalTelemetry: {
        facilities: [
          {
            name: '深圳坪山总部与整车研发智造总厂',
            location: '中国广东省深圳市坪山区',
            sarBackscatterDb: -7.4,
            sarStatus: '满负荷',
            thermalRadianceW: 158.4,
            claimedCapacityUtilization: '95.0%',
            verifiedPhysicalActivity: '96.2%（重金属产线雷达强反射与夜间排热高度活跃）',
            deviationDelta: '+1.2%（吻合）',
            confidence: '天基置信度 98%',
          },
          {
            name: '常州国家高新区新能源汽车核心基地',
            location: '中国江苏省常州市新北区',
            sarBackscatterDb: -8.1,
            sarStatus: '满负荷',
            thermalRadianceW: 142.1,
            claimedCapacityUtilization: '92.0%',
            verifiedPhysicalActivity: '91.4%（出厂商品车转运停车场热特征持续密集）',
            deviationDelta: '-0.6%（吻合）',
            confidence: '天基置信度 95%',
          },
          {
            name: '郑州航空港大型整车与电池产业园',
            location: '中国河南省郑州市航空港区',
            sarBackscatterDb: -8.6,
            sarStatus: '高运转',
            thermalRadianceW: 128.5,
            claimedCapacityUtilization: '88.0%',
            verifiedPhysicalActivity: '85.7%（三期厂区处于设备调试进场上升阶段）',
            deviationDelta: '-2.3%（轻微滞后）',
            confidence: '天基置信度 93%',
          },
          {
            name: '匈牙利塞格德欧洲第一制造基地 (在建)',
            location: '匈牙利塞格德 (Szeged)',
            sarBackscatterDb: -13.8,
            sarStatus: '部分运转',
            thermalRadianceW: 36.2,
            claimedCapacityUtilization: '建设期 (工程进度 35%)',
            verifiedPhysicalActivity: '钢结构大跨度厂房吊装雷达散射与挖掘土方高度吻合',
            deviationDelta: '+0.0%（真实在建）',
            confidence: '天基置信度 92%',
          },
        ],
        maritimeAisShipping: [
          {
            vesselName: '比亚迪开拓者1号 (BYD EXPLORER NO.1) - 汽车滚装船',
            portOfDeparture: '深圳盐田港 (CN YTN)',
            destinationPort: '德国不来梅哈芬港 (DE BRV)',
            draughtDepartureM: 10.8,
            draughtBallastM: 6.4,
            displacementTonnes: 39200,
            cargoValueEstimatedRmb: '约 11.6 亿元 (载运约 4,850 辆出口电动车)',
            customsReportedRmb: '11.4 亿元 (海关离岸申报口径)',
            isVerified: true,
            statusNote: '吃水线排水差与申报货值相差仅 1.7%，排除了海外虚假报关或空转出海风险。',
          },
        ],
        powerGridCorrelationScore: 96,
        physicalGroundTruthVerdict:
          '天基遥感与远洋 AIS 吃水线多源物理校验表明：财报披露的存货周转速度与海外出口暴增具有扎实的物理世界实体货流支撑，非虚假开票或账面库存。',
      },
      networkGeometry: {
        ricciCurvatureEdges: [
          {
            from: '全球头部先进制程晶圆厂 (TSMC)',
            to: '比亚迪智能座舱/高阶智驾域控制器',
            flowType: '4nm/7nm 芯片委托代工',
            ricciCurvature: -0.88,
            bottleneckRisk: '极高脆断咽喉',
            whyVulnerable: '该连接为极低冗余的负曲率边，缺乏本土同代际可替代制造路径。',
          },
          {
            from: '上游锂/镍/钴矿产资源网络',
            to: '弗迪电池正极材料加工',
            flowType: '大宗矿物碳酸锂及精炼原料',
            ricciCurvature: 0.42,
            bottleneckRisk: '充裕网络冗余',
            whyVulnerable: '拥有多区域多供应商持股与长协采购储备，网络局部连通度高。',
          },
          {
            from: '弗迪动力 / 弗迪科技',
            to: '比亚迪各基地总装产线',
            flowType: '核心动力总成与电控底盘',
            ricciCurvature: 0.81,
            bottleneckRisk: '充裕网络冗余',
            whyVulnerable: '集团内完全控股全闭环，协同效率极高，免疫外部商业纠纷。',
          },
        ],
        hiddenReservoirs: [
          {
            name: '弗迪系系列独立法人子公司集群 (分拆独立核算)',
            role: '将研发与制造成本在体外隔离，承接外部车企订单同时平滑集团毛利波动',
            riskOrCapitalTransfer: '通过内部公允转移定价调节税负，为后续潜在分拆上市保留资本操作弹性',
            shareholdingOpacity: '低',
          },
          {
            name: '海纳新能及境外供应链投资平台 (BVI / 开曼)',
            role: '锁定海外优质锂矿/盐湖股权与海外海运船队运营资产',
            riskOrCapitalTransfer: '隔离海外地缘政治反垄断审查与资产查封风险',
            shareholdingOpacity: '中',
          },
        ],
        networkTopologyVerdict:
          '网络几何拓扑表现为极度内聚的“星型堡垒网络”。90% 以上的边具备正曲率（强内部冗余），唯独智驾先进制程芯片呈现出极深负曲率（-0.88），为全网唯一的单点脆断弱穴。',
      },
      causalPercolation: {
        percolationThresholdPc: 0.24,
        currentNetworkStressLevel: 0.07,
        pearlDoInterventionCases: [
          {
            intervention: 'do(欧盟对华电动汽车加征反补贴关税至 38.1%)',
            counterfactualOutcome:
              '反事实因果推演：单车净利润即期压降约 1.35 万元，但依托全产业链垂直整合成本优势仍可保持 11% 边际毛利。伴随匈牙利工厂投产，可在 280 天内完成本土化免税重组。',
            resilienceHalfLifeDays: 280,
            emergencyAction: '加速塞格德基地二期电芯装配产线动工，调整出海车型以混动 DM-i 为主切入中东欧及拉美。',
          },
          {
            intervention: 'do(海外高阶主控 SoC 实施禁运断供)',
            counterfactualOutcome:
              '反事实因果推演：高端仰望/腾势车型智驾系统短期停滞 45-60 天，中低端王朝/海洋网采用自研及地平线平台无缝平替。',
            resilienceHalfLifeDays: 60,
            emergencyAction: '调用 90 天备用战略安全库存，全面切换为国产化高算力芯片架构方案。',
          },
        ],
        causalResilienceVerdict:
          '相变崩塌临界值 Pc = 0.24（需 24% 的核心供应商同时受阻才会引发全网断崖），其抗冲击鲁棒性在汽车制造业中处于第一梯队。',
      },
      algorithmicForensic: {
        benfordSpectrum: [
          { digit: 1, theoreticalPercent: 30.1, actualPercent: 30.8 },
          { digit: 2, theoreticalPercent: 17.6, actualPercent: 17.2 },
          { digit: 3, theoreticalPercent: 12.5, actualPercent: 12.8 },
          { digit: 4, theoreticalPercent: 9.7, actualPercent: 9.4 },
          { digit: 5, theoreticalPercent: 7.9, actualPercent: 7.6 },
          { digit: 6, theoreticalPercent: 6.7, actualPercent: 6.9 },
          { digit: 7, theoreticalPercent: 5.8, actualPercent: 5.5 },
          { digit: 8, theoreticalPercent: 5.1, actualPercent: 5.2 },
          { digit: 9, theoreticalPercent: 4.6, actualPercent: 4.6 },
        ],
        chiSquarePValue: 0.52,
        shannonEntropyBits: 3.14,
        maxEntropyBits: 3.17,
        auditForensicVerdict:
          '多周期明细账本福特定律卡方检验 p = 0.52（远大于 0.05 异常阈值），香农信息熵达到 3.14 bits（高度接近自然离散理论极值 3.17），无人工大额凑整或虚构贸易特征。',
      },
      institutionalModels: {
        beneishMScore: {
          overallScore: -2.48,
          manipulationRisk: '安全区间（极低操纵风险）',
          variables: [
            { code: 'DSRI', name: '应收收入指数 (Days Sales in Receivables)', value: 1.04, benchmark: 1.0, status: 'normal', note: '应收账款增速与营业收入基本同速，无突击虚构应收确认' },
            { code: 'GMI', name: '毛利率指数 (Gross Margin Index)', value: 0.94, benchmark: 1.0, status: 'normal', note: '毛利率保持稳步扩张，未见为粉饰报表掩饰毛利下滑' },
            { code: 'AQI', name: '资产质量指数 (Asset Quality Index)', value: 0.88, benchmark: 1.0, status: 'normal', note: '非流动资产质量良好，无大量递延挂账' },
            { code: 'SGI', name: '销售增长指数 (Sales Growth Index)', value: 1.38, benchmark: 1.0, status: 'normal', note: '高复合增速获终端终端上险量交叉印证' },
            { code: 'DEPI', name: '折旧率指数 (Depreciation Index)', value: 1.02, benchmark: 1.0, status: 'normal', note: '设备计提折旧极其谨慎，未违规拉长摊销年限' },
            { code: 'SGAI', name: '销售管理费用指数 (SGA Expense Index)', value: 0.96, benchmark: 1.0, status: 'normal', note: '销管费用率受规模效应持续摊薄' },
            { code: 'LVGI', name: '杠杆指数 (Leverage Index)', value: 1.03, benchmark: 1.0, status: 'caution', note: '负债率约 70% 处高位，但主要构成是供应链无息应付款（迪链）' },
            { code: 'TATA', name: '总应计利润资产比 (Total Accruals to Total Assets)', value: -0.05, benchmark: 0.0, status: 'normal', note: '现金流充分充沛覆盖账面净利，应计项为负数说明利润含金量极高' },
          ],
          modelVerdict: 'Beneish M-Score = -2.48（远低于操纵红线 -1.78），数学模型判定存在财务操纵的后验概率低于 0.8%。',
        },
        altmanZScore: {
          overallScore: 3.82,
          zone: '安全区 (Safe Zone)',
          variables: [
            { code: 'X1', name: '营运资本/总资产 (Working Capital / Total Assets)', value: 0.08, weight: 1.2, contribution: 0.10 },
            { code: 'X2', name: '留存收益/总资产 (Retained Earnings / Total Assets)', value: 0.22, weight: 1.4, contribution: 0.31 },
            { code: 'X3', name: 'EBIT/总资产 (EBIT / Total Assets)', value: 0.085, weight: 3.3, contribution: 0.28 },
            { code: 'X4', name: '权益市值/总负债 (Market Value of Equity / Total Liabilities)', value: 1.85, weight: 0.6, contribution: 1.11 },
            { code: 'X5', name: '销售收入/总资产 (Sales / Total Assets)', value: 1.02, weight: 0.999, contribution: 1.02 },
          ],
          modelVerdict: 'Altman Z-Score = 3.82，位于坚实安全区间（> 2.99）。市值与强劲营运现金流为总债务提供了坚固安全垫，无任何债务违约或短期破产风险。',
        },
        sloanAccrualRatio: {
          accrualRatio: -0.04,
          earningsQuality: '极高（现金流充分支撑净利）',
          cfoToNetIncomeRatio: 2.14,
          modelVerdict: '经营性现金流净额 (CFO) 达到账面净利润的 2.14 倍，属于顶级的真金白银造血质量，无账面纸面富贵隐患。',
        },
      },
      triangulationAudit: {
        threeWayReconciliation: {
          taxRevenueMatchScore: 98.4,
          bankReceiptToRevenueMatch: 97.2,
          taxInspectionVerdict: '金税四期增值税销项税发票流与整车出库合格证、海关提单申报口径无缝吻合，排除了空转虚构销售。',
          cashReconciliationVerdict: '对公资金进出流水清晰映射至各省级销售网络与海外大区代理行，未发现向未穿透关联方的资金循环回路。',
        },
        energyConservation: {
          unitConsumptionTheoretical: '理论单车制造总能耗：约 380 - 420 kWh / 辆（含刀片电池极片制造与PACK总成分摊）',
          gridSubstationMeasured: '主要整车生产基地国家电网 110kV/220kV 专用线路实测综合用电负荷完全匹配',
          deviationPercent: 1.4,
          conservationVerdict: '能量热工与物质守恒双重实测偏差仅 1.4%，从物理能量守恒定律上彻底锁定了其实际产出的客观真实性。',
        },
        mirrorReconciliation: [
          { supplierOrCustomer: '关键隔膜供应商 (恩捷股份)', targetClaimedRmb: '比亚迪采购金额约 32.5 亿元', counterpartyDisclosedRmb: '恩捷股份披露第一大客户收入 31.8 亿元', matchRatePercent: 97.8, forensicNote: '双方财报对应科目吻合度极高，跨期结算公差可忽略。' },
          { supplierOrCustomer: '关键正负极供应商 (贝特瑞/湖南裕能)', targetClaimedRmb: '比亚迪应付款项约 48.2 亿元', counterpartyDisclosedRmb: '主要供应商应收款项总和约 47.1 亿元', matchRatePercent: 97.7, forensicNote: '供应链账期与商业承兑汇票对账无账外未解纠纷。' },
        ],
      },
      decisionPlaybook: {
        equityInvestor: {
          marginOfSafetyPrice: '安全边际买入价格区间: 215 - 238 元/股 (对应 2025/2026 PE 约 14-16x)',
          targetFairValueRange: '中长期公允内在价值: 315 - 350 元/股',
          topLongCatalysts: [
            'DM 5.0 超级混动平台渗透率突破与全系智驾平权',
            '海外自建滚装船队出海，欧美及东南亚属地化工厂投产大幅提高单车出海净利',
            '第二代刀片电池及固态电池产业化落地',
          ],
          topShortRiskTriggers: [
            '欧美对华反补贴惩罚性关税税率顶格超预期（> 45%）',
            '国内价格战白热化单车让利超 1.5 万元且规模效应无法填补',
            '上游中小供应商爆发群体性账期流动性反弹',
          ],
          hedgingStrategy: '做多比亚迪正股，同时做空海外高估值且缺乏供应链自研垂直降本能力的传统外资车企或造车新势力。',
        },
        creditUnderwriter: {
          dscr: 4.6,
          interestCoverageRatio: 19.8,
          payableFinancingRisk: '低违约风险。但需常态化监测其供应链迪链凭证贴现利率与商业承兑汇票兑付期限结构。',
          suggestedCreditLimit: '建议核定最高综合无担保授信敞口: 800 - 1000 亿元，优先支持绿色出海船舶租赁与战略矿产保供。',
          lendingVerdict: '属顶级核心链主白名单资产，企业偿债意愿与偿债能力均处于制造业最高 AAA 级别。',
        },
        procurementChief: {
          singleSourceCriticalStockDays: 60,
          fastestBackupSwitchDays: 45,
          switchingFrictionCostEst: '约 3.5 亿元（车规软件重构认证与产线固件调校）',
          strategicAdvice: '严格将单一源外资供应商份额压制在 30% 以内，持续贯彻全栈自研与国产二供全备胎体系。',
        },
      },
      sensitivityAnalysis: {
        scenarios: [
          {
            id: 'sens-1',
            parameterName: '碳酸锂电池级原材料价格波动 (±20%)',
            baseValue: '10 万元/吨',
            stressRange: '8 - 12 万元/吨',
            netProfitImpact: '± 35 - 45 亿元 (净利变动约 8.5%)',
            grossMarginDelta: '± 1.2 个百分点',
            fcfImpact: '± 40 亿元',
            sensitivityVerdict: '由于电池自研自供且深度参股核心锂矿，碳酸锂价格敏感度远低于采购型主机厂。',
          },
          {
            id: 'sens-2',
            parameterName: '终端整车价格战单车让利 (降价 -5%)',
            baseValue: '单车均价 14.5 万元',
            stressRange: '单车降价 7250 元',
            netProfitImpact: '- 85 亿元',
            grossMarginDelta: '- 3.1 个百分点',
            fcfImpact: '- 70 亿元',
            sensitivityVerdict: '可通过规模效应折旧摊薄以及 DM5.0 极致平台化降本消化约 60% 的降价冲击。',
          },
          {
            id: 'sens-3',
            parameterName: '海外欧盟加征反补贴惩罚性关税 (+20%)',
            baseValue: '原综合关税 17.4%',
            stressRange: '升至 37.4%',
            netProfitImpact: '- 22 亿元 (仅影响直接整车出口部分)',
            grossMarginDelta: '- 0.8 个百分点',
            fcfImpact: '- 18 亿元',
            sensitivityVerdict: '加速匈牙利及土耳其海外属地化工厂投产，通过当地生产组装实现零关税绕道对冲。',
          },
        ],
      },
    };
  }

  // Archetype 2: 宁德时代 (CATL)
  if (name.includes('宁德时代') || name.toUpperCase().includes('CATL')) {
    return {
      companyName: name,
      _isSynthetic: true as const,
      strategicQuadLens: {
        essence: {
          coreIdentity: '全球电化学材料微观物理工程与极限制造标准的超级基础设施链主',
          underlyingProfitLogic:
            '赚取“原子级材料研发与全球专利封锁的技术溢价 + PPB十亿分之一级极限制造良率溢价 + 掌控锂镍关键矿权与邦普循环的全栈话语权”。',
          organizationDna:
            '战略笃定型研发军团（近2万名电化学科研人员，年研发支出超百亿），崇尚“赌性坚强”的前瞻技术战略押注与极其严苛的工业4.0极限制造管理。',
          capitalAllocationEfficiency:
            '高度专注电化学及其衍生万亿级应用网络（麒麟/神行电池、凝聚态电池、钠电、全固态电池、欧洲与海外超级工厂），绝不盲目跨界下场造车激怒客户。',
          essencePunchline:
            '做全球新能源智能汽车产业链中不可撼动的“电化学英特尔（CATL Inside）”，让所有整车厂既心生忌惮又无法割舍。',
        },
        successEngine: {
          flywheelStages: [
            {
              stage: '阶段一：材料化学基础研发与前瞻专利筑墙',
              title: '突破三元锂与磷酸铁锂高能量高安全极限',
              mechanism: '从原子和分子尺度计算微观化学机理，掌握CTP电芯成组结构与热失控安全自隔离独家技术。',
              moatDefensibility: '全球累计专利超2.5万件，构筑跨国同行无法绕行的知识产权专利密林。',
            },
            {
              stage: '阶段二：绑定全球豪华车企确立工业标杆标准',
              title: '攻克宝马严苛准入打造全球车规质量背书',
              mechanism: '从早期宝马之诺项目确立汽车级最高安全标准，随后横扫特斯拉、奔驰、大众、理想、蔚来等全球一线主机厂。',
              moatDefensibility: '全球一线车企从接洽到放量定点需3-5年验证周期，先发壁垒极高。',
            },
            {
              stage: '阶段三：极限制造良率将缺陷率压降至PPB级',
              title: '十亿分之一缺陷率筑起惊人制造成本壁垒',
              mechanism: '将动力电池缺陷率从行业通常的PPM（百万分之一）打到PPB（十亿分之一），每GWh电芯生产综合良率领先同行2-3个百分点。',
              moatDefensibility: '良率高出2%即可直接吃掉二线同行全部净利润，实现降价不亏本。',
            },
            {
              stage: '阶段四：超级现金流反哺下一代电化学技术无人区',
              title: '钠电、凝聚态与全固态形成多级代差压制',
              mechanism: '年超400亿净利润与近千亿经营现金流，支持在下一代材料与LRS轻资产技术授权模式提前布局。',
              moatDefensibility: '令跟进者不仅在存量产能落后，在新技术专利储备更落后一整个时代。',
            },
          ],
          coreMoatDimensions: [
            { dimension: '原子级材料化学专利网', rating: 'S+ 级', description: '全球专利保护壁垒深厚，正极包覆、高镍单晶、电解液添加剂全覆盖。' },
            { dimension: '极限制造PPB级良率', rating: 'S+ 级', description: '拥有灯塔工厂评级，全工序AI视觉与工艺参数毫秒级闭环控制。' },
            { dimension: '全球超大装机规模与市占', rating: 'S 级', description: '全球动力电池市占率破37%，海外欧洲市占率超35%，规模摊薄极强。' },
            { dimension: '上游锂镍矿资源与闭环回收', rating: 'S 级', description: '邦普循环电池回收率高达99.6%，宜春锂矿及印尼镍矿平抑原料周期。' },
            { dimension: 'LRS轻资产技术输出模式', rating: 'A+ 级（出海奇兵）', description: '通过授权技术专利与工厂运营绕开美国IRA法案关税限制（如福特合作案）。' },
          ],
          historicalPivotalDecisions: [
            { year: '2011年', event: 'ATL动力电池团队独立创立宁德时代', strategicBet: '敏锐预判消费电子向动力电池代际迁徙，专注于高壁垒车规电池', payoff: '抓住中国新能源汽车十倍速政策窗口期，成为无可置疑的龙头。' },
            { year: '2012年', event: '拿下华晨宝马首款高端电动车定点', strategicBet: '啃下德国车企厚达数百页的严苛车规标准，倒逼企业制造体系升级', payoff: '建立了傲视国内同行的全球最高车规级品控基因。' },
            { year: '2016年', event: '押注高能量密度三元高镍路线', strategicBet: '准确契合国家补贴政策对长续航高能量密度的倾斜', payoff: '一举反超比亚迪等传统磷酸铁锂厂商，锁定国内第一地位。' },
            { year: '2020年', event: '深度绑定特斯拉上海超级工厂', strategicBet: '以极致性价比磷酸铁锂与CTP方案打入Model 3/Y供应链', payoff: '单客户带来数百亿级新增营收，拉开与二线电池厂绝对差距。' },
            { year: '2023-2024年', event: '推出神行超充电池与创新LRS出海', strategicBet: '让磷酸铁锂迈入“充电10分钟续航400公里”4C超充时代，通过技术授权进入欧美', payoff: '逆周期实现市占率逆势再上扬，破局海外地缘围堵。' },
          ],
          costAdvantageEquation:
            '综合毛利溢价方程 = (极限制造良率溢价 3%-5%) + (万吨级大宗正极/碳酸锂采购议价 4%) + (自营邦普循环金属回收抵扣 2%) + (全自动化高稼动折旧摊薄 3%) ≈ 比二线电池同行多出 10%-14% 的厚重毛利护城河。',
          whyCompetitorsFail:
            '二线厂商学不会的根本原因：动力电池是高危险性精密化工制品，一旦出现热失控召回将导致主机厂灭顶之灾；没有车企敢轻易为了几分钱的差价拿数十万台整车商誉去冒电芯起火风险；且缺乏年出货百GWh级的极限缺陷大数据反哺工艺迭代。',
        },
        hiddenRisks: {
          topBlindSpots: [
            {
              category: '内部组织钝化',
              title: '核心车企客户“去宁化”与下场自研自制电芯博弈',
              severity: '高风险',
              triggerCondition: '部分车企电池占整车成本超35%，急于自建电池厂或扶持二供以夺回利润定价权。',
              cascadingImpact: '部分二线及新势力主机厂订单份额遭到分流，加剧国内价格战压力。',
              mitigationReadiness: '推行神行电池与麒麟电池品牌化（类似Intel Inside），以技术代差逼迫车企必须采用。',
            },
            {
              category: '地缘与准入封杀',
              title: '美国IRA法案与NDAA国防授权法案对中系电池的排除性封锁',
              severity: '极高风险',
              triggerCondition: '欧美对受关注外国实体（FEOC）严格界定，彻底阻断中企全资建厂与直接补贴。',
              cascadingImpact: '无法以传统重资产模式直接占领北美蓝海市场，错失万亿级高毛利增量。',
              mitigationReadiness: '开创LRS（Licensing Royalty Service）专利技术授权模式，由当地合作方全资建厂。',
            },
            {
              category: '技术颠覆断层',
              title: '全固态电池或新型储能技术跨代颠覆的“创新者窘境”',
              severity: '中度警惕',
              triggerCondition: '硫化物全固态电池产业化进程超预期提速，或海外巨头率先突破关键界面阻抗瓶颈。',
              cascadingImpact: '既有数百GWh液态锂电池产线面临高额资产减值计提风险。',
              mitigationReadiness: '全固态电池研发已投入超千人团队，硫化物与凝聚态全路线并进，技术储备居全球前列。',
            },
            {
              category: '供应链暗礁',
              title: '锂资源价格大起大落周期引发存货减值与保供错配',
              severity: '中度警惕',
              triggerCondition: '碳酸锂现货价格在几十万到几万元之间剧烈过山车震荡。',
              cascadingImpact: '高位囤积的矿权与正极存货面临减值，影响当期报表净利润平滑性。',
              mitigationReadiness: '通过期货套保与客供料闭环计价，将原材料波动全面传导并维持稳定加工费利润。',
            },
          ],
          vulnerabilityHeatmapScore: 61,
          worstCaseBlackSwan:
            '欧美联合实施全方位电化学产业链供应链脱钩禁令 + 全固态电池被海外竞争对手突然实现低成本量产打破现有专利体系。',
        },
        evolution: {
          currentSCurve: {
            curveName: '全球乘用车动力电池总成（三元高镍与磷酸铁锂高压实动力电芯）',
            status: '成熟期',
            saturationTimeline: '全球主流车企电动化定点格局已大体成型，未来复合增速从60%+放缓至15%-25%平稳期。',
          },
          nextGrowthCurves: [
            {
              curveName: '第二曲线：全球大型公用事业级源网荷储电网储能系统',
              potentialScale: '年出货量突破 150-200 GWh，营收占比达 30% 以上，毛利率超动力电池',
              readinessScore: 92,
              executionProgress: '连续数年全球储能电芯出货量第一，零辅源光储系统与大容量储能专用电芯全面放量。',
            },
            {
              curveName: '第三曲线：商用车/重卡/工程机械“骐骥”换电网络生态',
              potentialScale: '打造万亿重卡干线换电“电网级新基建”，锁定长期能源服务费现金流',
              readinessScore: 76,
              executionProgress: '在全国多条重卡干线布局底盘换电站，联合大型物流企业形成示范运营。',
            },
            {
              curveName: '第四曲线：电动航空（eVTOL/商用飞机）凝聚态电池与海运电动化',
              potentialScale: '高壁垒高毛利极客蓝海，单价与溢价远超地面乘用车',
              readinessScore: 80,
              executionProgress: '已成立航空电池合资公司，凝聚态电芯能量密度达 500Wh/kg 并开展试飞合作。',
            },
          ],
          endGameFiveYearScenario: {
            bullCase: {
              scenario: 'LRS技术授权模式在欧美全面开花结果，储能出货占比超过35%，全固态电池率先实现规模量产，全球能源底座地位无可动摇。',
              probability: '40%',
              enterpriseValue: '市值突破 1.6 - 2.2 万亿元人民币',
            },
            baseCase: {
              scenario: '全球动力电池市占率稳固在35%左右，欧洲匈牙利工厂顺利投产，储能持续高增，年净利稳定在 500-600 亿元。',
              probability: '45%',
              enterpriseValue: '市值保持在 1.1 - 1.4 万亿元人民币',
            },
            bearCase: {
              scenario: '海外地缘完全排挤，国内车企自研电芯蚕食二成份额，价格战导致单Wh净利下滑，年利润降至 350 亿元左右。',
              probability: '15%',
              enterpriseValue: '市值回调至 7000 - 8500 亿元人民币',
            },
          },
          evolutionVerdict:
            '宁德时代正从“动力电池硬件供应商”进化为“全球电化学综合能源解决方案基础设施巨擘”。它的战略生命力在于以极强的新技术研发储备（固态、钠电、航空电池）打破既有锂电周期的S曲线天花板，以技术换市场完成从中国龙头到全球不可或缺能源基石的蜕变。',
        },
      },
      verdictSummary: {
        dnaType: '材料化学深度垄断型全球超级链主',
        trueMoatRating: 'S+级（极高研发壁垒、全球专利封锁与极限制造规模）',
        realCashGeneratingPower: '极强（全球动力电池市占率破 37%，ROE 长期维持 25% 以上，话语权极高）',
        vulnerabilityEpicenter: '海外美国 IRA 法案准入排斥与整车厂自研电池去宁德化博弈',
        forensicAuthenticityScore: 94,
        executiveVerdictPunchline:
          '这是一家以“原子级材料化学工程”为地基的科技垄断帝国。它通过前瞻锁定上游核心矿权、在极限制造中将缺陷率降至 PPB（十亿分之一）级别，建立了让所有整车厂“既忌惮又无法舍弃”的行业基础设施地位。',
        confidenceLevel: '极高置信度（宁德湖西基地卫星热工感知、海外出口数据与全球装机量一致）',
      },
      businessAnatomy: {
        revenueSourceDeconstruction: [
          {
            segment: '动力电池系统 (麒麟/神行超充电池)',
            claimedShare: '71.5%',
            trueMargin: '26.8%',
            moatType: '高能量密度材料配方、高压实密度专利与超充散热拓扑',
            substitutability: '极难替代',
            anatomyVerdict: '全球第一大客户群与顶层整车厂深度绑定，溢价能力强。',
          },
          {
            segment: '储能电池系统 (EnerX 系列大储)',
            claimedShare: '15.2%',
            trueMargin: '25.3%',
            moatType: '超长循环寿命 (15000次+) 与全球电网级安全认证',
            substitutability: '极难替代',
            anatomyVerdict: '成为第二增长曲线，毛利率甚至高于动力电池，海外电网需求旺盛。',
          },
          {
            segment: '电池材料及回收 (邦普循环)',
            claimedShare: '13.3%',
            trueMargin: '16.5%',
            moatType: '镍钴锰回收率超 99.3%，锂回收率超 91%',
            substitutability: '中度替代',
            anatomyVerdict: '构成原料自给自足闭环，有效对冲上游大宗矿产暴涨波动。',
          },
        ],
        inHouseVsOutsourceRatio: {
          inHousePercentage: 72,
          outsourcePercentage: 28,
          keyInHouseAssets: [
            '电芯核心化学体系研发与专利池 (超万项全球专利)',
            '极限制造工艺与自动化产线自研设备',
            '邦普循环废旧电池湿法冶金回收网络',
          ],
          vulnerableOutsourceAssets: [
            '上游海外原矿（锂辉石/红土镍矿）采矿权地缘政变风险',
            '隔膜与高性能六氟磷酸锂外协采购',
          ],
        },
        economicEngineSummary:
          '通过全球最大装机规模持续吸收产线折旧，将庞大的研发投入（年超百亿）迅速平摊为极低的单 Wh 综合制造成本，构筑了竞争对手难以逾越的“技术迭代速度+成本”双重壁垒。',
      },
      cyberPhysicalTelemetry: {
        facilities: [
          {
            name: '福建宁德湖西/车里湾超级智造基地',
            location: '中国福建省宁德市蕉城区',
            sarBackscatterDb: -7.1,
            sarStatus: '满负荷',
            thermalRadianceW: 165.8,
            claimedCapacityUtilization: '94.0%',
            verifiedPhysicalActivity: '95.1%（极限制造灯塔工厂，夜间热工红外持续恒温稳定）',
            deviationDelta: '+1.1%（高度吻合）',
            confidence: '天基置信度 99%',
          },
          {
            name: '宜宾“绿色动力之都”三江新区生产基地',
            location: '中国四川省宜宾市三江新区',
            sarBackscatterDb: -7.9,
            sarStatus: '满负荷',
            thermalRadianceW: 152.0,
            claimedCapacityUtilization: '91.0%',
            verifiedPhysicalActivity: '90.8%（零碳工厂水电直供负荷与出货高吻合）',
            deviationDelta: '-0.2%（吻合）',
            confidence: '天基置信度 96%',
          },
          {
            name: '德国图林根埃尔福特电池制造基地',
            location: '德国埃尔福特 (Erfurt)',
            sarBackscatterDb: -9.8,
            sarStatus: '高运转',
            thermalRadianceW: 88.5,
            claimedCapacityUtilization: '82.0%',
            verifiedPhysicalActivity: '80.3%（向宝马/奔驰欧洲工厂持续点对点供货）',
            deviationDelta: '-1.7%（正常微差）',
            confidence: '天基置信度 94%',
          },
        ],
        maritimeAisShipping: [
          {
            vesselName: '中远海运集装箱轮 (危险品第9类电芯专运)',
            portOfDeparture: '厦门港 (CN XMN)',
            destinationPort: '荷兰鹿特丹港 (NL RTM)',
            draughtDepartureM: 13.5,
            draughtBallastM: 8.2,
            displacementTonnes: 62000,
            cargoValueEstimatedRmb: '约 16.8 亿元 (欧洲整车厂动力电池总成配额)',
            customsReportedRmb: '16.5 亿元 (关单货值一致)',
            isVerified: true,
            statusNote: '集装箱危险品舱位监控与电芯温控出运记录高度一致。',
          },
        ],
        powerGridCorrelationScore: 98,
        physicalGroundTruthVerdict:
          '天基热遥感与宜宾/宁德两地特高压工业用电负荷数据高度吻合，证实了其全球第一的出货量完全具备物理世界的能耗守恒支撑。',
      },
      networkGeometry: {
        ricciCurvatureEdges: [
          {
            from: '印尼红土镍矿/南美盐湖锂矿',
            to: '宁德时代原材料粗炼基地',
            flowType: '关键战略原矿跨境调拨',
            ricciCurvature: -0.72,
            bottleneckRisk: '极高脆断咽喉',
            whyVulnerable: '依赖资源国政权更迭与资源民族主义关税保护主义冲击。',
          },
          {
            from: '宁德时代电芯产线',
            to: '特斯拉/理想/宝马/蔚来电池包总装',
            flowType: '定制化模组与CTP总成',
            ricciCurvature: 0.65,
            bottleneckRisk: '充裕网络冗余',
            whyVulnerable: '下游客户高度多元分散，单一下游车企砍单无法动摇全网稳态。',
          },
        ],
        hiddenReservoirs: [
          {
            name: '宜宾晨道新能源产业投资基金等产业资本矩阵',
            role: '以 CVC 投资形式广泛穿透布局上游锂盐、隔膜、负极与正极初创企业',
            riskOrCapitalTransfer: '通过参股锁定最低保供价与技术独家优先采购权，平滑周期风险',
            shareholdingOpacity: '低',
          },
        ],
        networkTopologyVerdict:
          '典型的“超强枢纽辐射型（Hub-and-Spoke）网络”。宁德时代作为超级 Hub 拥有压倒性的拓扑中介中心性（Betweenness Centrality）。',
      },
      causalPercolation: {
        percolationThresholdPc: 0.28,
        currentNetworkStressLevel: 0.05,
        pearlDoInterventionCases: [
          {
            intervention: 'do(美国彻底限制采购含中国电池组件的产品 - IRA法案限制生效)',
            counterfactualOutcome:
              '反事实因果推演：直接出口美国市场受阻，但通过向福特/特斯拉授权专利与技术合作（LRS 模式），收取每套 10%-15% 的稳定技术许可费，现金流甚至优于直接重资产建厂。',
            resilienceHalfLifeDays: 90,
            emergencyAction: '深化与欧美老牌 OEM 签署轻资产技术授权长协，主力重资产产能投向欧洲与东南亚。',
          },
        ],
        causalResilienceVerdict:
          '相变阈值 Pc = 0.28，材料回收自给率超 25%，具备强大的系统性反脆弱自我净化与吸附能力。',
      },
      algorithmicForensic: {
        benfordSpectrum: [
          { digit: 1, theoreticalPercent: 30.1, actualPercent: 30.3 },
          { digit: 2, theoreticalPercent: 17.6, actualPercent: 17.9 },
          { digit: 3, theoreticalPercent: 12.5, actualPercent: 12.2 },
          { digit: 4, theoreticalPercent: 9.7, actualPercent: 9.8 },
          { digit: 5, theoreticalPercent: 7.9, actualPercent: 7.7 },
          { digit: 6, theoreticalPercent: 6.7, actualPercent: 6.5 },
          { digit: 7, theoreticalPercent: 5.8, actualPercent: 5.9 },
          { digit: 8, theoreticalPercent: 5.1, actualPercent: 5.0 },
          { digit: 9, theoreticalPercent: 4.6, actualPercent: 4.7 },
        ],
        chiSquarePValue: 0.68,
        shannonEntropyBits: 3.15,
        maxEntropyBits: 3.17,
        auditForensicVerdict:
          '财务数字谱系极其严谨，本福特卡方检验 p = 0.68，信息熵达到 3.15 bits，体现出成熟大型跨国企业的高度自然离散分布与严格内控审计水平。',
      },
      institutionalModels: {
        beneishMScore: {
          overallScore: -2.65,
          manipulationRisk: '安全区间（极低操纵风险）',
          variables: [
            { code: 'DSRI', name: '应收收入指数 (Days Sales in Receivables)', value: 0.98, benchmark: 1.0, status: 'normal', note: '客户均为全球顶层车企，回款周期稳定' },
            { code: 'GMI', name: '毛利率指数 (Gross Margin Index)', value: 0.92, benchmark: 1.0, status: 'normal', note: '通过技术溢价与高压实密度电芯维持毛利韧性' },
            { code: 'AQI', name: '资产质量指数 (Asset Quality Index)', value: 0.85, benchmark: 1.0, status: 'normal', note: '在建工程及时转固，未发现费用资本化异动' },
            { code: 'SGI', name: '销售增长指数 (Sales Growth Index)', value: 1.25, benchmark: 1.0, status: 'normal', note: '出货量位居全球装机量统计榜首' },
            { code: 'DEPI', name: '折旧率指数 (Depreciation Index)', value: 1.05, benchmark: 1.0, status: 'normal', note: '采用 3-5 年快速折旧政策，折旧政策极其严苛' },
            { code: 'SGAI', name: '销售管理费用指数 (SGA Expense Index)', value: 0.93, benchmark: 1.0, status: 'normal', note: '费用控制力极佳' },
            { code: 'LVGI', name: '杠杆指数 (Leverage Index)', value: 0.98, benchmark: 1.0, status: 'normal', note: '资产负债率约 65%，货币资金及交易性金融资产超千亿' },
            { code: 'TATA', name: '总应计利润资产比 (Total Accruals to Total Assets)', value: -0.06, benchmark: 0.0, status: 'normal', note: '充沛现金流全额支撑利润' },
          ],
          modelVerdict: 'Beneish M-Score = -2.65，远离 -1.78 警戒线，显示极高水平的国际级真实财报自律。',
        },
        altmanZScore: {
          overallScore: 4.15,
          zone: '安全区 (Safe Zone)',
          variables: [
            { code: 'X1', name: '营运资本/总资产', value: 0.12, weight: 1.2, contribution: 0.14 },
            { code: 'X2', name: '留存收益/总资产', value: 0.28, weight: 1.4, contribution: 0.39 },
            { code: 'X3', name: 'EBIT/总资产', value: 0.11, weight: 3.3, contribution: 0.36 },
            { code: 'X4', name: '权益市值/总负债', value: 2.50, weight: 0.6, contribution: 1.50 },
            { code: 'X5', name: '销售收入/总资产', value: 0.88, weight: 0.999, contribution: 0.88 },
          ],
          modelVerdict: 'Altman Z-Score = 4.15，属于标准的高流动性无风险白马龙头，资产负债表防御力极高。',
        },
        sloanAccrualRatio: {
          accrualRatio: -0.05,
          earningsQuality: '极高（现金流充分支撑净利）',
          cfoToNetIncomeRatio: 1.95,
          modelVerdict: '经营现金流净额接近净利润的 2 倍，手握超千亿现金储备，现金转换周期为负。',
        },
      },
      triangulationAudit: {
        threeWayReconciliation: {
          taxRevenueMatchScore: 99.1,
          bankReceiptToRevenueMatch: 98.5,
          taxInspectionVerdict: '全球各生产基地主管税务机关金税四期对账无重大申报差额。',
          cashReconciliationVerdict: '跨境资金池与对公结算严格由工农中建交及跨国顶级投行清算承兑。',
        },
        energyConservation: {
          unitConsumptionTheoretical: '理论单 GWh 电芯制造耗电量：约 3400 - 3700 万度电',
          gridSubstationMeasured: '宁德蕉城及宜宾翠屏基地特高压 220kV 工业变电站耗电量与出货 GWh 拟合度 99.2%',
          deviationPercent: 0.8,
          conservationVerdict: '能量与材料质量守恒精度达到 99.2%，无可挑剔的实体制造佐证。',
        },
        mirrorReconciliation: [
          { supplierOrCustomer: '第一大客户 (特斯拉)', targetClaimedRmb: '宁德时代对特斯拉销售约 380 亿元', counterpartyDisclosedRmb: '特斯拉 10-K 年报采购分类数据印证', matchRatePercent: 98.4, forensicNote: '汇率与交货在途公差内，完全匹配。' },
          { supplierOrCustomer: '核心正极材料 (德方纳米/容百科技)', targetClaimedRmb: '采购金额约 185 亿元', counterpartyDisclosedRmb: '供应商年报第一大客户销售数据', matchRatePercent: 98.1, forensicNote: '双向对账数据完全吻合。' },
        ],
      },
      decisionPlaybook: {
        equityInvestor: {
          marginOfSafetyPrice: '安全边际买入区间: 175 - 195 元/股 (对应动态 PE 约 16-18x)',
          targetFairValueRange: '合理公允价值: 260 - 295 元/股',
          topLongCatalysts: [
            '神行超充电池与麒麟电池全面放量，单瓦时溢价与毛利逆势抬升',
            '欧洲匈牙利 100GWh 电池超级基地顺利投产供货欧洲老牌主机厂',
            '全球电网级大型储能出货量增速超 40%',
          ],
          topShortRiskTriggers: [
            '美国国防授权法案（NDAA）与 IRA 补贴限制加码',
            '国内主流车企自研电池装机比例超预期侵蚀份额',
            '锂电池能量密度物理理论天花板逼近导致技术溢价收窄',
          ],
          hedgingStrategy: '做多宁德时代，做空缺乏技术护城河、依赖低价二线电池装机的主机厂或二线代工厂。',
        },
        creditUnderwriter: {
          dscr: 5.8,
          interestCoverageRatio: 28.4,
          payableFinancingRisk: '极低违约风险。货币资金与结构性存款超 1300 亿元，几乎无有息负债偿付压力。',
          suggestedCreditLimit: '建议核定最高综合授信敞口: 1200 亿元，优先支持全球出海供应链金融与上游锂镍矿权银团贷款。',
          lendingVerdict: '特级 AAA 资质，制造业信贷风控最高优先级。',
        },
        procurementChief: {
          singleSourceCriticalStockDays: 45,
          fastestBackupSwitchDays: 90,
          switchingFrictionCostEst: '超 12 亿元（电池包重新进行整车碰撞与热失控安全重新定型与工信部公告）',
          strategicAdvice: '对宁德时代保持战略采购压舱石地位的同时，扶持中创新航或亿纬锂能作为 15%-25% 的备选二供以维持商务谈判议价空间。',
        },
      },
      sensitivityAnalysis: {
        scenarios: [
          {
            id: 'sens-1',
            parameterName: '上游碳酸锂价格再度跳涨 (+50%)',
            baseValue: '10 万元/吨',
            stressRange: '升至 15 万元/吨',
            netProfitImpact: '+ 15 亿元 (利好存货升值与联动定价提价)',
            grossMarginDelta: '+ 0.8 个百分点',
            fcfImpact: '+ 20 亿元',
            sensitivityVerdict: '采用金属价格联动调价机制（Cost-plus Pass-through），锂价上涨可向下游车企顺价传导。',
          },
          {
            id: 'sens-2',
            parameterName: '下游车企要求动力电池降价 (-10%)',
            baseValue: '0.42 元/Wh',
            stressRange: '降至 0.38 元/Wh',
            netProfitImpact: '- 45 亿元',
            grossMarginDelta: '- 2.5 个百分点',
            fcfImpact: '- 38 亿元',
            sensitivityVerdict: '依靠材料回收（邦普循环）回收率超 90% 与极优良率抵御降价冲击。',
          },
          {
            id: 'sens-3',
            parameterName: '北美市场出口直接归零风险',
            baseValue: '北美营收占比约 11%',
            stressRange: '0% 直接出口',
            netProfitImpact: '- 35 亿元',
            grossMarginDelta: '- 1.2 个百分点',
            fcfImpact: '- 30 亿元',
            sensitivityVerdict: '通过向福特/通用采用 LRS 纯技术授权模式（无资本投入拿毛利分成）可挽回 70% 损失。',
          },
        ],
      },
    };
  }

  // Generic Dynamic Builder for other companies (e.g. 中芯国际, 苹果, or user custom searched)
  const isTechSemi = name.includes('芯') || name.includes('半导体') || name.includes('微电子');
  const isConsumer = name.includes('果') || name.includes('米') || name.includes('华为');

  return {
    companyName: name,
    _isSynthetic: true as const,
    strategicQuadLens: {
      essence: {
        coreIdentity: isTechSemi
          ? '高资本开支与精密工艺主导的战略核心零部件制造中枢'
          : isConsumer
          ? '深度用户心智连接与全球供应链协同的消费品牌帝国'
          : '深耕特定产业缝隙的隐形冠军与技术壁垒拥有者',
        underlyingProfitLogic: isTechSemi
          ? '通过先进制程良率爬坡与重资产设备折旧完成后的超额加工净利润'
          : isConsumer
          ? '品牌心智溢价 + 庞大软硬件生态网络黏性与经常性衍生订阅收入'
          : '专用技术方案的高转换成本溢价与核心客户长期定制采购锁定',
        organizationDna: isTechSemi
          ? '严苛的物理良率控制、重资本投资决断与前沿学术工程攻坚体系'
          : isConsumer
          ? '敏锐的消费者体验洞察、极致工业设计美学与全球协同供应链管理'
          : '务实深耕的技术工程师文化与对关键细分应用场景的深刻理解',
        capitalAllocationEfficiency: isTechSemi
          ? '逆周期逆势扩张晶圆产能，持续拉高研发占营收比重突破物理代差'
          : isConsumer
          ? '高额投向芯片软硬件底层自研、全球旗舰零售店与全方位品牌心智资产'
          : '围绕主业卡脖子环节进行横向补强，严控盲目多元化资本浪费',
        essencePunchline: isTechSemi
          ? '一家以重资本与微观物理制造为底座、构筑现代工业数字基石的硬核实体。'
          : isConsumer
          ? '一家以极致产品力构建全球用户信仰、通过高壁垒生态链牢牢锁定用户生命周期价值的商业巨擎。'
          : '一家在其专业细分领域筑起高转换壁垒与工艺诀窍的不可替代型骨干节点。',
      },
      successEngine: {
        flywheelStages: [
          {
            stage: '阶段一：核心底层关键技术/产品代差突破',
            title: '切入产业未被满足的痛点与代差真空',
            mechanism: '通过高强度早期研发锁定核心专利与独创工艺方案，完成从0到1商业化跨越。',
            moatDefensibility: '在细分领域建立先发专利优势与头部灯塔客户标杆示范。',
          },
          {
            stage: '阶段二：战略大客户绑定与供应链规模化放量',
            title: '进入全球头部核心供应链体系',
            mechanism: '通过严苛的长周期质量认证，实现大批量量产出货，单位BOM物料采购成本显著下降。',
            moatDefensibility: '替换二供具有高昂的工艺适配与质量试错成本，形成极高客户黏性。',
          },
          {
            stage: '阶段三：全工序自动化与良率曲线陡峭提升',
            title: '制造成本与良率剪刀差实现超额盈利',
            mechanism: '随着累计生产经验增加，工艺缺陷率指数级下降，固定折旧被海量出货摊薄。',
            moatDefensibility: '毛利率显著拉开与行业平均水平的差距，拥有行业降价杀伤力底牌。',
          },
          {
            stage: '阶段四：充沛自由现金流推进下一代飞轮升级',
            title: '生态网络闭环或下一代技术平台储备',
            mechanism: '自营造血反哺下一代颠覆性产品研发与海外全球化交付网络建设。',
            moatDefensibility: '竞品试图入场时已面临技术代差与规模成本双重高墙。',
          },
        ],
        coreMoatDimensions: [
          { dimension: '核心知识产权与专利池', rating: 'S 级', description: '拥有主营业务核心技术的发明专利池与排他性专有诀窍（Know-How）。' },
          { dimension: '高客户转换成本', rating: 'A+ 级', description: '下游客户若切换供应商需面临长时间认证周期与潜在停线风险。' },
          { dimension: '规模化采购与良率优势', rating: 'A+ 级', description: '出货量位居行业头部梯队，具备原材料谈判优先权与折旧摊薄效应。' },
          { dimension: '供应链抗断供韧性', rating: 'A 级', description: '核心主料已基本完成国产双备胎替代，正在推进海外属地化基地建设。' },
        ],
        historicalPivotalDecisions: [
          { year: '初创攻坚期', event: '确立核心自主研发路线', strategicBet: '抵制短期贸易代工赚快钱诱惑，坚决投向底层核心部件研发', payoff: '为长达十年的自主化独立发展奠定不可替代的技术基因。' },
          { year: '规模破局期', event: '打入全球顶级链主供应链', strategicBet: '按照全球最严苛国际标准重塑产线品控流程', payoff: '赢得行业顶级信用背书，迅速获得资本与海量订单正反馈。' },
          { year: '近期跨越期', event: '推进全球化布局与生态扩展', strategicBet: '在海外设立制造基地或研发中心，平抑地缘单一市场风险', payoff: '打开海外高单价增量空间，巩固全球行业头部地位。' },
        ],
        costAdvantageEquation:
          '竞争成本优势 = (核心模块自研自主率带来的毛利留存) + (工艺良率领先带来的原材料损耗降低) + (高产能利用率摊薄折旧) - (持续高强度研发投入)。',
        whyCompetitorsFail:
          '追随者难以逾越的壁垒：缺乏长时间工艺经验积累导致试错报废成本高昂；下游核心大客户基于供应链稳定性绝不敢轻易冒险切换；在专利密林与规模采购议价上均处于全面下风。',
      },
      hiddenRisks: {
        topBlindSpots: [
          {
            category: '地缘与准入封杀',
            title: '全球贸易壁垒与关键技术/设备进出口受限风险',
            severity: isTechSemi ? '极高风险' : '高风险',
            triggerCondition: '关键海外市场加征严苛准入关税或将核心供应链节点列入限制性清单。',
            cascadingImpact: '部分高端产品出海受阻，或部分关键原材料/上游设备面临交付延误。',
            mitigationReadiness: '加速推动上游全国产化验证与海外离岸组装工厂布局。',
          },
          {
            category: '技术颠覆断层',
            title: '下一代颠覆性技术路径突变带来的换道超车威胁',
            severity: '高风险',
            triggerCondition: '跨界竞争对手或新兴创业公司采用全新的低成本/高性能物理路径实现量产突破。',
            cascadingImpact: '存量技术路线产品溢价能力迅速弱化，既有研发与设备投资面临减值计提。',
            mitigationReadiness: '设立前沿研究院，对多条潜在备选路线进行前瞻预研与早期孵化投资。',
          },
          {
            category: '供应链暗礁',
            title: '上游单一关键供应商波动引发的交付断链',
            severity: '中度警惕',
            triggerCondition: '海外单一上游核心耗材或芯片出现工厂不可抗力停产。',
            cascadingImpact: '导致整机装配排产滞后，触发下游大客户交期违约惩罚条款。',
            mitigationReadiness: '推行战略安全库存双备份（维持60-90天用量）并扶持第二本土供应商。',
          },
        ],
        vulnerabilityHeatmapScore: isTechSemi ? 72 : 58,
        worstCaseBlackSwan:
          '关键上游核心受限物料遭遇突发断供 + 核心海外客户因不可抗力取消重大年度订单 + 国内市场爆发非理性价格战。',
      },
      evolution: {
        currentSCurve: {
          curveName: '既有主力产品与成熟应用场景放量',
          status: '成熟期',
          saturationTimeline: '在国内主流存量市场渗透率已进入成熟区间，增速由爆发式增长转入平稳结构性升级。',
        },
        nextGrowthCurves: [
          {
            curveName: '第二曲线：全球化海外新兴与成熟市场多极渗透',
            potentialScale: '海外营收贡献提升至整体业务的 35%-45%',
            readinessScore: 82,
            executionProgress: '已建立海外直销服务团队与首批海外装配基地。',
          },
          {
            curveName: '第三曲线：跨界拓展新兴前沿应用（如AI算力硬件、新能源、机器人）',
            potentialScale: '打开万亿级跨赛道第二成长极，提升整体估值倍数',
            readinessScore: 75,
            executionProgress: '多款试验性样件已送样核心战略客户完成第一轮严苛性能测试。',
          },
        ],
        endGameFiveYearScenario: {
          bullCase: {
            scenario: '下一代核心产品顺利突破技术代差，海外高毛利市场全面开花，跨赛道新业务成长为百亿级第二支柱。',
            probability: '35%',
            enterpriseValue: '市值或内在价值增长 80% - 150%',
          },
          baseCase: {
            scenario: '主业维持稳健领军市占率，出海平稳贡献增量，净利润复合增速保持在 15%-25% 健康区间。',
            probability: '50%',
            enterpriseValue: '市值跟随业绩稳健成长 30% - 60%',
          },
          bearCase: {
            scenario: '地缘外部限制加剧导致海外拓展停滞，行业内部竞争加剧引发价格战侵蚀毛利率。',
            probability: '15%',
            enterpriseValue: '估值承压回撤 20% - 35%',
          },
        },
        evolutionVerdict:
          '该企业已成功跨越从“靠规模与代工生存”到“靠技术与生态立命”的第一阶段。未来5年的核心进化使命在于：能否将技术壁垒转化为全球化不可替代的生态位，以及能否在主营业务成熟放缓前成功孕育出第二增长曲线。',
      },
    },
    verdictSummary: {
      dnaType: isTechSemi
        ? '国家战略级高壁垒半导体制造先锋'
        : isConsumer
        ? '全球顶层品牌生态与供应链协同巨头'
        : '关键细分赛道领军实体',
      trueMoatRating: isTechSemi ? 'A+级（极高资本开支与技术代差壁垒）' : 'A级（品牌心智与生态网络效应）',
      realCashGeneratingPower: '稳健（核心业务造血能力清晰，资本开支处于合理生命周期）',
      vulnerabilityEpicenter: isTechSemi
        ? '核心光刻与刻蚀关键设备海外禁令'
        : '关键原材料及海外分销清关滞泊',
      forensicAuthenticityScore: 88,
      executiveVerdictPunchline: `该企业在其产业链环节具备明确的生态位话语权，表内财务披露与外部物理世界活跃度高度收敛，核心攻防重点在于海外地缘技术壁垒对冲与供应链第二备胎建设。`,
      confidenceLevel: '多源交叉检验中高置信度',
    },
    businessAnatomy: {
      revenueSourceDeconstruction: [
        {
          segment: '主营核心产品/服务板块',
          claimedShare: '75.0%',
          trueMargin: '22.0%',
          moatType: '核心技术专利池与头部战略客户长期采购订单',
          substitutability: '极难替代',
          anatomyVerdict: '主业毛利成色真实，未发现虚构应收账款或存货堆积异常。',
        },
        {
          segment: '衍生配件与配套增值技术支持',
          claimedShare: '25.0%',
          trueMargin: '18.5%',
          moatType: '客户服务粘性与软硬件一体化定制能力',
          substitutability: '中度替代',
          anatomyVerdict: '提供充沛经营现金流补充，平滑主营业务季节性波动。',
        },
      ],
      inHouseVsOutsourceRatio: {
        inHousePercentage: isTechSemi ? 65 : 45,
        outsourcePercentage: isTechSemi ? 35 : 55,
        keyInHouseAssets: ['核心算法软件与芯片版图设计', '关键精密装配与成品质量检测控制体系'],
        vulnerableOutsourceAssets: ['高端上游精密机床与专用半导体材料', '第三方全球海运分销网络'],
      },
      economicEngineSummary:
        '通过在核心卡位环节掌握技术标准与自主知识产权，向上下游施加议价杠杆，从而在行业竞争中保持高于同业平均的净资产收益率。',
    },
    cyberPhysicalTelemetry: {
      facilities: [
        {
          name: `${name} 核心总部科技与制造示范基地`,
          location: data.basicInfo.headquarters || '中国核心产业集群园区',
          sarBackscatterDb: -8.2,
          sarStatus: '满负荷',
          thermalRadianceW: 135.6,
          claimedCapacityUtilization: '89.0%',
          verifiedPhysicalActivity: '88.2%（红外热特征与物流出入库高频运转）',
          deviationDelta: '-0.8%（吻合）',
          confidence: '天基置信度 92%',
        },
      ],
      maritimeAisShipping: [
        {
          vesselName: '全球标准集装箱远洋货轮',
          portOfDeparture: '核心出海主枢纽深水港',
          destinationPort: '欧洲/北美核心分销港',
          draughtDepartureM: 11.2,
          draughtBallastM: 7.1,
          displacementTonnes: 45000,
          cargoValueEstimatedRmb: '约 6.2 亿元',
          customsReportedRmb: '6.1 亿元',
          isVerified: true,
          statusNote: '实际排水量吨位推演与报关货值误差在安全区间以内。',
        },
      ],
      powerGridCorrelationScore: 92,
      physicalGroundTruthVerdict:
        '天基卫星遥感与区域工业用电负荷数据检验显示：企业表内营收规模与其实体工业热工辐射具有稳健的物理对应关系。',
    },
    networkGeometry: {
      ricciCurvatureEdges: [
        {
          from: data.upstream[0]?.name || '上游独家核心部件供应商',
          to: `${name} 制造集成总装`,
          flowType: '核心总成采购供应',
          ricciCurvature: -0.75,
          bottleneckRisk: '极高脆断咽喉',
          whyVulnerable: '由于缺乏替代路径，该连接为系统中的脆弱咽喉边。',
        },
        {
          from: `${name} 本部`,
          to: data.downstream[0]?.name || '下游主要分销客户网络',
          flowType: '成品交货与账期清算',
          ricciCurvature: 0.35,
          bottleneckRisk: '充裕网络冗余',
          whyVulnerable: '下游需求端客户多元化，抗单一违约冲击能力较好。',
        },
      ],
      hiddenReservoirs: [
        {
          name: '关联生态孵化平台与供应链合资公司',
          role: '承接高风险前沿研发开支与非标零部件保供',
          riskOrCapitalTransfer: '隔离前期沉没资本投入对母公司净利润的直接侵蚀',
          shareholdingOpacity: '中',
        },
      ],
      networkTopologyVerdict:
        '网络拓扑整体呈现树状扩散结构，需警惕根部唯一供给路径的负曲率脆弱性。',
    },
    causalPercolation: {
      percolationThresholdPc: 0.20,
      currentNetworkStressLevel: 0.08,
      pearlDoInterventionCases: [
        {
          intervention: 'do(关键上游断料 60 天)',
          counterfactualOutcome:
            '反事实因果推演：通过消耗 30 天安全库存与切换备选二供，产能受损可控制在 15% 以内。',
          resilienceHalfLifeDays: 90,
          emergencyAction: '启动供应链应急双源采购机制，扩大常备安全库存冗余。',
        },
      ],
      causalResilienceVerdict:
        '渗流相变临界值约为 Pc = 0.20，在行业平均水平以上，具备标准现代工业企业的抗扰动自愈韧性。',
    },
    algorithmicForensic: {
      benfordSpectrum: [
        { digit: 1, theoreticalPercent: 30.1, actualPercent: 30.5 },
        { digit: 2, theoreticalPercent: 17.6, actualPercent: 17.1 },
        { digit: 3, theoreticalPercent: 12.5, actualPercent: 12.9 },
        { digit: 4, theoreticalPercent: 9.7, actualPercent: 9.5 },
        { digit: 5, theoreticalPercent: 7.9, actualPercent: 7.8 },
        { digit: 6, theoreticalPercent: 6.7, actualPercent: 6.6 },
        { digit: 7, theoreticalPercent: 5.8, actualPercent: 5.7 },
        { digit: 8, theoreticalPercent: 5.1, actualPercent: 5.2 },
        { digit: 9, theoreticalPercent: 4.6, actualPercent: 4.7 },
      ],
      chiSquarePValue: 0.48,
      shannonEntropyBits: 3.12,
      maxEntropyBits: 3.17,
      auditForensicVerdict:
        '本福特定律卡方检验 p = 0.48，信息熵处于自然高熵区间，未检测到系统性手工调账或虚构客户凭证痕迹。',
    },
    institutionalModels: {
      beneishMScore: {
        overallScore: isTechSemi ? -2.35 : -2.20,
        manipulationRisk: '安全区间（极低操纵风险）',
        variables: [
          { code: 'DSRI', name: '应收收入指数 (Days Sales in Receivables)', value: 1.06, benchmark: 1.0, status: 'normal', note: '应收账款周转与行业生命周期相吻合' },
          { code: 'GMI', name: '毛利率指数 (Gross Margin Index)', value: 0.96, benchmark: 1.0, status: 'normal', note: '产品定价权受知识产权壁垒保护，毛利率健康' },
          { code: 'AQI', name: '资产质量指数 (Asset Quality Index)', value: 0.91, benchmark: 1.0, status: 'normal', note: '资产结构清晰，无非经营性长期待摊费用堆积' },
          { code: 'SGI', name: '销售增长指数 (Sales Growth Index)', value: 1.18, benchmark: 1.0, status: 'normal', note: '营收保持内生性有机增长' },
          { code: 'DEPI', name: '折旧率指数 (Depreciation Index)', value: 1.01, benchmark: 1.0, status: 'normal', note: '折旧政策与固定资产投资周期匹配' },
          { code: 'SGAI', name: '销售管理费用指数 (SGA Expense Index)', value: 0.97, benchmark: 1.0, status: 'normal', note: '销管费用受控' },
          { code: 'LVGI', name: '杠杆指数 (Leverage Index)', value: 1.02, benchmark: 1.0, status: 'normal', note: '负债水平符合行业常态' },
          { code: 'TATA', name: '总应计利润资产比 (Total Accruals to Total Assets)', value: -0.03, benchmark: 0.0, status: 'normal', note: '经营性现金流良好' },
        ],
        modelVerdict: `Beneish M-Score 模型综合评分为 ${isTechSemi ? -2.35 : -2.20}，低于 -1.78 的舞弊警戒线，财务可信度良好。`,
      },
      altmanZScore: {
        overallScore: isTechSemi ? 3.45 : 3.20,
        zone: '安全区 (Safe Zone)',
        variables: [
          { code: 'X1', name: '营运资本/总资产', value: 0.10, weight: 1.2, contribution: 0.12 },
          { code: 'X2', name: '留存收益/总资产', value: 0.18, weight: 1.4, contribution: 0.25 },
          { code: 'X3', name: 'EBIT/总资产', value: 0.075, weight: 3.3, contribution: 0.25 },
          { code: 'X4', name: '权益市值/总负债', value: 1.65, weight: 0.6, contribution: 0.99 },
          { code: 'X5', name: '销售收入/总资产', value: 0.85, weight: 0.999, contribution: 0.85 },
        ],
        modelVerdict: 'Altman Z-Score 处于安全区间（> 2.99），企业具备坚韧的债务偿付弹性与再融资支撑。',
      },
      sloanAccrualRatio: {
        accrualRatio: -0.03,
        earningsQuality: '极高（现金流充分支撑净利）',
        cfoToNetIncomeRatio: 1.45,
        modelVerdict: '经营现金流净额 (CFO) 高于账面净利润，应计利润系数处于健康收敛区间。',
      },
    },
    triangulationAudit: {
      threeWayReconciliation: {
        taxRevenueMatchScore: 97.6,
        bankReceiptToRevenueMatch: 96.8,
        taxInspectionVerdict: '发票与报表主营业务收入基本匹配，未发现明显的空转贸易特征。',
        cashReconciliationVerdict: '资金流向与真实合同交割对应，对公转账流水具备真实商业实质。',
      },
      energyConservation: {
        unitConsumptionTheoretical: '理论核心制程/生产综合单耗与行业工程基准拟合',
        gridSubstationMeasured: '主要产业园区变电负荷与申报出货节奏吻合',
        deviationPercent: 2.1,
        conservationVerdict: '物理能耗与财务产出对应度高，符合物理守恒基本律。',
      },
      mirrorReconciliation: [
        { supplierOrCustomer: '核心一级上游供应商网络', targetClaimedRmb: '主要物料采购额占销货成本约 62%', counterpartyDisclosedRmb: '主要供应商同向科目对应正常', matchRatePercent: 96.5, forensicNote: '双向对账基本吻合。' },
        { supplierOrCustomer: '重点销售渠道与战略客户', targetClaimedRmb: '对前五大客户销售占比约 45%', counterpartyDisclosedRmb: '大客户年报披露对应采购口径高度契合', matchRatePercent: 97.0, forensicNote: '无未披露重大关联交易。' },
      ],
    },
    decisionPlaybook: {
      equityInvestor: {
        marginOfSafetyPrice: '建议关注安全边际估值中枢，以行业 10 年历史分位数 30% 以下介入',
        targetFairValueRange: '合理估值维持在所处行业可比公司均值水平',
        topLongCatalysts: [
          '核心主营产品在新一代客户群体中的渗透率突破',
          '海外高毛利区域市场拓展与属地化供应链投产',
          '新技术换代带来产品溢价率回升',
        ],
        topShortRiskTriggers: [
          '行业同质化竞争导致价格战毛利下挫',
          '地缘贸易壁垒加剧海外清关滞泊',
          '关键单一供应商断料或违约',
        ],
        hedgingStrategy: '结合行业周期波动采取阶段性衍生品或多空对冲组合策略。',
      },
      creditUnderwriter: {
        dscr: 3.8,
        interestCoverageRatio: 12.5,
        payableFinancingRisk: '综合信用等级在 AA 到 AAA 之间，流动比率保持健康。',
        suggestedCreditLimit: '根据净资产与流动资产规模核定对应综合授信额度。',
        lendingVerdict: '属具备良好偿债意愿与履约实力的优质授信企业。',
      },
      procurementChief: {
        singleSourceCriticalStockDays: 45,
        fastestBackupSwitchDays: 60,
        switchingFrictionCostEst: '依据行业标准约为年采购额的 3% - 5%',
        strategicAdvice: '落实关键卡脖子材料的 AB 备选供应商梯队，防止单点断料冲击。',
      },
    },
    sensitivityAnalysis: {
      scenarios: [
        {
          id: 'sens-1',
          parameterName: '核心上游原材料价格变动 (±15%)',
          baseValue: '行业基准成本',
          stressRange: '± 15% 成本扰动',
          netProfitImpact: '对净利润影响约 ± 6% - 10%',
          grossMarginDelta: '± 1.5 个百分点',
          fcfImpact: '对自由现金流产生短期扰动',
          sensitivityVerdict: '可通过提前锁单长协或期现联动平滑波动风险。',
        },
        {
          id: 'sens-2',
          parameterName: '市场终端竞争售价波动 (-5%)',
          baseValue: '现行出厂均价',
          stressRange: '售价下调 5%',
          netProfitImpact: '净利润收窄约 12% - 18%',
          grossMarginDelta: '- 3.0 个百分点',
          fcfImpact: '营运现金流短期承压',
          sensitivityVerdict: '需依托工艺迭代和规模效应抵消降价压力。',
        },
      ],
    },
  };
}

