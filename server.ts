import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { generateStructuredJSON, generateText, getAvailableProviders, getActiveProvider, Type } from './server-ai';
import {
  mountAdminRoutes,
  quotaLimiter,
  recordAiSuccess,
  recordAiError,
  extractUser,
} from './server-admin';
import {
  countFreeReportOrdersToday,
  createReportOrder,
  getConfig,
  getReportOrder,
  listReportOrders,
  markReportDelivered,
  markReportOrderPaid,
  recordEmailDelivery,
  saveReportContent,
  updateReportOrderStatus,
  getCompanyCache,
  setCompanyCache,
  purgeExpiredCompanyCache,
  logUsage,
  getLatestExtractedData,
  ensureAdminUser,
} from './db';
import { sendReportEmail } from './server-email';
import { buildAutomotiveReport } from './server-report';
import { mountAuthRoutes, getSessionUser } from './server-auth';
import { isAdminRequest } from './server-admin';

dotenv.config();

// 启动时确保管理员账号存在（从 env ADMIN_EMAIL / ADMIN_PASSWORD 创建）
try {
  ensureAdminUser();
} catch (e) {
  console.warn('[admin] ensureAdminUser failed:', e);
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// 服务端真实鉴权路由（注册 / 登录 / 退出 / 会话恢复）
mountAuthRoutes(app);

// 挂载后台管理路由（鉴权由各路由内部 requireAdmin 中间件保障）
mountAdminRoutes(app);

// ---------------------------------------------------------------------------
// AI 结果缓存
// 缓存键包含 schema 版本：prompt/结构升级时提升版本号即可整体失效旧缓存。
// 命中缓存不消耗每日免费配额（不产生新的 AI 调用成本）。
// ---------------------------------------------------------------------------

const ANALYZE_CACHE_VERSION = 'v2';
const ANALYZE_CACHE_TTL_MS = 7 * 24 * 3600 * 1000; // 7 天

function analyzeCacheKey(companyName: string): string {
  return `${ANALYZE_CACHE_VERSION}:${getActiveProvider()}:${companyName.trim().toLowerCase()}`;
}

// 定期清理过期缓存条目
setInterval(() => {
  try {
    purgeExpiredCompanyCache();
  } catch (e) {
    console.warn('[cache] purge failed:', e);
  }
}, 6 * 3600 * 1000).unref();

// ---------------------------------------------------------------------------
// Safe JSON parsing & data validation helpers for AI-generated output
// AI models occasionally wrap JSON in markdown code blocks or add
// surrounding prose. This helper extracts and parses robustly.
// ---------------------------------------------------------------------------

/**
 * Safely parse JSON from AI model output.
 * Handles markdown code fences (```json ... ```) and surrounding text.
 */
function safeJsonParse(raw: string): any {
  if (!raw) throw new Error('Empty AI response');

  let text = raw.trim();

  // Strip markdown code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    text = fenceMatch[1].trim();
  }

  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Fallback: extract the first balanced JSON object/array from the text
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const candidate = text.slice(start, end + 1);
      return JSON.parse(candidate);
    }
    throw new Error('Unable to parse AI response as valid JSON');
  }
}

/**
 * Validate and sanitize AI-generated company panorama data.
 * Ensures all required top-level fields exist with correct types,
 * providing safe defaults where the AI omitted them.
 */
function validateAndSanitizeCompanyData(data: any, companyName: string): any {
  if (!data || typeof data !== 'object') {
    throw new Error('AI response is not a valid object');
  }

  const sanitized: any = { ...data };

  // Ensure basicInfo exists with required fields
  sanitized.basicInfo = sanitized.basicInfo || {};
  sanitized.basicInfo.name = sanitized.basicInfo.name || companyName;
  sanitized.basicInfo.headquarters = sanitized.basicInfo.headquarters || '未披露';
  sanitized.basicInfo.industry = sanitized.basicInfo.industry || '未分类';
  sanitized.basicInfo.subIndustry = sanitized.basicInfo.subIndustry || '未分类';
  sanitized.basicInfo.businessSummary =
    sanitized.basicInfo.businessSummary || `${companyName} 业务概况待补充。`;
  sanitized.basicInfo.strategicMoat =
    sanitized.basicInfo.strategicMoat || '护城河分析待补充。';
  sanitized.basicInfo.moatScore =
    typeof sanitized.basicInfo.moatScore === 'number'
      ? Math.min(5, Math.max(1, sanitized.basicInfo.moatScore))
      : 3;
  sanitized.basicInfo.tags = Array.isArray(sanitized.basicInfo.tags)
    ? sanitized.basicInfo.tags
    : [companyName];

  // Ensure arrays exist
  sanitized.upstream = Array.isArray(sanitized.upstream) ? sanitized.upstream : [];
  sanitized.downstream = Array.isArray(sanitized.downstream) ? sanitized.downstream : [];
  sanitized.investments = Array.isArray(sanitized.investments) ? sanitized.investments : [];
  sanitized.jointVentures = Array.isArray(sanitized.jointVentures) ? sanitized.jointVentures : [];
  sanitized.competitors = Array.isArray(sanitized.competitors) ? sanitized.competitors : [];
  sanitized.risks = Array.isArray(sanitized.risks) ? sanitized.risks : [];

  // Ensure string fields
  sanitized.executiveSummary =
    typeof sanitized.executiveSummary === 'string'
      ? sanitized.executiveSummary
      : `${companyName} 执行摘要待补充。`;

  sanitized.valueChainSummary = sanitized.valueChainSummary || {
    rawMaterialsInput: [],
    coreManufacturingProcess: [],
    finalProductsServices: [],
    endMarkets: [],
  };

  return sanitized;
}

