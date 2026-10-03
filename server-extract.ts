/**
 * LLM 结构化抽取
 *
 * 将年报/季报 PDF 文本中的关键信息结构化提取，存入 extracted_data 表：
 * - top_suppliers: 前五大供应商（名称、采购内容、金额估算、占比、单一来源风险）
 * - top_customers: 前五大客户（名称、采购内容、收入占比、客户粘性）
 * - related_party_transactions: 关联交易（对手方、金额、类型、定价公允性）
 * - equity_investments: 股权投资/合资（标的、持股比例、状态）
 * - key_financials: 关键财务指标（营收、毛利、研发费用、现金流等）
 *
 * 抽取原则：
 * - 严格区分"已披露数字"和"估算/推算"，不在未标注的情况下捏造数字
 * - 每个字段注明来源（年报页码/章节），方便溯源核实
 * - 抽取出错/文本中无相关信息时，该字段留空而非编造
 */
import { generateStructuredJSON } from './server-ai';
import { saveExtractedData, getLatestExtractedData } from './db';
import { processFiling, listPendingFilings } from './server-filing';

export interface ExtractionResult {
  success: boolean;
  dataType: string;
  confidence: number;
  data: any;
  error?: string;
}

// ---------------------------------------------------------------------------
// 抽取 Prompt 模板
// ---------------------------------------------------------------------------

