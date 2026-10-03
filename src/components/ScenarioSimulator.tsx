import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  TrendingDown,
  ArrowRight,
  Layers,
  Sliders,
  DollarSign,
  Building2,
  Cpu,
  Truck,
  CheckCircle2,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  CompanyPanoramaData,
  CascadeShockSimulationData,
  CascadeShockStage,
} from '../types';
import { getCascadeSimulationForCompany } from '../utils/forensicDataHelper';

interface ScenarioSimulatorProps {
  data: CompanyPanoramaData;
}

const PRESET_SHOCK_SCENARIOS = [
  {
    title: '海外高阶车规级芯片/核心控制器出口管制禁令',
    entity: '关键晶圆代工与高阶主控SoC芯片',
    type: '海外地缘政治出口管制与独家供应商突发断供',
  },
  {
    title: '关键电池矿产（锂/钴/镍）上游供给休克暴涨 +120%',
    entity: '上游关键矿产资源与正极高纯度前驱体',
    type: '大宗商品供给侧地缘紧缩与价格剧烈脉冲',
  },
  {
    title: '欧洲/美洲港口海运物流阻断与加征反补贴关税',
    entity: '远洋海运滚装航线与核心海外港口分销清关',
    type: '跨国关税壁垒升级与国际航运关键枢纽突发滞泊',
  },
];

