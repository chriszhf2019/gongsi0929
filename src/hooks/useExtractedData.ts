import { useState, useEffect } from 'react';
import { Evidence } from '../types';

export interface ExtractedFinancials {
  reporting_period?: string;
  revenue?: string;
  revenue_yoy_growth?: string;
  gross_profit?: string;
  gross_margin?: string;
  net_profit?: string;
  net_margin?: string;
  rd_expense?: string;
  rd_expense_ratio?: string;
  operating_cash_flow?: string;
  receivables_turnover_days?: string;
  inventory_turnover_days?: string;
  debt_to_asset_ratio?: string;
  roe_weighted?: string;
  notes?: string;
  is_consolidated?: boolean;
  source_section?: string;
}

export interface ExtractedSupplier {
  name: string;
  procurement_content?: string;
  amount_disclosed?: string;
  proportion_of_total?: string;
  single_source_risk?: 'High' | 'Medium' | 'Low';
  source_section?: string;
  is_estimated?: boolean;
}

export interface ExtractedCustomer {
  name: string;
  procurement_content?: string;
  revenue_contribution?: string;
  proportion_of_total?: string;
  customer_stickiness?: 'High' | 'Medium' | 'Low';
  source_section?: string;
  is_estimated?: boolean;
}

export interface ExtractedData {
  key_financials?: ExtractedFinancials;
  top_suppliers?: { suppliers: ExtractedSupplier[]; disclosure_note?: string };
  top_customers?: { customers: ExtractedCustomer[]; disclosure_note?: string };
  related_party_transactions?: { transactions: any[] };
  equity_investments?: { investments: any[] };
}

export interface UseExtractedDataResult {
  data: ExtractedData | null;
  hasData: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * 获取公司已抽取的真实结构化数据（来自巨潮/SEC/港交所披露文件）
 */
export function useExtractedData(companyName: string | undefined): UseExtractedDataResult {
  const [data, setData] = useState<ExtractedData | null>(null);
  const [hasData, setHasData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyName) {
      setData(null);
      setHasData(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(`/api/extracted-data/${encodeURIComponent(companyName)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((result) => {
        if (cancelled) return;
        setData(result.data || null);
        setHasData(result.hasData || false);
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companyName]);

  return { data, hasData, isLoading, error };
}

/**
 * 从字符串解析数字（处理"约 7,771 亿元"等格式）
 */
export function parseFinancialNumber(str: string | undefined): number | null {
  if (!str) return null;
  const cleaned = str
    .replace(/[约\~\s]/g, '')
    .replace(/亿元|万元|百万元|美元|人民币|元/g, '')
    .replace(/,/g, '')
    .replace(/%$/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * 将抽取数据转换为 Evidence 对象
 */
export function toEvidence(
  sourceSection: string | undefined,
  sourceType: Evidence['sourceType'] = 'extracted',
  isEstimated?: boolean,
  confidence?: number
): Evidence | undefined {
  if (!sourceSection) return undefined;
  return {
    sourceSection,
    sourceType,
    isEstimated,
    confidence,
  };
}

/**
 * 从 extracted_data 构建上游供应商的 evidence 映射
 */
export function buildSupplierEvidenceMap(
  data: ExtractedData | null
): Map<string, Evidence> {
  const map = new Map<string, Evidence>();
  if (!data?.top_suppliers?.suppliers) return map;

  for (const supplier of data.top_suppliers.suppliers) {
    const evidence = toEvidence(
      supplier.source_section,
      'annual_report',
      supplier.is_estimated
    );
    if (evidence) {
      map.set(supplier.name, evidence);
    }
  }
  return map;
}

/**
 * 从 extracted_data 构建下游客户的 evidence 映射
 */
export function buildCustomerEvidenceMap(
  data: ExtractedData | null
): Map<string, Evidence> {
  const map = new Map<string, Evidence>();
  if (!data?.top_customers?.customers) return map;

  for (const customer of data.top_customers.customers) {
    const evidence = toEvidence(
      customer.source_section,
      'annual_report',
      customer.is_estimated
    );
    if (evidence) {
      map.set(customer.name, evidence);
    }
  }
  return map;
}