const EXTRACTION_PROMPTS: Record<string, { prompt: string; schema: any }> = {
  top_suppliers: {
    prompt: `你是一名专业的财务审计分析师。请从以下年报文本中提取"前五大供应商"信息。

要求：
- 仅提取已明确披露的供应商信息（年报附注"前五大供应商"或"主要供应商"章节）
- 每家供应商提取：名称（原文）、采购内容或品类、金额估算（已披露的具体数字，或"未单独披露"）、占采购总额比例（如有）、单一来源风险评估（High/Medium/Low）
- 如文本中明确标注"未单独披露"某字段，则填写 null，不得推测
- 若前五大供应商信息完全未出现在文本中，返回空数组 []

返回严格 JSON 格式。`,
    schema: {
      type: 'OBJECT',
      properties: {
        suppliers: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING' },
              procurement_content: { type: 'STRING' },
              amount_disclosed: { type: 'STRING' },
              proportion_of_total: { type: 'STRING' },
              single_source_risk: { type: 'STRING', enum: ['High', 'Medium', 'Low'] },
              source_section: { type: 'STRING' },
              is_estimated: { type: 'BOOLEAN' },
            },
            required: ['name', 'procurement_content', 'single_source_risk'],
          },
        },
        disclosure_note: { type: 'STRING' },
        total_procurement_disclosed: { type: 'BOOLEAN' },
      },
      required: ['suppliers', 'disclosure_note'],
    },
  },

  top_customers: {
    prompt: `你是一名专业的财务审计分析师。请从以下年报文本中提取"前五大客户"信息。

要求：
- 仅提取已明确披露的客户信息（年报附注"前五大客户"或"主要客户"章节）
- 每家客户提取：名称（原文）、采购内容或品类、收入贡献估算、占收入比例（如有）、客户粘性评估（High/Medium/Low）
- 客户名称如为匿名处理（如"客户A"），保留原样
- 如文本中明确标注"未单独披露"，填写 null
- 若前五大客户信息完全未出现，返回空数组 []

返回严格 JSON 格式。`,
    schema: {
      type: 'OBJECT',
      properties: {
        customers: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING' },
              procurement_content: { type: 'STRING' },
              revenue_contribution: { type: 'STRING' },
              proportion_of_total: { type: 'STRING' },
              customer_stickiness: { type: 'STRING', enum: ['High', 'Medium', 'Low'] },
              source_section: { type: 'STRING' },
              is_estimated: { type: 'BOOLEAN' },
            },
            required: ['name', 'procurement_content', 'customer_stickiness'],
          },
        },
        disclosure_note: { type: 'STRING' },
        total_revenue_from_top5_disclosed: { type: 'BOOLEAN' },
      },
      required: ['customers', 'disclosure_note'],
    },
  },

  related_party_transactions: {
    prompt: `你是一名专业的财务审计分析师。请从以下年报文本中提取"关联交易"信息。

要求：
- 提取所有已披露的关联交易记录（采购商品/服务、销售商品/服务、资产转让、股权收购、担保、租赁等）
- 每条记录提取：对手方名称、交易类型（采购商品/销售商品/资产转让/担保/其他）、金额（已披露具体数字，或"未单独披露"）、定价依据（市场价/协议价/成本价/未披露）、是否关联担保或资金占用
- 重点关注：与控股股东/实控人及其近亲属的交易、跨年度持续性关联交易
- 如某类交易完全未披露，返回空数组 []

返回严格 JSON 格式。`,
    schema: {
      type: 'OBJECT',
      properties: {
        transactions: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              counterparty: { type: 'STRING' },
              transaction_type: { type: 'STRING' },
              amount: { type: 'STRING' },
              pricing_basis: { type: 'STRING' },
              is_recurring: { type: 'BOOLEAN' },
              is_related_to_controlling_shareholder: { type: 'BOOLEAN' },
              has_fund_occupation: { type: 'BOOLEAN' },
              source_section: { type: 'STRING' },
              is_estimated: { type: 'BOOLEAN' },
            },
            required: ['counterparty', 'transaction_type', 'amount', 'pricing_basis'],
          },
        },
        total_related_party_revenue: { type: 'STRING' },
        total_related_party_procurement: { type: 'STRING' },
        audit_opinion_on_rpt: { type: 'STRING' },
      },
      required: ['transactions'],
    },
  },

  equity_investments: {
    prompt: `你是一名专业的股权投资分析师。请从以下年报文本中提取"对外股权投资与合资合作"信息。

要求：
- 提取所有已披露的对外投资、参股、合资子公司信息
- 每条提取：标的公司名称、持股比例（如有）、投资金额（已披露或"未单独披露"）、核算科目（长期股权投资/其他权益工具/交易性金融资产等）、被投资单位主营业务、目前状态（正常运营/亏损/注销等）
- 区分：控股子公司、重大影响的联营企业、财务投资
- 若完全未披露，返回空数组 []

返回严格 JSON 格式。`,
    schema: {
      type: 'OBJECT',
      properties: {
        investments: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              company_name: { type: 'STRING' },
              shareholding_ratio: { type: 'STRING' },
              investment_amount: { type: 'STRING' },
              accounting_method: { type: 'STRING' },
              business_description: { type: 'STRING' },
              current_status: { type: 'STRING' },
              source_section: { type: 'STRING' },
              is_estimated: { type: 'BOOLEAN' },
            },
            required: ['company_name', 'accounting_method'],
          },
        },
        total_investment_amount: { type: 'STRING' },
        disclosure_note: { type: 'STRING' },
      },
      required: ['investments'],
    },
  },

  key_financials: {
    prompt: `你是一名专业的财务分析师。请从以下年报文本中提取"关键财务指标"。

要求：
- 仅提取年报/季报中已明确披露的具体数字
- 提取：营业收入及增速、毛利润及毛利率、净利润及净利率、研发费用及研发费用率、经营现金流净额、应收账款周转天数、存货周转天数、资产负债率、加权平均净资产收益率（ROE）
- 注明各项数值的报表期间（年报/三季报/中报）及报表类型（合并/母公司）
- 若某指标完全未披露，填写 null；若有但不精确（如"约XX亿"），在备注标注
- 所有数字注明单位（万元/亿元）及币种

返回严格 JSON 格式。`,
    schema: {
      type: 'OBJECT',
      properties: {
        reporting_period: { type: 'STRING' },
        revenue: { type: 'STRING' },
        revenue_yoy_growth: { type: 'STRING' },
        gross_profit: { type: 'STRING' },
        gross_margin: { type: 'STRING' },
        net_profit: { type: 'STRING' },
        net_margin: { type: 'STRING' },
        rd_expense: { type: 'STRING' },
        rd_expense_ratio: { type: 'STRING' },
        operating_cash_flow: { type: 'STRING' },
        receivables_turnover_days: { type: 'STRING' },
        inventory_turnover_days: { type: 'STRING' },
        debt_to_asset_ratio: { type: 'STRING' },
        roe_weighted: { type: 'STRING' },
        notes: { type: 'STRING' },
        is_consolidated: { type: 'BOOLEAN' },
      },
      required: ['reporting_period'],
    },
  },
};

