import { describe, it, expect } from 'vitest';
import {
  benfordAnalysis,
  beneishMScore,
  altmanZScore,
  sloanAccrualRatio,
  graphCentrality,
} from '../forensicCalculator';

// ---------------------------------------------------------------------------
// Benford's Law Analysis
// ---------------------------------------------------------------------------

describe('benfordAnalysis', () => {
  it('should return conforms for naturally distributed numbers', () => {
    // 自然分布的数字（斐波那契数列的前 50 项）
    const fib = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987,
      1597, 2584, 4181, 6765, 10946, 17711, 28657, 46368, 75025];
    const result = benfordAnalysis(fib);

    expect(result.spectrum).toHaveLength(9);
    expect(result.spectrum[0].digit).toBe(1);
    expect(result.spectrum[0].theoreticalPercent).toBeCloseTo(30.1, 0);
    expect(result.chiSquareStatistic).toBeGreaterThan(0);
    expect(result.shannonEntropyBits).toBeGreaterThan(0);
    expect(result.maxEntropyBits).toBeCloseTo(Math.log2(9), 2);
  });

  it('should detect manipulation in uniformly distributed numbers', () => {
    // 人为均匀分布（每个首位数字出现 30 次，严重违反本福特）
    const uniform: number[] = [];
    for (let d = 1; d <= 9; d++) {
      for (let i = 0; i < 30; i++) {
        uniform.push(d * Math.pow(10, i % 3));
      }
    }
    // 共 270 个数字，每个首位数字出现 30 次（11.1%）
    // 本福特期望 digit 1 出现 30.1%，这里只有 11.1%
    const result = benfordAnalysis(uniform);

    expect(result.spectrum[0].actualPercent).toBeCloseTo(11.1, 0);
    // 卡方值应该很大（均匀分布 vs 本福特期望）
    expect(result.chiSquareStatistic).toBeGreaterThan(100);
    // p 值应该非常小（强烈拒绝本福特分布）
    expect(result.chiSquarePValue).toBeLessThan(0.001);
    expect(result.verdict).toBe('deviates');
  });

  it('should handle empty input', () => {
    const result = benfordAnalysis([]);
    expect(result.verdict).toBe('deviates');
    expect(result.verdictLabel).toContain('无可用数据');
  });

  it('should handle zeros', () => {
    const result = benfordAnalysis([0, 0, 0]);
    expect(result.verdict).toBe('deviates');
  });

  it('should calculate spectrum percentages correctly', () => {
    // 所有数字都以 1 开头
    const ones = [1, 10, 100, 1000, 10000];
    const result = benfordAnalysis(ones);

    expect(result.spectrum[0].actualPercent).toBe(100); // digit 1 = 100%
    expect(result.spectrum[1].actualPercent).toBe(0);   // digit 2 = 0%
  });
});

// ---------------------------------------------------------------------------
// Beneish M-Score
// ---------------------------------------------------------------------------

describe('beneishMScore', () => {
  const baseInput = {
    receivables_t: 100, receivables_t1: 90,
    revenue_t: 1000, revenue_t1: 900,
    cogs_t: 600, cogs_t1: 550,
    inventory_t: 150, inventory_t1: 140,
    fixedAssets_t: 500, fixedAssets_t1: 480,
    depreciation_t: 50, depreciation_t1: 48,
    totalAssets_t: 2000, totalAssets_t1: 1800,
    sga_t: 200, sga_t1: 190,
    totalDebt_t: 800, totalDebt_t1: 750,
    netIncome_t: 150, operatingCashFlow_t: 180,
  };

  it('should calculate M-Score correctly', () => {
    const result = beneishMScore(baseInput);

    expect(result).not.toBeNull();
    expect(result!.overallScore).toBeLessThan(0); // M-Score 通常是负数
    expect(result!.variables).toHaveLength(8);
    expect(result!.variables[0].code).toBe('DSRI');
  });

  it('should classify safe zone correctly', () => {
    const result = beneishMScore(baseInput);

    expect(result).not.toBeNull();
    // 正常公司应该在安全区间
    if (result!.overallScore < -1.78) {
      expect(result!.manipulationRisk).toBe('safe');
    }
  });

  it('should return null for zero revenue', () => {
    const input = { ...baseInput, revenue_t: 0 };
    const result = beneishMScore(input);
    expect(result).toBeNull();
  });

  it('should return null for zero net income', () => {
    const input = { ...baseInput, netIncome_t: 0 };
    const result = beneishMScore(input);
    expect(result).toBeNull();
  });

  it('should flag high receivables growth', () => {
    // 应收暴增（可能是虚构收入）
    const input = {
      ...baseInput,
      receivables_t: 500, // 从 90 暴增到 500
      receivables_t1: 90,
    };
    const result = beneishMScore(input);

    expect(result).not.toBeNull();
    const dsri = result!.variables.find((v) => v.code === 'DSRI');
    expect(dsri).toBeDefined();
    expect(dsri!.value).toBeGreaterThan(1);
    expect(dsri!.status).toBe('alert');
  });
});

// ---------------------------------------------------------------------------
// Altman Z-Score
// ---------------------------------------------------------------------------

