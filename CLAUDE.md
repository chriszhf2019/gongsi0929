# CLAUDE.md

## 项目定位

鉴源・GenSight —— 汽车及相关产业垂直尽调平台。用**公开免费数据 + 卫星遥感 + 真实财务法证**做可追溯的企业/产业链全景图谱。首个垂直包为汽车产业，后续插件化扩展到其他行业。

> 完整架构设计见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)，改动前先读它。

## 核心原则（不可妥协）

**能真算的做真，不能真算的砍掉，绝不留假数据充门面。**

- 旧版 `src/utils/forensicDataHelper.ts` 里的"九维法证"（Benford/SAR/Ricci 等）是**预写模板文本 + 固定数字**，属于待替换的假数据，不是可复算的结论。
- 不要延续"堆术语充严谨"的做法；任何数字必须可追溯到 `Evidence`（来源 + 页码/URL + 采集时间）。

## 技术栈

- 前端：React 19 + Tailwind 4 + d3 + recharts + motion（Vite）
- 后端：Express + better-sqlite3（WAL），`server-*.ts` 模块化
- AI：`@google/genai`（Gemini）+ OpenAI 兼容 fetch（DeepSeek/Qwen），后端持有 Key
- PDF 抽取：pdfjs-dist；披露采集：巨潮(A股) + SEC EDGAR(美股)

## 常用命令

```bash
npm install          # 安装依赖（需构建 better-sqlite3 原生模块）
npm run dev          # 开发：tsx server.ts（默认端口 3000，PORT 环境变量可覆盖）
npm run build        # 构建：vite build + esbuild 打包 server → dist/server.cjs
npm start            # 生产：node dist/server.cjs
npm run lint         # 类型检查：tsc --noEmit
```

## 目录结构

```
server.ts             # Express 入口 + 路由
server-ai.ts          # AI 抽象层（三 provider、超时、schema 转换）
server-auth.ts        # 鉴权（scrypt、HttpOnly session）
server-admin.ts       # 后台管理 + 限流 + 日志中间件
server-filing.ts      # 披露文件采集（巨潮/SEC）
server-extract.ts     # LLM 结构化抽取（schema 驱动）
server-report.ts      # 付费报告生成
server-email.ts       # Resend 邮件投递（无 Key 时 mock）
db.ts                 # SQLite 数据层（10 张表）
src/App.tsx           # 前端入口（6 层递进）
src/types.ts          # 领域类型（待迁移到知识图谱本体）
src/data/             # 预设演示数据（过渡期保留，最终由采集+抽取动态生成）
src/components/       # 30+ 组件
src/utils/forensicDataHelper.ts  # ⚠️ 待重写的假法证模板
```

## 关键决策（ADR）

- **假法证全砍**：Benford/Beneish/Altman 要换成真计算，Ricci/Pearl/渗流相变等砍掉，换成图中心性（度/介数）。
- **第一版零付费数据源**：披露文件 + 行业统计 + Sentinel-1 遥感；工商股权留到有需求时按次付费兜底。
- **LLM 只做抽取不做生成**：抽取用便宜的 DeepSeek/Qwen，Gemini 仅兜底。
- **知识图谱替代平铺数组**：支撑证据链 + 中心性计算。

## 当前状态

### 已修复（本轮）
- ✅ 补齐缺失的 `src/data/mockTemplates.ts` + `automotiveIndustry.ts`（此前项目无法编译）
- ✅ 修复 Gemini 超时空转（`server-ai.ts` 的 `withTimeout` 改 `Promise.race`）
- ✅ 报告订单查询接口加鉴权（`server.ts`）
- ✅ 修复生产构建 `import.meta.url` 启动崩溃

### 待办（按 Phase）
- **P1.1 港交所采集**（✅ 已实现）：`server-filing.ts` 的 `searchHkexFilings` / `findHkexStockId`，接口已验证，需在实际部署环境跑通端到端
- **P1.2 台股采集**：台湾公开资讯观测站 MOPS
- **P1.3 证据链**：Evidence 数据结构落地
- **P1.4 知识图谱**：替代平铺数组
- **P2 真实法证**：Benford/Beneish/Altman 真计算替换假模板
- **P3 卫星实证**：Sentinel-1 SAR 监测工厂开工
- **P4 多行业**：垂直包抽象 + 验证半导体

## 已知限制

- **港交所披露易有反爬限流**：`titleSearchServlet.do` 高频请求会返回 `recordCnt:0` + `lang:"C"`（限流特征）。采集器已用 `fetchWithRetry`（5s/15s/45s 退避），生产需低频 + 缓存 + 定时任务，必要时 IP 轮换。接口关键坑：`prefix.do` 用 `lang=ZH`（大写），`titleSearchServlet` 用 `lang=zh`（小写）；`fromDate` 格式是 YYYYMMDD，过远日期会静默返回空（实测 20240101 可、20230929 空）。
- **巨潮资讯网采集器已过时**（原有代码，非本轮引入）：`server-filing.ts` 的 `searchCninfoFilings` 用 `stock=${code},${exchange}`（如 `002594,szse`）格式，但巨潮新版 API 返回 `totalSecurities:0`（需 `orgId`，通过证券搜索接口获取）。待 P1 修复。
- AI 分析路径需 `.env` 配 `GEMINI_API_KEY`（或 DeepSeek/Qwen）；预设 4 家公司（比亚迪/宁德时代/苹果/台积电）走内置演示数据，无需 Key。
- 付费报告默认 `PAYMENT_MODE=mock`、无 `RESEND_API_KEY` 时不真发邮件。
- `DAILY_FREE_BASIC_LIMIT` 是死配置（定义了未生效）。
- 前端单 chunk 约 1.3MB（gzip 373KB）未拆包，内网可接受，上线前用 `manualChunks` 拆 vendor。
