/**
 * 知识图谱模块
 *
 * 替代平铺数组，支撑证据链 + 中心性计算
 * 这是架构 ADR-5 的核心落地
 */

import { graphCentrality, type GraphCentralityResult } from './forensicCalculator';

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  properties: Record<string, any>;
  evidence?: Evidence[];
}

export type EntityType =
  | 'company'
  | 'supplier'
  | 'customer'
  | 'product'
  | 'technology'
  | 'person'
  | 'location'
  | 'financial_metric';

export interface Relationship {
  id: string;
  source: string; // entity id
  target: string; // entity id
  type: RelationshipType;
  properties: Record<string, any>;
  evidence?: Evidence[];
  weight?: number; // 用于中心性计算
}

export type RelationshipType =
  | 'supplies'
  | 'purchases_from'
  | 'invests_in'
  | 'competes_with'
  | 'partners_with'
  | 'owns'
  | 'located_in'
  | 'uses_technology'
  | 'financial_metric';

export interface Evidence {
  id: string;
  source: string; // 来源名称（如"2024年报 P.48"）
  sourceType: 'annual_report' | 'quarterly_report' | 'announcement' | 'regulator' | 'extracted';
  excerpt?: string; // 原文摘录
  confidence?: number; // 0-100
  verifiedAt?: string; // ISO date
}

export interface KnowledgeGraph {
  entities: Map<string, Entity>;
  relationships: Relationship[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
  };
}

// ---------------------------------------------------------------------------
// 知识图谱构建器
// ---------------------------------------------------------------------------

export class KnowledgeGraphBuilder {
  private entities: Map<string, Entity> = new Map();
  private relationships: Relationship[] = [];
  private entityIdCounter = 0;
  private relationshipIdCounter = 0;

  /**
   * 添加实体
   */
  addEntity(
    name: string,
    type: EntityType,
    properties: Record<string, any> = {},
    evidence?: Evidence[]
  ): string {
    const id = `entity_${++this.entityIdCounter}`;
    this.entities.set(id, { id, name, type, properties, evidence });
    return id;
  }

  /**
   * 添加关系
   */
  addRelationship(
    sourceId: string,
    targetId: string,
    type: RelationshipType,
    properties: Record<string, any> = {},
    evidence?: Evidence[],
    weight?: number
  ): string {
    if (!this.entities.has(sourceId)) {
      throw new Error(`Source entity ${sourceId} not found`);
    }
    if (!this.entities.has(targetId)) {
      throw new Error(`Target entity ${targetId} not found`);
    }

    const id = `rel_${++this.relationshipIdCounter}`;
    this.relationships.push({
      id,
      source: sourceId,
      target: targetId,
      type,
      properties,
      evidence,
      weight: weight ?? 1,
    });
    return id;
  }

  /**
   * 构建知识图谱
   */
  build(): KnowledgeGraph {
    return {
      entities: new Map(this.entities),
      relationships: [...this.relationships],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0',
      },
    };
  }
}

// ---------------------------------------------------------------------------
// 知识图谱查询与分析
// ---------------------------------------------------------------------------

/**
 * 获取实体的所有关系
 */
export function getEntityRelationships(
  graph: KnowledgeGraph,
  entityId: string
): Relationship[] {
  return graph.relationships.filter(
    (r) => r.source === entityId || r.target === entityId
  );
}

/**
 * 获取实体的上游（供应商）
 */
export function getUpstreamEntities(
  graph: KnowledgeGraph,
  entityId: string
): Entity[] {
  const upstreamIds = graph.relationships
    .filter((r) => r.target === entityId && r.type === 'supplies')
    .map((r) => r.source);
  return upstreamIds.map((id) => graph.entities.get(id)!).filter(Boolean);
}

/**
 * 获取实体的下游（客户）
 */
export function getDownstreamEntities(
  graph: KnowledgeGraph,
  entityId: string
): Entity[] {
  const downstreamIds = graph.relationships
    .filter((r) => r.source === entityId && r.type === 'supplies')
    .map((r) => r.target);
  return downstreamIds.map((id) => graph.entities.get(id)!).filter(Boolean);
}

/**
 * 获取实体的证据链（包括关系上的证据）
 */
export function getEntityEvidenceChain(
  graph: KnowledgeGraph,
  entityId: string
): Evidence[] {
  const entity = graph.entities.get(entityId);
  if (!entity) return [];

  const evidence: Evidence[] = [];

  // 实体自身的证据
  if (entity.evidence) {
    evidence.push(...entity.evidence);
  }

  // 关系上的证据
  const relationships = getEntityRelationships(graph, entityId);
  for (const rel of relationships) {
    if (rel.evidence) {
      evidence.push(...rel.evidence);
    }
  }

  return evidence;
}

/**
 * 计算图中心性（度中心性 + 介数中心性）
 */
export function calculateGraphCentrality(
  graph: KnowledgeGraph
): GraphCentralityResult {
  const nodes = Array.from(graph.entities.keys());
  const edges = graph.relationships.map((r) => ({
    from: r.source,
    to: r.target,
    weight: r.weight,
  }));

  return graphCentrality({ nodes, edges });
}