/**
 * 校验 AI 返回的 financialBreakdown 结构是否可用。
 * 形状不合法时宁可丢弃该模块（前端有空态展示），不用编造数据填充。
 */
function isValidFinancialBreakdown(fb: any): boolean {
  return (
    !!fb &&
    typeof fb === 'object' &&
    Array.isArray(fb.segments) &&
    fb.segments.length > 0 &&
    fb.segments.every(
      (s: any) => typeof s?.name === 'string' && typeof s?.value === 'number' && !isNaN(s.value)
    ) &&
    Array.isArray(fb.regions) &&
    fb.regions.every((r: any) => typeof r?.name === 'string' && typeof r?.value === 'number')
  );
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// AI Provider info endpoint - returns active provider & which are configured
app.get('/api/ai-providers', (_req: Request, res: Response) => {
  res.json({
    active: getActiveProvider(),
    providers: getAvailableProviders(),
  });
});

// Company Panorama Analysis Endpoint
app.post('/api/analyze-company', quotaLimiter, async (req: Request, res: Response) => {
  const __start = Date.now();
  try {
    const { companyName } = req.body;

    if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    const cleanName = companyName.trim();

    // 1) 命中缓存直接返回：不消耗每日免费配额、不产生 AI 调用成本
    const cacheKey = analyzeCacheKey(cleanName);
    const cached = getCompanyCache(cacheKey);
    if (cached) {
      try {
        const { userId, userEmail, ip } = extractUser(req);
        logUsage({
          user_id: userId,
          user_email: userEmail,
          ip,
          endpoint: 'analyze-company',
          company_name: cleanName,
          provider: `${getActiveProvider()}(cache)`,
          status: 'success',
          duration_ms: Date.now() - __start,
        });
      } catch (e) {
        console.warn('[cache] logUsage failed:', e);
      }
      return res.json({ ...cached.data, cached: true });
    }

    const prompt = `你是一名资深的全球产业经济学家、顶级股权投资分析师与供应链图谱专家。
请针对用户指定的公司：“${cleanName}”，进行深度的企业全景情报剖析与产业链/投资图谱梳理。

要求提供详实、客观、前沿且具体的全景数据，包括：
1. 公司基本面 (全称、股票代码/上市情况、总部、成立年份、核心高管、主营赛道、营收规模估算、市值/估值、目前经营状况态势、核心产品市占率及行业地位、未来3-5年战略与技术趋势、商业模式与护城河)。
2. 上游产业链供应商 (核心原材料、关键零部件、装备工具、基础软件/算力等。提供供货内容、合作建立时间、目前供货/研发协同现状、该环节替代对手、未来技术趋势演进、依赖程度High/Medium/Low、国内/海外、战略影响)。列出 4-7 家关键上游实体。
3. 下游客户及分销网络 (B2B企业客户群、B2C大众消费分层、分销渠道、系统集成商等。提供采购产品、收入贡献估算、合作起始时间、目前合作与订单现状、客户其他备选竞品、未来需求演进方向、客户粘性)。列出 3-6 家/类关键下游实体。
4. 对外投资与子公司 (全资子公司、控股子公司、CVC战略风投、少数股权参股等，持股比例、所属领域、目前协同成效、未来规划)。列出 4-7 家投资/子公司。
5. 合资合作企业与战略联盟 (Joint Ventures、共同研发实验室等，合资方、持股结构、合作范围与重点项目、目前运营现状与未来重点)。列出 2-4 个合资合作实体。
6. 行业竞争格局 (直接对手、跨界颠覆者，市场份额估计、目前竞争动作态势、未来战略破局点、各自优势劣势对比)。列出 3-4 个主要竞品对手。
7. 供应链与经营风险全景图 (卡脖子环节、地缘关税/出口管制风险、集中度风险、颠覆性技术替代风险与应对举措)。列出 2-4 项关键风险。
8. 极具洞察力的执行摘要 (Executive Summary) 与 产业链价值流动流向总结 (原材料 ➔ 核心制造/研发环节 ➔ 最终产品/服务 ➔ 终端市场)。
9. 财务结构拆解 (financialBreakdown)：按业务板块的营收构成百分比（segments，3-4 项，name+value+unit"%"）、按区域市场营收构成（regions，3-4 项）、研发费用率区间（如 "6% - 9%"）、综合毛利率区间（如 "18% - 24%"）。基于公开披露或行业通行估算口径。
10. 商业反常点洞察 (anomalies)：识别 2-3 处与行业常规/同行均值相悖的经营反常点，每处包含 tag（如"毛利异动"）、title、contradiction（expectation 预期 vs reality 现实）、severity（high/medium/low）、investigationClue 溯源核验切入点、deepAnalysis 商业实质剖析。
11. 利益链路闭环 (interestFlow)：构建“circuitName 闭环名称、description 闭环说明、nodes 4-5 个利益节点（id/name/role/type：upstream/core/downstream/capital/offshore）、steps 4-6 步资金或货物流转（from/to 节点id、flowType：goods/capital/dividend/equity、label、description、isClosedLoop 是否闭环回流）、closedLoopSummary 闭环总结”。刻画该公司从上游采购、核心经营到下游回款/跨境结算的资金业务闭环。
12. 灰度证据评估 (grayScaleEvaluation)：给出 confidenceScore（0-100 整数置信度）、confidenceRating（枚举："高置信 (A)"/"良好 (B)"/"中度存疑 (C)"/"高风险 (D)"）、verdict 总体判定；supportingEvidence 2-3 条支持性证据（point/source 来源渠道/weight 权重"强|中|弱"）；opposingEvidence 1-2 条相悖或存疑证据；uncertainVariables 1-2 个待观察变量（point/watchTrigger 触发监测信号）。评估口径须与你实际掌握的信息充分性匹配：信息不足时应如实降低置信度并说明缺口，不得虚标。

请以严谨准确的结构化 JSON 格式返回。所有无法核实的数据请标注估算口径；禁止编造具体未披露数字。`;

    const responseSchema = {
          type: Type.OBJECT,
          properties: {
            basicInfo: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                englishName: { type: Type.STRING },
                ticker: { type: Type.STRING },
                exchange: { type: Type.STRING },
                foundingYear: { type: Type.STRING },
                establishedYear: { type: Type.STRING },
                headquarters: { type: Type.STRING },
                keyLeaders: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                industry: { type: Type.STRING },
                subIndustry: { type: Type.STRING },
                marketCapOrValuation: { type: Type.STRING },
                annualRevenue: { type: Type.STRING },
                employeeCount: { type: Type.STRING },
                website: { type: Type.STRING },
                businessSummary: { type: Type.STRING },
                strategicMoat: { type: Type.STRING },
                moatScore: { type: Type.NUMBER },
                developmentStage: { type: Type.STRING },
                currentStatus: { type: Type.STRING },
                marketShare: { type: Type.STRING },
                futureTrend: { type: Type.STRING },
                keyCompetitorSummary: { type: Type.STRING },
                tags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: [
                'name',
                'headquarters',
                'industry',
                'subIndustry',
                'businessSummary',
                'strategicMoat',
                'moatScore',
                'tags',
              ],
            },
            upstream: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  category: {
                    type: Type.STRING,
                    enum: [
                      'raw_material',
                      'core_component',
                      'equipment_tools',
                      'software_cloud',
                      'oem_packaging',
                      'other',
                    ],
                  },
                  categoryLabel: { type: Type.STRING },
                  supplies: { type: Type.STRING },
                  dependenceLevel: {
                    type: Type.STRING,
                    enum: ['High', 'Medium', 'Low'],
                  },
                  originCountry: { type: Type.STRING },
                  isDomestic: { type: Type.BOOLEAN },
                  strategicImpact: { type: Type.STRING },
                  cooperationStartYear: { type: Type.STRING },
                  currentStatus: { type: Type.STRING },
                  competitors: { type: Type.STRING },
                  futureTrend: { type: Type.STRING },
                  supplyVolumeRatio: { type: Type.STRING },
                  ticker: { type: Type.STRING },
                },
                required: [
                  'name',
                  'category',
                  'categoryLabel',
                  'supplies',
                  'dependenceLevel',
                  'originCountry',
                  'isDomestic',
                  'strategicImpact',
                ],
              },
            },
            downstream: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  segmentType: {
                    type: Type.STRING,
                    enum: [
                      'enterprise_b2b',
                      'consumer_b2c',
                      'distributor_channel',
                      'government_public',
                      'integrator',
                    ],
                  },
                  segmentLabel: { type: Type.STRING },
                  productOrServicePurchased: { type: Type.STRING },
                  revenueContributionEst: { type: Type.STRING },
                  customerStickiness: {
                    type: Type.STRING,
                    enum: ['High', 'Medium', 'Low'],
                  },
                  relationshipSummary: { type: Type.STRING },
                  targetRegion: { type: Type.STRING },
                  cooperationStartYear: { type: Type.STRING },
                  currentStatus: { type: Type.STRING },
                  competitorAlternatives: { type: Type.STRING },
                  futureTrend: { type: Type.STRING },
                },
                required: [
                  'name',
                  'segmentType',
                  'segmentLabel',
                  'productOrServicePurchased',
                  'customerStickiness',
                  'relationshipSummary',
                  'targetRegion',
                ],
              },
            },
            investments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  type: {
                    type: Type.STRING,
                    enum: [
                      'wholly_owned',
                      'majority_owned',
                      'minority_cvc',
                      'incubated',
                    ],
                  },
                  typeLabel: { type: Type.STRING },
                  shareholdingRatio: { type: Type.STRING },
                  industryDomain: { type: Type.STRING },
                  strategicGoal: { type: Type.STRING },
                  roundOrStage: { type: Type.STRING },
                  investmentYear: { type: Type.STRING },
                  currentStatus: { type: Type.STRING },
                  futureTrend: { type: Type.STRING },
                },
                required: [
                  'name',
                  'type',
                  'typeLabel',
                  'industryDomain',
                  'strategicGoal',
                ],
              },
            },
            jointVentures: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  partnerNames: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  shareholdingSummary: { type: Type.STRING },
                  cooperationScope: { type: Type.STRING },
                  establishedYear: { type: Type.STRING },
                  keyProductsOrProjects: { type: Type.STRING },
                  strategicValue: { type: Type.STRING },
                  currentStatus: { type: Type.STRING },
                  futureTrend: { type: Type.STRING },
                },
                required: [
                  'name',
                  'partnerNames',
                  'cooperationScope',
                  'keyProductsOrProjects',
                  'strategicValue',
                ],
              },
            },
            competitors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  region: { type: Type.STRING },
                  competingSegments: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  rivalryStrength: {
                    type: Type.STRING,
                    enum: [
                      'Direct Rival',
                      'Secondary Competitor',
                      'Potential Disruptor',
                    ],
                  },
                  strengthsVsTarget: { type: Type.STRING },
                  weaknessesVsTarget: { type: Type.STRING },
                  marketShare: { type: Type.STRING },
                  currentStatus: { type: Type.STRING },
                  futureTrend: { type: Type.STRING },
                },
                required: [
                  'name',
                  'region',
                  'competingSegments',
                  'rivalryStrength',
                  'strengthsVsTarget',
                  'weaknessesVsTarget',
                ],
              },
            },
            risks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    enum: [
                      'bottleneck',
                      'geopolitical',
                      'concentration',
                      'regulatory',
                      'technology_shift',
                    ],
                  },
                  title: { type: Type.STRING },
                  severity: {
                    type: Type.STRING,
                    enum: ['High', 'Medium', 'Low'],
                  },
                  description: { type: Type.STRING },
                  mitigationMeasure: { type: Type.STRING },
                },
                required: [
                  'type',
                  'title',
                  'severity',
                  'description',
                  'mitigationMeasure',
                ],
              },
            },
            executiveSummary: { type: Type.STRING },
            valueChainSummary: {
              type: Type.OBJECT,
              properties: {
                rawMaterialsInput: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                coreManufacturingProcess: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                finalProductsServices: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                endMarkets: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: [
                'rawMaterialsInput',
                'coreManufacturingProcess',
                'finalProductsServices',
                'endMarkets',
              ],
            },
            financialBreakdown: {
              type: Type.OBJECT,
              properties: {
                segments: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      value: { type: Type.NUMBER },
                      unit: { type: Type.STRING },
                    },
                    required: ['name', 'value'],
                  },
                },
                regions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      value: { type: Type.NUMBER },
                    },
                    required: ['name', 'value'],
                  },
                },
                rdExpenseRatio: { type: Type.STRING },
                grossMargin: { type: Type.STRING },
              },
              required: ['segments', 'regions'],
            },
            anomalies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  tag: { type: Type.STRING },
                  title: { type: Type.STRING },
                  contradiction: {
                    type: Type.OBJECT,
                    properties: {
                      expectation: { type: Type.STRING },
                      reality: { type: Type.STRING },
                    },
                    required: ['expectation', 'reality'],
                  },
                  severity: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                  investigationClue: { type: Type.STRING },
                  deepAnalysis: { type: Type.STRING },
                },
                required: [
                  'tag',
                  'title',
                  'contradiction',
                  'severity',
                  'investigationClue',
                  'deepAnalysis',
                ],
              },
            },
            interestFlow: {
              type: Type.OBJECT,
              properties: {
                circuitName: { type: Type.STRING },
                description: { type: Type.STRING },
                nodes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      role: { type: Type.STRING },
                      type: {
                        type: Type.STRING,
                        enum: ['upstream', 'core', 'downstream', 'capital', 'offshore'],
                      },
                    },
                    required: ['id', 'name', 'role', 'type'],
                  },
                },
                steps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      from: { type: Type.STRING },
                      to: { type: Type.STRING },
                      flowType: {
                        type: Type.STRING,
                        enum: ['goods', 'capital', 'dividend', 'equity'],
                      },
                      label: { type: Type.STRING },
                      description: { type: Type.STRING },
                      isClosedLoop: { type: Type.BOOLEAN },
                    },
                    required: ['from', 'to', 'flowType', 'label', 'description'],
                  },
                },
                closedLoopSummary: { type: Type.STRING },
              },
              required: ['circuitName', 'description', 'nodes', 'steps', 'closedLoopSummary'],
            },
            grayScaleEvaluation: {
              type: Type.OBJECT,
              properties: {
                confidenceScore: { type: Type.NUMBER },
                confidenceRating: {
                  type: Type.STRING,
                  enum: ['高置信 (A)', '良好 (B)', '中度存疑 (C)', '高风险 (D)'],
                },
                verdict: { type: Type.STRING },
                supportingEvidence: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      point: { type: Type.STRING },
                      source: { type: Type.STRING },
                      weight: { type: Type.STRING, enum: ['强', '中', '弱'] },
                    },
                    required: ['point', 'source', 'weight'],
                  },
                },
                opposingEvidence: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      point: { type: Type.STRING },
                      source: { type: Type.STRING },
                      weight: { type: Type.STRING, enum: ['强', '中', '弱'] },
                    },
                    required: ['point', 'source', 'weight'],
                  },
                },
                uncertainVariables: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      point: { type: Type.STRING },
                      watchTrigger: { type: Type.STRING },
                    },
                    required: ['point', 'watchTrigger'],
                  },
                },
              },
              required: [
                'confidenceScore',
                'confidenceRating',
                'verdict',
                'supportingEvidence',
                'opposingEvidence',
                'uncertainVariables',
              ],
            },
          },
          required: [
            'basicInfo',
            'upstream',
            'downstream',
            'investments',
            'jointVentures',
            'competitors',
            'risks',
            'executiveSummary',
            'valueChainSummary',
          ],
    };

    const textOutput = await generateStructuredJSON(prompt, responseSchema, undefined);
    if (!textOutput) {
      throw new Error('No response text generated by AI model');
    }

    // Safely parse AI output (handles markdown fences & surrounding text)
    const parsedData = validateAndSanitizeCompanyData(safeJsonParse(textOutput), cleanName);

    // Assign IDs if missing
    parsedData.upstream = (parsedData.upstream || []).map((item: any, idx: number) => ({
      ...item,
      id: item.id || `up-${idx + 1}`,
    }));
    parsedData.downstream = (parsedData.downstream || []).map((item: any, idx: number) => ({
      ...item,
      id: item.id || `down-${idx + 1}`,
    }));
    parsedData.investments = (parsedData.investments || []).map((item: any, idx: number) => ({
      ...item,
      id: item.id || `inv-${idx + 1}`,
    }));
    parsedData.jointVentures = (parsedData.jointVentures || []).map((item: any, idx: number) => ({
      ...item,
      id: item.id || `jv-${idx + 1}`,
    }));
    parsedData.competitors = (parsedData.competitors || []).map((item: any, idx: number) => ({
      ...item,
      id: item.id || `comp-${idx + 1}`,
    }));

    // 高级模块结构校验：AI 未返回或形状不合法时直接省略对应字段。
    // 前端组件对缺失模块有完整的空态处理——宁可缺失，不用编造内容冒充真实数据。
    if (!isValidFinancialBreakdown(parsedData.financialBreakdown)) {
      delete parsedData.financialBreakdown;
    }
    if (Array.isArray(parsedData.anomalies)) {
      const validAnomalies = parsedData.anomalies.filter(
        (item: any) =>
          item &&
          typeof item === 'object' &&
          typeof item.title === 'string' &&
          item.contradiction &&
          typeof item.contradiction.expectation === 'string' &&
          typeof item.contradiction.reality === 'string' &&
          ['high', 'medium', 'low'].includes(item.severity)
      );
      if (validAnomalies.length > 0) {
        parsedData.anomalies = validAnomalies.map((item: any, idx: number) => ({
          ...item,
          id: item.id || `anom-${idx + 1}`,
        }));
      } else {
        delete parsedData.anomalies;
      }
    } else {
      delete parsedData.anomalies;
    }
    if (
      !parsedData.interestFlow ||
      !Array.isArray(parsedData.interestFlow.nodes) ||
      parsedData.interestFlow.nodes.length === 0 ||
      !Array.isArray(parsedData.interestFlow.steps) ||
      parsedData.interestFlow.steps.length === 0
    ) {
      delete parsedData.interestFlow;
    }
    if (
      !parsedData.grayScaleEvaluation ||
      typeof parsedData.grayScaleEvaluation.confidenceScore !== 'number' ||
      typeof parsedData.grayScaleEvaluation.verdict !== 'string'
    ) {
      delete parsedData.grayScaleEvaluation;
    }

    const responsePayload = {
      query: cleanName,
      timestamp: Date.now(),
      ...parsedData,
    };

    // 写入缓存：TTL 内的重复查询直接命中，不再产生 AI 调用成本
    try {
      setCompanyCache(cacheKey, cleanName, responsePayload, getActiveProvider(), ANALYZE_CACHE_TTL_MS);
    } catch (e) {
      console.warn('[cache] save failed:', e);
    }

    recordAiSuccess(req, { endpoint: 'analyze-company', companyName: cleanName, provider: getActiveProvider() }, Date.now() - __start);
    return res.json(responsePayload);
  } catch (error: any) {
    console.error('Error analyzing company:', error);
    recordAiError(req, { endpoint: 'analyze-company', companyName: req.body?.companyName, provider: getActiveProvider() }, error, Date.now() - __start);
    return res.status(500).json({
      error: error.message || 'Failed to analyze company panorama',
    });
  }
});

