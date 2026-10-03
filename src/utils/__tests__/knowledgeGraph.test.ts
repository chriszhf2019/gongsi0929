import { describe, it, expect } from 'vitest';
import {
  KnowledgeGraphBuilder,
  getEntityRelationships,
  getUpstreamEntities,
  getDownstreamEntities,
  getEntityEvidenceChain,
  calculateGraphCentrality,
  findPath,
  detectCycles,
  buildGraphFromPanoramaData,
} from '../knowledgeGraph';

describe('KnowledgeGraphBuilder', () => {
  it('should create empty graph', () => {
    const builder = new KnowledgeGraphBuilder();
    const graph = builder.build();

    expect(graph.entities.size).toBe(0);
    expect(graph.relationships.length).toBe(0);
    expect(graph.metadata.version).toBe('1.0.0');
  });

  it('should add entities', () => {
    const builder = new KnowledgeGraphBuilder();
    const id1 = builder.addEntity('公司A', 'company', { industry: '汽车' });
    const id2 = builder.addEntity('供应商B', 'supplier', { category: '电池' });

    expect(id1).toBe('entity_1');
    expect(id2).toBe('entity_2');

    const graph = builder.build();
    expect(graph.entities.size).toBe(2);
    expect(graph.entities.get(id1)?.name).toBe('公司A');
    expect(graph.entities.get(id2)?.type).toBe('supplier');
  });

  it('should add relationships', () => {
    const builder = new KnowledgeGraphBuilder();
    const id1 = builder.addEntity('公司A', 'company');
    const id2 = builder.addEntity('供应商B', 'supplier');
    const relId = builder.addRelationship(id2, id1, 'supplies', { volume: '100亿' });

    expect(relId).toBe('rel_1');

    const graph = builder.build();
    expect(graph.relationships.length).toBe(1);
    expect(graph.relationships[0].source).toBe(id2);
    expect(graph.relationships[0].target).toBe(id1);
    expect(graph.relationships[0].type).toBe('supplies');
  });

  it('should throw error when adding relationship to non-existent entity', () => {
    const builder = new KnowledgeGraphBuilder();
    const id1 = builder.addEntity('公司A', 'company');

    expect(() => {
      builder.addRelationship(id1, 'non_existent', 'supplies');
    }).toThrow('Target entity non_existent not found');
  });

  it('should add entities with evidence', () => {
    const builder = new KnowledgeGraphBuilder();
    const evidence = [
      {
        id: 'e1',
        source: '2024年报 P.48',
        sourceType: 'annual_report' as const,
        confidence: 95,
      },
    ];
    const id = builder.addEntity('公司A', 'company', {}, evidence);

    const graph = builder.build();
    expect(graph.entities.get(id)?.evidence).toHaveLength(1);
    expect(graph.entities.get(id)?.evidence?.[0].source).toBe('2024年报 P.48');
  });
});

describe('Graph queries', () => {
  it('should get entity relationships', () => {
    const builder = new KnowledgeGraphBuilder();
    const id1 = builder.addEntity('公司A', 'company');
    const id2 = builder.addEntity('供应商B', 'supplier');
    const id3 = builder.addEntity('客户C', 'customer');
    builder.addRelationship(id2, id1, 'supplies');
    builder.addRelationship(id1, id3, 'supplies');

    const graph = builder.build();
    const rels = getEntityRelationships(graph, id1);

    expect(rels.length).toBe(2);
  });

  it('should get upstream entities', () => {
    const builder = new KnowledgeGraphBuilder();
    const companyId = builder.addEntity('公司A', 'company');
    const supplier1Id = builder.addEntity('供应商B', 'supplier');
    const supplier2Id = builder.addEntity('供应商C', 'supplier');
    builder.addRelationship(supplier1Id, companyId, 'supplies');
    builder.addRelationship(supplier2Id, companyId, 'supplies');

    const graph = builder.build();
    const upstream = getUpstreamEntities(graph, companyId);

    expect(upstream.length).toBe(2);
    expect(upstream.map((e) => e.name)).toContain('供应商B');
    expect(upstream.map((e) => e.name)).toContain('供应商C');
  });

  it('should get downstream entities', () => {
    const builder = new KnowledgeGraphBuilder();
    const companyId = builder.addEntity('公司A', 'company');
    const customer1Id = builder.addEntity('客户B', 'customer');
    const customer2Id = builder.addEntity('客户C', 'customer');
    builder.addRelationship(companyId, customer1Id, 'supplies');
    builder.addRelationship(companyId, customer2Id, 'supplies');

    const graph = builder.build();
    const downstream = getDownstreamEntities(graph, companyId);

    expect(downstream.length).toBe(2);
    expect(downstream.map((e) => e.name)).toContain('客户B');
    expect(downstream.map((e) => e.name)).toContain('客户C');
  });

  it('should get entity evidence chain', () => {
    const builder = new KnowledgeGraphBuilder();
    const entityEvidence = [
      { id: 'e1', source: '年报 P.10', sourceType: 'annual_report' as const },
    ];
    const relEvidence = [
      { id: 'e2', source: '年报 P.48', sourceType: 'annual_report' as const },
    ];

    const id1 = builder.addEntity('公司A', 'company', {}, entityEvidence);
    const id2 = builder.addEntity('供应商B', 'supplier');
    builder.addRelationship(id2, id1, 'supplies', {}, relEvidence);

    const graph = builder.build();
    const evidence = getEntityEvidenceChain(graph, id1);

    expect(evidence.length).toBe(2);
    expect(evidence.map((e) => e.source)).toContain('年报 P.10');
    expect(evidence.map((e) => e.source)).toContain('年报 P.48');
  });
});

