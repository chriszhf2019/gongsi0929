import { AUTOMOTIVE_INDUSTRY_DATA } from './src/data/automotiveIndustry';
import {
  AutomotiveCompany,
  AutomotiveRelation,
  AutomotiveRelationType,
} from './src/types';
import { getCompanyExtractedData } from './server-extract';

const RELATION_LABELS: Record<AutomotiveRelationType, string> = {
  supply: '供应',
  customer: '采购',
  equity: '入股',
  joint_venture: '合资',
  co_development: '联合研发',
  technology_license: '技术授权',
  distribution: '渠道分销',
  competitor: '竞争',
};

/**
 * 付费报告的公司匹配必须精确：
 * 1) 名称/简称/代码完全一致（忽略大小写）；
 * 2) 否则仅当唯一前缀命中时才接受；
 * 3) 歧义或未收录一律返回 null —— 报告会如实说明数据未收录，绝不猜主体。
 */
function findCompany(companyName: string): AutomotiveCompany | null {
  const normalized = companyName.trim().toLowerCase();
  if (!normalized) return null;
  const companies = AUTOMOTIVE_INDUSTRY_DATA.companies;

  const exact = companies.find((company) =>
    [company.name, company.shortName, company.ticker || ''].some(
      (field) => field && field.toLowerCase() === normalized
    )
  );
  if (exact) return exact;

  const prefixMatches = companies.filter((company) =>
    [company.name, company.shortName].some(
      (field) => field && field.toLowerCase().startsWith(normalized)
    )
  );
  if (prefixMatches.length === 1) return prefixMatches[0];

  return null;
}

function formatRelation(relation: AutomotiveRelation): string {
  const companyMap = new Map(
    AUTOMOTIVE_INDUSTRY_DATA.companies.map((company) => [company.id, company])
  );
  const from = companyMap.get(relation.fromCompanyId)?.shortName || relation.fromCompanyId;
  const to = companyMap.get(relation.toCompanyId)?.shortName || relation.toCompanyId;
  const types = relation.relationTypes.map((type) => RELATION_LABELS[type]).join('/');
  const procurement = relation.procurement
    ? `采购产品：${relation.procurement.product}；金额口径：${relation.procurement.amountLabel}；单一来源风险：${relation.procurement.singleSourceRisk}`
    : '不涉及已记录的采购信息';
  const equity = relation.equity
    ? `持股比例：${relation.equity.percentage != null ? `${relation.equity.percentage}%` : '待核验'}；控制类型：${relation.equity.controlType}`
    : '不涉及已记录的股权信息';
  const evidence = relation.evidence
    .map((item) => `${item.sourceName}（${item.level}级，${item.filedAt}）`)
    .join('；');
  return `- **${from} → ${to}**｜${types}\n  - ${relation.title}\n  - ${procurement}\n  - ${equity}\n  - 证据：${evidence}`;
}

