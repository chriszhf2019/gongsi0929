import React, { useState, useEffect } from 'react';
import {
  AnomalyItem,
  EvidenceCrossSource,
  FieldInvestigationTask,
} from '../types';
import { getForensicEvidenceForAnomaly } from '../utils/forensicDataHelper';
import {
  X,
  ShieldAlert,
  Scale,
  FileText,
  Compass,
  CheckCircle2,
  Circle,
  AlertTriangle,
  ExternalLink,
  Download,
  Copy,
  Check,
  Building2,
  Fingerprint,
  Calculator,
  Eye,
  BookOpen,
  HelpCircle,
  FileCheck2,
} from 'lucide-react';

interface EvidenceWorkbenchModalProps {
  isOpen: boolean;
  onClose: () => void;
  anomaly: AnomalyItem | null;
  companyName: string;
}

const STORAGE_KEY_PREFIX = 'gensight_checklist_';

export const EvidenceWorkbenchModal: React.FC<EvidenceWorkbenchModalProps> = ({
  isOpen,
  onClose,
  anomaly,
  companyName,
}) => {
  if (!isOpen || !anomaly) return null;

  const forensicData: EvidenceCrossSource = getForensicEvidenceForAnomaly(
    anomaly,
    companyName
  );

  const storageKey = `${STORAGE_KEY_PREFIX}${anomaly.id}`;

  // Interactive Checklist state
  const [tasks, setTasks] = useState<FieldInvestigationTask[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load saved checklist', e);
    }
    return forensicData.fieldInvestigationChecklist;
  });

  const [activeTab, setActiveTab] = useState<'compare' | 'formula' | 'checklist'>('compare');
  const [copiedFormula, setCopiedFormula] = useState(false);
  const [activeNoteTaskId, setActiveNoteTaskId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<string>('');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Sync when anomaly changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setTasks(JSON.parse(saved));
      } else {
        setTasks(forensicData.fieldInvestigationChecklist);
      }
    } catch {
      setTasks(forensicData.fieldInvestigationChecklist);
    }
  }, [anomaly.id, storageKey]);

  // Save checklist state to localStorage
  const handleToggleTask = (taskId: string) => {
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t));
    setTasks(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save checklist', e);
    }
  };

  const handleSaveNote = (taskId: string) => {
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, auditorNotes: noteText.trim() } : t
    );
    setTasks(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save note', e);
    }
    setActiveNoteTaskId(null);
    setNoteText('');
  };

  const handleCopyFormula = () => {
    if (forensicData.auditVerdict.forensicFormula) {
      navigator.clipboard.writeText(forensicData.auditVerdict.forensicFormula);
      setCopiedFormula(true);
      setTimeout(() => setCopiedFormula(false), 2000);
    }
  };

  const handleExportForensicSheet = () => {
    const content = `【源察·GenSight】首席调查官商业反常多源交叉核验底稿
=====================================================
公司主体: ${companyName}
核验标题: ${anomaly.title}
反常标签: ${anomaly.tag}
严重等级: ${anomaly.severity === 'high' ? '高度反常' : '温和张力'}
核验时间: ${new Date().toLocaleString()}

一、企业披露口径 (Official Claim)
-----------------------------------------------------
声明陈述: ${forensicData.companyClaim.statement}
披露来源: ${forensicData.companyClaim.sourceDocument}
声称指标: ${forensicData.companyClaim.claimedMetric}
披露日期: ${forensicData.companyClaim.filingDate}
审计意见: ${forensicData.companyClaim.auditorSignoff || '标准无保留意见'}

二、第三方客观多源比对 (Objective Benchmark)
-----------------------------------------------------
多源类别: ${forensicData.objectiveBenchmark.sourceTypeName}
客观发现: ${forensicData.objectiveBenchmark.finding}
背离幅度: ${forensicData.objectiveBenchmark.discrepancyDelta}
佐证依据: ${forensicData.objectiveBenchmark.benchmarkEvidence}

三、神经符号勾稽求解与裁定 (Neuro-Symbolic Verdict)
-----------------------------------------------------
置信度评分: ${forensicData.auditVerdict.confidenceScore} / 100
存疑等级: ${forensicData.auditVerdict.suspicionLevel}
勾稽公式: ${forensicData.auditVerdict.forensicFormula || 'N/A'}
数理阐释: ${forensicData.auditVerdict.formulaMathExplanation || 'N/A'}
调查官裁定: ${forensicData.auditVerdict.summary}

四、现场尽调核查执行清单 (Field Investigation Checklist)
-----------------------------------------------------
${tasks
  .map(
    (t, idx) =>
      `${idx + 1}. [${t.done ? '已核验' : '待核验'}] 【${t.priority}】 ${t.action}
   - 核查对象: ${t.targetEntity}
   - 调取核心底稿: ${t.keyDocumentToRequest}
   ${t.auditorNotes ? `   - 分析师手记: ${t.auditorNotes}` : ''}`
  )
  .join('\n\n')}

=====================================================
底稿生成系统: 源察·GenSight 商业反常交叉核验工作台
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GenSight-尽调核验底稿-${companyName}-${anomaly.tag}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  const completedCount = tasks.filter((t) => t.done).length;
  const isHigh = anomaly.severity === 'high';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-[#1F3437]/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white rounded-xs border border-[#1F3437] shadow-2xl overflow-hidden font-sans">
        {forensicData._isSynthetic && (
          <div className="mx-5 mt-4 sm:mx-6 sm:mt-5 rounded-xs border border-[#C4883A] bg-[#FFF8ED] px-4 py-2.5 flex items-start gap-3">
            <AlertTriangle className="h-3.5 w-3.5 text-[#C4883A] shrink-0 mt-0.5" />
            <div className="text-[11px] text-[#7A5520] leading-relaxed">
              <span className="font-serif font-bold text-[#C4883A]">示例证据 · 未接入真实采集</span>
              <span className="mx-1.5 text-[#D4D9D4]">|</span>
              以下证据链为预写模板占位，非来自巨潮/SEC/港交所真实披露文件。接入真实采集管线后将自动替换为可追溯来源。
            </div>
          </div>
        )}
        {/* Top Institutional Header */}
        <div className="px-5 py-4 sm:px-6 bg-[#1F3437] text-white flex items-center justify-between border-b border-[#2C4A4E]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xs bg-[#FAF8F5] text-[#1F3437] font-serif font-bold text-base shadow-xs">
              鉴
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono tracking-widest text-[#8C9E9F] uppercase">
                  FORENSIC EVIDENCE WORKBENCH
                </span>
                <span className="text-[10px] px-1.5 py-0.2 bg-[#FAF8F5]/10 rounded-xs text-[#FAF8F5] border border-white/20">
                  多源证据交叉比对台
                </span>
              </div>
              <h2 className="font-serif text-base sm:text-lg font-bold text-[#FAF8F5] tracking-wide">
                【{companyName}】反常点证据链交叉核验卷宗
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xs text-[#8C9E9F] hover:text-white hover:bg-white/10 transition-colors"
            title="关闭核验台"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Anomaly Brief Banner */}
        <div className="px-5 py-3.5 sm:px-6 bg-[#F6F7F5] border-b border-[#E2E6E2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-xs border ${
                  isHigh
                    ? 'bg-[#A84A3E]/10 text-[#A84A3E] border-[#A84A3E]/30'
                    : 'bg-[#3E6F73]/10 text-[#3E6F73] border-[#3E6F73]/30'
                }`}
              >
                <AlertTriangle className="h-3 w-3" />
                {anomaly.tag}
              </span>

              <span className="text-xs font-semibold text-[#1F3437]">
                {anomaly.title}
              </span>
            </div>
          </div>

          {/* Quick Confidence Metric Meter */}
          <div className="flex items-center gap-3 shrink-0 bg-white px-3 py-1.5 rounded-xs border border-[#E2E6E2]">
            <div className="text-right">
              <div className="text-[10px] text-[#627578] uppercase font-mono">核验裁定等级</div>
              <div
                className={`text-xs font-bold ${
                  forensicData.auditVerdict.suspicionLevel === '严重存疑'
                    ? 'text-[#A84A3E]'
                    : forensicData.auditVerdict.suspicionLevel === '中度警示'
                    ? 'text-amber-700'
                    : 'text-[#3E6F73]'
                }`}
              >
                {forensicData.auditVerdict.suspicionLevel}
              </div>
            </div>
            <div className="w-12 h-6 flex items-center justify-center bg-[#F6F7F5] rounded-xs border border-[#E2E6E2] font-mono font-bold text-xs text-[#1F3437]">
              {forensicData.auditVerdict.confidenceScore}%
            </div>
          </div>
        </div>

        {/* Navigation Tabs for Workbench */}
        <div className="px-5 sm:px-6 border-b border-[#E2E6E2] bg-white flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-4 text-xs font-serif">
            <button
              type="button"
              onClick={() => setActiveTab('compare')}
              className={`py-2.5 border-b-2 font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'compare'
                  ? 'border-[#1F3437] text-[#1F3437]'
                  : 'border-transparent text-[#627578] hover:text-[#1F3437]'
              }`}
            >
              <Scale className="h-3.5 w-3.5" />
              双向证据交叉比对 (Evidence Cross-Check)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('formula')}
              className={`py-2.5 border-b-2 font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'formula'
                  ? 'border-[#1F3437] text-[#1F3437]'
                  : 'border-transparent text-[#627578] hover:text-[#1F3437]'
              }`}
            >
              <Calculator className="h-3.5 w-3.5" />
              神经符号勾稽求解 (Audit Solver)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('checklist')}
              className={`py-2.5 border-b-2 font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'checklist'
                  ? 'border-[#1F3437] text-[#1F3437]'
                  : 'border-transparent text-[#627578] hover:text-[#1F3437]'
              }`}
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              现场尽调核验清单 ({completedCount}/{tasks.length})
            </button>
          </div>

          {/* Action to export forensic worksheet */}
          <button
            type="button"
            onClick={handleExportForensicSheet}
            className="my-1.5 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xs border border-[#1F3437] text-xs font-serif font-medium text-[#1F3437] hover:bg-[#1F3437] hover:text-white transition-colors"
          >
            {downloadSuccess ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                已下载底稿
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                导出核验底稿 (.txt)
              </>
            )}
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-[#FAF8F5]/30">
          {/* TAB 1: Evidence Cross-Check Side-by-Side */}
          {activeTab === 'compare' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch">
                {/* Left Column: Official Company Claim */}
                <div className="flex flex-col bg-white rounded-xs border border-[#E2E6E2] p-5 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E2E6E2]">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-[#3E6F73] rounded-xs" />
                      <span className="font-serif font-bold text-sm text-[#1F3437]">
                        左栏：企业官方披露口径 (Official Claim)
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#627578] bg-[#F6F7F5] px-2 py-0.5 rounded-xs border border-[#E2E6E2]">
                      表内正式声称
                    </span>
                  </div>

                  {/* Claimed Metric Pill */}
                  <div className="p-3 bg-[#F6F7F5] rounded-xs border border-[#E2E6E2] space-y-1">
                    <span className="text-[11px] text-[#627578] block">核心财务/经营指标陈述:</span>
                    <span className="text-sm font-serif font-bold text-[#1F3437]">
                      {forensicData.companyClaim.claimedMetric}
                    </span>
                  </div>

                  {/* Verbatim Statement */}
                  <div className="space-y-1.5 flex-1">
                    <span className="text-xs font-medium text-[#627578] flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-[#3E6F73]" />
                      管理层报表官方陈述全文：
                    </span>
                    <blockquote className="p-3 bg-[#FBFBFA] rounded-xs border-l-2 border-[#3E6F73] text-xs leading-relaxed text-[#2D4245] italic">
                      “{forensicData.companyClaim.statement}”
                    </blockquote>
                  </div>

                  {/* Source Provenance */}
                  <div className="pt-2 border-t border-[#F0F2EF] text-[11px] text-[#627578] space-y-1">
                    <div className="flex items-center justify-between">
                      <span>核验底稿来源:</span>
                      <span className="font-mono text-[#1F3437] font-medium">
                        {forensicData.companyClaim.sourceDocument}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>报告披露基准日:</span>
                      <span className="font-mono text-[#1F3437]">
                        {forensicData.companyClaim.filingDate}
                      </span>
                    </div>
                    {forensicData.companyClaim.auditorSignoff && (
                      <div className="pt-1 text-[10px] text-[#8C9E9F]">
                        审计签章：{forensicData.companyClaim.auditorSignoff}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Objective Benchmark & Multi-Source Evidence */}
                <div className="flex flex-col bg-white rounded-xs border border-[#E8DFDD] p-5 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E8DFDD]">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-[#A84A3E] rounded-xs" />
                      <span className="font-serif font-bold text-sm text-[#A84A3E]">
                        右栏：第三方客观多源比对 (Objective Multi-Source)
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#A84A3E] bg-[#FDF7F7] px-2 py-0.5 rounded-xs border border-[#E8DFDD]">
                      外围穿透实证
                    </span>
                  </div>

                  {/* Discrepancy Delta Highlight */}
                  <div className="p-3 bg-[#FDF7F7] rounded-xs border border-[#E8DFDD] space-y-1">
                    <span className="text-[11px] text-[#A84A3E] font-medium block">
                      剪刀差 / 统计背离度 (Delta):
                    </span>
                    <span className="text-sm font-serif font-bold text-[#A84A3E]">
                      {forensicData.objectiveBenchmark.discrepancyDelta}
                    </span>
                  </div>

                  {/* Objective Empirical Finding */}
                  <div className="space-y-1.5 flex-1">
                    <span className="text-xs font-medium text-[#627578] flex items-center gap-1.5">
                      <Fingerprint className="h-3.5 w-3.5 text-[#A84A3E]" />
                      多源交叉核验客观证据链：
                    </span>
                    <div className="p-3 bg-[#FBFBFA] rounded-xs border-l-2 border-[#A84A3E] text-xs leading-relaxed text-[#2D4245]">
                      {forensicData.objectiveBenchmark.finding}
                    </div>
                  </div>

                  {/* Source Provenance */}
                  <div className="pt-2 border-t border-[#F0F2EF] text-[11px] text-[#627578] space-y-1">
                    <div className="flex items-center justify-between">
                      <span>数据源类型:</span>
                      <span className="font-mono text-[#1F3437] font-medium">
                        {forensicData.objectiveBenchmark.sourceTypeName}
                      </span>
                    </div>
                    {forensicData.objectiveBenchmark.sampleCoverage && (
                      <div className="flex items-center justify-between">
                        <span>样本覆盖范围:</span>
                        <span className="text-[#1F3437]">
                          {forensicData.objectiveBenchmark.sampleCoverage}
                        </span>
                      </div>
                    )}
                    <div className="pt-1 text-[10px] text-[#8C9E9F]">
                      核实佐证：{forensicData.objectiveBenchmark.benchmarkEvidence}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Forensic Verdict Card */}
              <div className="p-4 sm:p-5 rounded-xs bg-white border border-[#E2E6E2] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-serif font-bold text-sm text-[#1F3437]">
                    <ShieldAlert className="h-4 w-4 text-[#3E6F73]" />
                    <span>首席调查官核验综合裁定与商业实质剖析</span>
                  </div>
                  <span className="text-xs text-[#627578] font-mono">
                    置信度指数: {forensicData.auditVerdict.confidenceScore}/100
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#2D4245] leading-relaxed bg-[#F6F7F5] p-3 rounded-xs border border-[#E2E6E2]">
                  {forensicData.auditVerdict.summary}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Neuro-Symbolic Audit Solver */}
          {activeTab === 'formula' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-white p-5 rounded-xs border border-[#E2E6E2] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-[#3E6F73]" />
                    <h3 className="font-serif font-bold text-sm text-[#1F3437]">
                      神经符号财务勾稽核查公式 (Neuro-Symbolic Audit Formula)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyFormula}
                    className="flex items-center gap-1 text-xs text-[#627578] hover:text-[#1F3437] transition-colors"
                  >
                    {copiedFormula ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>已复制公式</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>复制公式</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Formula Monospace Box */}
                <div className="p-4 rounded-xs bg-[#1F3437] text-white font-mono text-xs sm:text-sm tracking-wide overflow-x-auto shadow-inner border border-[#18292B]">
                  <code>{forensicData.auditVerdict.forensicFormula || 'Formula: Target_Metric - Industry_Benchmark > Threshold'}</code>
                </div>

                {/* Math Logic Explanation */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-[#1F3437] block">
                    勾稽公式数理逻辑阐释：
                  </span>
                  <p className="text-xs text-[#2D4245] leading-relaxed bg-[#F6F7F5] p-3.5 rounded-xs border border-[#E2E6E2]">
                    {forensicData.auditVerdict.formulaMathExplanation ||
                      '通过将报表披露数据同上下游物理货流、海关申报量及同业统计分布进行神经符号约束求解，检视其偏离度是否超出3倍标准差的正态分布区间。'}
                  </p>
                </div>

                {/* Step-by-Step Logic Trace */}
                <div className="space-y-2 pt-2 border-t border-[#E2E6E2]">
                  <span className="text-xs font-semibold text-[#1F3437] block">
                    神经符号求解器三阶推演证明链：
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-xs border border-[#E2E6E2] space-y-1">
                      <span className="text-[10px] text-[#627578] font-mono">01. 假设提出</span>
                      <p className="text-[#1F3437] font-medium">若管理层披露属实，则上下游对应实体应呈现同步物理流动。</p>
                    </div>
                    <div className="p-3 bg-white rounded-xs border border-[#E2E6E2] space-y-1">
                      <span className="text-[10px] text-[#627578] font-mono">02. 物理守恒检验</span>
                      <p className="text-[#1F3437] font-medium">通过海关提单、货运在途及同行BOM拆解计算实际物理消耗。</p>
                    </div>
                    <div className="p-3 bg-white rounded-xs border border-[#E2E6E2] space-y-1">
                      <span className="text-[10px] text-[#A84A3E] font-mono">03. 求解结论</span>
                      <p className="text-[#A84A3E] font-medium">触发【{forensicData.auditVerdict.suspicionLevel}】阈值，建议执行现场尽调。</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Field Investigation Checklist */}
          {activeTab === 'checklist' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E2E6E2]">
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#1F3437]">
                    现场尽职调查核查执行清单 (Field Action Checklist)
                  </h3>
                  <p className="text-xs text-[#627578]">
                    分析师在前往企业本部或其供应商/客户实地尽调时需核验的具体取证清单。
                  </p>
                </div>

                <div className="text-xs font-mono text-[#3E6F73] bg-[#3E6F73]/10 px-2.5 py-1 rounded-xs border border-[#3E6F73]/20">
                  完成进度: {completedCount} / {tasks.length} ({Math.round((completedCount / tasks.length) * 100)}%)
                </div>
              </div>

              {/* Task Items */}
              <div className="space-y-3">
                {tasks.map((task) => {
                  const isPriorityMust = task.priority === '必查';
                  return (
                    <div
                      key={task.id}
                      className={`p-4 rounded-xs bg-white border transition-all ${
                        task.done
                          ? 'border-emerald-200 bg-emerald-50/20'
                          : 'border-[#E2E6E2] hover:border-[#3E6F73]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(task.id)}
                          className="mt-0.5 text-[#1F3437] hover:text-[#3E6F73] transition-colors shrink-0"
                          title={task.done ? '标记为未核实' : '标记为已核实'}
                        >
                          {task.done ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-[#8C9E9F]" />
                          )}
                        </button>

                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-xs border ${
                                isPriorityMust
                                  ? 'bg-[#A84A3E]/10 text-[#A84A3E] border-[#A84A3E]/30'
                                  : 'bg-[#3E6F73]/10 text-[#3E6F73] border-[#3E6F73]/30'
                              }`}
                            >
                              {task.priority}
                            </span>
                            <span
                              className={`text-xs sm:text-sm font-semibold ${
                                task.done ? 'line-through text-[#8C9E9F]' : 'text-[#1F3437]'
                              }`}
                            >
                              {task.action}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="bg-[#F6F7F5] p-2 rounded-xs border border-[#E2E6E2]">
                              <span className="text-[#627578] block text-[11px]">核查目标实体:</span>
                              <span className="font-medium text-[#1F3437]">{task.targetEntity}</span>
                            </div>
                            <div className="bg-[#F6F7F5] p-2 rounded-xs border border-[#E2E6E2]">
                              <span className="text-[#627578] block text-[11px]">调取核心底稿:</span>
                              <span className="font-medium text-[#3E6F73]">{task.keyDocumentToRequest}</span>
                            </div>
                          </div>

                          {/* Existing Note or Add Note button */}
                          {task.auditorNotes && (
                            <div className="text-xs text-[#2D4245] bg-[#FAF8F5] p-2 rounded-xs border border-[#E8DFDD]">
                              <span className="font-semibold text-[#A84A3E]">调查官手记：</span>
                              {task.auditorNotes}
                            </div>
                          )}

                          {activeNoteTaskId === task.id ? (
                            <div className="space-y-2 pt-2">
                              <textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="输入现场走访记录、走访人姓名或调取文件编号..."
                                className="w-full text-xs p-2 rounded-xs border border-[#3E6F73] focus:outline-none bg-white text-[#1F3437]"
                                rows={2}
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSaveNote(task.id)}
                                  className="px-2.5 py-1 bg-[#1F3437] text-white text-xs rounded-xs font-serif hover:bg-[#3E6F73] transition-colors"
                                >
                                  保存手记
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveNoteTaskId(null);
                                    setNoteText('');
                                  }}
                                  className="px-2.5 py-1 bg-white border border-[#E2E6E2] text-[#627578] text-xs rounded-xs font-serif"
                                >
                                  取消
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveNoteTaskId(task.id);
                                setNoteText(task.auditorNotes || '');
                              }}
                              className="text-[11px] text-[#3E6F73] hover:underline flex items-center gap-1 font-serif pt-1"
                            >
                              <span>+ 添加/编辑调查官手记</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 sm:px-6 bg-[#F6F7F5] border-t border-[#E2E6E2] flex items-center justify-between text-xs">
          <span className="text-[#627578] font-mono">
            GenSight Forensic Protocol v2.5 · 神经符号勾稽裁判
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportForensicSheet}
              className="sm:hidden px-2.5 py-1.5 rounded-xs border border-[#1F3437] text-xs font-serif font-medium text-[#1F3437]"
            >
              导出底稿
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xs bg-[#1F3437] text-white font-serif font-medium hover:bg-[#3E6F73] transition-colors"
            >
              完成核验关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