// Extracted Data Endpoint (真实采集+抽取数据，供前端法证计算使用)
app.get('/api/extracted-data/:companyName', (req: Request, res: Response) => {
  const { companyName } = req.params;
  if (!companyName) {
    return res.status(400).json({ error: 'companyName is required' });
  }
  try {
    const data = getLatestExtractedData(decodeURIComponent(companyName));
    return res.json({ companyName, data, hasData: Object.keys(data).length > 0 });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch extracted data' });
  }
});

// ---------------------------------------------------------------------------
// Sentinel-1 SAR 工厂实证端点 (特色三)
// 接入 Copernicus Data Space Ecosystem 真实遥感数据
// ---------------------------------------------------------------------------

import { getFactorySarTimeSeries, listKnownFactories, findFactoryForCompany } from './server-sar';

// 获取所有已知工厂列表
app.get('/api/sar/factories', (_req: Request, res: Response) => {
  try {
    const factories = listKnownFactories();
    return res.json({ factories });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to list factories' });
  }
});

// 根据公司名称获取对应工厂的 SAR 数据
app.get('/api/sar/company/:companyName', async (req: Request, res: Response) => {
  const { companyName } = req.params;
  if (!companyName) {
    return res.status(400).json({ error: 'companyName is required' });
  }

  try {
    const factoryKey = findFactoryForCompany(decodeURIComponent(companyName));
    if (!factoryKey) {
      return res.json({ hasData: false, message: '未找到该公司对应的已知工厂坐标' });
    }

    const monthsBack = parseInt(req.query.months as string) || 12;
    const sarData = await getFactorySarTimeSeries(factoryKey, monthsBack);

    if (!sarData) {
      return res.json({ hasData: false, message: '无法获取 SAR 数据' });
    }

    return res.json({ hasData: true, factoryKey, data: sarData });
  } catch (err: any) {
    console.error('[SAR] Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch SAR data' });
  }
});