export function buildAutomotiveReport(companyName: string): string {
  const company = findCompany(companyName);
  const asOf = AUTOMOTIVE_INDUSTRY_DATA.asOf;
  const extracted = getCompanyExtractedData(companyName);
  const hasExtractedData = Object.keys(extracted).length > 0;

  // 找不到任何公司 → 如实告知（不再假装有数据）
  if (!company && !hasExtractedData) {
    return `# 【鉴源 · GenSight】${companyName} 汽车产业深度分析报告

> 数据截止：${asOf}
> 状态：当前公司尚未进入汽车行业 V1 核心公司库，且无已采集的公开披露文件。

## 一、当前结论

当前无法基于已核验的汽车产业资料形成确定性结论。系统不会用推断性内容替代缺失事实。

## 二、需要补充的数据

- 公司主体和统一社会信用代码
- 上市市场、股票代码和最新财报
- 汽车相关业务收入与客户结构
- 主要供应商和采购金额
- 参股、控股和合资关系
- 工厂、产能、车型和出口信息

## 三、数据限制

本报告未接入该公司的完整公开资料。金额、比例和关系必须取得原始文件后才能进入正式报告。管理员可通过后台"文件采集"功能触发年报/季报下载与抽取。

---

*本报告仅用于公开信息研究，不构成投资建议。*`;
  }

  // ------------------------------------------------------------------
  // 合并数据：优先真实披露数据，演示数据加标注
  // ------------------------------------------------------------------

  // 1) 财务数据
  const financials = extracted.key_financials;
  const staticFinancial = company
    ? AUTOMOTIVE_INDUSTRY_DATA.financials.find((s) => s.companyId === company.id)
    : null;
  const hasRealFinancial = !!financials;

  function financialLine(label: string, value: string | undefined, isReal: boolean) {
    const marker = isReal ? '' : '【演示指标】';
    return value && value !== 'null' ? `${marker}${label}：${value}` : null;
  }

  const finLines: string[] = [];
  if (financials) {
    const f = financials;
    const real = (l: string, v: string | undefined) => financialLine(l, v, true);
    if (f.reporting_period) finLines.push(`报表期间：${f.reporting_period}`);
    if (f.revenue) finLines.push(real('营业收入', f.revenue));
    if (f.gross_margin) finLines.push(real('毛利率', f.gross_margin));
    if (f.net_profit) finLines.push(real('净利润', f.net_profit));
    if (f.rd_expense_ratio) finLines.push(real('研发费用率', f.rd_expense_ratio));
    if (f.operating_cash_flow) finLines.push(real('经营现金流', f.operating_cash_flow));
    if (f.roe_weighted) finLines.push(real('加权ROE', f.roe_weighted));
    if (f.debt_to_asset_ratio) finLines.push(real('资产负债率', f.debt_to_asset_ratio));
    if (f.notes) finLines.push(`备注：${f.notes}`);
  } else if (staticFinancial) {
    const s = staticFinancial;
    finLines.push('【演示指标】以下为结构演示指标，需用真实财报替换');
    finLines.push(`毛利率：${s.grossMargin}%`);
    finLines.push(`现金转化：${s.cashConversion}%`);
    finLines.push(`研发费用率：${s.rdRatio}%`);
    if (s.customerConcentration != null) finLines.push(`客户集中度：${s.customerConcentration}%`);
    if (s.supplierConcentration != null) finLines.push(`供应商集中度：${s.supplierConcentration}%`);
    finLines.push(`注：${s.isIllustrative ? '当前为演示指标，需用最新财报替换' : '来自结构化财务数据'}`);
  } else {
    finLines.push('当前未导入可核验的财务快照。');
  }
  const financialSection = finLines.join('\n');

  // 2) 采购与供货（前五大供应商）
  const supplierLines: string[] = [];
  if (extracted.top_suppliers?.suppliers?.length > 0) {
    supplierLines.push('**【来自公开年报披露】前五大供应商**');
    for (const s of extracted.top_suppliers.suppliers) {
      const risk = s.single_source_risk || '未评估';
      supplierLines.push(
        `- ${s.name}\n  采购内容：${s.procurement_content || '未披露'}；` +
        `金额：${s.amount_disclosed || '未单独披露'}（${s.proportion_of_total || '占比未披露'}）；` +
        `单一来源风险：${risk}${s.source_section ? `；来源：${s.source_section}` : ''}`
      );
    }
    if (extracted.top_suppliers.disclosure_note) {
      supplierLines.push(`披露说明：${extracted.top_suppliers.disclosure_note}`);
    }
  } else if (company) {
    const relations = AUTOMOTIVE_INDUSTRY_DATA.relations.filter(
      (r) =>
        (r.fromCompanyId === company!.id || r.toCompanyId === company!.id) &&
        r.procurement
    );
    if (relations.length > 0) {
      supplierLines.push('**【来自结构演示库】主要供应关系**');
      for (const r of relations) {
        const srcCompany = AUTOMOTIVE_INDUSTRY_DATA.companies.find(
          (c) => c.id === r.fromCompanyId || c.id === r.toCompanyId
        );
        supplierLines.push(formatRelation(r));
      }
    } else {
      supplierLines.push('当前未收录可确认的采购金额或供应关系。');
    }
  } else {
    supplierLines.push('当前未收录可确认的采购金额或供应关系。');
  }
  const procurementSection = supplierLines.join('\n');

  // 3) 前五大客户
  const customerLines: string[] = [];
  if (extracted.top_customers?.customers?.length > 0) {
    customerLines.push('**【来自公开年报披露】前五大客户**');
    for (const c of extracted.top_customers.customers) {
      customerLines.push(
        `- ${c.name}\n  采购内容：${c.procurement_content || '未披露'}；` +
        `收入贡献：${c.revenue_contribution || '未披露'}（${c.proportion_of_total || '占比未披露'}）；` +
        `客户粘性：${c.customer_stickiness || '未评估'}` +
        `${c.source_section ? `；来源：${c.source_section}` : ''}`
      );
    }
  } else {
    customerLines.push('当前未收录可确认的客户结构信息。');
  }
  const customerSection = customerLines.join('\n');

  // 4) 入股、合资与合作
  const equityLines: string[] = [];
  if (extracted.equity_investments?.investments?.length > 0) {
    equityLines.push('**【来自公开年报披露】对外股权投资与合资**');
    for (const inv of extracted.equity_investments.investments) {
      equityLines.push(
        `- ${inv.company_name}\n  持股比例：${inv.shareholding_ratio || '未披露'}；` +
        `投资金额：${inv.investment_amount || '未单独披露'}；` +
        `核算科目：${inv.accounting_method || ''}；` +
        `状态：${inv.current_status || '未知'}` +
        `${inv.source_section ? `；来源：${inv.source_section}` : ''}`
      );
    }
  } else if (company) {
    const equityRels = AUTOMOTIVE_INDUSTRY_DATA.relations.filter(
      (r) =>
        (r.fromCompanyId === company!.id || r.toCompanyId === company!.id) &&
        r.equity
    );
    if (equityRels.length > 0) {
      equityLines.push('**【来自结构演示库】入股与合资关系**');
      for (const r of equityRels) equityLines.push(formatRelation(r));
    } else {
      equityLines.push('当前未收录入股或合资关系。');
    }
  } else {
    equityLines.push('当前未收录入股或合资关系。');
  }
  const equitySection = equityLines.join('\n');

  // 5) 关联交易（仅来自真实抽取）
  const rptLines: string[] = [];
  if (extracted.related_party_transactions?.transactions?.length > 0) {
    rptLines.push('**【来自公开年报附注】关联交易**');
    for (const t of extracted.related_party_transactions.transactions) {
      const rptType = t.is_related_to_controlling_shareholder ? '⚠️ 关联担保/资金占用' : '';
      rptLines.push(
        `- ${t.counterparty}（${t.transaction_type}）\n  金额：${t.amount || '未披露'}；` +
        `定价依据：${t.pricing_basis || '未披露'}；` +
        `${rptType}` +
        `${t.source_section ? `；来源：${t.source_section}` : ''}`
      );
    }
  } else {
    rptLines.push('当前未收录关联交易明细（年报附注中通常单独列示）。');
  }
  const rptSection = rptLines.join('\n');

  // 6) 事件时间线（仅来自演示库）
  let timelineSection = '当前未收录时间线事件。';
  let disclosureSection = '当前未导入公开资料文件。';
  if (company) {
    const timeline = AUTOMOTIVE_INDUSTRY_DATA.timeline
      .filter((e) => e.companyIds.includes(company!.id))
      .sort((a, b) => b.date.localeCompare(a.date));
    if (timeline.length > 0) {
      timelineSection = timeline
        .map(
          (e) =>
            `- **${e.date}｜${e.title}**\n  ${e.summary}\n  来源：${e.sourceName}（${e.evidenceLevel}级证据）`
        )
        .join('\n');
    }
    const disclosures = AUTOMOTIVE_INDUSTRY_DATA.disclosures.filter(
      (d) => d.companyId === company!.id
    );
    if (disclosures.length > 0) {
      disclosureSection = disclosures
        .map((d) => `- ${d.title}（${d.period}，${d.sourceName}，${d.extractionStatus}）`)
        .join('\n');
    }
  }

  const dataSourceNote = hasExtractedData
    ? `> 数据来源：已接入公司公开披露年报/季报的结构化抽取数据（管理员可在后台文件管理中查看原始来源）。`
    : `> 数据来源：当前为汽车行业 V1 结构演示数据，管理员可通过"文件采集"功能接入真实年报数据。`;

  const headerCompany = company
    ? `${company.name}（${company.ticker || '非上市/未披露'}）`
    : companyName;
  const headerSegment = company ? `产业环节：${company.segmentLabel}；业务定位：${company.role}` : '尚未收录至汽车产业链数据库';

  return `# 【鉴源 · GenSight】${hasExtractedData ? headerCompany : (company?.shortName || companyName)} 汽车产业深度分析报告

> 数据截止：${asOf}
${dataSourceNote}

## 一、执行摘要

${
  hasExtractedData && extracted.key_financials
    ? `${company?.name || companyName} 位于汽车产业链${company ? `的"${company.segmentLabel}"环节，` : ''}核心业务数据已通过公开披露文件核验。报告以下列示从年度报告中抽取的前五大供应商、客户、关联交易及财务指标，所有数字均注明来源页码，请结合原始披露文件独立核验。`
    : `${company?.shortName || companyName} 位于汽车产业链${company ? `的"${company.segmentLabel}"环节，` : ''}当前报告基于结构演示数据。管理员可通过后台"文件采集"功能，接入公司真实年报/季报，系统将自动抽取前五大供应商、客户、关联交易等结构化数据，替换下方演示指标。`
}

## 二、核心财务观察

${financialSection}

## 三、前五大供应商（采购与供货关系）

${procurementSection}

## 四、前五大客户

${customerSection}

## 五、入股、控制与合资关系

${equitySection}

## 六、关联交易（来自年报附注）

${rptSection}

## 七、事件时间线

${timelineSection}

## 八、公开资料清单

${disclosureSection}

## 九、风险提示

- 采购金额、客户名称和供应份额可能没有单独披露；须核对原始年报附注。
- 关联交易需要核验定价公允性和资金流向是否存在异常。
- 同一供应商可能同时服务多个竞争对手，市场份额不能仅由关系推导。
- 汽车行业受价格战、关税、车型周期、电池价格和芯片供应影响显著。
- 本报告基于公开披露文件与结构化抽取数据，不构成投资建议，不得代替原始财报、审计报告或专业尽调。

## 十、后续核验清单

- 调取最近一期年报、季报和重大公告（重点：前五大供应商/客户附注）。
- 核对参股、控股、合资企业的持股比例及变化时间线。
- 用车型销量、单车用量和市场价格反向验证采购量的合理性。
- 将采购量、收入和现金流放入同一时间轴比较，识别异常波动。
- 本报告由系统自动生成，管理员可在后台查看每条数据对应的原始 PDF 文本来源。

---

*本报告由鉴源 GenSight 自动生成，基于公开资料研究，不构成投资建议。*`;
}
