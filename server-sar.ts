/**
 * Sentinel-1 SAR 工厂实证模块
 *
 * 接入 Copernicus Data Space Ecosystem (CDSE) OData API
 * 获取真实 Sentinel-1 GRD 产品元数据，用于工厂开工率监测
 *
 * API 文档: https://documentation.dataspace.copernicus.eu/APIs/OData.html
 * 免费公开接口，无需 API Key（元数据查询）
 */

import { getLatestExtractedData } from './db';

// Copernicus Data Space OData API
const CDSE_ODATA_URL = 'https://catalogue.dataspace.copernicus.eu/odata/v1/Products';

export interface SarProduct {
  id: string;
  name: string;
  acquisitionDate: string;
  beginPosition: string;
  endPosition: string;
  footprint: string;
  orbitNumber: number;
  relativeOrbitNumber: number;
  polarisationChannels: string;
  productType: string;
  size: string;
}

export interface SarTimeSeriesPoint {
  date: string;
  backscatterMean: number | null; // dB (需后续处理)
  orbitNumber: number;
  productName: string;
}

export interface FactorySarData {
  factoryName: string;
  location: { lat: number; lon: number };
  boundingBox: string; // WKT format
  timeSeries: SarTimeSeriesPoint[];
  dataQuality: {
    totalImages: number;
    dateRange: { start: string; end: string };
    avgRevisitDays: number;
  };
  verdict: string;
}

/**
 * 已知工厂坐标（示例）
 * 实际使用时应从 extracted_data 或用户输入获取
 */
const KNOWN_FACTORIES: Record<string, { lat: number; lon: number; name: string }> = {
  '比亚迪坪山工厂': { lat: 22.7167, lon: 114.3500, name: '比亚迪坪山总部工厂' },
  '比亚迪西安工厂': { lat: 34.2619, lon: 108.9428, name: '比亚迪西安高新工厂' },
  '宁德时代湖西基地': { lat: 26.6611, lon: 119.5347, name: '宁德时代湖西智造基地' },
  '宁德时代宜宾基地': { lat: 28.7619, lon: 104.5689, name: '宁德时代宜宾工厂' },
};

/**
 * 构建 WKT 格式的 bounding box
 * @param lat 中心纬度
 * @param lon 中心经度
 * @param sizeKm 区域大小（公里），默认 2km（适合单个工厂）
 */
function buildBoundingBox(lat: number, lon: number, sizeKm: number = 2): string {
  // 粗略转换：1 度纬度 ≈ 111km，1 度经度 ≈ 111km * cos(lat)
  const latOffset = sizeKm / 2 / 111;
  const lonOffset = sizeKm / 2 / (111 * Math.cos(lat * Math.PI / 180));

  const minLat = lat - latOffset;
  const maxLat = lat + latOffset;
  const minLon = lon - lonOffset;
  const maxLon = lon + lonOffset;

  // OData API 使用 bbox 格式: "POLYGON((minLon minLat, minLon maxLat, maxLon maxLat, maxLon minLat, minLon minLat))"
  return `POLYGON((${minLon} ${minLat}, ${minLon} ${maxLat}, ${maxLon} ${maxLat}, ${maxLon} ${minLat}, ${minLon} ${minLat}))`;
}

/**
 * 查询 Copernicus CDSE OData API 获取 Sentinel-1 产品
 */