// ---------------------------------------------------------------------------
// 核心抽取函数
// ---------------------------------------------------------------------------

/**
 * 对给定文本执行结构化抽取。
 * filingType 可选：annual_report / quarterly_report / prospectus
 */
export async function extractFromText(
  companyName: string,
  text: string,
  filingType: string,
  filingId?: string
): Promise<ExtractionResult[]> {
  const results: ExtractionResult[] = [];

  for (const [dataType, { prompt, schema }] of Object.entries(EXTRACTION_PROMPTS)) {
    try {
      const fullPrompt = `${prompt}

【公司名称】：${companyName}
【文件类型】：${filingType}
【正文内容】（已做预处理，去除了无关页眉页脚）：
${text}`;

      const rawOutput = await generateStructuredJSON(fullPrompt, schema, undefined);
      let parsed: any;
      try {
        parsed = JSON.parse(rawOutput);
      } catch {
        // AI 可能包在 markdown 围栏里
        const match = rawOutput.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (match) {
          parsed = JSON.parse(match[1].trim());
        } else {
          throw new Error('Cannot parse JSON from AI output');
        }
      }

      // 简单置信度评估：非空数组填充率 + 字段完整度
      const confidence = computeConfidence(parsed, dataType);

      saveExtractedData({
        companyName,
        filingId,
        dataType,
        jsonData: parsed,
        confidence,
      });

      results.push({ success: true, dataType, confidence, data: parsed });
    } catch (err: any) {
      console.error(`[extract] ${dataType} extraction failed for ${companyName}:`, err);
      results.push({
        success: false,
        dataType,
        confidence: 0,
        data: null,
        error: err.message,
      });
    }
  }

  return results;
}

/**
 * 根据抽取结果的字段填充率评估置信度（0-100）。
 */
function computeConfidence(parsed: any, dataType: string): number {
  if (!parsed) return 0;
  let filled = 0;
  let total = 0;

  if (dataType === 'key_financials') {
    const fields = [
      'revenue', 'gross_profit', 'net_profit', 'rd_expense',
      'operating_cash_flow', 'debt_to_asset_ratio', 'roe_weighted',
    ];
    for (const f of fields) {
      total++;
      if (parsed[f] && parsed[f] !== 'null' && parsed[f] !== null) filled++;
    }
  } else if (['top_suppliers', 'top_customers', 'related_party_transactions', 'equity_investments'].includes(dataType)) {
    const arr = parsed[dataType === 'top_suppliers' ? 'suppliers'
                : dataType === 'top_customers' ? 'customers'
                : dataType === 'related_party_transactions' ? 'transactions'
                : 'investments'] || [];
    total = Math.max(arr.length, 1);
    filled = arr.filter((item: any) => item && typeof item === 'object').length;
    // 加一个基础分（如果数组非空说明章节存在）
    if (arr.length > 0) filled = Math.max(filled, 1);
  }

  if (total === 0) return 0;
  return Math.min(100, Math.round((filled / total) * 100));
}

/**
 * 获取公司已抽取的最新结构化数据（供报告生成使用）。
 */
export function getCompanyExtractedData(companyName: string): Record<string, any> {
  return getLatestExtractedData(companyName);
}

/**
 * 批量处理所有 pending filings（供管理员触发或定时任务调用）。
 */
export async function processAllPendingFilings(): Promise<void> {
  const pending = listPendingFilings();
  for (const filing of pending) {
    console.info(`[extract] processing filing ${filing.id} for ${filing.company_name}`);
    const text = await processFiling(filing.id);
    if (!text) continue;
    await extractFromText(filing.company_name, text, filing.filing_type, filing.id);
  }
}