// 直接通过工厂 Key 获取 SAR 数据
app.get('/api/sar/:factoryKey', async (req: Request, res: Response) => {
  const { factoryKey } = req.params;
  if (!factoryKey) {
    return res.status(400).json({ error: 'factoryKey is required' });
  }

  try {
    const monthsBack = parseInt(req.query.months as string) || 12;
    const sarData = await getFactorySarTimeSeries(decodeURIComponent(factoryKey), monthsBack);

    if (!sarData) {
      return res.status(404).json({ error: 'Factory not found' });
    }

    return res.json({ hasData: true, data: sarData });
  } catch (err: any) {
    console.error('[SAR] Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch SAR data' });
  }
});

// Company Comparison & Benchmarking Endpoint
app.post('/api/compare-companies', quotaLimiter, async (req: Request, res: Response) => {
  const __start = Date.now();
  try {
    const { companyA, companyB } = req.body;
    if (!companyA || !companyB) {
      return res.status(400).json({ error: 'Both companyA and companyB are required' });
    }

    const prompt = `你是一名全球顶级产业分析师与供应链战略对标专家。
请对以下两家对标公司进行全方位的产业链、供应链与商业模式横向对标分析：
公司 A: "${companyA}"
公司 B: "${companyB}"

要求生成严谨具体的对标分析数据，包括：
1. 公司A与公司B的基本面与核心护城河评级（1-5分）
2. 6个维度的雷达量化评分(0-100分)：
   - supplyChainSelfReliance (供应链自主度/自研率)
   - coreTechInHouseRate (核心技术/芯片/算法自研率)
   - globalMarketCoverage (全球化市场覆盖度)
   - verticalIntegrationDepth (垂直一体化深度)
   - cvcEcosystemSynergy (CVC资本生态协同力)
   - riskResilience (地缘与断供风险抗击力)
3. 双方各自的核心竞争优势与潜在脆弱点
4. 共有/重叠供应商 (Shared Suppliers) 以及各自差异化特色上游供应商
5. 下游客群与渠道策略对比 (B2B/B2C, 直销 vs 代理, 出海战略)
6. 资深分析师终审结论 (Strategic Verdict)

请以严格的 JSON 格式输出。`;

    const responseSchema = {
          type: Type.OBJECT,
          properties: {
            companyA: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                industry: { type: Type.STRING },
                marketCap: { type: Type.STRING },
                revenue: { type: Type.STRING },
                moatScore: { type: Type.NUMBER },
                strategicSummary: { type: Type.STRING },
                radarScores: {
                  type: Type.OBJECT,
                  properties: {
                    supplyChainSelfReliance: { type: Type.NUMBER },
                    coreTechInHouseRate: { type: Type.NUMBER },
                    globalMarketCoverage: { type: Type.NUMBER },
                    verticalIntegrationDepth: { type: Type.NUMBER },
                    cvcEcosystemSynergy: { type: Type.NUMBER },
                    riskResilience: { type: Type.NUMBER },
                  },
                  required: [
                    'supplyChainSelfReliance',
                    'coreTechInHouseRate',
                    'globalMarketCoverage',
                    'verticalIntegrationDepth',
                    'cvcEcosystemSynergy',
                    'riskResilience',
                  ],
                },
                keyAdvantages: { type: Type.ARRAY, items: { type: Type.STRING } },
                vulnerabilities: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['name', 'industry', 'marketCap', 'revenue', 'moatScore', 'strategicSummary', 'radarScores', 'keyAdvantages', 'vulnerabilities'],
            },
            companyB: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                industry: { type: Type.STRING },
                marketCap: { type: Type.STRING },
                revenue: { type: Type.STRING },
                moatScore: { type: Type.NUMBER },
                strategicSummary: { type: Type.STRING },
                radarScores: {
                  type: Type.OBJECT,
                  properties: {
                    supplyChainSelfReliance: { type: Type.NUMBER },
                    coreTechInHouseRate: { type: Type.NUMBER },
                    globalMarketCoverage: { type: Type.NUMBER },
                    verticalIntegrationDepth: { type: Type.NUMBER },
                    cvcEcosystemSynergy: { type: Type.NUMBER },
                    riskResilience: { type: Type.NUMBER },
                  },
                  required: [
                    'supplyChainSelfReliance',
                    'coreTechInHouseRate',
                    'globalMarketCoverage',
                    'verticalIntegrationDepth',
                    'cvcEcosystemSynergy',
                    'riskResilience',
                  ],
                },
                keyAdvantages: { type: Type.ARRAY, items: { type: Type.STRING } },
                vulnerabilities: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['name', 'industry', 'marketCap', 'revenue', 'moatScore', 'strategicSummary', 'radarScores', 'keyAdvantages', 'vulnerabilities'],
            },
            sharedSuppliers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  category: { type: Type.STRING },
                  roleInA: { type: Type.STRING },
                  roleInB: { type: Type.STRING },
                },
                required: ['name', 'category', 'roleInA', 'roleInB'],
              },
            },
            differentiatedUpstream: {
              type: Type.OBJECT,
              properties: {
                companyAName: { type: Type.STRING },
                companyASuppliers: { type: Type.ARRAY, items: { type: Type.STRING } },
                companyBName: { type: Type.STRING },
                companyBSuppliers: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['companyAName', 'companyASuppliers', 'companyBName', 'companyBSuppliers'],
            },
            downstreamChannelComparison: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dimension: { type: Type.STRING },
                  companyAStrategy: { type: Type.STRING },
                  companyBStrategy: { type: Type.STRING },
                },
                required: ['dimension', 'companyAStrategy', 'companyBStrategy'],
              },
            },
            strategicVerdict: { type: Type.STRING },
          },
          required: [
            'companyA',
            'companyB',
            'sharedSuppliers',
            'differentiatedUpstream',
            'downstreamChannelComparison',
            'strategicVerdict',
          ],
    };

    const textOutput = await generateStructuredJSON(prompt, responseSchema, undefined);
    const parsed = safeJsonParse(textOutput || '{}');
    recordAiSuccess(req, { endpoint: 'compare-companies', companyName: `${companyA} vs ${companyB}`, provider: getActiveProvider() }, Date.now() - __start);
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error comparing companies:', error);
    recordAiError(req, { endpoint: 'compare-companies', companyName: `${req.body?.companyA} vs ${req.body?.companyB}`, provider: getActiveProvider() }, error, Date.now() - __start);
    return res.status(500).json({ error: error.message || 'Failed to compare companies' });
  }
});

