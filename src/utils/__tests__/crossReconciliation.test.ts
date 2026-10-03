import { describe, it, expect } from 'vitest';
import {
  reconcileSupplier,
  reconcileCustomer,
  reconcileSuppliers,
  reconcileCustomers,
  calculateReconciliationHealth,
  type SupplierData,
  type CustomerData,
  type CounterpartyData,
} from '../crossReconciliation';

// ---------------------------------------------------------------------------
// reconcileSupplier
// ---------------------------------------------------------------------------

describe('reconcileSupplier', () => {
  it('should calculate match rate for matching amounts', () => {
    const target: SupplierData = {
      name: '恩捷股份',
      procurementAmount: '32.5 亿元',
      sourceSection: '2024年报 P.48',
    };
    const counterparty: CounterpartyData = {
      name: '恩捷股份',
      amountFromTarget: '31.8 亿元',
      sourceSection: '恩捷年报 P.112',
    };

    const result = reconcileSupplier(target, counterparty);

    expect(result.counterparty).toBe('恩捷股份');
    expect(result.targetAmount).toBeCloseTo(32.5, 1);
    expect(result.counterpartyAmount).toBeCloseTo(31.8, 1);
    expect(result.matchRate).toBeGreaterThan(90);
    expect(result.status).toBe('matched');
    expect(result.statusLabel).toBe('高度吻合');
  });

  it('should detect significant mismatch', () => {
    const target: SupplierData = {
      name: '供应商A',
      procurementAmount: '100 亿元',
      sourceSection: '年报',
    };
    const counterparty: CounterpartyData = {
      name: '供应商A',
      amountFromTarget: '50 亿元',
      sourceSection: '对手方年报',
    };

    const result = reconcileSupplier(target, counterparty);

    expect(result.matchRate).toBeLessThan(80);
    expect(result.status).toBe('mismatch');
    expect(result.statusLabel).toBe('显著差异');
  });

  it('should handle missing counterparty data', () => {
    const target: SupplierData = {
      name: '供应商B',
      procurementAmount: '20 亿元',
      sourceSection: '年报',
    };

    const result = reconcileSupplier(target);

    expect(result.counterpartyAmount).toBeNull();
    expect(result.matchRate).toBeNull();
    expect(result.status).toBe('insufficient_data');
  });

  it('should handle unparseable amounts', () => {
    const target: SupplierData = {
      name: '供应商C',
      procurementAmount: '未单独披露',
      sourceSection: '年报',
    };
    const counterparty: CounterpartyData = {
      name: '供应商C',
      amountFromTarget: '15 亿元',
      sourceSection: '对手方年报',
    };

    const result = reconcileSupplier(target, counterparty);

    expect(result.targetAmount).toBeNull();
    expect(result.matchRate).toBeNull();
    expect(result.status).toBe('insufficient_data');
  });

  it('should classify partial match correctly', () => {
    const target: SupplierData = {
      name: '供应商D',
      procurementAmount: '100 亿元',
      sourceSection: '年报',
    };
    const counterparty: CounterpartyData = {
      name: '供应商D',
      amountFromTarget: '85 亿元',
      sourceSection: '对手方年报',
    };

    const result = reconcileSupplier(target, counterparty);

    expect(result.matchRate).toBeGreaterThanOrEqual(80);
    expect(result.matchRate).toBeLessThan(95);
    expect(result.status).toBe('partial');
  });
});

// ---------------------------------------------------------------------------
// reconcileCustomer
// ---------------------------------------------------------------------------

describe('reconcileCustomer', () => {
  it('should reconcile customer revenue', () => {
    const target: CustomerData = {
      name: '特斯拉',
      revenueContribution: '380 亿元',
      sourceSection: '2024年报 P.72',
    };
    const counterparty: CounterpartyData = {
      name: '特斯拉',
      amountFromTarget: '375 亿元',
      sourceSection: 'Tesla 10-K',
    };

    const result = reconcileCustomer(target, counterparty);

    expect(result.counterparty).toBe('特斯拉');
    expect(result.matchRate).toBeGreaterThan(95);
    expect(result.status).toBe('matched');
  });
});

// ---------------------------------------------------------------------------
// Batch reconciliation
// ---------------------------------------------------------------------------