async function querySentinel1Products(
  boundingBox: string,
  startDate: string,
  endDate: string,
  maxResults: number = 50
): Promise<SarProduct[]> {
  // 构建 OData 查询参数
  const params = new URLSearchParams({
    '$filter': [
      `Collection/Name eq 'SENTINEL-1'`,
      `and OData.CSC.Intersects(area=geography'SRID=4326;${boundingBox}')`,
      `and ContentDate/Start gt ${startDate}T00:00:00.000Z`,
      `and ContentDate/Start lt ${endDate}T23:59:59.999Z`,
      `and Attributes/OData.CSC.StringAttribute/any(att:att/Name eq 'productType' and att/OData.CSC.StringAttribute/Value eq 'IW_GRDH_1S')`,
    ].join(' '),
    '$orderby': 'ContentDate/Start desc',
    '$top': maxResults.toString(),
    '$expand': 'Attributes',
  });

  const url = `${CDSE_ODATA_URL}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!response.ok) {
      throw new Error(`CDSE API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // 解析 OData 响应
    const products: SarProduct[] = (data.value || []).map((item: any) => {
      const attrs = item.Attributes || [];
      const getAttr = (name: string) => attrs.find((a: any) => a.Name === name)?.Value;

      return {
        id: item.Id,
        name: item.Name,
        acquisitionDate: item.ContentDate?.Start || item.PublicationDate,
        beginPosition: item.ContentDate?.Start,
        endPosition: item.ContentDate?.End,
        footprint: item.Footprint,
        orbitNumber: parseInt(getAttr('orbitNumber') || '0', 10),
        relativeOrbitNumber: parseInt(getAttr('relativeOrbitNumber') || '0', 10),
        polarisationChannels: getAttr('polarisationChannels') || 'VV/VH',
        productType: getAttr('productType') || 'IW_GRDH_1S',
        size: item.ContentLength ? `${Math.round(item.ContentLength / 1024 / 1024)} MB` : 'N/A',
      };
    });

    return products;
  } catch (error) {
    console.error('[SAR] Failed to query CDSE API:', error);
    throw error;
  }
}

/**
 * 获取工厂的 SAR 时间序列数据
 */
export async function getFactorySarTimeSeries(
  factoryKey: string,
  monthsBack: number = 12
): Promise<FactorySarData | null> {
  const factory = KNOWN_FACTORIES[factoryKey];
  if (!factory) {
    return null;
  }

  const boundingBox = buildBoundingBox(factory.lat, factory.lon, 2);

  // 计算日期范围
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  try {
    const products = await querySentinel1Products(
      boundingBox,
      startDateStr,
      endDateStr,
      100
    );

    // 构建时间序列（目前只有元数据，真实后向散射值需要下载和处理 GeoTIFF）
    const timeSeries: SarTimeSeriesPoint[] = products.map((p) => ({
      date: p.acquisitionDate.split('T')[0],
      backscatterMean: null, // TODO: 需要实际处理 Sentinel-1 GeoTIFF 计算
      orbitNumber: p.orbitNumber,
      productName: p.name,
    }));

    // 计算数据质量指标
    const dates = timeSeries.map((t) => new Date(t.date)).sort((a, b) => a.getTime() - b.getTime());
    const totalDays = dates.length > 0
      ? (dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24)
      : 0;
    const avgRevisitDays = dates.length > 1 ? totalDays / (dates.length - 1) : 0;

    const verdict = timeSeries.length > 0
      ? `已获取 ${timeSeries.length} 景 Sentinel-1 SAR 影像覆盖该工厂区域，时间跨度 ${startDateStr} 至 ${endDateStr}，平均重访周期 ${avgRevisitDays.toFixed(1)} 天。`
      : `未找到覆盖该工厂区域的 Sentinel-1 影像。`;

    return {
      factoryName: factory.name,
      location: { lat: factory.lat, lon: factory.lon },
      boundingBox,
      timeSeries,
      dataQuality: {
        totalImages: timeSeries.length,
        dateRange: {
          start: dates.length > 0 ? dates[0].toISOString().split('T')[0] : '',
          end: dates.length > 0 ? dates[dates.length - 1].toISOString().split('T')[0] : '',
        },
        avgRevisitDays: Math.round(avgRevisitDays * 10) / 10,
      },
      verdict,
    };
  } catch (error) {
    console.error(`[SAR] Failed to get time series for ${factoryKey}:`, error);
    return null;
  }
}

/**
 * 获取所有已知工厂列表
 */
export function listKnownFactories(): { key: string; name: string; lat: number; lon: number }[] {
  return Object.entries(KNOWN_FACTORIES).map(([key, f]) => ({
    key,
    name: f.name,
    lat: f.lat,
    lon: f.lon,
  }));
}

/**
 * 根据公司名称尝试匹配已知工厂
 */
export function findFactoryForCompany(companyName: string): string | null {
  const lowerName = companyName.toLowerCase();

  if (lowerName.includes('比亚迪') || lowerName.includes('byd')) {
    return '比亚迪坪山工厂'; // 默认返回总部工厂
  }
  if (lowerName.includes('宁德时代') || lowerName.includes('catl')) {
    return '宁德时代湖西基地';
  }

  return null;
}