/**
 * 查找两个实体之间的路径
 */
export function findPath(
  graph: KnowledgeGraph,
  fromId: string,
  toId: string
): string[] | null {
  if (fromId === toId) return [fromId];

  const visited = new Set<string>();
  const queue: Array<{ id: string; path: string[] }> = [{ id: fromId, path: [fromId] }];

  while (queue.length > 0) {
    const { id, path } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    // 找到所有相邻节点
    const neighbors = graph.relationships
      .filter((r) => r.source === id || r.target === id)
      .map((r) => (r.source === id ? r.target : r.source));

    for (const neighbor of neighbors) {
      const newPath = [...path, neighbor];
      if (neighbor === toId) {
        return newPath;
      }
      if (!visited.has(neighbor)) {
        queue.push({ id: neighbor, path: newPath });
      }
    }
  }

  return null; // 无路径
}

/**
 * 检测环路
 */
export function detectCycles(graph: KnowledgeGraph): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string, path: string[]): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = graph.relationships
      .filter((r) => r.source === nodeId)
      .map((r) => r.target);

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor, [...path, neighbor])) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        // 找到环路
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart >= 0) {
          cycles.push(path.slice(cycleStart).concat(neighbor));
        }
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const entityId of graph.entities.keys()) {
    if (!visited.has(entityId)) {
      dfs(entityId, [entityId]);
    }
  }

  return cycles;
}

// ---------------------------------------------------------------------------
// 从现有数据结构转换
// ---------------------------------------------------------------------------

/**
 * 从 CompanyPanoramaData 构建知识图谱
 */
export function buildGraphFromPanoramaData(data: any): KnowledgeGraph {
  const builder = new KnowledgeGraphBuilder();

  // 添加核心公司
  const companyId = builder.addEntity(
    data.basicInfo?.name || 'Unknown Company',
    'company',
    {
      englishName: data.basicInfo?.englishName,
      ticker: data.basicInfo?.ticker,
      industry: data.basicInfo?.industry,
      marketCap: data.basicInfo?.marketCapOrValuation,
    },
    data.extractedEvidence?.keyFinancials?.sourceSection
      ? [
          {
            id: `evidence_company_${Date.now()}`,
            source: data.extractedEvidence.keyFinancials.sourceSection,
            sourceType: 'annual_report',
          },
        ]
      : undefined
  );

  // 添加上游供应商
  if (data.upstream) {
    for (const supplier of data.upstream) {
      const supplierId = builder.addEntity(
        supplier.name,
        'supplier',
        {
          category: supplier.category,
          supplies: supplier.supplies,
          dependenceLevel: supplier.dependenceLevel,
          originCountry: supplier.originCountry,
        },
        supplier.evidence
          ? [
              {
                id: `evidence_supplier_${supplier.id}`,
                source: supplier.evidence.sourceSection,
                sourceType: supplier.evidence.sourceType,
              },
            ]
          : undefined
      );

      builder.addRelationship(
        supplierId,
        companyId,
        'supplies',
        {
          strategicImpact: supplier.strategicImpact,
          supplyVolumeRatio: supplier.supplyVolumeRatio,
        },
        supplier.evidence
          ? [
              {
                id: `evidence_rel_${supplier.id}`,
                source: supplier.evidence.sourceSection,
                sourceType: supplier.evidence.sourceType,
              },
            ]
          : undefined
      );
    }
  }

  // 添加下游客户
  if (data.downstream) {
    for (const customer of data.downstream) {
      const customerId = builder.addEntity(
        customer.name,
        'customer',
        {
          segmentType: customer.segmentType,
          revenueContribution: customer.revenueContributionEst,
          stickiness: customer.customerStickiness,
        },
        customer.evidence
          ? [
              {
                id: `evidence_customer_${customer.id}`,
                source: customer.evidence.sourceSection,
                sourceType: customer.evidence.sourceType,
              },
            ]
          : undefined
      );

      builder.addRelationship(
        companyId,
        customerId,
        'supplies',
        {
          productOrService: customer.productOrServicePurchased,
          revenueContribution: customer.revenueContributionEst,
        },
        customer.evidence
          ? [
              {
                id: `evidence_rel_${customer.id}`,
                source: customer.evidence.sourceSection,
                sourceType: customer.evidence.sourceType,
              },
            ]
          : undefined
      );
    }
  }

  // 添加财务指标
  if (data.financialBreakdown) {
    const metrics = [
      { name: '营收', value: data.basicInfo?.annualRevenue },
      { name: '毛利率', value: data.financialBreakdown.grossMargin },
      { name: '研发费用率', value: data.financialBreakdown.rdExpenseRatio },
    ];

    for (const metric of metrics) {
      if (metric.value) {
        const metricId = builder.addEntity(metric.name, 'financial_metric', {
          value: metric.value,
        });
        builder.addRelationship(companyId, metricId, 'financial_metric', {
          value: metric.value,
        });
      }
    }
  }

  return builder.build();
}