// Supply Chain Stress Test / Scenario Simulator Endpoint
app.post('/api/simulate-stress-test', quotaLimiter, async (req: Request, res: Response) => {
  const __start = Date.now();
  try {
    const { companyName, disruptionEntity, disruptionType } = req.body;
    if (!companyName) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    const prompt = `你是一名全球供应链韧性与危机推演专家。
请对目标公司“${companyName}”在遭遇以下供应链黑天鹅断供事件时进行定量与定性的抗压测试推演：
- 断供/冲击实体或关键物料：${disruptionEntity || '核心芯片与基础零部件'}
- 冲击类型：${disruptionType || '海外出口管制禁运 / 原材料价格剧烈波动 / 地缘断供'}

推演评估内容包括：
1. 危机严重程度 (Critical/High/Medium/Low)
2. 预计对交付周期的推迟周数 (estimatedDeliveryDelayWeeks)
3. 预计对毛利率的负向冲击百分比 (estimatedGrossMarginHitPercent)
4. 受波及的核心产品线与业务板块
5. 可行替代供应商清单及切换准备周期 (Immediate / 3-6 Months / 1+ Year) 与成本差异
6. 战略恢复举措与应对路线图
7. 资深韧性评估解析 (aiResilienceAnalysis)

请以严格 JSON 格式返回。`;

    const responseSchema = {
          type: Type.OBJECT,
          properties: {
            scenarioTitle: { type: Type.STRING },
            disruptionEntity: { type: Type.STRING },
            disruptionType: { type: Type.STRING },
            severityLevel: { type: Type.STRING, enum: ['Critical', 'High', 'Medium', 'Low'] },
            estimatedDeliveryDelayWeeks: { type: Type.NUMBER },
            estimatedGrossMarginHitPercent: { type: Type.NUMBER },
            affectedCoreProducts: { type: Type.ARRAY, items: { type: Type.STRING } },
            alternativeSuppliers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  readiness: { type: Type.STRING, enum: ['Immediate', '3-6 Months', '1+ Year'] },
                  costDifference: { type: Type.STRING },
                },
                required: ['name', 'readiness', 'costDifference'],
              },
            },
            strategicRecoveryActions: { type: Type.ARRAY, items: { type: Type.STRING } },
            aiResilienceAnalysis: { type: Type.STRING },
          },
          required: [
            'scenarioTitle',
            'disruptionEntity',
            'disruptionType',
            'severityLevel',
            'estimatedDeliveryDelayWeeks',
            'estimatedGrossMarginHitPercent',
            'affectedCoreProducts',
            'alternativeSuppliers',
            'strategicRecoveryActions',
            'aiResilienceAnalysis',
          ],
    };

    const textOutput = await generateStructuredJSON(prompt, responseSchema, undefined);
    const parsed = safeJsonParse(textOutput || '{}');
    recordAiSuccess(req, { endpoint: 'simulate-stress-test', companyName, provider: getActiveProvider() }, Date.now() - __start);
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error running stress test:', error);
    recordAiError(req, { endpoint: 'simulate-stress-test', companyName: req.body?.companyName, provider: getActiveProvider() }, error, Date.now() - __start);
    return res.status(500).json({ error: error.message || 'Failed to simulate stress test' });
  }
});

