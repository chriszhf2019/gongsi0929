/**
 * 交叉对账模块 - 特色二的核心
 *
 * 当供应商年报写"第一大客户贡献收入 31.8 亿"，
 * 目标公司写"向该供应商采购 32.5 亿"——两边对上了，才是真的证据。
 *
 * 这是"鉴源"二字的落点：别人不做，LLM 编不出。
 */

import { parseFinancialNumber } from '../hooks/useExtractedData';

/**
 * 交叉对账结果
 */
export interface ReconciliationMatch {
  /** 对手方名称（供应商或客户） */
  counterparty: string;
  /** 目标公司披露的金额 */
  targetAmount: number | null;
  /** 目标公司披露的原始文本 */
  targetAmountText: string;
  /** 目标公司来源章节 */
  targetSourceSection: string;
  /** 对手方披露的金额 */
  counterpartyAmount: number | null;
  /** 对手方披露的原始文本 */
  counterpartyAmountText: string;
  /** 对手方来源章节 */
  counterpartySourceSection: string;
  /** 吻合度 0-100% */
  matchRate: number | null;
  /** 差异金额 */
  delta: number | null;
  /** 差异百分比 */
  deltaPercent: number | null;
  /** 对账状态 */
  status: 'matched' | 'partial' | 'mismatch' | 'insufficient_data';
  /** 状态标签 */
  statusLabel: string;
  /** 法证注释 */
  forensicNote: string;
}

/**
 * 供应商数据（从目标公司视角）
 */
export interface SupplierData {
  name: string;
  /** 目标公司披露的采购金额 */
  procurementAmount?: string;
  /** 来源章节 */
  sourceSection?: string;
}

/**
 * 客户数据（从目标公司视角）
 */
export interface CustomerData {
  name: string;
  /** 目标公司披露的销售收入 */
  revenueContribution?: string;
  /** 来源章节 */
  sourceSection?: string;
}

/**
 * 对手方数据（从对手方年报抽取）
 */
export interface CounterpartyData {
  name: string;
  /** 对手方披露的来自目标公司的收入/对目标公司的采购 */
  amountFromTarget?: string;
  /** 来源章节 */
  sourceSection?: string;
}

/**
 * 计算两个金额的吻合度
 */
function calculateMatchRate(amount1: number | null, amount2: number | null): {
  matchRate: number | null;
  delta: number | null;
  deltaPercent: number | null;
} {
  if (amount1 === null || amount2 === null) {
    return { matchRate: null, delta: null, deltaPercent: null };
  }

  const delta = Math.abs(amount1 - amount2);
  const base = Math.max(amount1, amount2);
  const deltaPercent = base > 0 ? (delta / base) * 100 : 0;
  const matchRate = 100 - deltaPercent;

  return {
    matchRate: Math.round(matchRate * 10) / 10,
    delta: Math.round(delta * 100) / 100,
    deltaPercent: Math.round(deltaPercent * 10) / 10,
  };
}

/**
 * 判断对账状态
 */
function determineStatus(matchRate: number | null): {
  status: ReconciliationMatch['status'];
  statusLabel: string;
  forensicNote: string;
} {
  if (matchRate === null) {
    return {
      status: 'insufficient_data',
      statusLabel: '数据不足',
      forensicNote: '双方披露数据不完整，无法完成交叉对账。',
    };
  }

  if (matchRate >= 95) {
    return {
      status: 'matched',
      statusLabel: '高度吻合',
      forensicNote: '双方披露金额高度一致，差异在合理公差范围内（汇率、在途、会计口径），交叉验证通过。',
    };
  }

  if (matchRate >= 80) {
    return {
      status: 'partial',
      statusLabel: '部分吻合',
      forensicNote: '双方披露金额存在一定差异，可能源于统计口径、合并范围、或在途时间差，需进一步核实。',
    };
  }

  return {
    status: 'mismatch',
    statusLabel: '显著差异',
    forensicNote: '双方披露金额存在显著差异，超出合理公差范围，可能存在关联交易非关联化、或披露口径不一致，需重点核查。',
  };
}

/**
 * 对单个供应商进行交叉对账
 */
