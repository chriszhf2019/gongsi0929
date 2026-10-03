/**
 * 真实法证计算模块
 *
 * 所有数字均从输入的财务数据实时计算，不写死任何结果。
 * 替换 forensicDataHelper.ts 中的预写模板数字。
 */

// ---------------------------------------------------------------------------
// Benford's Law Analysis (本福特定律卡方检验)
// ---------------------------------------------------------------------------

export interface BenfordResult {
  spectrum: { digit: number; theoreticalPercent: number; actualPercent: number }[];
  chiSquareStatistic: number;
  chiSquarePValue: number;
  shannonEntropyBits: number;
  maxEntropyBits: number;
  verdict: 'conforms' | 'marginal' | 'deviates';
  verdictLabel: string;
}

function benfordExpected(digit: number): number {
  return Math.log10(1 + 1 / digit) * 100;
}

function chiSquarePValueFromStatistic(x2: number, df: number): number {
  if (df <= 0) return 1;
  if (x2 <= 0) return 1;
  
  // For large chi-square values, use normal approximation
  // Wilson-Hilferty transformation: Z ≈ ((x²/df)^(1/3) - (1 - 2/(9*df))) / sqrt(2/(9*df))
  if (df >= 30 || x2 > df * 5) {
    const ratio = x2 / df;
    const term1 = Math.pow(ratio, 1/3);
    const term2 = 1 - 2 / (9 * df);
    const term3 = Math.sqrt(2 / (9 * df));
    const z = (term1 - term2) / term3;
    // Standard normal CDF approximation
    return 1 - normalCDF(z);
  }
  
  // For smaller values, use regularized incomplete gamma function
  const a = df / 2;
  const z = x2 / 2;
  return regularizedGammaQ(a, z);
}

// Standard normal CDF using error function approximation
function normalCDF(x: number): number {
  // Abramowitz and Stegun approximation 7.1.26
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1 / (1 + p * absX);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  
  return 0.5 * (1 + sign * y);
}

// Regularized upper incomplete gamma function Q(a, z) = 1 - P(a, z)
function regularizedGammaQ(a: number, z: number): number {
  if (z < 0) return 1;
  if (z === 0) return 1;
  
  // Use series for small z, continued fraction for large z
  if (z < a + 1) {
    return 1 - seriesGammaP(a, z);
  }
  return continuedFractionGammaQ(a, z);
}

function seriesGammaP(a: number, z: number): number {
  // Series expansion for lower incomplete gamma P(a, z)
  let sum = 1 / a;
  let term = 1 / a;
  for (let n = 1; n < 200; n++) {
    term *= z / (a + n);
    sum += term;
    if (Math.abs(term) < 1e-14 * Math.abs(sum)) break;
  }
  return sum * Math.exp(-z + a * Math.log(z) - lnGamma(a));
}

function continuedFractionGammaQ(a: number, z: number): number {
  // Continued fraction for upper incomplete gamma Q(a, z)
  // Using modified Lentz's method
  const TINY = 1e-30;
  const EPS = 1e-14;
  
  let f = TINY;
  let c = TINY;
  let d = 0;
  
  // Initial term: b0 = z + 1 - a
  const b0 = z + 1 - a;
  if (Math.abs(b0) < TINY) {
    d = 1 / TINY;
  } else {
    d = 1 / b0;
  }
  let h = d;
  
  for (let i = 1; i <= 200; i++) {
    const an = -i * (i - a);
    const bn = z + 2 * i + 1 - a;
    
    d = bn + an * d;
    if (Math.abs(d) < TINY) d = TINY;
    else d = 1 / d;
    
    c = bn + an / c;
    if (Math.abs(c) < TINY) c = TINY;
    
    const delta = c * d;
    h *= delta;
    
    if (Math.abs(delta - 1) < EPS) break;
  }
  
  return Math.exp(-z + a * Math.log(z) - lnGamma(a)) * h;
}

function lnGamma(x: number): number {
  // Lanczos approximation for log-gamma function
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    y += 1;
    ser += cof[j] / y;
  }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