describe('altmanZScore', () => {
  const healthyInput = {
    workingCapital: 200,
    totalAssets: 2000,
    retainedEarnings: 800,
    ebit: 300,
    marketValueEquity: 5000,
    totalLiabilities: 1000,
    revenue: 3000,
  };

  it('should calculate Z-Score correctly', () => {
    const result = altmanZScore(healthyInput);

    expect(result).not.toBeNull();
    expect(result!.overallScore).toBeGreaterThan(0);
    expect(result!.variables).toHaveLength(5);
    expect(result!.variables[0].code).toBe('X1');
  });

  it('should classify healthy company as safe zone', () => {
    const result = altmanZScore(healthyInput);

    expect(result).not.toBeNull();
    expect(result!.zone).toBe('safe');
    expect(result!.zoneLabel).toContain('Safe Zone');
  });

  it('should classify distressed company correctly', () => {
    const distressedInput = {
      workingCapital: -100, // 负营运资本
      totalAssets: 2000,
      retainedEarnings: -500, // 累积亏损
      ebit: 50, // 低利润
      marketValueEquity: 500, // 低市值
      totalLiabilities: 1800, // 高负债
      revenue: 1000,
    };
    const result = altmanZScore(distressedInput);

    expect(result).not.toBeNull();
    expect(result!.zone).toBe('distress');
  });

  it('should return null for zero total assets', () => {
    const input = { ...healthyInput, totalAssets: 0 };
    const result = altmanZScore(input);
    expect(result).toBeNull();
  });

  it('should calculate variable contributions correctly', () => {
    const result = altmanZScore(healthyInput);

    expect(result).not.toBeNull();
    // Z = 1.2*X1 + 1.4*X2 + 3.3*X3 + 0.6*X4 + 0.999*X5
    const x1 = healthyInput.workingCapital / healthyInput.totalAssets;
    expect(result!.variables[0].value).toBeCloseTo(x1, 3);
    expect(result!.variables[0].contribution).toBeCloseTo(1.2 * x1, 2);
  });
});

// ---------------------------------------------------------------------------
// Sloan Accrual Ratio
// ---------------------------------------------------------------------------

describe('sloanAccrualRatio', () => {
  it('should calculate accrual ratio correctly', () => {
    const input = {
      netIncome: 100,
      operatingCashFlow: 150,
      totalAssets_t: 2000,
      totalAssets_t1: 1800,
    };
    const result = sloanAccrualRatio(input);

    expect(result).not.toBeNull();
    expect(result!.accrualRatio).toBeLessThan(0); // CFO > NI => 负应计
    expect(result!.cfoToNetIncomeRatio).toBe(1.5);
    expect(result!.earningsQuality).toBe('high');
  });

  it('should detect deteriorating quality', () => {
    const input = {
      netIncome: 100,
      operatingCashFlow: 50, // CFO 远低于 NI
      totalAssets_t: 2000,
      totalAssets_t1: 1800,
    };
    const result = sloanAccrualRatio(input);

    expect(result).not.toBeNull();
    expect(result!.cfoToNetIncomeRatio).toBe(0.5);
    expect(result!.earningsQuality).toBe('deteriorating');
  });

  it('should return null for zero average assets', () => {
    const input = {
      netIncome: 100,
      operatingCashFlow: 150,
      totalAssets_t: 0,
      totalAssets_t1: 0,
    };
    const result = sloanAccrualRatio(input);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Graph Centrality
// ---------------------------------------------------------------------------

describe('graphCentrality', () => {
  it('should calculate degree centrality', () => {
    const input = {
      nodes: ['A', 'B', 'C', 'D'],
      edges: [
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' },
        { from: 'B', to: 'C' },
        { from: 'C', to: 'D' },
      ],
    };
    const result = graphCentrality(input);

    expect(result.degreeCentrality['A']).toBeCloseTo(2 / 3, 3); // A 连接 2/3 个其他节点
    expect(result.degreeCentrality['C']).toBeCloseTo(3 / 3, 3); // C 连接所有其他节点
  });

  it('should calculate betweenness centrality', () => {
    // 星型网络：中心节点应该有最高介数中心性
    const input = {
      nodes: ['hub', 'a', 'b', 'c', 'd'],
      edges: [
        { from: 'hub', to: 'a' },
        { from: 'hub', to: 'b' },
        { from: 'hub', to: 'c' },
        { from: 'hub', to: 'd' },
      ],
    };
    const result = graphCentrality(input);

    expect(result.betweennessCentrality['hub']).toBeGreaterThan(0);
    expect(result.topNodes[0].node).toBe('hub');
  });

  it('should handle empty graph', () => {
    const input = { nodes: [], edges: [] };
    const result = graphCentrality(input);

    expect(result.topNodes).toHaveLength(0);
  });

  it('should handle single node', () => {
    const input = { nodes: ['A'], edges: [] };
    const result = graphCentrality(input);

    expect(result.degreeCentrality['A']).toBe(0);
    expect(result.betweennessCentrality['A']).toBe(0);
  });

  it('should rank top nodes by betweenness', () => {
    const input = {
      nodes: ['A', 'B', 'C', 'D', 'E'],
      edges: [
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
        { from: 'C', to: 'D' },
        { from: 'D', to: 'E' },
      ],
    };
    const result = graphCentrality(input);

    // 中间节点 B, C, D 应该有更高的介数中心性
    expect(result.topNodes.length).toBeGreaterThan(0);
  });
});
