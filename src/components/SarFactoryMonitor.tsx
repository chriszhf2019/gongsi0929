import React, { useState, useEffect } from 'react';
import { Satellite, Calendar, MapPin, Clock, TrendingUp, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface SarTimeSeriesPoint {
  date: string;
  backscatterMean: number | null;
  orbitNumber: number;
  productName: string;
}

interface FactorySarData {
  factoryName: string;
  location: { lat: number; lon: number };
  boundingBox: string;
  timeSeries: SarTimeSeriesPoint[];
  dataQuality: {
    totalImages: number;
    dateRange: { start: string; end: string };
    avgRevisitDays: number;
  };
  verdict: string;
}

interface SarFactoryMonitorProps {
  companyName?: string;
}

export const SarFactoryMonitor: React.FC<SarFactoryMonitorProps> = ({ companyName }) => {
  const [sarData, setSarData] = useState<FactorySarData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthsBack, setMonthsBack] = useState(12);

  useEffect(() => {
    if (!companyName) return;

    const fetchSarData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/sar/company/${encodeURIComponent(companyName)}?months=${monthsBack}`
        );
        const result = await response.json();

        if (result.hasData && result.data) {
          setSarData(result.data);
        } else {
          setError(result.message || '未找到该公司的 SAR 数据');
        }
      } catch (err: any) {
        setError(err.message || '获取 SAR 数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchSarData();
  }, [companyName, monthsBack]);

  if (loading) {
    return (
      <div className="p-6 rounded-xs border border-[#E2E6E2] bg-white">
        <div className="flex items-center gap-3 text-[#627578]">
          <Satellite className="h-5 w-5 animate-pulse" />
          <span className="text-sm font-serif">正在查询 Copernicus Sentinel-1 影像...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xs border border-[#C4883A]/30 bg-[#FFF8ED]">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-[#C4883A] shrink-0 mt-0.5" />
          <div>
            <div className="font-serif font-bold text-sm text-[#C4883A]">暂无 SAR 实证数据</div>
            <p className="text-xs text-[#7A5520] mt-1">{error}</p>
            <p className="text-[11px] text-[#8C9E9F] mt-2">
              当前仅支持已知工厂坐标查询。可在 server-sar.ts 中添加更多工厂坐标。
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!sarData) return null;

  const { factoryName, location, timeSeries, dataQuality, verdict } = sarData;

  // 准备图表数据（过滤掉没有 backscatterMean 的点）
  const chartData = timeSeries
    .filter((p) => p.backscatterMean !== null)
    .map((p) => ({
      date: p.date,
      backscatter: p.backscatterMean,
      orbit: p.orbitNumber,
    }));

  const hasBackscatterData = chartData.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 rounded-xs border border-[#1F3437] bg-white shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xs bg-[#3E6F73]/10 text-[#3E6F73] border border-[#3E6F73]/30 shrink-0">
              <Satellite className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-base font-bold text-[#1F3437]">
                  {factoryName}
                </h3>
                <span className="text-[10px] px-1.5 py-0.5 bg-[#3E6F73]/10 text-[#3E6F73] border border-[#3E6F73]/20 rounded-xs font-sans">
                  Sentinel-1 实测
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-[#627578]">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {location.lat.toFixed(4)}°N, {location.lon.toFixed(4)}°E
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {dataQuality.dateRange.start} ~ {dataQuality.dateRange.end}
                </span>
              </div>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-[#627578]">时间范围:</span>
            <select
              value={monthsBack}
              onChange={(e) => setMonthsBack(parseInt(e.target.value))}
              className="text-xs border border-[#E2E6E2] rounded-xs px-2 py-1 bg-white"
            >
              <option value={6}>近 6 个月</option>
              <option value={12}>近 12 个月</option>
              <option value={24}>近 24 个月</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Quality Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xs bg-[#F6F7F5] border border-[#E2E6E2]">
          <div className="flex items-center gap-1.5 text-[10px] text-[#627578] mb-1">
            <Satellite className="h-3 w-3" />
            <span>影像数量</span>
          </div>
          <div className="font-mono font-bold text-lg text-[#1F3437]">
            {dataQuality.totalImages}
            <span className="text-xs text-[#627578] font-normal ml-1">景</span>
          </div>
        </div>
        <div className="p-3 rounded-xs bg-[#F6F7F5] border border-[#E2E6E2]">
          <div className="flex items-center gap-1.5 text-[10px] text-[#627578] mb-1">
            <Clock className="h-3 w-3" />
            <span>平均重访周期</span>
          </div>
          <div className="font-mono font-bold text-lg text-[#1F3437]">
            {dataQuality.avgRevisitDays}
            <span className="text-xs text-[#627578] font-normal ml-1">天</span>
          </div>
        </div>
        <div className="p-3 rounded-xs bg-[#F6F7F5] border border-[#E2E6E2]">
          <div className="flex items-center gap-1.5 text-[10px] text-[#627578] mb-1">
            <TrendingUp className="h-3 w-3" />
            <span>后向散射数据</span>
          </div>
          <div className="font-mono font-bold text-sm text-[#1F3437]">
            {hasBackscatterData ? (
              <span className="flex items-center gap-1 text-[#3E6F73]">
                <CheckCircle2 className="h-4 w-4" />
                已处理
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[#C4883A]">
                <AlertCircle className="h-4 w-4" />
                待处理
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Time Series Chart */}
      {hasBackscatterData ? (
        <div className="p-4 rounded-xs border border-[#E2E6E2] bg-white">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-serif font-bold text-sm text-[#1F3437]">
              后向散射系数时间序列 (Mean Backscatter σ°)
            </h4>
            <span className="text-[10px] text-[#627578] font-mono">单位: dB</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E6E2" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#627578' }}
                  tickFormatter={(val) => val.slice(5)} // Show MM-DD
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#627578' }}
                  domain={['auto', 'auto']}
                  label={{ value: 'dB', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E2E6E2',
                    borderRadius: '4px',
                    fontSize: '11px',
                  }}
                  formatter={(value: number) => [`${value.toFixed(2)} dB`, '后向散射']}
                  labelFormatter={(label) => `日期: ${label}`}
                />
                <ReferenceLine y={-10} stroke="#C4883A" strokeDasharray="3 3" label={{ value: '低活动阈值', fontSize: 10, fill: '#C4883A' }} />
                <Line
                  type="monotone"
                  dataKey="backscatter"
                  stroke="#3E6F73"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#3E6F73' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-[#627578] mt-2 leading-relaxed">
            后向散射系数反映地表粗糙度与介电常数变化。工厂开工率高时，金属设备与车辆活动增加雷达反射，σ° 上升；
            停产或减产时，σ° 下降。通过与财报披露的产能利用率交叉验证，可实证经营真实性。
          </p>
        </div>
      ) : (
        <div className="p-4 rounded-xs border border-[#C4883A]/30 bg-[#FFF8ED]">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-[#C4883A] shrink-0 mt-0.5" />
            <div>
              <div className="font-serif font-bold text-sm text-[#C4883A]">
                已获取 {dataQuality.totalImages} 景影像，后向散射待处理
              </div>
              <p className="text-xs text-[#7A5520] mt-1">
                已找到覆盖该工厂的 Sentinel-1 GRD 影像，但后向散射系数需要下载 GeoTIFF 并计算统计值。
                当前仅展示元数据（获取时间、轨道号）。
              </p>
              <div className="mt-3 p-2 bg-white rounded-xs border border-[#E2E6E2]">
                <div className="text-[10px] text-[#627578] mb-1">最近 5 景影像:</div>
                <div className="space-y-1">
                  {timeSeries.slice(0, 5).map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[#1F3437]">{p.date}</span>
                      <span className="text-[#627578]">Orbit {p.orbitNumber}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verdict */}
      <div className="p-3 rounded-xs bg-[#F0F7F7] border border-[#3E6F73]/20">
        <p className="text-xs text-[#1F3437] leading-relaxed">{verdict}</p>
      </div>

      {/* Data Source */}
      <div className="flex items-center justify-between text-[10px] text-[#8C9E9F] px-1">
        <span>数据来源: Copernicus Data Space Ecosystem · Sentinel-1 SAR</span>
        <a
          href="https://dataspace.copernicus.eu"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-[#3E6F73]"
        >
          <span>dataspace.copernicus.eu</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
};