export function benfordAnalysis(numbers: number[]): BenfordResult {
  const firstDigits = numbers
    .map((n) => {
      const abs = Math.abs(n);
      if (abs === 0) return null;
      const s = abs.toExponential();
      const d = parseInt(s.charAt(0), 10);
      return d >= 1 && d <= 9 ? d : null;
    })
    .filter((d): d is number => d !== null);

  const counts = new Array(10).fill(0);
  for (const d of firstDigits) counts[d]++;
  const total = firstDigits.length;

  const spectrum: BenfordResult['spectrum'] = [];
  let chi2 = 0;
  for (let digit = 1; digit <= 9; digit++) {
    const expected = benfordExpected(digit);
    const actual = total > 0 ? (counts[digit] / total) * 100 : 0;
    spectrum.push({ digit, theoreticalPercent: Math.round(expected * 100) / 100, actualPercent: Math.round(actual * 100) / 100 });
    if (total > 0) {
      const obs = counts[digit];
      const exp = (expected / 100) * total;
      chi2 += ((obs - exp) ** 2) / exp;
    }
  }

  const df = 8;
  const pValue = total > 0 ? chiSquarePValueFromStatistic(chi2, df) : 0;

  let shannonEntropy = 0;
  for (let digit = 1; digit <= 9; digit++) {
    const p = total > 0 ? counts[digit] / total : 0;
    if (p > 0) shannonEntropy -= p * Math.log2(p);
  }
  const maxEntropy = Math.log2(9);

  let verdict: BenfordResult['verdict'];
  let verdictLabel: string;
  if (total === 0) {
    verdict = 'deviates';
    verdictLabel = '无可用数据执行本福特分析';
  } else if (pValue > 0.05) {
    verdict = 'conforms';
    verdictLabel = `符合本福特自然分布 (χ²=${chi2.toFixed(2)}, p=${pValue.toFixed(3)})`;
  } else if (pValue > 0.01) {
    verdict = 'marginal';
    verdictLabel = `边际偏离 (χ²=${chi2.toFixed(2)}, p=${pValue.toFixed(3)})，需进一步核查`;
  } else {
    verdict = 'deviates';
    verdictLabel = `显著偏离本福特分布 (χ²=${chi2.toFixed(2)}, p=${pValue.toFixed(4)})，存在人工凑整或虚构嫌疑`;
  }

  return {
    spectrum,
    chiSquareStatistic: Math.round(chi2 * 100) / 100,
    chiSquarePValue: Math.round(pValue * 1000) / 1000,
    shannonEntropyBits: Math.round(shannonEntropy * 100) / 100,
    maxEntropyBits: Math.round(maxEntropy * 100) / 100,
    verdict,
    verdictLabel,
  };
}

// ---------------------------------------------------------------------------
// Beneish M-Score (贝尼希 M-Score 操纵检测)
// ---------------------------------------------------------------------------

export interface BeneishInput {
  receivables_t: number;
  receivables_t1: number;
  revenue_t: number;
  revenue_t1: number;
  cogs_t: number;
  cogs_t1: number;
  inventory_t: number;
  inventory_t1: number;
  fixedAssets_t: number;
  fixedAssets_t1: number;
  depreciation_t: number;
  depreciation_t1: number;
  totalAssets_t: number;
  totalAssets_t1: number;
  sga_t: number;
  sga_t1: number;
  totalDebt_t: number;
  totalDebt_t1: number;
  netIncome_t: number;
  operatingCashFlow_t: number;
}

export interface BeneishResult {
  overallScore: number;
  manipulationRisk: 'safe' | 'grey' | 'manipulation';
  manipulationRiskLabel: string;
  variables: {
    code: string;
    name: string;
    value: number;
    benchmark: number;
    status: 'normal' | 'caution' | 'alert';
  }[];
  verdictLabel: string;
}

