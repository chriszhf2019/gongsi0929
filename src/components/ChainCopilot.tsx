import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  X,
  Bot,
  User,
  RefreshCw,
  Lightbulb,
} from 'lucide-react';
import { CompanyPanoramaData, CopilotMessage } from '../types';

interface ChainCopilotProps {
  companyData: CompanyPanoramaData;
}

const QUICK_PROMPTS = [
  '分析该公司的核心卡脖子风险及供应链断供脆弱点？',
  '该公司的垂直一体化模式与外部采购相比有何优劣？',
  '海外地缘政治与欧美关税对其出海战略有何冲击？',
  '有哪些隐形冠军上游供应商最值得长期跟踪？',
];

export const ChainCopilot: React.FC<ChainCopilotProps> = ({ companyData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: `您好！我是鉴源·产业链与投资 AI 顾问。关于【${companyData.basicInfo.name}】的供应链图谱、上下游依赖、投资生态与地缘风险，您可以随时向我核验或提问。`,
      timestamp: Date.now(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Update welcome message when company changes
  useEffect(() => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: `您好！我是鉴源·产业链与投资 AI 顾问。关于【${companyData.basicInfo.name}】的供应链图谱、上下游依赖、投资生态与地缘风险，您可以随时向我核验或提问。`,
        timestamp: Date.now(),
      },
    ]);
  }, [companyData.basicInfo.name]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 90_000);
      const response = await fetch('/api/ask-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyData.basicInfo.name,
          question: query,
          contextData: {
            basicInfo: companyData.basicInfo,
            upstreamCount: companyData.upstream.length,
            downstreamCount: companyData.downstream.length,
            risks: companyData.risks,
            executiveSummary: companyData.executiveSummary,
          },
        }),
        signal: controller.signal as any,
      });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error('AI Copilot 暂时响应超时');
      }

      const resJson = await response.json();
      const aiMsg: CopilotMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: resJson.answer,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.warn('Copilot backend unavailable, generating grounded insight from local dossier:', err);
      // Smart grounded synthesis using full companyData context
      let fallbackText = '';
      const name = companyData.basicInfo.name;
      const q = query.toLowerCase();

      if (q.includes('卡脖子') || q.includes('断供') || q.includes('风险') || q.includes('脆弱')) {
        const riskList = companyData.risks.map((r, i) => `${i + 1}. 【${r.severity}风险】${r.title}：${r.description}（应对举措：${r.mitigationMeasure}）`).join('\n');
        const highDepUpstream = companyData.upstream.filter(u => u.dependenceLevel === 'High').map(u => `• ${u.name}（供货：${u.supplies}，产地：${u.originCountry}）`).join('\n');
        fallbackText = `【${name} 供应链脆弱点与卡脖子核验结论】\n\n📌 **高依赖度上游供给**：\n${highDepUpstream || '• 主要核心环节已实现多源分散或自制'}\n\n⚠️ **核心供应链与经营风险**：\n${riskList}\n\n💡 **投研建议**：重点监测先进制程芯片与海外单一源头零部件的二供适配进度及常备库存天数。`;
      } else if (q.includes('护城河') || q.includes('优势') || q.includes('垂直一体化') || q.includes('模式')) {
        fallbackText = `【${name} 核心竞争优势与战略护城河】\n\n🛡️ **护城河壁垒评级**：${companyData.basicInfo.moatScore}/5.0 分\n\n🔑 **战略护城河解析**：\n${companyData.basicInfo.strategicMoat}\n\n📊 **垂直整合与价值链流向**：\n• 原材料要素：${companyData.valueChainSummary?.rawMaterialsInput?.join('、') || '行业标准'}\n• 核心制造研发：${companyData.valueChainSummary?.coreManufacturingProcess?.join('、') || '自研闭环'}\n• 终端产品矩阵：${companyData.valueChainSummary?.finalProductsServices?.join('、') || '多系列覆盖'}\n\n💡 **商业实质**：${companyData.executiveSummary}`;
      } else if (q.includes('关税') || q.includes('出海') || q.includes('地缘') || q.includes('海外')) {
        const overseasDownstream = companyData.downstream.filter(d => d.targetRegion.includes('海外') || d.targetRegion.includes('全球') || d.targetRegion.includes('欧洲') || d.targetRegion.includes('美')).map(d => `• ${d.name}（目标市场：${d.targetRegion}，粘性：${d.customerStickiness}）`).join('\n');
        fallbackText = `【${name} 海外出海战略与地缘应对分析】\n\n🌍 **主要海外客群与渠道**：\n${overseasDownstream || '• 正在稳步拓展欧洲、东南亚及拉美等新兴市场'}\n\n🚢 **出海与关税对冲策略**：\n推进海外属地化 KD 组装工厂建设，以本地生产对冲直接反补贴关税，同时自建或锁定海运物流保障交付。`;
      } else {
        const keyUpstream = companyData.upstream.slice(0, 3).map(u => `• ${u.name}（${u.supplies}）`).join('\n');
        const keyCompetitors = companyData.competitors.slice(0, 3).map(c => `• ${c.name}（${c.region}，竞争维度：${c.competingSegments.join('/')}）`).join('\n');
        fallbackText = `【${name} 产业链情报深度概览】\n\n🏢 **基本面定位**：${companyData.basicInfo.industry} · ${companyData.basicInfo.subIndustry}（${companyData.basicInfo.developmentStage || '成熟扩张期'}）\n\n🔗 **关键上游支柱**：\n${keyUpstream}\n\n⚔️ **主要竞品格局**：\n${keyCompetitors}\n\n🎯 **执行摘要**：\n${companyData.executiveSummary}`;
      }

      const aiMsg: CopilotMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: fallbackText,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-xs bg-[#1F3437] hover:bg-[#3E6F73] px-3.5 py-2.5 text-xs font-serif font-medium text-white shadow-lg transition-all border border-[#18292B]"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-2xs bg-[#3E6F73] text-white font-serif font-bold text-[10px]">
            鉴
          </div>
          <span>产业链 Copilot 追问</span>
          <span className="flex h-1.5 w-1.5 rounded-full bg-[#3E6F73]"></span>
        </button>
      )}

      {/* Floating Chat Drawer / Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[430px] h-[560px] rounded-xs border border-[#E2E6E2] bg-white shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E6E2] bg-[#FAFBF9]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-[#1F3437] text-white font-serif font-bold text-xs">
                鉴
              </div>
              <div>
                <div className="font-serif text-xs font-bold text-[#1F3437] flex items-center gap-1.5">
                  <span>鉴源 · 产业链智能顾问</span>
                  <span className="text-[10px] bg-[#3E6F73]/10 text-[#254E52] px-1.5 py-0.2 rounded-xs border border-[#3E6F73]/25 font-sans">
                    实时在线
                  </span>
                </div>
                <div className="text-[11px] text-[#627578] truncate max-w-[200px]">
                  核验标的：{companyData.basicInfo.name}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="rounded-xs p-1 text-[#627578] hover:bg-[#F6F7F5] hover:text-[#1F3437] border border-[#E2E6E2] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-3 py-2 bg-[#F6F7F5] border-b border-[#E2E6E2] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <Lightbulb className="h-3 w-3 text-[#9C6E28] shrink-0" />
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="whitespace-nowrap rounded-xs bg-white hover:bg-[#FAFBF9] px-2 py-0.5 text-[10px] text-[#2D4245] border border-[#E2E6E2] shrink-0 transition-colors disabled:opacity-50"
              >
                {prompt.slice(0, 16)}...
              </button>
            ))}
          </div>

          {/* Chat Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs bg-[#FAFBF9]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xs bg-[#1F3437] text-white font-serif font-bold text-[10px]">
                    鉴
                  </div>
                )}

                <div
                  className={`max-w-[84%] rounded-xs px-3.5 py-2.5 leading-relaxed text-xs ${
                    msg.sender === 'user'
                      ? 'bg-[#1F3437] text-white shadow-2xs font-sans'
                      : 'bg-white text-[#2D4245] border border-[#E2E6E2] whitespace-pre-wrap shadow-2xs'
                  }`}
                >
                  {msg.text}
                </div>

                {msg.sender === 'user' && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xs bg-[#F0F2EF] text-[#1F3437] border border-[#E2E6E2] text-[10px]">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 items-center text-[#627578] text-xs pl-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#3E6F73]" />
                <span className="font-serif">鉴源正在深入卷宗核验供应链数据...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-3 border-t border-[#E2E6E2] bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={`向鉴源顾问追问关于 ${companyData.basicInfo.name}...`}
                disabled={isLoading}
                className="flex-1 rounded-xs border border-[#D4D9D4] bg-[#FAFBF9] px-3 py-1.5 text-xs text-[#1F3437] placeholder-[#8C9E9F] focus:outline-none focus:border-[#3E6F73] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isLoading}
                className="flex h-7 w-7 items-center justify-center rounded-xs bg-[#1F3437] text-white hover:bg-[#3E6F73] disabled:opacity-40 transition-colors shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