describe('Graph analysis', () => {
  it('should calculate graph centrality', () => {
    const builder = new KnowledgeGraphBuilder();
    const id1 = builder.addEntity('公司A', 'company');
    const id2 = builder.addEntity('供应商B', 'supplier');
    const id3 = builder.addEntity('供应商C', 'supplier');
    const id4 = builder.addEntity('客户D', 'customer');
    builder.addRelationship(id2, id1, 'supplies');
    builder.addRelationship(id3, id1, 'supplies');
    builder.addRelationship(id1, id4, 'supplies');

    const graph = builder.build();
    const centrality = calculateGraphCentrality(graph);

    expect(centrality.degreeCentrality).toBeDefined();
    expect(centrality.betweennessCentrality).toBeDefined();
    expect(centrality.topNodes.length).toBeGreaterThan(0);
  });

  it('should find path between entities', () => {
    const builder = new KnowledgeGraphBuilder();
    const id1 = builder.addEntity('公司A', 'company');
    const id2 = builder.addEntity('供应商B', 'supplier');
    const id3 = builder.addEntity('供应商C', 'supplier');
    builder.addRelationship(id2, id1, 'supplies');
    builder.addRelationship(id3, id2, 'supplies');

    const graph = builder.build();
    const path = findPath(graph, id3, id1);

    expect(path).not.toBeNull();
    expect(path).toHaveLength(3);
    expect(path![0]).toBe(id3);
    expect(path![2]).toBe(id1);
  });

  it('should return null when no path exists', () => {
    const builder = new KnowledgeGraphBuilder();
    const id1 = builder.addEntity('公司A', 'company');
    const id2 = builder.addEntity('公司B', 'company');

    const graph = builder.build();
    const path = findPath(graph, id1, id2);

    expect(path).toBeNull();
  });

  it('should detect cycles', () => {
    const builder = new KnowledgeGraphBuilder();
    const id1 = builder.addEntity('公司A', 'company');
    const id2 = builder.addEntity('供应商B', 'supplier');
    const id3 = builder.addEntity('供应商C', 'supplier');
    builder.addRelationship(id1, id2, 'supplies');
    builder.addRelationship(id2, id3, 'supplies');
    builder.addRelationship(id3, id1, 'supplies');

    const graph = builder.build();
    const cycles = detectCycles(graph);

    expect(cycles.length).toBeGreaterThan(0);
  });
});

describe('buildGraphFromPanoramaData', () => {
  it('should build graph from panorama data', () => {
    const data = {
      basicInfo: {
        name: '比亚迪',
        industry: '汽车',
        annualRevenue: '7771亿',
      },
      upstream: [
        {
          id: 'up1',
          name: '恩捷股份',
          category: '电池材料',
          supplies: '隔膜',
          dependenceLevel: 'High',
          originCountry: '中国',
          strategicImpact: '核心材料',
        },
      ],
      downstream: [
        {
          id: 'down1',
          name: '特斯拉',
          segmentType: 'enterprise_b2b',
          productOrServicePurchased: '电池',
          revenueContributionEst: '15%',
          customerStickiness: 'High',
        },
      ],
      financialBreakdown: {
        grossMargin: '22%',
        rdExpenseRatio: '6%',
      },
    };

    const graph = buildGraphFromPanoramaData(data);

    expect(graph.entities.size).toBeGreaterThan(0);
    expect(graph.relationships.length).toBeGreaterThan(0);

    // 检查核心公司
    const companyEntity = Array.from(graph.entities.values()).find(
      (e) => e.type === 'company'
    );
    expect(companyEntity).toBeDefined();
    expect(companyEntity?.name).toBe('比亚迪');

    // 检查供应商
    const supplierEntity = Array.from(graph.entities.values()).find(
      (e) => e.type === 'supplier'
    );
    expect(supplierEntity).toBeDefined();
    expect(supplierEntity?.name).toBe('恩捷股份');

    // 检查客户
    const customerEntity = Array.from(graph.entities.values()).find(
      (e) => e.type === 'customer'
    );
    expect(customerEntity).toBeDefined();
    expect(customerEntity?.name).toBe('特斯拉');
  });
});