// Chain AI Copilot Q&A Endpoint
app.post('/api/ask-copilot', quotaLimiter, async (req: Request, res: Response) => {
  const __start = Date.now();
  try {
    const { companyName, question, contextData } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const prompt = `你是一名精通产业经济学、产业链穿透与股权投资的顶尖 AI 投资顾问与供应链分析助手。
当前正在深度分析的公司是：“${companyName || '目标公司'}”。

【上下文背景资料】：
${contextData ? JSON.stringify(contextData).slice(0, 3000) : '当前处于公司产业链全景研报研读阶段'}

【用户提问】：
${question}

请给出专业、数据翔实、逻辑严谨且切中商业实质的回答。分点明确，重点突出。`;

    const answer = await generateText(prompt, undefined);

    recordAiSuccess(req, { endpoint: 'ask-copilot', companyName: companyName, provider: getActiveProvider() }, Date.now() - __start);
    return res.json({
      answer: answer || '暂无分析回复',
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Error asking copilot:', error);
    recordAiError(req, { endpoint: 'ask-copilot', companyName: req.body?.companyName, provider: getActiveProvider() }, error, Date.now() - __start);
    return res.status(500).json({ error: error.message || 'Failed to generate copilot answer' });
  }
});

// ---------------------------------------------------------------------------
// Paid automotive report orders and email delivery
// ---------------------------------------------------------------------------

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function fulfillReportOrder(orderId: string): Promise<void> {
  const order = getReportOrder(orderId);
  if (!order) throw new Error('Report order not found');

  updateReportOrderStatus(orderId, 'processing');
  try {
    const markdown = buildAutomotiveReport(order.company_name);
    saveReportContent(orderId, markdown);
    const delivery = await sendReportEmail({
      recipient: order.user_email,
      companyName: order.company_name,
      orderId,
      markdown,
    });
    recordEmailDelivery({
      orderId,
      recipient: order.user_email,
      provider: delivery.provider,
      status: delivery.status,
      providerMessageId: delivery.providerMessageId,
    });
    markReportDelivered(orderId);
  } catch (error: any) {
    updateReportOrderStatus(orderId, 'failed', error?.message || String(error));
    recordEmailDelivery({
      orderId,
      recipient: order.user_email,
      provider: 'mock',
      status: 'failed',
      providerMessageId: null,
    });
    throw error;
  }
}

app.get('/api/reports/config', (_req: Request, res: Response) => {
  const priceYuan = Math.max(0, Number(getConfig('REPORT_PRICE_CNY', '8')) || 8);
  const freeDeepLimit = Math.max(0, parseInt(getConfig('DAILY_FREE_DEEP_LIMIT', '1') || '1', 10) || 1);
  res.json({
    priceYuan,
    freeDeepLimit,
    paymentMode: getConfig('PAYMENT_MODE', 'mock') || 'mock',
    currency: 'CNY',
  });
});

app.post('/api/reports/orders', async (req: Request, res: Response) => {
  try {
    const companyName = String(req.body?.companyName || '').trim();
    const userEmail = String(req.body?.userEmail || '').trim().toLowerCase();
    const reportType = String(req.body?.reportType || 'automotive_deep');

    if (!companyName) {
      return res.status(400).json({ error: 'companyName is required' });
    }
    if (!isValidEmail(userEmail)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }

    // 用户身份以服务端 session 为准；客户端传入的 userId 不再被信任
    const sessionUser = getSessionUser(req);
    const userId = sessionUser ? sessionUser.id : `email:${userEmail}`;

    const freeDeepLimit = Math.max(
      0,
      parseInt(getConfig('DAILY_FREE_DEEP_LIMIT', '1') || '1', 10) || 1
    );
    const usedFree = countFreeReportOrdersToday(userId);
    const isFree = usedFree < freeDeepLimit;
    const priceYuan = Math.max(0, Number(getConfig('REPORT_PRICE_CNY', '8')) || 8);
    const amountCents = isFree ? 0 : Math.round(priceYuan * 100);

    const order = createReportOrder({
      userId,
      userEmail,
      companyName,
      reportType,
      amountCents,
      status: isFree ? 'processing' : 'pending_payment',
    });

    if (isFree) {
      await fulfillReportOrder(order.id);
    }

    const latest = getReportOrder(order.id)!;
    return res.status(201).json({
      order: latest,
      free: isFree,
      freeRemaining: Math.max(0, freeDeepLimit - usedFree - (isFree ? 1 : 0)),
      priceYuan,
      paymentMode: getConfig('PAYMENT_MODE', 'mock') || 'mock',
    });
  } catch (error: any) {
    console.error('[reports] create order failed:', error);
    return res.status(500).json({ error: error?.message || 'Failed to create report order' });
  }
});

app.get('/api/reports/orders', (req: Request, res: Response) => {
  const sessionUser = getSessionUser(req);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '30'), 10) || 30));

  // 管理员可查询任意用户/邮箱的订单
  if (isAdminRequest(req)) {
    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
    const email = typeof req.query.email === 'string' ? req.query.email.toLowerCase() : undefined;
    return res.json({ orders: listReportOrders({ userId, email, limit }) });
  }

  // 普通用户仅能查看自己的订单（身份以服务端 session 为准，不信任查询参数）
  if (!sessionUser) {
    return res.status(401).json({ error: '请先登录' });
  }
  return res.json({ orders: listReportOrders({ userId: sessionUser.id, limit }) });
});

