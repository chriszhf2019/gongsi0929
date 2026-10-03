import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Filter,
  Eye,
  Layers,
  Maximize2,
  Minimize2,
  FileCode,
  Search,
  Orbit,
  Network,
  GitMerge,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import {
  CompanyPanoramaData,
  GraphNode,
  GraphLink,
  RelationshipCategory,
  GraphLayoutMode,
} from '../types';

interface PanoramicGraphProps {
  data: CompanyPanoramaData;
  onNodeClick: (node: GraphNode) => void;
}

const CATEGORY_CONFIG: Record<
  RelationshipCategory,
  { label: string; color: string; stroke: string; bgClass: string; textClass: string }
> = {
  core: {
    label: '核心主体',
    color: '#1F3437',
    stroke: '#3E6F73',
    bgClass: 'bg-[#1F3437] border-[#1F3437] text-white',
    textClass: 'text-[#1F3437]',
  },
  upstream: {
    label: '上游供应商',
    color: '#3E6F73',
    stroke: '#2B5559',
    bgClass: 'bg-[#3E6F73]/10 border-[#3E6F73]/35 text-[#254E52]',
    textClass: 'text-[#3E6F73]',
  },
  downstream: {
    label: '下游客户/渠道',
    color: '#2E6B56',
    stroke: '#205141',
    bgClass: 'bg-[#2E6B56]/10 border-[#2E6B56]/35 text-[#1D4739]',
    textClass: 'text-[#2E6B56]',
  },
  subsidiary: {
    label: '全资/控股子公司',
    color: '#5E4D78',
    stroke: '#47385E',
    bgClass: 'bg-[#5E4D78]/10 border-[#5E4D78]/35 text-[#433557]',
    textClass: 'text-[#5E4D78]',
  },
  investment: {
    label: 'CVC对外投资',
    color: '#735777',
    stroke: '#5B415F',
    bgClass: 'bg-[#735777]/10 border-[#735777]/35 text-[#543958]',
    textClass: 'text-[#735777]',
  },
  joint_venture: {
    label: '合资/战略联盟',
    color: '#9C6E28',
    stroke: '#7F571D',
    bgClass: 'bg-[#9C6E28]/10 border-[#9C6E28]/35 text-[#734E14]',
    textClass: 'text-[#9C6E28]',
  },
  partner: {
    label: '合作伙伴',
    color: '#8C6838',
    stroke: '#705128',
    bgClass: 'bg-[#8C6838]/10 border-[#8C6838]/35 text-[#634823]',
    textClass: 'text-[#8C6838]',
  },
  competitor: {
    label: '主要竞争对手',
    color: '#A84A3E',
    stroke: '#88352A',
    bgClass: 'bg-[#A84A3E]/10 border-[#A84A3E]/35 text-[#823329]',
    textClass: 'text-[#A84A3E]',
  },
};