export function reconcileSupplier(
  targetSupplier: SupplierData,
  counterpartyData?: CounterpartyData
): ReconciliationMatch {
  const targetAmount = parseFinancialNumber(targetSupplier.procurementAmount);
  const counterpartyAmount = counterpartyData
    ? parseFinancialNumber(counterpartyData.amountFromTarget)
    : null;

  const { matchRate, delta, deltaPercent } = calculateMatchRate(targetAmount, counterpartyAmount);
  const { status, statusLabel, forensicNote } = determineStatus(matchRate);

  return {
    counterparty: targetSupplier.name,
    targetAmount,
    targetAmountText: targetSupplier.procurementAmount || '未披露',
    targetSourceSection: targetSupplier.sourceSection || '未知来源',
    counterpartyAmount,
    counterpartyAmountText: counterpartyData?.amountFromTarget || '未披露',
    counterpartySourceSection: counterpartyData?.sourceSection || '未获取对手方数据',
    matchRate,
    delta,
    deltaPercent,
    status,
    statusLabel,
    forensicNote,
  };
}

/**
 * 对单个客户进行交叉对账
 */
export function reconcileCustomer(
  targetCustomer: CustomerData,
  counterpartyData?: CounterpartyData
): ReconciliationMatch {
  const targetAmount = parseFinancialNumber(targetCustomer.revenueContribution);
  const counterpartyAmount = counterpartyData
    ? parseFinancialNumber(counterpartyData.amountFromTarget)
    : null;

  const { matchRate, delta, deltaPercent } = calculateMatchRate(targetAmount, counterpartyAmount);
  const { status, statusLabel, forensicNote } = determineStatus(matchRate);

  return {
    counterparty: targetCustomer.name,
    targetAmount,
    targetAmountText: targetCustomer.revenueContribution || '未披露',
    targetSourceSection: targetCustomer.sourceSection || '未知来源',
    counterpartyAmount,
    counterpartyAmountText: counterpartyData?.amountFromTarget || '未披露',
    counterpartySourceSection: counterpartyData?.sourceSection || '未获取对手方数据',
    matchRate,
    delta,
    deltaPercent,
    status,
    statusLabel,
    forensicNote,
  };
}

/**
 * 批量对账供应商
 */
export function reconcileSuppliers(
  targetSuppliers: SupplierData[],
  counterpartyMap: Map<string, CounterpartyData>
): ReconciliationMatch[] {
  return targetSuppliers.map((supplier) => {
    const counterparty = counterpartyMap.get(supplier.name);
    return reconcileSupplier(supplier, counterparty);
  });
}

/**
 * 批量对账客户
 */
export function reconcileCustomers(
  targetCustomers: CustomerData[],
  counterpartyMap: Map<string, CounterpartyData>
): ReconciliationMatch[] {
  return targetCustomers.map((customer) => {
    const counterparty = counterpartyMap.get(customer.name);
    return reconcileCustomer(customer, counterparty);
  });
}

/**
 * 计算整体对账健康度
 */
export function calculateReconciliationHealth(matches: ReconciliationMatch[]): {
  overallScore: number;
  matchedCount: number;
  partialCount: number;
  mismatchCount: number;
  insufficientCount: number;
  verdict: string;
} {
  const matchedCount = matches.filter((m) => m.status === 'matched').length;
  const partialCount = matches.filter((m) => m.status === 'partial').length;
  const mismatchCount = matches.filter((m) => m.status === 'mismatch').length;
  const insufficientCount = matches.filter((m) => m.status === 'insufficient_data').length;

  const validMatches = matches.filter((m) => m.matchRate !== null);
  const overallScore =
    validMatches.length > 0
      ? Math.round(validMatches.reduce((sum, m) => sum + (m.matchRate || 0), 0) / validMatches.length)
      : 0;

  let verdict: string;
  if (validMatches.length === 0) {
    verdict = '暂无足够数据完成交叉对账';
  } else if (overallScore >= 90 && mismatchCount === 0) {
    verdict = '交叉对账健康度极高，双方披露高度一致，财务真实性强';
  } else if (overallScore >= 75) {
    verdict = '交叉对账基本健康，大部分披露吻合，少量差异需关注';
  } else if (overallScore >= 60) {
    verdict = '交叉对账存在一定差异，建议重点核查差异项';
  } else {
    verdict = '交叉对账差异显著，存在披露不一致风险，需深入调查';
  }

  return {
    overallScore,
    matchedCount,
    partialCount,
    mismatchCount,
    insufficientCount,
    verdict,
  };
}