app.get('/api/reports/orders/:id', (req: Request, res: Response) => {
  const order = getReportOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Report order not found' });

  // 仅订单属主（session）或管理员可查看订单详情，防止通过猜测 id 枚举他人邮箱与报告
  const sessionUser = getSessionUser(req);
  const isOwner =
    !!sessionUser &&
    ((!!order.user_id && order.user_id === sessionUser.id) ||
      (!!order.user_email && order.user_email === sessionUser.email));
  if (!isOwner && !isAdminRequest(req)) {
    return res.status(403).json({ error: '只有订单属主或管理员可以查看该订单' });
  }
  return res.json({ order });
});

app.post('/api/reports/orders/:id/mock-pay', async (req: Request, res: Response) => {
  if ((getConfig('PAYMENT_MODE', 'mock') || 'mock') !== 'mock') {
    return res.status(400).json({ error: 'Mock payment is disabled' });
  }
  const current = getReportOrder(req.params.id);
  if (!current) return res.status(404).json({ error: 'Report order not found' });

  // 幂等：已完成支付/处理中/已完成的重复请求返回当前状态，不报错
  if (current.status !== 'pending_payment') {
    return res.json({ order: current, idempotent: true });
  }

  // 仅订单属主（session）或管理员可确认支付，防止任意第三人替单
  const sessionUser = getSessionUser(req);
  const isOwner =
    !!sessionUser &&
    ((!!current.user_id && current.user_id === sessionUser.id) ||
      (!!current.user_email && current.user_email === sessionUser.email));
  if (!isOwner && !isAdminRequest(req)) {
    return res.status(403).json({ error: '只有订单属主或管理员可以确认支付' });
  }

  try {
    markReportOrderPaid(current.id, 'mock', `mock_${Date.now()}`);
    await fulfillReportOrder(current.id);
    return res.json({ order: getReportOrder(current.id) });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Mock payment fulfillment failed' });
  }
});