describe('reconcileSuppliers (batch)', () => {
  it('should reconcile multiple suppliers', () => {
    const targets: SupplierData[] = [
      { name: '供应商A', procurementAmount: '50 亿元', sourceSection: '年报' },
      { name: '供应商B', procurementAmount: '30 亿元', sourceSection: '年报' },
    ];
    const counterpartyMap = new Map<string, CounterpartyData>([
      ['供应商A', { name: '供应商A', amountFromTarget: '48 亿元', sourceSection: 'A年报' }],
      ['供应商B', { name: '供应商B', amountFromTarget: '29 亿元', sourceSection: 'B年报' }],
    ]);

    const results = reconcileSuppliers(targets, counterpartyMap);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('matched');
    expect(results[1].status).toBe('matched');
  });
});

describe('reconcileCustomers (batch)', () => {
  it('should reconcile multiple customers', () => {
    const targets: CustomerData[] = [
      { name: '客户A', revenueContribution: '100 亿元', sourceSection: '年报' },
      { name: '客户B', revenueContribution: '60 亿元', sourceSection: '年报' },
    ];
    const counterpartyMap = new Map<string, CounterpartyData>([
      ['客户A', { name: '客户A', amountFromTarget: '98 亿元', sourceSection: 'A年报' }],
      ['客户B', { name: '客户B', amountFromTarget: '40 亿元', sourceSection: 'B年报' }],
    ]);

    const results = reconcileCustomers(targets, counterpartyMap);

    expect(results).toHaveLength(2);
    expect(results[0].matchRate).toBeGreaterThan(95);
    expect(results[1].matchRate).toBeLessThan(80);
  });
});

// ---------------------------------------------------------------------------
// calculateReconciliationHealth
// ---------------------------------------------------------------------------

describe('calculateReconciliationHealth', () => {
  it('should calculate overall health score', () => {
    const matches = [
      { counterparty: 'A', targetAmount: 100, targetAmountText: '100', targetSourceSection: '年报', counterpartyAmount: 98, counterpartyAmountText: '98', counterpartySourceSection: 'A年报', matchRate: 98, delta: 2, deltaPercent: 2, status: 'matched' as const, statusLabel: '高度吻合', forensicNote: '' },
      { counterparty: 'B', targetAmount: 50, targetAmountText: '50', targetSourceSection: '年报', counterpartyAmount: 49, counterpartyAmountText: '49', counterpartySourceSection: 'B年报', matchRate: 98, delta: 1, deltaPercent: 2, status: 'matched' as const, statusLabel: '高度吻合', forensicNote: '' },
    ];

    const health = calculateReconciliationHealth(matches);

    expect(health.overallScore).toBe(98);
    expect(health.matchedCount).toBe(2);
    expect(health.mismatchCount).toBe(0);
    expect(health.verdict).toContain('极高');
  });

  it('should handle empty matches', () => {
    const health = calculateReconciliationHealth([]);

    expect(health.overallScore).toBe(0);
    expect(health.verdict).toContain('暂无足够数据');
  });

  it('should handle mixed results', () => {
    const matches = [
      { counterparty: 'A', targetAmount: 100, targetAmountText: '100', targetSourceSection: '年报', counterpartyAmount: 98, counterpartyAmountText: '98', counterpartySourceSection: 'A年报', matchRate: 98, delta: 2, deltaPercent: 2, status: 'matched' as const, statusLabel: '高度吻合', forensicNote: '' },
      { counterparty: 'B', targetAmount: 50, targetAmountText: '50', targetSourceSection: '年报', counterpartyAmount: 30, counterpartyAmountText: '30', counterpartySourceSection: 'B年报', matchRate: 60, delta: 20, deltaPercent: 40, status: 'mismatch' as const, statusLabel: '显著差异', forensicNote: '' },
      { counterparty: 'C', targetAmount: null, targetAmountText: '未披露', targetSourceSection: '年报', counterpartyAmount: null, counterpartyAmountText: '未披露', counterpartySourceSection: 'C年报', matchRate: null, delta: null, deltaPercent: null, status: 'insufficient_data' as const, statusLabel: '数据不足', forensicNote: '' },
    ];

    const health = calculateReconciliationHealth(matches);

    expect(health.matchedCount).toBe(1);
    expect(health.mismatchCount).toBe(1);
    expect(health.insufficientCount).toBe(1);
  });
});
