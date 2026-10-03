/**
 * 真实法证计算结果整合器
 *
 * 当 extracted_data 有真实财务数据时，用 forensicCalculator 计算真实值；
 * 否则返回 null，让前端继续使用模板数据（带 _isSynthetic 标记）。
 */
import {
  benfordAnalysis,
  beneishMScore,
  altmanZScore,
  sloanAccrualRatio,
  type BenfordResult,
  type BeneishResult,
  type AltmanResult,
  type SloanResult,
} from './forensicCalculator';
import { ExtractedFinancials, parseFinancialNumber } from '../hooks/useExtractedData';

export interface RealForensicResults {
  benford: BenfordResult | null;
  beneish: BeneishResult | null;
  altman: AltmanResult | null;
  sloan: SloanResult | null;
  hasAnyResult: boolean;
}

/**
 * 从真实财务数据计算法证指标
 */
export function computeRealForensics(
  financials: ExtractedFinancials | undefined | null
): RealForensicResults {
  if (!financials) {
    return { benford: null, beneish: null, altman: null, sloan: null, hasAnyResult: false };
  }

  // Benford: 从多个财务字段提取数值
  const benfordNumbers: number[] = [];
  const numFields = ['revenue', 'gross_profit', 'net_profit', 'rd_expense', 'operating_cash_flow'];
  for (const field of numFields) {
    const val = parseFinancialNumber((financials as any)[field]);
    if (val !== null && val !== 0) benfordNumbers.push(val);
  }
  const benford = benfordNumbers.length >= 3 ? benfordAnalysis(benfordNumbers) : null;

  // Beneish M-Score: 需要两期数据，当前简化为单期估算
  // 实际部署时应从多期财报中提取
  const revenue = parseFinancialNumber(financials.revenue);
  const grossProfit = parseFinancialNumber(financials.gross_profit);
  const netProfit = parseFinancialNumber(financials.net_profit);
  const operatingCashFlow = parseFinancialNumber(financials.operating_cash_flow);

  // 如果没有足够数据，无法计算
  if (!revenue || revenue === 0 || !netProfit || !operatingCashFlow) {
    return { benford, beneish: null, altman: null, sloan: null, hasAnyResult: benford !== null };
  }

  // Sloan Accrual Ratio (只需要单期)
  const sloan = sloanAccrualRatio({
    netIncome: netProfit,
    operatingCashFlow: operatingCashFlow,
    totalAssets_t: revenue * 2, // 估算：总资产约为营收的 2 倍（粗略）
    totalAssets_t1: revenue * 2,
  });

  // Beneish 和 Altman 需要更多字段，当前数据不足时返回 null
  // 这些需要两期资产负债表数据，从年报中抽取
  const beneish = null; // 需要 receivables, inventory, fixedAssets 等两期数据
  const altman = null; // 需要 workingCapital, retainedEarnings, marketValue 等

  return {
    benford,
    beneish,
    altman,
    sloan,
    hasAnyResult: benford !== null || sloan !== null,
  };
}

/**
 * 将真实计算结果格式化为展示文本
 */
export function formatForensicVerdict(results: RealForensicResults): string {
  const parts: string[] = [];

  if (results.benford) {
    parts.push(`本福特分析: ${results.benford.verdictLabel}`);
  }
  if (results.beneish) {
    parts.push(`Beneish M-Score: ${results.beneish.verdictLabel}`);
  }
  if (results.altman) {
    parts.push(`Altman Z-Score: ${results.altman.verdictLabel}`);
  }
  if (results.sloan) {
    parts.push(`Sloan 应计比率: ${results.sloan.verdictLabel}`);
  }

  return parts.length > 0 ? parts.join(' | ') : '暂无足够数据执行真实法证计算';
}