export function beneishMScore(input: BeneishInput): BeneishResult | null {
  const {
    receivables_t, receivables_t1, revenue_t, revenue_t1,
    cogs_t, cogs_t1, inventory_t, inventory_t1,
    fixedAssets_t, fixedAssets_t1, depreciation_t, depreciation_t1,
    totalAssets_t, totalAssets_t1, sga_t, sga_t1,
    totalDebt_t, totalDebt_t1, netIncome_t, operatingCashFlow_t,
  } = input;

  if (revenue_t === 0 || revenue_t1 === 0 || totalAssets_t === 0 || totalAssets_t1 === 0) {
    return null;
  }
  if (netIncome_t === 0) return null;

  const DSRI = (receivables_t / revenue_t) / (receivables_t1 / revenue_t1);
  const GMI = ((revenue_t - cogs_t) / revenue_t) / ((revenue_t1 - cogs_t1) / revenue_t1);
  const AQI =
    (1 - (fixedAssets_t + inventory_t) / totalAssets_t) /
    (1 - (fixedAssets_t1 + inventory_t1) / totalAssets_t1);
  const SGI = revenue_t / revenue_t1;
  const DEPI =
    (depreciation_t1 / (fixedAssets_t1 + depreciation_t1)) /
    (depreciation_t / (fixedAssets_t + depreciation_t));
  const SGAI = (sga_t / revenue_t) / (sga_t1 / revenue_t1);
  const LVGI = (totalDebt_t / totalAssets_t) / (totalDebt_t1 / totalAssets_t1);
  const TATA = (netIncome_t - operatingCashFlow_t) / totalAssets_t;

  const MSCORE =
    -4.84 +
    0.92 * DSRI +
    0.528 * GMI +
    0.404 * AQI +
    0.892 * SGI +
    0.115 * DEPI -
    0.172 * SGAI +
    4.679 * TATA -
    0.327 * LVGI;

  const variables = [
    { code: 'DSRI', name: '应收收入指数', value: Math.round(DSRI * 100) / 100, benchmark: 1.0, status: DSRI > 1.2 ? 'alert' as const : DSRI > 1.05 ? 'caution' as const : 'normal' as const },
    { code: 'GMI', name: '毛利率指数', value: Math.round(GMI * 100) / 100, benchmark: 1.0, status: GMI > 1.1 ? 'alert' as const : GMI > 1.02 ? 'caution' as const : 'normal' as const },
    { code: 'AQI', name: '资产质量指数', value: Math.round(AQI * 100) / 100, benchmark: 1.0, status: AQI > 1.1 ? 'alert' as const : AQI > 1.02 ? 'caution' as const : 'normal' as const },
    { code: 'SGI', name: '销售增长指数', value: Math.round(SGI * 100) / 100, benchmark: 1.0, status: SGI > 1.5 ? 'caution' as const : 'normal' as const },
    { code: 'DEPI', name: '折旧率指数', value: Math.round(DEPI * 100) / 100, benchmark: 1.0, status: DEPI > 1.2 ? 'caution' as const : 'normal' as const },
    { code: 'SGAI', name: '销管费用指数', value: Math.round(SGAI * 100) / 100, benchmark: 1.0, status: SGAI > 1.15 ? 'caution' as const : 'normal' as const },
    { code: 'LVGI', name: '杠杆指数', value: Math.round(LVGI * 100) / 100, benchmark: 1.0, status: LVGI > 1.15 ? 'caution' as const : 'normal' as const },
    { code: 'TATA', name: '应计利润资产比', value: Math.round(TATA * 1000) / 1000, benchmark: 0.0, status: TATA > 0.05 ? 'alert' as const : TATA > 0.02 ? 'caution' as const : 'normal' as const },
  ];

  let manipulationRisk: BeneishResult['manipulationRisk'];
  let manipulationRiskLabel: string;
  if (MSCORE < -1.78) {
    manipulationRisk = 'safe';
    manipulationRiskLabel = '安全区间（极低操纵风险）';
  } else if (MSCORE < -1.49) {
    manipulationRisk = 'grey';
    manipulationRiskLabel = '灰色警戒区间';
  } else {
    manipulationRisk = 'manipulation';
    manipulationRiskLabel = '高概率操纵（M-Score 超过 -1.49 警戒线）';
  }

  return {
    overallScore: Math.round(MSCORE * 100) / 100,
    manipulationRisk,
    manipulationRiskLabel,
    variables,
    verdictLabel: `Beneish M-Score = ${MSCORE.toFixed(2)}，${manipulationRiskLabel}`,
  };
}

