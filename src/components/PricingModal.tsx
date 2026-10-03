import React, { useState } from 'react';
import {
  Check,
  Zap,
  Building2,
  ShieldCheck,
  Sparkles,
  CreditCard,
  Lock,
  ArrowRight,
  HelpCircle,
  Clock,
  Download,
  Flame,
  FileSpreadsheet,
  Layers,
  Network,
  X,
} from 'lucide-react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan?: (planId: string) => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, onSelectPlan }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  if (!isOpen) return null;

  const plans = [
    {
      id: 'free',
      name: '基础体验版',
      tagline: '个人投资者与初阶行业爱好者',
      priceMonthly: '¥0',
      priceYearly: '¥0',
      pricePeriod: '永久免费',
      badge: null,
      highlight: false,
      buttonText: '当前正在使用',
      buttonDisabled: true,
      features: [
        '每日 5 次标准企业全景图谱分析',
        '基础力导向拓扑关系图谱查看',
        '标准一级供应商与分销客户名录',
        '基础公司财报业务板块概览',
        '商业反常点初筛与社区洞察',
      ],
      limitations: [
        '不支持 3 级供应链多层穿透分析',
        '无实时黑天鹅脆断风险沙盘推演',
        '导出研报附带官方通用水印',
      ],
    },
    {
      id: 'pro',
      name: '专业投研版 (Pro)',
      tagline: '券商分析师、VC/PE 投资经理与战略专家',
      priceMonthly: '¥299',
      priceYearly: '¥2,880',
      pricePeriod: billingCycle === 'yearly' ? '¥240 / 月 (按年付)' : '/ 月',
      badge: '投研首选',
      highlight: true,
      buttonText: '即刻升级 Pro 版',
      buttonDisabled: false,
      features: [
        '无限次 深度企业商业全景图谱透视',
        '3 级供应链多层穿透 (Tier-1/2/3)',
        '4K 高清拓扑 PNG / 无损矢量 SVG 导出',
        '投研级 Markdown & 结构化 JSON 研报导出',
        '商业逻辑反常点与灰度证据链核验矩阵',
        '突发断供压力测试与脆断推演沙盘',
        '20 家重点企业自选雷达与动态预警',
      ],
      limitations: [],
    },
    {
      id: 'team',
      name: '机构/企业定制版',
      tagline: '大型集团供应链战略部、商业银行风控与智库',
      priceMonthly: '¥2,499',
      priceYearly: '¥23,800',
      pricePeriod: billingCycle === 'yearly' ? '¥1,983 / 月 (按年付)' : '/ 月',
      badge: '机构专属',
      highlight: false,
      buttonText: '联系机构顾问定制',
      buttonDisabled: false,
      features: [
        '包含 Pro 版所有权益 + 50 个团队成员席位',
        '海量实体图数据库原生穿透接入',
        '7x24 小时海关提单与供应链黑天鹅秒级推送',
        '机构专属私有知识库 (RAG) 混检索引',
        '白标定制 (White-label) 与团队协作机密批注',
        '专属专家 1 对 1 架构支持与 SLA 99.9%',
        '提供 OpenAPI / Webhook 自动化数据对接',
      ],
      limitations: [],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F3437]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl rounded-xs border border-[#E2E6E2] bg-white shadow-2xl p-6 sm:p-8 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 rounded-xs border border-[#E2E6E2] bg-white p-1.5 text-[#627578] hover:text-[#1F3437] hover:bg-[#F6F7F5] transition-colors"
          title="关闭"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2.5 mb-8">
          <div className="inline-flex items-center gap-2 rounded-xs bg-[#FAFBF9] border border-[#E2E6E2] px-3.5 py-1 text-xs font-serif font-medium text-[#3E6F73]">
            <Sparkles className="h-3.5 w-3.5 text-[#3E6F73]" />
            <span>鉴源・GenSight 商业智能订阅方案</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-[#1F3437] tracking-tight">
            选择契合您投研深度的产业链分析方案
          </h2>
          <p className="text-xs sm:text-sm text-[#627578] font-serif max-w-xl mx-auto">
            从个人投研穿透到跨国供应链抗风险监控，助力商业与投资决策快人一步。
          </p>

          {/* Billing Switcher */}
          <div className="flex items-center justify-center gap-3 pt-3">
            <span
              className={`text-xs font-serif cursor-pointer ${
                billingCycle === 'monthly' ? 'text-[#1F3437] font-bold' : 'text-[#8C9E9F]'
              }`}
              onClick={() => setBillingCycle('monthly')}
            >
              按月计费
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="relative h-6 w-12 rounded-full bg-[#E2E6E2] p-0.5 transition-colors"
            >
              <div
                className={`h-5 w-5 rounded-full bg-[#1F3437] transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <span
              className={`text-xs font-serif flex items-center gap-1.5 cursor-pointer ${
                billingCycle === 'yearly' ? 'text-[#1F3437] font-bold' : 'text-[#8C9E9F]'
              }`}
              onClick={() => setBillingCycle('yearly')}
            >
              按年付费
              <span className="rounded-xs bg-[#2E6B56]/15 border border-[#2E6B56]/30 px-1.5 py-0.5 text-[10px] text-[#2E6B56] font-bold">
                立省 20%
              </span>
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-xs border p-6 flex flex-col justify-between transition-all ${
                plan.highlight
                  ? 'border-[#3E6F73] bg-[#FAFBF9] shadow-md ring-1 ring-[#3E6F73]/20'
                  : 'border-[#E2E6E2] bg-white hover:border-[#8C9E9F]'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-xs bg-[#1F3437] text-white px-3 py-0.5 text-[10px] font-serif font-bold shadow-xs">
                  {plan.badge}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-serif font-bold text-[#1F3437]">{plan.name}</h3>
                  <p className="text-xs text-[#627578] font-serif mt-1">{plan.tagline}</p>
                </div>

                <div className="flex items-baseline gap-1 py-2 border-y border-[#E2E6E2]">
                  <span className="text-3xl font-serif font-bold text-[#1F3437] tracking-tight">
                    {billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly}
                  </span>
                  <span className="text-xs text-[#627578] font-serif">{plan.pricePeriod}</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <p className="font-serif font-semibold text-[#1F3437]">包含权益：</p>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[#2D4245]">
                      <Check className="h-4 w-4 text-[#2E6B56] shrink-0 mt-0.5" />
                      <span className="font-serif">{feat}</span>
                    </div>
                  ))}
                  {plan.limitations.map((lim, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[#8C9E9F]">
                      <span className="h-4 w-4 text-[#C4CCC4] shrink-0 text-center font-bold">✕</span>
                      <span className="font-serif">{lim}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-[#E2E6E2]">
                <button
                  disabled={plan.buttonDisabled}
                  onClick={() => onSelectPlan && onSelectPlan(plan.id)}
                  className={`w-full rounded-xs py-2.5 text-xs font-serif font-bold transition-all ${
                    plan.highlight
                      ? 'bg-[#1F3437] hover:bg-[#3E6F73] text-white shadow-xs'
                      : plan.buttonDisabled
                      ? 'bg-[#F0F2EF] text-[#8C9E9F] border border-[#E2E6E2] cursor-not-allowed'
                      : 'border border-[#E2E6E2] bg-white text-[#1F3437] hover:bg-[#F6F7F5]'
                  }`}
                >
                  {plan.buttonText}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Enterprise Trust Guarantee */}
        <div className="rounded-xs border border-[#E2E6E2] bg-[#FAFBF9] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#627578]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xs bg-[#1F3437] text-white font-serif font-bold text-sm shrink-0">
              鉴
            </div>
            <div>
              <h4 className="font-serif font-bold text-[#1F3437]">机构级数据合规与金融安全保障</h4>
              <p className="text-[11px] text-[#627578] font-serif">
                数据严格遵循跨境投资监管与金融隔离标准，支持专有通道传输与私有化部署。
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[11px] shrink-0 font-mono text-[#627578]">
            <span>🔒 256-bit SSL</span>
            <span>⚡ 99.9% SLA</span>
            <span>📄 发票即开</span>
          </div>
        </div>
      </div>
    </div>
  );
};