export const PanoramicGraph: React.FC<PanoramicGraphProps> = ({ data, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Layout mode state
  const [layoutMode, setLayoutMode] = useState<GraphLayoutMode>('force');

  // Filters
  const [activeFilters, setActiveFilters] = useState<Set<RelationshipCategory>>(
    new Set(['core', 'upstream', 'downstream', 'subsidiary', 'investment', 'joint_venture', 'competitor'])
  );

  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 580 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Keyboard shortcut: Esc to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Update container size with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({
            width: Math.max(width, 400),
            height: Math.max(height, 520),
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Build graph model from data
  const { nodes, links } = useMemo(() => {
    const rawNodes: GraphNode[] = [];
    const rawLinks: GraphLink[] = [];

    const coreId = 'node-core';
    rawNodes.push({
      id: coreId,
      label: data.basicInfo.name,
      category: 'core',
      groupLabel: '核心主体',
      details: data.basicInfo.businessSummary,
      subInfo: data.basicInfo.ticker || data.basicInfo.industry,
      val: 34,
    });

    // 1. Upstream Nodes
    data.upstream.forEach((up, idx) => {
      const upId = `node-up-${idx}`;
      rawNodes.push({
        id: upId,
        label: up.name,
        category: 'upstream',
        groupLabel: up.categoryLabel || '上游供应',
        details: `供应产品：${up.supplies} (依赖度：${up.dependenceLevel})`,
        subInfo: up.supplies,
        val: up.dependenceLevel === 'High' ? 22 : 18,
      });
      rawLinks.push({
        source: upId,
        target: coreId,
        relation: `供货：${up.supplies.slice(0, 8)}`,
        category: 'upstream',
        strength: up.dependenceLevel === 'High' ? 1.2 : 0.8,
      });
    });

    // 2. Downstream Nodes
    data.downstream.forEach((down, idx) => {
      const downId = `node-down-${idx}`;
      rawNodes.push({
        id: downId,
        label: down.name,
        category: 'downstream',
        groupLabel: down.segmentLabel || '下游客群',
        details: `采购产品：${down.productOrServicePurchased} (收入贡献：${down.revenueContributionEst})`,
        subInfo: down.revenueContributionEst,
        val: down.customerStickiness === 'High' ? 22 : 18,
      });
      rawLinks.push({
        source: coreId,
        target: downId,
        relation: `销售：${down.productOrServicePurchased.slice(0, 8)}`,
        category: 'downstream',
        strength: 1,
      });
    });

    // 3. Investments & Subsidiaries
    data.investments.forEach((inv, idx) => {
      const invId = `node-inv-${idx}`;
      const isSub = inv.type === 'wholly_owned' || inv.type === 'majority_owned';
      const cat: RelationshipCategory = isSub ? 'subsidiary' : 'investment';
      rawNodes.push({
        id: invId,
        label: inv.name,
        category: cat,
        groupLabel: inv.typeLabel || '对外投资',
        details: `持股：${inv.shareholdingRatio || '战略参股'} | 战略定位：${inv.strategicGoal}`,
        subInfo: inv.shareholdingRatio || inv.industryDomain,
        val: isSub ? 20 : 16,
      });
      rawLinks.push({
        source: coreId,
        target: invId,
        relation: inv.shareholdingRatio ? `持股 ${inv.shareholdingRatio}` : '股权投资',
        category: cat,
        strength: 0.9,
      });
    });

    // 4. Joint Ventures
    data.jointVentures.forEach((jv, idx) => {
      const jvId = `node-jv-${idx}`;
      rawNodes.push({
        id: jvId,
        label: jv.name,
        category: 'joint_venture',
        groupLabel: '合资/联盟',
        details: `合作方：${jv.partnerNames.join(', ')} | ${jv.cooperationScope}`,
        subInfo: jv.shareholdingSummary,
        val: 20,
      });
      rawLinks.push({
        source: coreId,
        target: jvId,
        relation: '合资联营',
        category: 'joint_venture',
        strength: 1.1,
      });
    });

    // 5. Competitors
    data.competitors.forEach((comp, idx) => {
      const compId = `node-comp-${idx}`;
      rawNodes.push({
        id: compId,
        label: comp.name,
        category: 'competitor',
        groupLabel: '行业竞品',
        details: `对标业务：${comp.competingSegments.join(', ')} | 竞争格局：${comp.rivalryStrength}`,
        subInfo: comp.rivalryStrength,
        val: 17,
      });
      rawLinks.push({
        source: coreId,
        target: compId,
        relation: '市场竞争',
        category: 'competitor',
        strength: 0.5,
      });
    });

    // Filter nodes according to activeFilters
    const filteredNodes = rawNodes.filter((n) => activeFilters.has(n.category));
    const activeNodeIds = new Set(filteredNodes.map((n) => n.id));

    const filteredLinks = rawLinks.filter(
      (l) => activeNodeIds.has(l.source as string) && activeNodeIds.has(l.target as string)
    );

    return { nodes: filteredNodes, links: filteredLinks };
  }, [data, activeFilters]);

  // Handle Search & Camera Navigation
  const handleSearchNode = (term: string) => {
    setSearchQuery(term);
    if (!term.trim() || !svgRef.current || !zoomRef.current) {
      setHighlightedNodeId(null);
      return;
    }

    const matched = nodes.find(
      (n) =>
        n.label.toLowerCase().includes(term.toLowerCase()) ||
        n.details?.toLowerCase().includes(term.toLowerCase()) ||
        n.subInfo?.toLowerCase().includes(term.toLowerCase())
    );

    if (matched && matched.x !== undefined && matched.y !== undefined) {
      setHighlightedNodeId(matched.id);
      const svg = d3.select(svgRef.current);
      const { width, height } = dimensions;
      const targetX = width / 2 - matched.x * 1.3;
      const targetY = height / 2 - matched.y * 1.3;

      svg
        .transition()
        .duration(750)
        .call(
          zoomRef.current.transform,
          d3.zoomIdentity.translate(targetX, targetY).scale(1.3)
        );
    }
  };

  // High-Res PNG Export (Executive Due-Diligence Style)
  const handleExportPNG = () => {
    if (!svgRef.current) return;
    const svgElement = svgRef.current;
    const { width, height } = dimensions;

    const headerHeight = 72;
    const footerHeight = 36;
    const totalHeight = height + headerHeight + footerHeight;

    const svgString = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = totalHeight * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(2, 2);

    // Full canvas background
    ctx.fillStyle = '#FBFBFA';
    ctx.fillRect(0, 0, width, totalHeight);

    // Header Banner
    ctx.fillStyle = '#FAFBF9';
    ctx.fillRect(0, 0, width, headerHeight);
    ctx.fillStyle = '#E2E6E2';
    ctx.fillRect(0, headerHeight - 1, width, 1);

    // Ink Seal icon mark
    ctx.fillStyle = '#1F3437';
    ctx.fillRect(20, 18, 36, 36);
    ctx.fillStyle = '#FAF8F5';
    ctx.font = 'bold 18px "Noto Serif SC", serif';
    ctx.fillText('鉴', 30, 42);

    // Main Report Title
    ctx.fillStyle = '#1F3437';
    ctx.font = 'bold 16px "Noto Serif SC", serif';
    ctx.fillText(`【${data.basicInfo.name}】全景产业链与投资关系拓扑图`, 68, 33);

    // Subtitle metadata
    const layoutLabel =
      layoutMode === 'force' ? '力导向拓扑' : layoutMode === 'concentric' ? '同心轨道' : '价值流动线';
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#627578';
    ctx.fillText(
      `拓扑模式: ${layoutLabel} | 实体节点: ${nodes.length} 个 | 关联流向: ${links.length} 条 | 导出时间: ${new Date().toLocaleString('zh-CN')}`,
      68,
      52
    );

    // Bottom Footer
    ctx.fillStyle = '#FAFBF9';
    ctx.fillRect(0, totalHeight - footerHeight, width, footerHeight);
    ctx.fillStyle = '#E2E6E2';
    ctx.fillRect(0, totalHeight - footerHeight, width, 1);

    ctx.fillStyle = '#8C9E9F';
    ctx.font = '10px "Noto Serif SC", serif';
    ctx.fillText(
      '鉴源・GenSight 企业商业尽调中台 · 机密卷宗 · 本图谱由鉴源拓扑引擎经多源交叉核验绘制',
      20,
      totalHeight - 14
    );

    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const blobURL = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, 0, headerHeight, width, height);
      URL.revokeObjectURL(blobURL);

      const a = document.createElement('a');
      a.download = `${data.basicInfo.name}_产业链全景拓扑_${layoutMode}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = blobURL;
  };

  // Vector SVG Export
  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const svgString = new XMLSerializer().serializeToString(svgClone);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `${data.basicInfo.name}_产业链全景拓扑_${layoutMode}.svg`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render D3 Graph
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Defs for markers and subtle drop shadow
    const defs = svg.append('defs');

    // Dot grid pattern
    const pattern = defs
      .append('pattern')
      .attr('id', 'graph-grid')
      .attr('width', 28)
      .attr('height', 28)
      .attr('patternUnits', 'userSpaceOnUse');

    pattern
      .append('circle')
      .attr('cx', 2)
      .attr('cy', 2)
      .attr('r', 1)
      .attr('fill', '#DCE1DC');

    // Directional arrows
    Object.entries(CATEGORY_CONFIG).forEach(([catKey, config]) => {
      defs
        .append('marker')
        .attr('id', `arrow-${catKey}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 25)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-4L8,0L0,4')
        .attr('fill', config.color)
        .attr('opacity', 0.85);
    });

    // Subtle drop shadow filter for nodes
    const filter = defs
      .append('filter')
      .attr('id', 'node-shadow')
      .attr('x', '-25%')
      .attr('y', '-25%')
      .attr('width', '150%')
      .attr('height', '150%');
    filter
      .append('feDropShadow')
      .attr('dx', '0')
      .attr('dy', '2')
      .attr('stdDeviation', '3')
      .attr('flood-color', '#1F3437')
      .attr('flood-opacity', '0.14');

    // Background paper canvas
    svg
      .append('rect')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', '#FBFBFA');

    svg
      .append('rect')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', 'url(#graph-grid)')
      .attr('pointer-events', 'none');

    // Setup zoom container
    const g = svg.append('g').attr('class', 'graph-container');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 3.5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // Initial transform centered
    svg.call(
      zoom.transform,
      d3.zoomIdentity.translate(width / 2, height / 2).scale(0.85)
    );

    // Prepare node copy for simulation
    const simNodes = nodes.map((d) => ({ ...d }));
    const simLinks = links.map((d) => ({ ...d }));

    // Apply layout positions according to layoutMode
    if (layoutMode === 'concentric') {
      const coreNode = simNodes.find((n) => n.category === 'core');
      if (coreNode) {
        coreNode.fx = 0;
        coreNode.fy = 0;
      }

      const ring1Nodes = simNodes.filter(
        (n) => n.category === 'subsidiary' || n.category === 'joint_venture'
      );
      const ring2Nodes = simNodes.filter(
        (n) => n.category === 'upstream' || n.category === 'downstream'
      );
      const ring3Nodes = simNodes.filter(
        (n) => n.category === 'investment' || n.category === 'competitor'
      );

      const placeRing = (rNodes: typeof simNodes, radius: number) => {
        rNodes.forEach((node, idx) => {
          const angle = (2 * Math.PI * idx) / (rNodes.length || 1);
          node.fx = radius * Math.cos(angle);
          node.fy = radius * Math.sin(angle);
        });
      };

      placeRing(ring1Nodes, 160);
      placeRing(ring2Nodes, 270);
      placeRing(ring3Nodes, 380);
    } else if (layoutMode === 'pipeline') {
      const coreNode = simNodes.find((n) => n.category === 'core');
      if (coreNode) {
        coreNode.fx = 0;
        coreNode.fy = 0;
      }

      const upNodes = simNodes.filter((n) => n.category === 'upstream');
      const downNodes = simNodes.filter((n) => n.category === 'downstream');
      const subNodes = simNodes.filter((n) => n.category === 'subsidiary' || n.category === 'investment');
      const compNodes = simNodes.filter((n) => n.category === 'competitor' || n.category === 'joint_venture');

      // Left columns: Upstream
      upNodes.forEach((n, i) => {
        n.fx = -320;
        n.fy = (i - (upNodes.length - 1) / 2) * 75;
      });

      // Right column: Downstream
      downNodes.forEach((n, i) => {
        n.fx = 320;
        n.fy = (i - (downNodes.length - 1) / 2) * 75;
      });

      // Top / Bottom columns
      subNodes.forEach((n, i) => {
        n.fx = (i - (subNodes.length - 1) / 2) * 110;
        n.fy = 220;
      });

      compNodes.forEach((n, i) => {
        n.fx = (i - (compNodes.length - 1) / 2) * 110;
        n.fy = -220;
      });
    }

    // Force simulation
    const simulation = d3
      .forceSimulation<any>(simNodes)
      .force(
        'link',
        d3
          .forceLink<any, any>(simLinks)
          .id((d) => d.id)
          .distance((d) => (d.category === 'core' ? 120 : 160))
          .strength(layoutMode === 'force' ? 0.8 : 0.2)
      )
      .force(
        'charge',
        d3.forceManyBody().strength(layoutMode === 'force' ? -420 : -100)
      )
      .force('collide', d3.forceCollide().radius((d: any) => (d.val || 20) + 26))
      .force('center', d3.forceCenter(0, 0).strength(layoutMode === 'force' ? 0.05 : 0));

    // Links group
    const linkGroup = g.append('g').attr('class', 'links');

    const link = linkGroup
      .selectAll<SVGLineElement, any>('line')
      .data(simLinks)
      .enter()
      .append('line')
      .attr('stroke', (d: any) => CATEGORY_CONFIG[d.category as RelationshipCategory]?.color || '#8C9E9F')
      .attr('stroke-width', (d: any) => (d.category === 'core' ? 2 : 1.25))
      .attr('stroke-dasharray', (d: any) => (d.category === 'competitor' ? '4 3' : 'none'))
      .attr('stroke-opacity', (d: any) => (d.category === 'competitor' ? 0.75 : 0.6))
      .attr('marker-end', (d: any) => `url(#arrow-${d.category})`);

    // Link Labels
    const linkText = linkGroup
      .selectAll<SVGTextElement, any>('text')
      .data(simLinks)
      .enter()
      .append('text')
      .attr('font-size', '9px')
      .attr('font-family', 'sans-serif')
      .attr('fill', '#627578')
      .attr('text-anchor', 'middle')
      .attr('dy', -4)
      .text((d: any) => d.relation);

    // Nodes group
    const nodeGroup = g.append('g').attr('class', 'nodes');

    const node = nodeGroup
      .selectAll<SVGGElement, any>('g')
      .data(simNodes)
      .enter()
      .append('g')
      .attr('class', 'node-item')
      .attr('cursor', 'pointer')
      .on('click', (_event, d: any) => onNodeClick(d))
      .on('mouseenter', (_event: any, d: any) => {
        setHoveredNode(d);
        d3.select(_event.currentTarget as SVGGElement)
          .select('.main-circle')
          .transition()
          .duration(150)
          .attr('r', (d.val || 20) * 1.2)
          .attr('filter', 'url(#node-shadow)');
      })
      .on('mouseleave', (_event: any, d: any) => {
        setHoveredNode(null);
        d3.select(_event.currentTarget as SVGGElement)
          .select('.main-circle')
          .transition()
          .duration(150)
          .attr('r', d.val || 20)
          .attr('filter', d.id === highlightedNodeId ? 'url(#node-shadow)' : null);
      });

    // Drag behavior
    const drag = d3
      .drag<SVGGElement, any>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        if (layoutMode === 'force') {
          d.fx = null;
          d.fy = null;
        }
      });

    node.call(drag);

    // If core node, append outer concentric ring (Ink Seal ring)
    node
      .filter((d: any) => d.category === 'core')
      .append('circle')
      .attr('r', (d: any) => (d.val || 20) + 5)
      .attr('fill', 'none')
      .attr('stroke', '#3E6F73')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3 2')
      .attr('opacity', 0.8);

    // Main Node Circles
    node
      .append('circle')
      .attr('class', 'main-circle')
      .attr('r', (d: any) => d.val || 20)
      .attr('fill', (d: any) => {
        if (d.category === 'core') return '#1F3437';
        return '#FFFFFF';
      })
      .attr('stroke', (d: any) => {
        if (d.id === highlightedNodeId) return '#1F3437';
        if (d.category === 'core') return '#18292B';
        return CATEGORY_CONFIG[d.category as RelationshipCategory]?.color || '#8C9E9F';
      })
      .attr('stroke-width', (d: any) => {
        if (d.id === highlightedNodeId) return 3.5;
        return d.category === 'core' ? 2.5 : 2;
      })
      .attr('filter', 'url(#node-shadow)');

    // Category Badge Dots inside Node (for non-core nodes)
    node
      .filter((d: any) => d.category !== 'core')
      .append('circle')
      .attr('r', 3.5)
      .attr('cx', (d: any) => (d.val || 20) * 0.65)
      .attr('cy', (d: any) => -(d.val || 20) * 0.65)
      .attr('fill', (d: any) => CATEGORY_CONFIG[d.category as RelationshipCategory]?.color || '#627578');

    // Node Primary Labels
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', (d: any) => (d.category === 'core' ? '12px' : '10px'))
      .attr('font-family', (d: any) => (d.category === 'core' ? '"Noto Serif SC", serif' : 'sans-serif'))
      .attr('font-weight', (d: any) => (d.category === 'core' ? 'bold' : '600'))
      .attr('fill', (d: any) => (d.category === 'core' ? '#FAF8F5' : '#1F3437'))
      .text((d: any) => {
        const maxLen = d.category === 'core' ? 10 : 7;
        return d.label.length > maxLen ? `${d.label.slice(0, maxLen)}..` : d.label;
      });

    // Secondary sub-info label (under node)
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d: any) => (d.val || 20) + 14)
      .attr('font-size', '9px')
      .attr('fill', '#627578')
      .text((d: any) => (d.subInfo ? `${d.subInfo.slice(0, 10)}` : ''));

    // Simulation tick handler
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      linkText
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, dimensions, layoutMode, highlightedNodeId]);

  // Controls
  const handleZoom = (delta: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(zoomRef.current.scaleBy, delta);
  };

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomRef.current) return;
    const { width, height } = dimensions;
    d3.select(svgRef.current)
      .transition()
      .duration(350)
      .call(
        zoomRef.current.transform,
        d3.zoomIdentity.translate(width / 2, height / 2).scale(0.85)
      );
  };

  const toggleFilter = (cat: RelationshipCategory) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  return (
    <div
      className={`relative w-full bg-white shadow-xs overflow-hidden flex flex-col transition-all duration-200 ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none w-screen h-screen'
          : 'rounded-xs border border-[#E2E6E2]'
      }`}
    >
      {/* Top Toolbar Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[#E2E6E2] bg-[#FAFBF9] z-10">
        {/* Left: Layout Mode Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-serif font-semibold text-[#1F3437]">拓扑形态：</span>
          <div className="flex rounded-xs bg-[#F0F2EF] p-0.5 border border-[#E2E6E2]">
            <button
              onClick={() => setLayoutMode('force')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-serif rounded-xs transition-all ${
                layoutMode === 'force'
                  ? 'bg-[#1F3437] text-white font-bold shadow-xs'
                  : 'text-[#627578] hover:text-[#1F3437] hover:bg-white'
              }`}
            >
              <Network className="h-3.5 w-3.5" />
              <span>力导向网络</span>
            </button>

            <button
              onClick={() => setLayoutMode('concentric')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-serif rounded-xs transition-all ${
                layoutMode === 'concentric'
                  ? 'bg-[#1F3437] text-white font-bold shadow-xs'
                  : 'text-[#627578] hover:text-[#1F3437] hover:bg-white'
              }`}
            >
              <Orbit className="h-3.5 w-3.5" />
              <span>同心轨道</span>
            </button>

            <button
              onClick={() => setLayoutMode('pipeline')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-serif rounded-xs transition-all ${
                layoutMode === 'pipeline'
                  ? 'bg-[#3E6F73] text-white font-bold shadow-xs'
                  : 'text-[#627578] hover:text-[#1F3437] hover:bg-white'
              }`}
            >
              <GitMerge className="h-3.5 w-3.5" />
              <span>价值流动线</span>
            </button>
          </div>
        </div>

        {/* Center: In-Graph Node Search */}
        <div className="relative min-w-[200px] sm:min-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#3E6F73]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchNode(e.target.value)}
            placeholder="搜索图谱内实体并定位..."
            className="w-full rounded-xs border border-[#D4D9D4] bg-white pl-8 pr-3 py-1.5 text-xs text-[#1F3437] placeholder-[#8C9E9F] focus:outline-none focus:border-[#3E6F73]"
          />
        </div>

        {/* Right: Controls & High-Res Export */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleZoom(1.25)}
            className="rounded-xs p-1.5 text-[#627578] hover:bg-[#F6F7F5] hover:text-[#1F3437] border border-[#E2E6E2] bg-white transition-colors"
            title="放大"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleZoom(0.8)}
            className="rounded-xs p-1.5 text-[#627578] hover:bg-[#F6F7F5] hover:text-[#1F3437] border border-[#E2E6E2] bg-white transition-colors"
            title="缩小"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="rounded-xs p-1.5 text-[#627578] hover:bg-[#F6F7F5] hover:text-[#1F3437] border border-[#E2E6E2] bg-white transition-colors"
            title="重置视角"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`rounded-xs p-1.5 border transition-colors ${
              isFullscreen
                ? 'bg-[#1F3437] text-white border-[#1F3437]'
                : 'text-[#627578] hover:bg-[#F6F7F5] hover:text-[#1F3437] border-[#E2E6E2] bg-white'
            }`}
            title={isFullscreen ? '退出全屏 (ESC)' : '全屏透视沉浸检视'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Dual Export (PNG / SVG) */}
          <div className="flex items-center rounded-xs border border-[#E2E6E2] bg-white overflow-hidden shadow-2xs">
            <button
              onClick={handleExportPNG}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-serif font-medium text-[#1F3437] hover:bg-[#FAFBF9] border-r border-[#E2E6E2] transition-colors"
              title="导出高清PNG投研级拓扑图"
            >
              <Download className="h-3.5 w-3.5 text-[#3E6F73]" />
              <span>PNG</span>
            </button>
            <button
              onClick={handleExportSVG}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-serif font-medium text-[#627578] hover:text-[#1F3437] hover:bg-[#FAFBF9] transition-colors"
              title="导出矢量SVG原图(可无损放大编辑)"
            >
              <FileCode className="h-3.5 w-3.5 text-[#627578]" />
              <span>SVG</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Category Chips Bar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-[#FAFBF9] border-b border-[#E2E6E2] overflow-x-auto no-scrollbar">
        <span className="text-[11px] text-[#627578] font-serif flex items-center gap-1">
          <Filter className="h-3 w-3 text-[#3E6F73]" />
          <span>图层筛选：</span>
        </span>
        {(Object.keys(CATEGORY_CONFIG) as RelationshipCategory[]).map((catKey) => {
          const cfg = CATEGORY_CONFIG[catKey];
          const isActive = activeFilters.has(catKey);
          return (
            <button
              key={catKey}
              onClick={() => toggleFilter(catKey)}
              className={`flex items-center gap-1.5 rounded-xs px-2.5 py-0.5 text-[11px] font-medium border transition-all ${
                isActive
                  ? `${cfg.bgClass} shadow-2xs`
                  : 'bg-white border-[#E2E6E2] text-[#8C9E9F] hover:text-[#627578]'
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: isActive ? cfg.color : '#C4CCC4' }}
              />
              <span>{cfg.label}</span>
            </button>
          );
        })}

        {isFullscreen && (
          <span className="ml-auto text-[11px] text-[#8C9E9F] font-mono px-2 py-0.5 rounded-xs bg-white border border-[#E2E6E2]">
            按 ESC 键或点击右上角退出全屏
          </span>
        )}
      </div>

      {/* SVG Canvas Area */}
      <div
        ref={containerRef}
        className={`relative w-full bg-[#FBFBFA] ${
          isFullscreen ? 'flex-1 h-[calc(100vh-104px)]' : 'h-[540px]'
        }`}
      >
        <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Hovered Node Detail Tooltip Box */}
        {hoveredNode && (
          <div className="absolute bottom-4 left-4 z-20 max-w-sm rounded-xs border border-[#E2E6E2] bg-white/98 p-3.5 shadow-md backdrop-blur-md pointer-events-none space-y-1.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between gap-2">
              <span className="font-serif font-bold text-sm text-[#1F3437]">{hoveredNode.label}</span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-xs ${
                  CATEGORY_CONFIG[hoveredNode.category]?.bgClass
                }`}
              >
                {hoveredNode.groupLabel}
              </span>
            </div>
            {hoveredNode.details && (
              <p className="text-xs text-[#2D4245] leading-relaxed">{hoveredNode.details}</p>
            )}
            <div className="text-[10px] text-[#3E6F73] font-serif pt-1 border-t border-[#E2E6E2]">
              点击节点可展开深度产业链尽调档案 ➔
            </div>
          </div>
        )}

        {/* Bottom Legend Note */}
        <div className="absolute bottom-3 right-4 z-10 text-[10px] text-[#627578] font-serif bg-white/90 px-2.5 py-1 rounded-xs border border-[#E2E6E2] pointer-events-none shadow-2xs">
          支持滚轮缩放、拖拽画布及节点自由拉伸
        </div>
      </div>
    </div>
  );
};