export const ScenarioSimulator: React.FC<ScenarioSimulatorProps> = ({ data }) => {
  const companyName = data.basicInfo.name;

  // Selected disruption setup
  const [selectedEntity, setSelectedEntity] = useState<string>(
    data.upstream[0]?.name || '关键车规芯片与核心主控模组'
  );
  const [selectedType, setSelectedType] = useState<string>(
    '海外地缘政治出口管制与独家供应商突发断供'
  );

  // Simulation data
  const [simulationData, setSimulationData] = useState<CascadeShockSimulationData>(() =>
    getCascadeSimulationForCompany(data, { entity: selectedEntity, type: selectedType })
  );

  // Active Stage Index (0: Day 1-7, 1: Day 8-21, 2: Day 22-45, 3: Day 46-90)
  const [currentStageIdx, setCurrentStageIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize when active company changes
  useEffect(() => {
    const defaultEntity = data.upstream[0]?.name || '关键车规芯片与核心主控模组';
    setSelectedEntity(defaultEntity);
    const newSim = getCascadeSimulationForCompany(data, {
      entity: defaultEntity,
      type: selectedType,
    });
    setSimulationData(newSim);
    setCurrentStageIdx(0);
    setIsPlaying(false);
  }, [data.basicInfo.name]);

  // Auto-play interval
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = 2800 / playbackSpeed;
      timerRef.current = setInterval(() => {
        setCurrentStageIdx((prev) => {
          if (prev >= simulationData.stages.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, simulationData.stages.length]);

  const handleApplyPreset = (preset: typeof PRESET_SHOCK_SCENARIOS[0]) => {
    setSelectedEntity(preset.entity);
    setSelectedType(preset.type);
    const newSim = getCascadeSimulationForCompany(data, {
      entity: preset.entity,
      type: preset.type,
    });
    setSimulationData(newSim);
    setCurrentStageIdx(0);
    setIsPlaying(true);
  };

  const handleStartCustomSimulation = () => {
    const newSim = getCascadeSimulationForCompany(data, {
      entity: selectedEntity,
      type: selectedType,
    });
    setSimulationData(newSim);
    setCurrentStageIdx(0);
    setIsPlaying(true);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStageIdx(0);
  };

  const activeStage: CascadeShockStage =
    simulationData.stages[currentStageIdx] || simulationData.stages[0];

  return (
    <div className="w-full space-y-6">
      {simulationData._isSynthetic && (
        <div className="w-full rounded-xs border border-[#C4883A] bg-[#FFF8ED] px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-[#C4883A] shrink-0 mt-0.5" />
          <div className="text-xs text-[#7A5520] leading-relaxed">
            <span className="font-serif font-bold text-[#C4883A]">示例推演 · 未接入真实数据</span>
            <span className="mx-1.5 text-[#D4D9D4]">|</span>
            级联推演数值为预写模板占位，不代表真实供应链风险评估。接入 Sentinel-1 遥感与真实物流数据后将自动替换。
          </div>
        </div>
      )}
      {/* Top Header - Institutional Chinese Archive Style */}
      <div className="bg-white rounded-xs border border-[#1F3437] shadow-xs overflow-hidden">
        <div className="px-5 py-4 bg-[#1F3437] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2C4A4E]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xs bg-[#FAF8F5] text-[#1F3437] font-serif font-bold text-base shadow-xs">
              推
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono tracking-widest text-[#8C9E9F] uppercase">
                  CASCADE SHOCK SIMULATOR
                </span>
                <span className="text-[10px] px-1.5 py-0.2 bg-[#A84A3E]/20 text-[#E8A59E] border border-[#A84A3E]/40 rounded-xs">
                  因果时序级联沙盘
                </span>
              </div>
              <h2 className="font-serif text-base sm:text-lg font-bold text-[#FAF8F5] tracking-wide">
                【{companyName}】极端断供因果级联脆断推演沙盘
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8C9E9F]">综合抗脆断韧性评级:</span>
            <span className="px-2.5 py-0.5 rounded-xs font-serif font-bold text-xs bg-[#FAF8F5]/10 text-[#FAF8F5] border border-white/20">
              {simulationData.overallResilienceRating}
            </span>
          </div>
        </div>

        {/* Shock Preset and Custom Control Bar */}
        <div className="p-5 bg-[#F6F7F5] border-b border-[#E2E6E2] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[#627578] mb-1.5 block">
                设置受冲击震中节点 (Disruption Epicenter):
              </label>
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="w-full text-xs font-serif p-2 rounded-xs border border-[#E2E6E2] bg-white text-[#1F3437] focus:outline-none focus:border-[#1F3437]"
              >
                {data.upstream.map((up) => (
                  <option key={up.id} value={up.name}>
                    {up.name} ({up.supplies}) - 依赖度: {up.dependenceLevel}
                  </option>
                ))}
                <option value="关键车规级高阶主控SoC与智驾算力芯片">
                  关键车规级高阶主控SoC与智驾算力芯片
                </option>
                <option value="高纯度锂盐/正极高镍三元前驱体">
                  高纯度锂盐/正极高镍三元前驱体
                </option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-[#627578] mb-1.5 block">
                外部冲击类型 (Shock Scenario):
              </label>
              <input
                type="text"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                placeholder="例如：地缘政治出口管制、代工厂火灾、海外反倾销关税"
                className="w-full text-xs p-2 rounded-xs border border-[#E2E6E2] bg-white text-[#1F3437] focus:outline-none focus:border-[#1F3437]"
              />
            </div>
          </div>

          {/* Quick Presets & Start Simulation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[#627578] text-[11px] font-serif">快速推演情景:</span>
              {PRESET_SHOCK_SCENARIOS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="px-2 py-1 rounded-xs bg-white hover:bg-[#EAECE8] text-[#1F3437] border border-[#E2E6E2] text-[11px] transition-colors font-serif"
                >
                  {preset.title.slice(0, 16)}...
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleStartCustomSimulation}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1F3437] text-white rounded-xs text-xs font-serif font-medium hover:bg-[#3E6F73] transition-colors shadow-2xs shrink-0"
            >
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span>启动沙盘物理推演</span>
            </button>
          </div>
        </div>

        {/* Time Scrubber and Playback Bar */}
        <div className="p-4 sm:p-5 bg-white border-b border-[#E2E6E2] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-[#1F3437] text-white text-xs font-serif font-medium hover:bg-[#3E6F73] transition-colors"
                title={isPlaying ? '暂停推演' : '自动播放级联推演'}
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                <span>{isPlaying ? '暂停' : '播放'}</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 rounded-xs bg-[#F6F7F5] border border-[#E2E6E2] text-[#627578] hover:text-[#1F3437] text-xs transition-colors"
                title="重置到第1天"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 2 : 1)}
                className="px-2 py-1 rounded-xs bg-[#F6F7F5] border border-[#E2E6E2] text-xs font-mono text-[#1F3437] hover:bg-[#EAECE8] transition-colors"
                title="切换播放速度"
              >
                {playbackSpeed}x 速
              </button>

              <div className="h-4 w-px bg-[#E2E6E2] mx-1" />

              <span className="text-xs font-serif font-bold text-[#1F3437]">
                当前推演周期: <span className="text-[#A84A3E] font-mono">{activeStage.dayRange}</span>
              </span>
            </div>

            <div className="text-xs text-[#627578] font-mono">
              阶段 {currentStageIdx + 1} / {simulationData.stages.length} · 扩散半径：
              <span className="text-[#1F3437] font-semibold">{activeStage.impactRadius}</span>
            </div>
          </div>

          {/* Stepper Timeline Navigation */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
            {simulationData.stages.map((stage, idx) => {
              const isActive = idx === currentStageIdx;
              const isPast = idx < currentStageIdx;

              return (
                <button
                  key={stage.stageId}
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStageIdx(idx);
                  }}
                  className={`p-2.5 rounded-xs text-left border transition-all ${
                    isActive
                      ? 'bg-[#1F3437] text-white border-[#1F3437] shadow-sm'
                      : isPast
                      ? 'bg-[#F6F7F5] text-[#1F3437] border-[#3E6F73]/50 hover:border-[#1F3437]'
                      : 'bg-white text-[#627578] border-[#E2E6E2] hover:border-[#8C9E9F]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                    <span className={isActive ? 'text-[#8C9E9F]' : isPast ? 'text-[#3E6F73]' : 'text-[#8C9E9F]'}>
                      0{idx + 1}
                    </span>
                    <span className="font-bold">{stage.dayRange}</span>
                  </div>
                  <div
                    className={`text-xs font-serif font-medium line-clamp-1 ${
                      isActive ? 'text-[#FAF8F5]' : 'text-[#1F3437]'
                    }`}
                  >
                    {stage.stageTitle.split('：')[1] || stage.stageTitle}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Real-time Shock Meters (4 Quantitative Damage Indicators) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-xs border border-[#E2E6E2] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#627578] text-xs">
            <span className="font-serif">累积整车交付推迟</span>
            <Clock className="h-4 w-4 text-[#A84A3E]" />
          </div>
          <div className="text-xl sm:text-2xl font-serif font-bold text-[#A84A3E] font-mono">
            + {activeStage.systemicDamageMetrics.deliveryDelayWeeksCumulative} 周
          </div>
          <div className="text-[11px] text-[#8C9E9F]">
            整车产线降速与半成品积压周期
          </div>
        </div>

        <div className="p-4 bg-white rounded-xs border border-[#E2E6E2] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#627578] text-xs">
            <span className="font-serif">综合毛利率负向侵蚀</span>
            <TrendingDown className="h-4 w-4 text-[#3E6F73]" />
          </div>
          <div className="text-xl sm:text-2xl font-serif font-bold text-[#3E6F73] font-mono">
            - {activeStage.systemicDamageMetrics.grossMarginHitPercentCumulative}%
          </div>
          <div className="text-[11px] text-[#8C9E9F]">
            紧急空运溢价与固定资产折旧摊薄
          </div>
        </div>

        <div className="p-4 bg-white rounded-xs border border-[#E2E6E2] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#627578] text-xs">
            <span className="font-serif">直接财务损失敞口</span>
            <DollarSign className="h-4 w-4 text-[#1F3437]" />
          </div>
          <div className="text-sm sm:text-base font-serif font-bold text-[#1F3437]">
            {activeStage.systemicDamageMetrics.directFinancialLossEst}
          </div>
          <div className="text-[11px] text-[#8C9E9F]">
            违约金、加价备料及闲置摩擦
          </div>
        </div>

        <div className="p-4 bg-white rounded-xs border border-[#E2E6E2] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#627578] text-xs">
            <span className="font-serif">系统性违约破产风险率</span>
            <ShieldAlert className="h-4 w-4 text-amber-700" />
          </div>
          <div className="text-xl sm:text-2xl font-serif font-bold text-amber-700 font-mono">
            {activeStage.systemicDamageMetrics.defaultRiskRate}
          </div>
          <div className="text-[11px] text-[#8C9E9F]">
            依赖单源无二供时的脆断极限
          </div>
        </div>
      </div>

      {/* Main Cascade Propagation Topology & Node Shock States */}
      <div className="bg-white rounded-xs border border-[#E2E6E2] p-5 shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-[#E2E6E2] pb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#A84A3E]" />
            <h3 className="font-serif font-bold text-sm sm:text-base text-[#1F3437]">
              级联物理时序扩散链 (Cascade Transmission Pathway) · {activeStage.dayRange}
            </h3>
          </div>
          <span className="text-xs font-mono text-[#627578]">
            震中: {simulationData.disruptedEntity}
          </span>
        </div>

        {/* Physical Chain Flow Visualization */}
        <div className="relative p-4 sm:p-6 bg-[#F6F7F5] rounded-xs border border-[#E2E6E2] overflow-x-auto">
          <div className="min-w-[680px] flex items-center justify-between relative">
            {/* Connecting Line */}
            <div className="absolute top-1/2 left-8 right-8 h-1 bg-[#E2E6E2] -translate-y-1/2 z-0" />

            {/* Stage 1 Node: Epicenter */}
            <div
              className={`relative z-10 flex flex-col items-center text-center p-3 rounded-xs border transition-all ${
                currentStageIdx >= 0
                  ? 'bg-white border-[#A84A3E] shadow-sm'
                  : 'bg-white/80 border-[#E2E6E2]'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xs flex items-center justify-center mb-1.5 ${
                  currentStageIdx >= 0
                    ? 'bg-[#A84A3E] text-white animate-pulse'
                    : 'bg-[#E2E6E2] text-[#627578]'
                }`}
              >
                <Cpu className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-mono text-[#627578]">震中源头</span>
              <span className="text-xs font-serif font-bold text-[#1F3437] mt-0.5 max-w-[120px] truncate">
                {simulationData.disruptedEntity}
              </span>
              <span className="text-[10px] text-[#A84A3E] font-medium mt-1">
                {currentStageIdx >= 0 ? '停产休克' : '待命'}
              </span>
            </div>

            <ArrowRight className="h-4 w-4 text-[#627578] relative z-10 shrink-0" />

            {/* Stage 2 Node: Tier 1 Modules */}
            <div
              className={`relative z-10 flex flex-col items-center text-center p-3 rounded-xs border transition-all ${
                currentStageIdx >= 1
                  ? 'bg-white border-[#A84A3E] shadow-sm'
                  : 'bg-white/80 border-[#E2E6E2]'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xs flex items-center justify-center mb-1.5 ${
                  currentStageIdx >= 1
                    ? 'bg-[#A84A3E] text-white animate-pulse'
                    : 'bg-[#E2E6E2] text-[#627578]'
                }`}
              >
                <Layers className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-mono text-[#627578]">一级模组厂</span>
              <span className="text-xs font-serif font-bold text-[#1F3437] mt-0.5 max-w-[120px] truncate">
                Tier-1 总成中心
              </span>
              <span className="text-[10px] text-amber-700 font-medium mt-1">
                {currentStageIdx >= 1 ? '断料缺货' : '安全库存中'}
              </span>
            </div>

            <ArrowRight className="h-4 w-4 text-[#627578] relative z-10 shrink-0" />

            {/* Stage 3 Node: OEM Assembly */}
            <div
              className={`relative z-10 flex flex-col items-center text-center p-3 rounded-xs border transition-all ${
                currentStageIdx >= 2
                  ? 'bg-white border-[#A84A3E] shadow-sm'
                  : 'bg-white/80 border-[#E2E6E2]'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xs flex items-center justify-center mb-1.5 ${
                  currentStageIdx >= 2
                    ? 'bg-[#A84A3E] text-white animate-pulse'
                    : 'bg-[#E2E6E2] text-[#627578]'
                }`}
              >
                <Building2 className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-mono text-[#627578]">整机制造总装</span>
              <span className="text-xs font-serif font-bold text-[#1F3437] mt-0.5 max-w-[120px] truncate">
                {companyName} 本部
              </span>
              <span className="text-[10px] text-[#A84A3E] font-medium mt-1">
                {currentStageIdx >= 2 ? '降速轮休' : '正常产线'}
              </span>
            </div>

            <ArrowRight className="h-4 w-4 text-[#627578] relative z-10 shrink-0" />

            {/* Stage 4 Node: Downstream Delivery & Substitute */}
            <div
              className={`relative z-10 flex flex-col items-center text-center p-3 rounded-xs border transition-all ${
                currentStageIdx >= 3
                  ? 'bg-white border-[#3E6F73] shadow-sm'
                  : 'bg-white/80 border-[#E2E6E2]'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xs flex items-center justify-center mb-1.5 ${
                  currentStageIdx >= 3
                    ? 'bg-[#3E6F73] text-white'
                    : 'bg-[#E2E6E2] text-[#627578]'
                }`}
              >
                <Truck className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-mono text-[#627578]">终端客户与二供</span>
              <span className="text-xs font-serif font-bold text-[#1F3437] mt-0.5 max-w-[120px] truncate">
                自研二供重组
              </span>
              <span className="text-[10px] text-[#3E6F73] font-medium mt-1">
                {currentStageIdx >= 3 ? '替代并线达成' : '观望待交付'}
              </span>
            </div>
          </div>
        </div>

        {/* Affected Entities Detailed Cards in Active Stage */}
        <div className="space-y-2.5">
          <span className="text-xs font-serif font-bold text-[#1F3437] block">
            本阶段波及的核心节点与受损指标明细：
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeStage.affectedNodes.map((node) => (
              <div
                key={node.nodeId}
                className="p-3.5 bg-[#FAF8F5] rounded-xs border border-[#E8DFDD] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-serif font-bold text-[#1F3437]">
                    {node.name}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-xs font-medium border ${
                      node.status === 'halted'
                        ? 'bg-[#A84A3E]/10 text-[#A84A3E] border-[#A84A3E]/30'
                        : node.status === 'stockout'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : node.status === 'alternative_activated'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-[#3E6F73]/10 text-[#3E6F73] border-[#3E6F73]/30'
                    }`}
                  >
                    {node.statusLabel}
                  </span>
                </div>
                <div className="text-[11px] text-[#627578]">节点角色: {node.role}</div>
                <p className="text-xs text-[#2D4245] leading-relaxed pt-1 border-t border-[#F0EAE7]">
                  {node.metricHit}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Transmission Mechanism & Emergency Playbook */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Physical Mechanism */}
          <div className="p-4 bg-white rounded-xs border border-[#E2E6E2] space-y-2">
            <span className="text-xs font-serif font-bold text-[#1F3437] flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-[#A84A3E]" />
              物理传导脆断机理剖析:
            </span>
            <p className="text-xs text-[#2D4245] leading-relaxed bg-[#F6F7F5] p-3 rounded-xs border border-[#E2E6E2]">
              {activeStage.transmissionMechanism}
            </p>
          </div>

          {/* Emergency Countermeasure */}
          <div className="p-4 bg-white rounded-xs border border-[#E2E6E2] space-y-2">
            <span className="text-xs font-serif font-bold text-[#1F3437] flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#3E6F73]" />
              应急对冲实操方案 (Countermeasure):
            </span>
            <p className="text-xs text-[#2D4245] leading-relaxed bg-[#F6F7F5] p-3 rounded-xs border border-[#E2E6E2]">
              {activeStage.countermeasureAction}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Mitigation Playbook & Buffer Days */}
      <div className="bg-white rounded-xs border border-[#E2E6E2] p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#E2E6E2] pb-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#3E6F73]" />
            <h3 className="font-serif font-bold text-sm text-[#1F3437]">
              企业战略储备防御手牌 (Strategic Mitigation Playbook)
            </h3>
          </div>
          <span className="text-xs text-[#627578]">
            前置对冲能力保障
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {simulationData.mitigationPlaybook.map((play, idx) => (
            <div
              key={idx}
              className="p-3.5 bg-[#F6F7F5] rounded-xs border border-[#E2E6E2] space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#3E6F73]">防线 0{idx + 1}</span>
                <span className="text-[10px] font-mono text-[#1F3437] bg-white px-2 py-0.5 rounded-xs border border-[#E2E6E2]">
                  延缓 +{play.bufferDaysGained} 天
                </span>
              </div>
              <p className="text-xs font-serif font-bold text-[#1F3437] leading-snug">
                {play.tierAction}
              </p>
              <div className="text-[11px] text-[#627578]">
                预案成本影响: <span className="text-[#1F3437]">{play.costImpact}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