app.post('/api/reports/orders/:id/resend', async (req: Request, res: Response) => {
  const order = getReportOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Report order not found' });
  if (!order.report_markdown) {
    return res.status(400).json({ error: 'Report content is not ready' });
  }
  // 重发同样限制为订单属主或管理员
  const sessionUser = getSessionUser(req);
  const isOwner =
    !!sessionUser &&
    ((!!order.user_id && order.user_id === sessionUser.id) ||
      (!!order.user_email && order.user_email === sessionUser.email));
  if (!isOwner && !isAdminRequest(req)) {
    return res.status(403).json({ error: '只有订单属主或管理员可以重发报告邮件' });
  }
  try {
    const delivery = await sendReportEmail({
      recipient: order.user_email,
      companyName: order.company_name,
      orderId: order.id,
      markdown: order.report_markdown,
    });
    recordEmailDelivery({
      orderId: order.id,
      recipient: order.user_email,
      provider: delivery.provider,
      status: delivery.status,
      providerMessageId: delivery.providerMessageId,
    });
    markReportDelivered(order.id);
    return res.json({ order: getReportOrder(order.id) });
  } catch (error: any) {
    recordEmailDelivery({
      orderId: order.id,
      recipient: order.user_email,
      provider: 'resend',
      status: 'failed',
      error: error?.message || String(error),
    });
    return res.status(500).json({ error: error?.message || 'Failed to resend report' });
  }
});

// Vite Middleware & SPA Fallback setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
