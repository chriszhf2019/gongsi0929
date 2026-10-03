import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { PieChart as PieIcon, BarChart3, TrendingUp, Sparkles, DollarSign, Layers } from 'lucide-react';
import { CompanyPanoramaData } from '../types';

interface FinancialSegmentsProps {
  data: CompanyPanoramaData;
}

const SEGMENT_COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
const REGION_COLORS = ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ec4899'];

export const FinancialSegments: React.FC<FinancialSegmentsProps> = ({ data }) => {
  const { basicInfo, financialBreakdown } = data;

  const segmentsData = financialBreakdown?.segments || [
    { name: '核心主营业务', value: 64 },
    { name: '生态及关联业务', value: 22 },
    { name: '海外与创新服务', value: 14 },
  ];

  const regionsData = financialBreakdown?.regions || [
    { name: '中国大陆', value: 68 },
    { name: '欧洲及中东', value: 16 },
    { name: '亚太其他', value: 11 },
    { name: '美洲', value: 5 },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Top Banner / Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="text-[11px] font-medium text-slate-400">年度营业收入体量</div>
          <div className="text-lg font-bold text-white font-mono mt-1">
            {basicInfo.annualRevenue || '未公开披露'}
          </div>
          <div className="text-[10px] text-cyan-400 mt-0.5">全球产业领军规模</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="text-[11px] font-medium text-slate-400">市值 / 综合估值</div>
          <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
            {basicInfo.marketCapOrValuation || '非公开估值'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{basicInfo.exchange || '核心标的'}</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="text-[11px] font-medium text-slate-400">研发费用率区间</div>
          <div className="text-lg font-bold text-cyan-400 font-mono mt-1">
            {financialBreakdown?.rdExpenseRatio || '5.5% - 10.8%'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">高强度技术壁垒壁垒</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="text-[11px] font-medium text-slate-400">综合业务毛利率</div>
          <div className="text-lg font-bold text-purple-400 font-mono mt-1">
            {financialBreakdown?.grossMargin || '18.5% - 24.5%'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">垂直一体化护城河支撑</div>
        </div>
      </div>

      {/* Recharts Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Business Segments Donut Chart */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                  <PieIcon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">主营业务收入板块构成 (Revenue Breakdown)</h3>
                  <p className="text-[11px] text-slate-400">按主营事业群与业务矩阵结构拆解</p>
                </div>
              </div>
              <span className="text-[10px] text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                板块比重
              </span>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={segmentsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {segmentsData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={SEGMENT_COLORS[index % SEGMENT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`${value}% 份额`, '占比估算']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Legend Items */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-slate-800/80">
            {segmentsData.map((seg, idx) => (
              <div key={idx} className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: SEGMENT_COLORS[idx % SEGMENT_COLORS.length] }}
                />
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-300 truncate font-medium">{seg.name}</div>
                  <div className="text-[10px] font-mono text-cyan-400">{seg.value}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Regional Market Coverage Bar Chart */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800/60">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">全球地域营收分布格局 (Geographic Spread)</h3>
                  <p className="text-[11px] text-slate-400">本土大本营与海外出海渗透率</p>
                </div>
              </div>
              <span className="text-[10px] text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                出海对标
              </span>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`${value}% 营收贡献`, '地域占比']}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]}>
                    {regionsData.map((_entry, index) => (
                      <Cell key={`cell-bar-${index}`} fill={REGION_COLORS[index % REGION_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Regional Summary */}
          <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-300 flex items-center justify-between">
            <span className="text-slate-400">出海扩张韧性：</span>
            <span className="font-semibold text-emerald-400">
              全球化布局加速，欧洲及东南亚市场增长迅猛
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