// ---------------------------------------------------------------------------
// Altman Z-Score (奥特曼 Z-Score 破产预测)
// ---------------------------------------------------------------------------

export interface AltmanInput {
  workingCapital: number;
  totalAssets: number;
  retainedEarnings: number;
  ebit: number;
  marketValueEquity: number;
  totalLiabilities: number;
  revenue: number;
}

export interface AltmanResult {
  overallScore: number;
  zone: 'safe' | 'grey' | 'distress';
  zoneLabel: string;
  variables: {
    code: string;
    name: string;
    value: number;
    weight: number;
    contribution: number;
  }[];
  verdictLabel: string;
}

export function altmanZScore(input: AltmanInput): AltmanResult | null {
  const { workingCapital, totalAssets, retainedEarnings, ebit, marketValueEquity, totalLiabilities, revenue } = input;
  if (totalAssets === 0) return null;

  const X1 = workingCapital / totalAssets;
  const X2 = retainedEarnings / totalAssets;
  const X3 = ebit / totalAssets;
  const X4 = totalLiabilities !== 0 ? marketValueEquity / totalLiabilities : 0;
  const X5 = revenue / totalAssets;

  const Z = 1.2 * X1 + 1.4 * X2 + 3.3 * X3 + 0.6 * X4 + 0.999 * X5;

  const variables = [
    { code: 'X1', name: '营运资本/总资产', value: Math.round(X1 * 1000) / 1000, weight: 1.2, contribution: Math.round(1.2 * X1 * 100) / 100 },
    { code: 'X2', name: '留存收益/总资产', value: Math.round(X2 * 1000) / 1000, weight: 1.4, contribution: Math.round(1.4 * X2 * 100) / 100 },
    { code: 'X3', name: 'EBIT/总资产', value: Math.round(X3 * 1000) / 1000, weight: 3.3, contribution: Math.round(3.3 * X3 * 100) / 100 },
    { code: 'X4', name: '权益市值/总负债', value: Math.round(X4 * 100) / 100, weight: 0.6, contribution: Math.round(0.6 * X4 * 100) / 100 },
    { code: 'X5', name: '销售收入/总资产', value: Math.round(X5 * 1000) / 1000, weight: 0.999, contribution: Math.round(0.999 * X5 * 100) / 100 },
  ];

  let zone: AltmanResult['zone'];
  let zoneLabel: string;
  if (Z > 2.99) {
    zone = 'safe';
    zoneLabel = '安全区 (Safe Zone, Z > 2.99)';
  } else if (Z > 1.81) {
    zone = 'grey';
    zoneLabel = '灰色区 (Grey Zone, 1.81 < Z ≤ 2.99)';
  } else {
    zone = 'distress';
    zoneLabel = '财务困境预警 (Distress Zone, Z ≤ 1.81)';
  }

  return {
    overallScore: Math.round(Z * 100) / 100,
    zone,
    zoneLabel,
    variables,
    verdictLabel: `Altman Z-Score = ${Z.toFixed(2)}，${zoneLabel}`,
  };
}

// ---------------------------------------------------------------------------
// Sloan Accrual Ratio (斯隆应计比率)
// ---------------------------------------------------------------------------

export interface SloanInput {
  netIncome: number;
  operatingCashFlow: number;
  totalAssets_t: number;
  totalAssets_t1: number;
}

export interface SloanResult {
  accrualRatio: number;
  cfoToNetIncomeRatio: number;
  earningsQuality: 'high' | 'normal' | 'deteriorating';
  earningsQualityLabel: string;
  verdictLabel: string;
}

