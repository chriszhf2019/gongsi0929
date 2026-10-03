import React, { useState } from 'react';
import { X, FileText, Code, Printer, Download, Copy, Check, ShieldCheck, Sparkles } from 'lucide-react';
import { CompanyPanoramaData } from '../types';

interface ExportModalProps {
  data: CompanyPanoramaData;
  onClose: () => void;
  onExportSuccess?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ data, onClose, onExportSuccess }) => {
  const [copied, setCopied] = useState(false);
  const [exportFormat, setExportFormat] = useState<'markdown' | 'json'>('markdown');

  // Generate complete, deep Markdown report string including GenSight's key differentiators
  const generateMarkdown = (): string => {
    const {
      basicInfo,
      upstream,
      downstream,
      investments,
      jointVentures,
      competitors,
      risks,
      valueChainSummary,
      anomalies,
      interestFlow,
      grayScaleEvaluation,
    } = data;

    const sections: string[] = [];

    // Header & Meta
    sections.push(`# 【鉴源・GenSight 商业尽调档案】${basicInfo.name} 企业全景研报与产业链图谱

> **生成时间**: ${new Date(data.timestamp).toLocaleString('zh-CN')}
> **密级与效力**: 商业秘密 / 决策参考底档
> **核心赛道**: ${basicInfo.industry} / ${basicInfo.subIndustry}
> **股票代码**: ${basicInfo.ticker || '未上市/非公开'} (${basicInfo.exchange || '-'})
> **总部地点**: ${basicInfo.headquarters} (成立年份: ${basicInfo.foundingYear || basicInfo.establishedYear || '-'})
> **市值/估值**: ${basicInfo.marketCapOrValuation || '-'} | **年营业收入**: ${basicInfo.annualRevenue || '-'}
> **市场份额**: ${basicInfo.marketShare || '-'} | **经营态势**: ${basicInfo.currentStatus || '-'}
> **护城河壁垒评级**: ${basicInfo.moatScore}/5.0

---

## 一、 核心业务概览与战略护城河
**业务概况**:
${basicInfo.businessSummary}

**战略护城河分析**:
${basicInfo.strategicMoat}

**投研执行摘要**:
${data.executiveSummary}
`);

    // Anomalies Section
    if (anomalies && anomalies.length > 0) {
      sections.push(`---

## 二、 商业逻辑反常点洞察 (Anomalies Radar)
${anomalies
  .map(
    (a, idx) => `### ${idx + 1}. 【${a.severity.toUpperCase()} 等级反常】${a.title}
- **反常分类**: ${a.tag}
- **异常指标表现**: ${a.contradiction?.reality || '存在逻辑背离'} (行业基准: ${a.contradiction?.expectation || '常规区间'})
- **反常表象陈述**: ${a.tag}
- **深层商业动因剖析**: ${a.deepAnalysis}
- **尽职调查核验建议**: ${a.investigationClue}`
  )
  .join('\n\n')}`);
    }

    // Interest Flow Circuit
    if (interestFlow) {
      sections.push(`---

## 三、 利益流向闭环与资金/货物运转 (Interest Flow Circuit)
- **闭环模式**: ${interestFlow.circuitName}
- **回路描述**: ${interestFlow.closedLoopSummary}`);
    }

    // Gray Scale Evaluation
    if (grayScaleEvaluation) {
      sections.push(`---

## 四、 灰度证据链核验矩阵 (Gray-Scale Evidence Evaluation)
> **综合证据链置信度得分**: **${grayScaleEvaluation.confidenceScore}/100**
> **总体评估判定**: ${grayScaleEvaluation.verdict}

### 1. 正面实锤证据 (Supporting Facts)
${(grayScaleEvaluation.supportingEvidence || []).map((e) => `- **[${e.source || '公开核实'}]** ${e.point} (权重: ${e.weight})`).join('\n')}

### 2. 中性待证事实 (Neutral / Ongoing Verification)
${(grayScaleEvaluation.uncertainVariables || []).map((e) => `- ${e.point} (关注触发: ${e.watchTrigger})`).join('\n')}

### 3. 高度存疑点与反常线索 (Red Flags & Questionable Points)
${(grayScaleEvaluation.opposingEvidence || []).map((r) => `- **[${r.weight}]** ${r.point} (来源: ${r.source})`).join('\n')}`);
    }

    // Value Chain Summary
    sections.push(`---

## 五、 产业链微笑曲线与价值流动
- **上游原材料与要素投入**: ${valueChainSummary?.rawMaterialsInput?.join('、') || '-'}
- **核心制造与研发工序**: ${valueChainSummary?.coreManufacturingProcess?.join('、') || '-'}
- **核心产品与服务矩阵**: ${valueChainSummary?.finalProductsServices?.join('、') || '-'}
- **终端客户与分销渠道**: ${valueChainSummary?.endMarkets?.join('、') || '-'}`);

    // Upstream Table
    sections.push(`---

## 六、 上游核心供应商网络
| 供应商名称 | 供货品类/服务 | 合作年份 | 现状与演进 | 依赖度 | 产地/区域 |
| :--- | :--- | :--- | :--- | :--- | :--- |
${upstream.map((up) => `| **${up.name}** | ${up.supplies} | ${up.cooperationStartYear || '-'} | ${up.currentStatus || up.strategicImpact} | ${up.dependenceLevel} | ${up.originCountry} |`).join('\n')}`);

    // Downstream Table
    sections.push(`---

## 七、 下游客户与销售渠道
| 客户群体/渠道名称 | 采购产品与服务 | 合作年份 | 现状与演进 | 营收贡献预估 | 客群粘性 |
| :--- | :--- | :--- | :--- | :--- | :--- |
${downstream.map((down) => `| **${down.name}** | ${down.productOrServicePurchased} | ${down.cooperationStartYear || '-'} | ${down.currentStatus || down.relationshipSummary} | ${down.revenueContributionEst} | ${down.customerStickiness} |`).join('\n')}`);

    // Investments Table
    sections.push(`---

## 八、 对外投资与控股子公司生态
| 实体名称 | 投资类型 | 持股比例 | 主营赛道 | 战略协同目标 |
| :--- | :--- | :--- | :--- | :--- |
${investments.map((inv) => `| **${inv.name}** | ${inv.typeLabel} | ${inv.shareholdingRatio || '-'} | ${inv.industryDomain} | ${inv.strategicGoal} |`).join('\n')}`);

    // Joint Ventures Table
    sections.push(`---

## 九、 合资合作企业与战略联盟
| 合资实体名称 | 伙伴方名称 | 股权结构 | 重点合作业务 | 战略价值与协同 |
| :--- | :--- | :--- | :--- | :--- |
${jointVentures.map((jv) => `| **${jv.name}** | ${jv.partnerNames.join('、')} | ${jv.shareholdingSummary} | ${jv.keyProductsOrProjects} | ${jv.strategicValue} |`).join('\n')}`);

    // Competitors Table
    sections.push(`---

## 十、 竞争对手横向对标分析
| 竞品对手 | 所属区域 | 核心对标赛道 | 竞争强度 | 相对优势与劣势 | 市场地位/现状 |
| :--- | :--- | :--- | :--- | :--- | :--- |
${competitors.map((comp) => `| **${comp.name}** | ${comp.region} | ${comp.competingSegments.join('、')} | ${comp.rivalryStrength} | 优势:${comp.strengthsVsTarget} / 劣势:${comp.weaknessesVsTarget} | ${comp.marketShare || '-'} / ${comp.currentStatus || '-'} |`).join('\n')}`);

    // Supply Chain Risks
    sections.push(`---

## 十一、 供应链卡脖子风险雷达与防范举措
${risks.map((risk, idx) => `### ${idx + 1}. 【${risk.severity} 风险】${risk.title}
- **风险描述**: ${risk.description}
- **缓释与应对举措**: ${risk.mitigationMeasure}`).join('\n\n')}

---
*报告由 鉴源・GenSight 商业智能引擎自动汇总生成。*`);

    return sections.join('\n\n');
  };

  const downloadFile = () => {
    let content = '';
    let fileName = '';
    let type = '';

    if (exportFormat === 'markdown') {
      content = generateMarkdown();
      fileName = `${data.basicInfo.name}_商业全景尽调研报.md`;
      type = 'text/markdown;charset=utf-8';
    } else {
      content = JSON.stringify(data, null, 2);
      fileName = `${data.basicInfo.name}_全景数据底档.json`;
      type = 'application/json;charset=utf-8';
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (onExportSuccess) onExportSuccess();
  };

  const handleCopy = () => {
    const content = exportFormat === 'markdown' ? generateMarkdown() : JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(content);
    setCopied(true);
    if (onExportSuccess) onExportSuccess();
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F3437]/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-4xl rounded-xs border border-[#E2E6E2] bg-white shadow-2xl p-6 sm:p-7 flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E6E2]">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xs bg-[#1F3437] text-white font-serif font-bold text-sm">
              鉴
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg font-bold text-[#1F3437] tracking-tight">
                  导出【{data.basicInfo.name}】全景尽调研报
                </span>
                <span className="text-[10px] bg-[#3E6F73]/10 text-[#254E52] px-2 py-0.5 rounded-xs border border-[#3E6F73]/25 font-serif font-medium">
                  投研级机密底档
                </span>
              </div>
              <p className="text-xs text-[#627578] font-serif">
                包含商业反常点核验、利益闭环运转、灰度证据矩阵与完整产业链图谱
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xs p-1.5 text-[#627578] hover:text-[#1F3437] hover:bg-[#F6F7F5] border border-[#E2E6E2] transition-colors"
            title="关闭窗口"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Format Select Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-[#E2E6E2] bg-[#FAFBF9] px-3 -mx-6 sm:-mx-7">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExportFormat('markdown')}
              className={`flex items-center gap-1.5 rounded-xs px-3 py-1.5 text-xs font-serif font-medium border transition-all ${
                exportFormat === 'markdown'
                  ? 'bg-[#1F3437] text-white border-[#1F3437] shadow-2xs'
                  : 'bg-white text-[#627578] border-[#E2E6E2] hover:text-[#1F3437]'
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-[#3E6F73]" />
              <span>Markdown 研报格式 (.md)</span>
            </button>
            <button
              onClick={() => setExportFormat('json')}
              className={`flex items-center gap-1.5 rounded-xs px-3 py-1.5 text-xs font-serif font-medium border transition-all ${
                exportFormat === 'json'
                  ? 'bg-[#1F3437] text-white border-[#1F3437] shadow-2xs'
                  : 'bg-white text-[#627578] border-[#E2E6E2] hover:text-[#1F3437]'
              }`}
            >
              <Code className="h-3.5 w-3.5 text-[#627578]" />
              <span>JSON 原始底档 (.json)</span>
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xs border border-[#E2E6E2] bg-white px-3 py-1.5 text-xs font-serif font-medium text-[#1F3437] hover:bg-[#F6F7F5] transition-colors shadow-2xs"
          >
            <Printer className="h-3.5 w-3.5 text-[#3E6F73]" />
            <span>打印 / 导出 PDF</span>
          </button>
        </div>

        {/* Preview Content Area */}
        <div className="flex-1 overflow-y-auto my-4 p-4 rounded-xs bg-[#FAFBF9] border border-[#E2E6E2] text-xs font-mono text-[#2D4245] whitespace-pre-wrap leading-relaxed select-text shadow-inner">
          {exportFormat === 'markdown' ? generateMarkdown() : JSON.stringify(data, null, 2)}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[#E2E6E2]">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-xs border border-[#E2E6E2] bg-white px-3.5 py-2 text-xs font-serif font-medium text-[#1F3437] hover:bg-[#F6F7F5] transition-colors shadow-2xs"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-[#2E6B56]" />
                <span className="text-[#2E6B56] font-bold">已复制研报全文</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-[#3E6F73]" />
                <span>复制全部研报文本</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xs px-4 py-2 text-xs font-serif font-medium text-[#627578] hover:text-[#1F3437] hover:bg-[#F6F7F5] border border-[#E2E6E2] transition-colors"
            >
              取消
            </button>
            <button
              onClick={downloadFile}
              className="flex items-center gap-1.5 rounded-xs bg-[#1F3437] hover:bg-[#3E6F73] px-4 py-2 text-xs font-serif font-bold text-white shadow-xs transition-all"
            >
              <Download className="h-4 w-4" />
              <span>下载卷宗文件</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
