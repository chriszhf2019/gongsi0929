import React, { useState } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import {
  Scale,
  Sparkles,
  ArrowRightLeft,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Building,
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { CompanyComparisonData } from '../types';

interface CompanyComparisonProps {
  initialCompanyA?: string;
  onSelectEntity?: (name: string, category: string, details?: string) => void;
}

const COMPARISON_PRESETS = [
  { nameA: '比亚迪', nameB: '特斯拉', label: '新能源车双雄：比亚迪 vs 特斯拉' },
  { nameA: '宁德时代', nameB: 'LG新能源', label: '动力电池巨头：宁德时代 vs LG新能源' },
  { nameA: '苹果', nameB: '华为', label: '智能终端与芯片生态：苹果 vs 华为' },
  { nameA: '台积电', nameB: '英特尔', label: '晶圆代工与先进制程：台积电 vs 英特尔' },
];

const DEFAULT_BYD_TESLA_COMPARISON: CompanyComparisonData = {
  companyA: {
    name: '比亚迪 (BYD)',
    industry: '新能源汽车与动力电池',
    marketCap: '约 7,800 亿元人民币',
    revenue: '约 6,023 亿元人民币',
    moatScore: 4.8,
    strategicSummary: '全球极罕见的“垂直一体化全产业链自制”模式，自产动力电池、IGBT半导体、驱动电机、车桥冲压件等90%核心部件。',
    radarScores: {
      supplyChainSelfReliance: 94,
      coreTechInHouseRate: 92,
      globalMarketCoverage: 70,
      verticalIntegrationDepth: 98,
      cvcEcosystemSynergy: 86,
      riskResilience: 92,
    },
    keyAdvantages: [
      '刀片电池+CTB技术自研自产，成本控制极致',
      '自建半导体与混动DM-i专用发动机，抗缺芯能力极强',
      '产品矩阵覆盖从7万到100万级全价格带',
    ],
    vulnerabilities: [
      '欧美地缘政治高关税壁垒增加出海成本',
      '高端化品牌溢价与智驾软件算法相较前沿有追赶空间',
    ],
  },
  companyB: {
    name: '特斯拉 (Tesla)',
    industry: '智能电动汽车与AI机器人',
    marketCap: '约 7,500 亿美元',
    revenue: '约 967 亿美元',
    moatScore: 4.7,
    strategicSummary: '以“核心软硬件自研+全球极致分工外采”为主，聚焦FSD自动驾驶神经网络芯片、4680电池研发，其余大量外采顶级供应链。',
    radarScores: {
      supplyChainSelfReliance: 75,
      coreTechInHouseRate: 90,
      globalMarketCoverage: 96,
      verticalIntegrationDepth: 72,
      cvcEcosystemSynergy: 80,
      riskResilience: 78,
    },
    keyAdvantages: [
      '全球超充网络与全球化品牌号召力极高',
      'FSD端到端大模型算法与自研Dojo/HW4芯片领先',
      '一体化大压铸与超级工厂极高自动化制造效率',
    ],
    vulnerabilities: [
      '动力电池对宁德时代、LG新能源等外部供应商有较强依赖',
      '车型更新迭代节奏相对放缓，面临白热化性价比竞争',
    ],
  },
  sharedSuppliers: [
    {
      name: '宁德时代 (CATL)',
      category: '动力锂电池',
      roleInA: '外部补充供应特定车型与海外储能电芯',
      roleInB: '上海及全球标续车型主力磷酸铁锂电池供应商',
    },
    {
      name: '福耀玻璃',
      category: '汽车安全与全景天幕玻璃',
      roleInA: '多款王朝/海洋网主力车型前挡与侧窗配套',
      roleInB: '全球超级工厂全景天幕与前挡玻璃主要供货方',
    },
    {
      name: '拓普集团',
      category: '轻量化底盘与一体化结构件',
      roleInA: '部分底盘悬挂与轻量化部件配套',
      roleInB: '一体化压铸结构件与热管理系统核心战略供应商',
    },
    {
      name: '法雷奥 / 博世',
      category: '底盘制动与智能车身系统',
      roleInA: 'ESC/ESP车身稳定控制与雷达传感部件',
      roleInB: '刹车制动总成与安全气囊传感器',
    },
  ],
  differentiatedUpstream: {
    companyAName: '比亚迪 (自制为主)',
    companyASuppliers: ['比亚迪半导体 (自研自产)', '弗迪电池 (自研刀片)', '弗迪动力', '盛新锂能', '天齐锂业'],
    companyBName: '特斯拉 (全球顶尖外采)',
    companyBSuppliers: ['松下 (Panasonic)', 'LG新能源', 'AMD (座舱芯片)', '英伟达 (算力集群)', '意法半导体 (SiC)'],
  },
  downstreamChannelComparison: [
    {
      dimension: '销售与分销渠道模式',
      companyAStrategy: '“直营+庞大授权经销商”双轨并行，下沉市场渗透极深',
      companyBStrategy: '100% 直营体验店与线上透明定价订购体系',
    },
    {
      dimension: '全球市场结构',
      companyAStrategy: '国内市场占主力（约70%+），正强力拓展欧洲、东南亚、拉美',
      companyBStrategy: '北美、中国、欧洲三大市场均衡分流，全球渗透度高',
    },
    {
      dimension: '补能与生态服务',
      companyAStrategy: '兼顾混动DM-i与纯电，家用充电桩与第三方公充兼容',
      companyBStrategy: '自建全球庞大V3/V4超级充电桩生态，形成闭环网络壁垒',
    },
  ],
  strategicVerdict:
    '【产业链综合对比结论】：比亚迪在“全产业链抗风险自给率”、“成本极致穿透”与“混动/纯电双轮驱动”上具备无与伦比的规模优势；而特斯拉在“全球化品牌溢价”、“端到端AI智能驾驶算力生态”及“全球超级工厂制造效率”上保持标杆地位。两者代表了新能源时代“垂直全闭环制造”与“全球软件AI定义汽车”的两种终极竞争形态。',
};

const PRESET_COMPARISONS: Record<string, CompanyComparisonData> = {
  '比亚迪_特斯拉': DEFAULT_BYD_TESLA_COMPARISON,
  '宁德时代_LG新能源': {
    companyA: {
      name: '宁德时代 (CATL)',
      industry: '动力电池与储能系统',
      marketCap: '约 10,200 亿元人民币',
      revenue: '约 4,009 亿元人民币',
      moatScore: 4.9,
      strategicSummary: '全球动力电池与储能电池绝对龙头，依托极致极限制造良品率 (PPB级) 与超大规模采购成本优势。',
      radarScores: {
        supplyChainSelfReliance: 92,
        coreTechInHouseRate: 94,
        globalMarketCoverage: 85,
        verticalIntegrationDepth: 90,
        cvcEcosystemSynergy: 92,
        riskResilience: 88,
      },
      keyAdvantages: [
        '麒麟电池与神行超充电池技术代差领跑',
        '全球动力电池连续 7 年市占率第一',
        '储能业务高毛利出海放量',
      ],
      vulnerabilities: [
        '美国 IRA 法案限制直接补贴准入',
        '车企扶持二供与自研电芯意愿增加',
      ],
    },
    companyB: {
      name: 'LG新能源 (LG Energy Solution)',
      industry: '动力电池与先进材料',
      marketCap: '约 580 亿美元',
      revenue: '约 255 亿美元',
      moatScore: 4.3,
      strategicSummary: '韩国动力电池巨头，欧美车企合资工厂多地落地，享受北美 IRA 补贴政策红利。',
      radarScores: {
        supplyChainSelfReliance: 78,
        coreTechInHouseRate: 85,
        globalMarketCoverage: 92,
        verticalIntegrationDepth: 74,
        cvcEcosystemSynergy: 82,
        riskResilience: 80,
      },
      keyAdvantages: [
        '北美本地合资建厂进度领先 (通用/本田/Stellantis)',
        '三元高镍软包与圆柱电池技术成熟',
      ],
      vulnerabilities: [
        '磷酸铁锂 (LFP) 布局滞后，综合制造成本偏高',
        '海外合资工厂开工稼动率与良品率承压',
      ],
    },
    sharedSuppliers: [
      {
        name: '恩捷股份 (002812.SZ)',
        category: '湿法锂电隔膜',
        roleInA: '主力隔膜一供，全球基地战略锁定',
        roleInB: '海外电池产线隔膜重要外部供应商',
      },
      {
        name: '天赐材料 (002709.SZ)',
        category: '锂离子电解液',
        roleInA: '电解液核心集采保供伙伴',
        roleInB: '部分合资工厂电解液采购方',
      },
      {
        name: '先导智能 (300450.SZ)',
        category: '锂电整线装备',
        roleInA: '欧洲超级工厂设备总包与深度联合研发',
        roleInB: '部分后道化成分容与卷绕设备供应商',
      },
    ],
    differentiatedUpstream: {
      companyAName: '宁德时代 (本土完整闭环)',
      companyASuppliers: ['湖南裕能 (正极)', '德方纳米 (磷酸铁锂)', '璞泰来 (负极)', '广东邦普 (回收提锂)'],
      companyBName: 'LG新能源 (日韩美日供应链)',
      companyBSuppliers: ['LG Chem (母公司正极)', '浦项制铁 POSCO (正负极)', 'W-Scope (隔膜)', 'SK IE Technology'],
    },
    downstreamChannelComparison: [
      {
        dimension: '核心战略客户绑定',
        companyAStrategy: '特斯拉、宝马、理想、极氪、奔驰、大众新平台定点',
        companyBStrategy: '通用汽车 (Ultium)、现代起亚、福特、Stellantis',
      },
      {
        dimension: '技术授权与轻资产出海',
        companyAStrategy: '创新 LRS 许可与技术授权模式 (福特合作) 破局北美',
        companyBStrategy: '重资产合资建厂直接获得欧美政府税收补贴',
      },
    ],
    strategicVerdict:
      '【电池双雄对标结论】：宁德时代在“技术代差（超充神行/麒麟）”、“极限制造良品率”及“单位制造成本”上具备压倒性优势；LG新能源则凭借“欧美地缘合规优势”与“北美合资深耕”构筑防线。随着宁德时代匈牙利超级工厂落成与 LRS 授权模式推进，全球格局正加速向中国头部电池集中。',
  },
  '苹果_华为': {
    companyA: {
      name: '苹果 (Apple Inc.)',
      industry: '消费电子与全球闭环生态',
      marketCap: '约 3.4 万亿美元',
      revenue: '约 3,832 亿美元',
      moatScore: 5.0,
      strategicSummary: '软硬件一体化极致自研 (A/M系列芯片 + iOS/macOS)，22亿活跃设备超高用户转换成本，服务业高毛利造血。',
      radarScores: {
        supplyChainSelfReliance: 70,
        coreTechInHouseRate: 92,
        globalMarketCoverage: 98,
        verticalIntegrationDepth: 80,
        cvcEcosystemSynergy: 88,
        riskResilience: 82,
      },
      keyAdvantages: [
        'A/M系列自研芯片算力能效领先，包揽台积电最先进制程首发',
        '全球高端智能手机利润份额超 80%',
        '服务业务毛利率超 74%，抗硬件周期波动',
      ],
      vulnerabilities: [
        '先进制程独家代工单源依赖台积电',
        '全球反垄断 (欧盟DMA) 对闭环生态实施强制开放',
      ],
    },
    companyB: {
      name: '华为 (Huawei)',
      industry: 'ICT基础设施、算力芯片与终端',
      marketCap: '估值约 1.8 万亿元人民币',
      revenue: '约 7,042 亿元人民币',
      moatScore: 4.9,
      strategicSummary: '年研发投入超千亿的极限硬核攻坚，全栈突破麒麟/昇腾芯片、纯血鸿蒙操作系统 (HarmonyOS NEXT) 及智能车生态。',
      radarScores: {
        supplyChainSelfReliance: 94,
        coreTechInHouseRate: 96,
        globalMarketCoverage: 75,
        verticalIntegrationDepth: 92,
        cvcEcosystemSynergy: 94,
        riskResilience: 95,
      },
      keyAdvantages: [
        '全栈自研纯血鸿蒙，彻底摆脱海外操作系统内核依赖',
        '昇腾算力生态+CANN架构成为国内大模型算力核心支柱',
        '鸿蒙智行联盟赋能车企打造豪华爆款矩阵',
      ],
      vulnerabilities: [
        '先进制程晶圆代工与高端光刻设备受海外出口管制约束',
        '海外欧美高端消费电子市场面临地缘准入壁垒',
      ],
    },
    sharedSuppliers: [
      {
        name: '京东方 (000725.SZ)',
        category: '柔性 OLED 屏幕面板',
        roleInA: 'iPhone 及 iPad 柔性 OLED 面板重要供应商',
        roleInB: 'Mate 系列及三折叠手机核心主供与联合研发',
      },
      {
        name: '立讯精密 (002475.SZ)',
        category: '精密电子制造与声学',
        roleInA: 'iPhone、Apple Watch、Vision Pro 核心代工',
        roleInB: '通信基站连接器与智能穿戴精密组件供应',
      },
      {
        name: '比亚迪电子 (0285.HK)',
        category: '精密金属/玻璃结构件与组装',
        roleInA: 'iPad 及相关精密结构件主力代工厂',
        roleInB: '旗舰手机中框与精密外观件重要制造伙伴',
      },
    ],
    differentiatedUpstream: {
      companyAName: '苹果 (全球顶尖无障碍代工)',
      companyASuppliers: ['台积电 (3nm独家首发)', '三星显示 (超高亮M系列OLED)', '高通 (5G基带芯片)', '索尼 (CIS图像传感器)'],
      companyBName: '华为 (国产根技术闭环)',
      companyBSuppliers: ['中芯国际 (本土先进制程代工)', '哈勃投资半导体生态', '长鑫/长存 (存储)', '思瑞浦/圣邦 (模拟芯片)'],
    },
    downstreamChannelComparison: [
      {
        dimension: '操作系统与应用生态',
        companyAStrategy: 'iOS 闭环生态，App Store 统一全球分发并抽取高额分成',
        companyBStrategy: 'HarmonyOS NEXT 纯血鸿蒙，万物智联打通手机/PC/车机全场景',
      },
      {
        dimension: '智能汽车生态打法',
        companyAStrategy: '终止 Titan 整车项目，聚焦 CarPlay 映射投屏',
        companyBStrategy: '鸿蒙智行联盟深度掌控座舱+智驾底座，引望独立对外赋能',
      },
    ],
    strategicVerdict:
      '【科技双雄对标结论】：苹果代表了“全球化开放分工下软硬件一体化的极致商业变现”；华为则代表了“面对极端外部围堵下硬核根技术全栈自立的极致工程韧性”。双方在高端智能终端、端侧 AI 以及下一代人机交互操作系统上的碰撞，构成未来十年全球科技竞争的最大主线。',
  },
  '台积电_英特尔': {
    companyA: {
      name: '台积电 (TSMC)',
      industry: '全球半导体晶圆代工制造',
      marketCap: '约 9,000 亿美元',
      revenue: '约 693 亿美元',
      moatScore: 5.0,
      strategicSummary: '全球先进制程代工市占超 90%，坚守纯代工不与客户竞争商业道德，CoWoS先进封装垄断全球AI算力出货。',
      radarScores: {
        supplyChainSelfReliance: 75,
        coreTechInHouseRate: 92,
        globalMarketCoverage: 98,
        verticalIntegrationDepth: 70,
        cvcEcosystemSynergy: 90,
        riskResilience: 80,
      },
      keyAdvantages: [
        'N3/N2 先进制程良品率高、交付信用无可匹敌',
        '全球 AI 算力芯片 (英伟达/AMD/苹果) 独家制造底座',
        '毛利率长期保持 53%+ 产生充沛资本开支复利',
      ],
      vulnerabilities: [
        '台湾海峡地缘政治与地震自然灾害集中度高',
        '海外多中心建厂 (美/日/德) 面临高成本与工会文化摩擦',
      ],
    },
    companyB: {
      name: '英特尔 (Intel Corporation)',
      industry: '半导体设计与 IDM 制造',
      marketCap: '约 950 亿美元',
      revenue: '约 542 亿美元',
      moatScore: 3.8,
      strategicSummary: '传统 x86 架构 PC/服务器 CPU 霸主，推进“四年五个制程节点”转型，重金打造独立代工服务 (Intel Foundry)。',
      radarScores: {
        supplyChainSelfReliance: 80,
        coreTechInHouseRate: 88,
        globalMarketCoverage: 85,
        verticalIntegrationDepth: 88,
        cvcEcosystemSynergy: 76,
        riskResilience: 82,
      },
      keyAdvantages: [
        '美国芯片法案最大受惠者，美国本土晶圆制造战略安全背书',
        '全球首家商用 High-NA EUV 光刻机 (Intel 18A 工艺)',
        'x86 服务器与传统 PC 软件生态底蕴深厚',
      ],
      vulnerabilities: [
        '晶圆代工巨额亏损承压，外部大客户信任尚未完全建立',
        '移动端与 AI 算力 GPU 市场份额被英伟达/高通/AMD 剧烈挤压',
      ],
    },
    sharedSuppliers: [
      {
        name: '阿斯麦 (ASML)',
        category: '极紫外光刻机 (EUV)',
        roleInA: '长期锁定大批量 High-NA EUV 与标准 EUV 机台配额',
        roleInB: '首家接收 ASML High-NA EUV (EXE:5000) 商业机台',
      },
      {
        name: '应用材料 (Applied Materials)',
        category: '薄膜沉积与 CMP 抛光设备',
        roleInA: '先进制程晶圆产线核心设备供应商',
        roleInB: '全球晶圆超级工厂主要工艺设备战略伙伴',
      },
      {
        name: '新思科技 (Synopsys) / 楷登电子 (Cadence)',
        category: 'EDA 电子设计自动化与 IP',
        roleInA: 'OIP 开放创新平台基础工具与晶圆 PDK 认证',
        roleInB: '芯片架构设计与自研处理器关键 EDA 支撑',
      },
    ],
    differentiatedUpstream: {
      companyAName: '台积电 (全球生态网络协同)',
      companyASuppliers: ['东京电子 (清洗/刻蚀)', '科林研发 (高精度刻蚀)', '信越化学 (硅片)', 'JSR (EUV光刻胶)'],
      companyBName: '英特尔 (欧美为主 IDM 供应链)',
      companyBSuppliers: ['环球晶圆 (大硅片)', 'KLA (光学量测与缺陷质检)', '杜邦 DuPont (先进封装材料)'],
    },
    downstreamChannelComparison: [
      {
        dimension: '商业模式与利益隔离',
        companyAStrategy: '100% 纯晶圆代工，绝不自研芯片，永不与客户竞争',
        companyBStrategy: 'IDM 自研 CPU 销售为主，正努力分拆代工部门建立客户防火墙',
      },
      {
        dimension: 'AI 算力超级周期受益度',
        companyAStrategy: '通吃英伟达 Blackwell、AMD MI300 及云厂商定制 ASIC',
        companyBStrategy: 'Gaudi AI 加速器出货规模相对有限，依赖 PC 端 Core Ultra 换机',
      },
    ],
    strategicVerdict:
      '【半导体制造对标结论】：台积电凭借“纯代工模式的客户互信”、“难以逾越的良品率工程代差”与“CoWoS 先进封装生态”，在先进制程代工领域处于垄断地位；英特尔则依靠“美国本土制造战略安全补贴”与“18A 工艺重注”全力追赶。短期内台积电在 AI 时代的制造霸权难以撼动。',
  },
};

export const CompanyComparison: React.FC<CompanyComparisonProps> = ({
  initialCompanyA = '比亚迪',
  onSelectEntity,
}) => {
  const [compA, setCompA] = useState(initialCompanyA);
  const [compB, setCompB] = useState('特斯拉');
  const [comparisonData, setComparisonData] = useState<CompanyComparisonData>(DEFAULT_BYD_TESLA_COMPARISON);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunComparison = async (nameA: string, nameB: string) => {
    if (!nameA.trim() || !nameB.trim()) return;
    setIsLoading(true);
    setError(null);

    // Check pre-rendered dictionary presets
    const cleanA = nameA.trim();
    const cleanB = nameB.trim();
    const matchKey = Object.keys(PRESET_COMPARISONS).find(k => {
      const [pA, pB] = k.split('_');
      return (
        (cleanA.includes(pA) && cleanB.includes(pB)) ||
        (cleanA.includes(pB) && cleanB.includes(pA))
      );
    });

    if (matchKey && PRESET_COMPARISONS[matchKey]) {
      setTimeout(() => {
        setComparisonData(PRESET_COMPARISONS[matchKey]);
        setIsLoading(false);
      }, 150);
      return;
    }

    try {
      const response = await fetch('/api/compare-companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyA: cleanA, companyB: cleanB }),
      });

      if (!response.ok) {
        throw new Error('获取对比数据失败，请重试');
      }

      const result: CompanyComparisonData = await response.json();
      setComparisonData(result);
    } catch (err: any) {
      console.error('Comparison error:', err);
      setError(err.message || '生成产业链对标分析失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPreset = (preset: typeof COMPARISON_PRESETS[0]) => {
    setCompA(preset.nameA);
    setCompB(preset.nameB);
    handleRunComparison(preset.nameA, preset.nameB);
  };


  // Prepare radar chart data
  const radarChartData = [
    {
      subject: '供应链自主度',
      A: comparisonData.companyA.radarScores.supplyChainSelfReliance,
      B: comparisonData.companyB.radarScores.supplyChainSelfReliance,
      fullMark: 100,
    },
    {
      subject: '核心技术自研率',
      A: comparisonData.companyA.radarScores.coreTechInHouseRate,
      B: comparisonData.companyB.radarScores.coreTechInHouseRate,
      fullMark: 100,
    },
    {
      subject: '全球化覆盖度',
      A: comparisonData.companyA.radarScores.globalMarketCoverage,
      B: comparisonData.companyB.radarScores.globalMarketCoverage,
      fullMark: 100,
    },
    {
      subject: '垂直一体化深度',
      A: comparisonData.companyA.radarScores.verticalIntegrationDepth,
      B: comparisonData.companyB.radarScores.verticalIntegrationDepth,
      fullMark: 100,
    },
    {
      subject: '资本生态协同',
      A: comparisonData.companyA.radarScores.cvcEcosystemSynergy,
      B: comparisonData.companyB.radarScores.cvcEcosystemSynergy,
      fullMark: 100,
    },
    {
      subject: '断供与地缘抗击力',
      A: comparisonData.companyA.radarScores.riskResilience,
      B: comparisonData.companyB.radarScores.riskResilience,
      fullMark: 100,
    },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Header & Preset Selector */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-base">
            <ArrowRightLeft className="h-5 w-5" />
            <span>产业链与商业模式横向对标工作台 (Benchmark Arena)</span>
          </div>
          <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700/60">
            多维供应链雷达 · 供应商重合度穿透
          </span>
        </div>

        {/* Inputs Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-cyan-400 mb-1 block">对标公司 A</label>
            <input
              type="text"
              value={compA}
              onChange={(e) => setCompA(e.target.value)}
              placeholder="如：比亚迪"
              className="w-full rounded-xl border border-cyan-800/60 bg-slate-950 px-3.5 py-2 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="flex justify-center sm:col-span-1 pt-4 sm:pt-0">
            <span className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
              VS
            </span>
          </div>

          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-indigo-400 mb-1 block">对标公司 B</label>
            <input
              type="text"
              value={compB}
              onChange={(e) => setCompB(e.target.value)}
              placeholder="如：特斯拉"
              className="w-full rounded-xl border border-indigo-800/60 bg-slate-950 px-3.5 py-2 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px]">快捷对标方案：</span>
            {COMPARISON_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectPreset(preset)}
                className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] text-slate-300 border border-slate-700/60 transition-colors"
              >
                {preset.nameA} vs {preset.nameB}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleRunComparison(compA, compB)}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 transition-all"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>对标计算中...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>发起深度对标分析</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Comparison Body */}
      {comparisonData && (
        <div className="space-y-6">
          {/* 1. Radar & Strategic Summary Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Recharts Radar Chart */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-2">
                  <span className="text-xs font-bold text-slate-200">产业链战略多维雷达 (6-Dim Capabilities)</span>
                  <span className="text-[10px] text-slate-400">满分 100</span>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarChartData}>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={10} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={9} />
                      <Radar
                        name={comparisonData.companyA.name}
                        dataKey="A"
                        stroke="#06b6d4"
                        fill="#06b6d4"
                        fillOpacity={0.4}
                      />
                      <Radar
                        name={comparisonData.companyB.name}
                        dataKey="B"
                        stroke="#818cf8"
                        fill="#818cf8"
                        fillOpacity={0.4}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 text-center pt-2 border-t border-slate-800/80">
                青色：{comparisonData.companyA.name} | 紫色：{comparisonData.companyB.name}
              </div>
            </div>

            {/* Right: Side-by-Side Fundamentals */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Company A Card */}
              <div className="rounded-2xl border border-cyan-800/60 bg-cyan-950/15 p-5 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-cyan-900/60">
                    <h3 className="text-base font-bold text-cyan-300 truncate">
                      {comparisonData.companyA.name}
                    </h3>
                    <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800">
                      护城河: {comparisonData.companyA.moatScore}/5.0
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-900/80 p-2 border border-slate-800">
                      <div className="text-[10px] text-slate-400">市值/估值</div>
                      <div className="font-bold text-white truncate">{comparisonData.companyA.marketCap}</div>
                    </div>
                    <div className="rounded-lg bg-slate-900/80 p-2 border border-slate-800">
                      <div className="text-[10px] text-slate-400">营收体量</div>
                      <div className="font-bold text-white truncate">{comparisonData.companyA.revenue}</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {comparisonData.companyA.strategicSummary}
                  </p>

                  <div className="space-y-1.5 pt-2">
                    <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      核心竞争优势：
                    </div>
                    <ul className="space-y-1 text-xs text-slate-300">
                      {comparisonData.companyA.keyAdvantages.map((adv, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-emerald-400 shrink-0 mt-0.5">•</span>
                          <span>{adv}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Company B Card */}
              <div className="rounded-2xl border border-indigo-800/60 bg-indigo-950/15 p-5 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-900/60">
                    <h3 className="text-base font-bold text-indigo-300 truncate">
                      {comparisonData.companyB.name}
                    </h3>
                    <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">
                      护城河: {comparisonData.companyB.moatScore}/5.0
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-900/80 p-2 border border-slate-800">
                      <div className="text-[10px] text-slate-400">市值/估值</div>
                      <div className="font-bold text-white truncate">{comparisonData.companyB.marketCap}</div>
                    </div>
                    <div className="rounded-lg bg-slate-900/80 p-2 border border-slate-800">
                      <div className="text-[10px] text-slate-400">营收体量</div>
                      <div className="font-bold text-white truncate">{comparisonData.companyB.revenue}</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {comparisonData.companyB.strategicSummary}
                  </p>

                  <div className="space-y-1.5 pt-2">
                    <div className="text-[11px] font-semibold text-indigo-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      核心竞争优势：
                    </div>
                    <ul className="space-y-1 text-xs text-slate-300">
                      {comparisonData.companyB.keyAdvantages.map((adv, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-indigo-400 shrink-0 mt-0.5">•</span>
                          <span>{adv}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Shared Overlapping Suppliers vs Differentiated Matrix */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Layers className="h-4 w-4" />
                <span>上游供应链穿透：重合供应商 vs 差异化独家供应商</span>
              </div>
              <span className="text-xs text-slate-400">
                共有供应链生态节点：{comparisonData.sharedSuppliers.length} 家
              </span>
            </div>

            {/* Overlapping Suppliers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {comparisonData.sharedSuppliers.map((sup, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectEntity?.(sup.name, '重合供应商', `角色A: ${sup.roleInA}\n角色B: ${sup.roleInB}`)}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 hover:border-cyan-600/60 cursor-pointer transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-100">{sup.name}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                      {sup.category}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
                    <div>
                      <span className="text-cyan-400 font-medium">在 {comparisonData.companyA.name.slice(0, 4)}：</span>
                      <span className="text-slate-400 block truncate">{sup.roleInA}</span>
                    </div>
                    <div>
                      <span className="text-indigo-400 font-medium">在 {comparisonData.companyB.name.slice(0, 4)}：</span>
                      <span className="text-slate-400 block truncate">{sup.roleInB}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Differentiated Unique Suppliers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl border border-cyan-900/60 bg-cyan-950/20 p-3.5">
                <div className="text-xs font-bold text-cyan-300 mb-2">
                  {comparisonData.differentiatedUpstream.companyAName} 特色/自研供应链：
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(comparisonData.differentiatedUpstream.companyASuppliers || []).map((s, i) => (
                    <span key={i} className="text-[11px] bg-cyan-950 px-2.5 py-1 rounded-md text-cyan-200 border border-cyan-800">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-indigo-900/60 bg-indigo-950/20 p-3.5">
                <div className="text-xs font-bold text-indigo-300 mb-2">
                  {comparisonData.differentiatedUpstream.companyBName} 特色/外采供应链：
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(comparisonData.differentiatedUpstream.companyBSuppliers || []).map((s, i) => (
                    <span key={i} className="text-[11px] bg-indigo-950 px-2.5 py-1 rounded-md text-indigo-200 border border-indigo-800">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Downstream Channels & Strategic Verdict */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-4">
            <div className="text-xs font-bold text-slate-200 pb-2 border-b border-slate-800">
              下游客群、商业渠道与出海模式深度对照
            </div>

            <div className="space-y-2">
              {comparisonData.downstreamChannelComparison.map((row, idx) => (
                <div key={idx} className="rounded-xl bg-slate-950/70 p-3 border border-slate-800 text-xs grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="font-semibold text-slate-300">{row.dimension}</div>
                  <div className="text-cyan-300">{row.companyAStrategy}</div>
                  <div className="text-indigo-300">{row.companyBStrategy}</div>
                </div>
              ))}
            </div>

            {/* Strategic Verdict Quote */}
            <div className="rounded-xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 p-4 border border-slate-700/60">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 mb-1.5">
                <Sparkles className="h-4 w-4" />
                <span>资深产业分析师对标总结</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {comparisonData.strategicVerdict}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