export function sloanAccrualRatio(input: SloanInput): SloanResult | null {
  const { netIncome, operatingCashFlow, totalAssets_t, totalAssets_t1 } = input;
  const avgAssets = (totalAssets_t + totalAssets_t1) / 2;
  if (avgAssets === 0) return null;

  const accrualRatio = (netIncome - operatingCashFlow) / avgAssets;
  const cfoToNetIncome = netIncome !== 0 ? operatingCashFlow / netIncome : 0;

  let earningsQuality: SloanResult['earningsQuality'];
  let earningsQualityLabel: string;
  if (cfoToNetIncome >= 1.5) {
    earningsQuality = 'high';
    earningsQualityLabel = '极高（现金流充分支撑净利）';
  } else if (cfoToNetIncome >= 0.8) {
    earningsQuality = 'normal';
    earningsQualityLabel = '正常';
  } else {
    earningsQuality = 'deteriorating';
    earningsQualityLabel = '应计质量恶化（现金流不足以覆盖账面利润）';
  }

  return {
    accrualRatio: Math.round(accrualRatio * 1000) / 1000,
    cfoToNetIncomeRatio: Math.round(cfoToNetIncome * 100) / 100,
    earningsQuality,
    earningsQualityLabel,
    verdictLabel: `应计比率 = ${accrualRatio.toFixed(3)}，CFO/净利润 = ${cfoToNetIncome.toFixed(2)}x，${earningsQualityLabel}`,
  };
}

// ---------------------------------------------------------------------------
// Graph Centrality (图中心性：度中心性 + 介数中心性)
// ---------------------------------------------------------------------------

export interface GraphCentralityInput {
  nodes: string[];
  edges: { from: string; to: string; weight?: number }[];
}

export interface GraphCentralityResult {
  degreeCentrality: Record<string, number>;
  betweennessCentrality: Record<string, number>;
  topNodes: { node: string; degree: number; betweenness: number }[];
  verdictLabel: string;
}

export function graphCentrality(input: GraphCentralityInput): GraphCentralityResult {
  const { nodes, edges } = input;
  const n = nodes.length;

  const degree: Record<string, number> = {};
  for (const node of nodes) degree[node] = 0;
  for (const edge of edges) {
    degree[edge.from] = (degree[edge.from] || 0) + 1;
    degree[edge.to] = (degree[edge.to] || 0) + 1;
  }

  const degreeCentrality: Record<string, number> = {};
  for (const node of nodes) {
    degreeCentrality[node] = n > 1 ? degree[node] / (n - 1) : 0;
  }

  const adj: Record<string, string[]> = {};
  for (const node of nodes) adj[node] = [];
  for (const edge of edges) {
    adj[edge.from]?.push(edge.to);
    adj[edge.to]?.push(edge.from);
  }

  const betweenness: Record<string, number> = {};
  for (const node of nodes) betweenness[node] = 0;

  for (const s of nodes) {
    const stack: string[] = [];
    const pred: Record<string, string[]> = {};
    for (const node of nodes) pred[node] = [];
    const sigma: Record<string, number> = {};
    for (const node of nodes) sigma[node] = 0;
    sigma[s] = 1;
    const dist: Record<string, number> = {};
    for (const node of nodes) dist[node] = -1;
    dist[s] = 0;

    const queue: string[] = [s];
    while (queue.length > 0) {
      const v = queue.shift()!;
      stack.push(v);
      for (const w of adj[v] || []) {
        if (dist[w] < 0) {
          queue.push(w);
          dist[w] = dist[v] + 1;
        }
        if (dist[w] === dist[v] + 1) {
          sigma[w] += sigma[v];
          pred[w].push(v);
        }
      }
    }

    const delta: Record<string, number> = {};
    for (const node of nodes) delta[node] = 0;
    while (stack.length > 0) {
      const w = stack.pop()!;
      for (const v of pred[w]) {
        delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
      }
      if (w !== s) betweenness[w] += delta[w];
    }
  }

  for (const node of nodes) {
    betweenness[node] = n > 2 ? betweenness[node] / ((n - 1) * (n - 2)) : 0;
    betweenness[node] = Math.round(betweenness[node] * 1000) / 1000;
  }

  const topNodes = nodes
    .map((node) => ({
      node,
      degree: degree[node] || 0,
      betweenness: betweenness[node] || 0,
    }))
    .sort((a, b) => b.betweenness - a.betweenness)
    .slice(0, 10);

  const hubNode = topNodes[0]?.node || 'N/A';
  const verdictLabel = `网络枢纽节点: ${hubNode}（介数中心性 = ${topNodes[0]?.betweenness || 0}）`;

  return { degreeCentrality, betweennessCentrality: betweenness, topNodes, verdictLabel };
}
