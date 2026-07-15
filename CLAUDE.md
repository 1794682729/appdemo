# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目是什么

个人自用记账 Web 应用（流水账）：部署在国内 VPS，手机 Safari「添加到主屏幕」使用。  
**不做** App Store / 原生壳；**不做**多用户；数据在服务端，不以浏览器本地为唯一数据源。

## 常用命令

包管理：`pnpm@9.15.9`（见根 `packageManager`）。Node：`>=20.19`（推荐 22，见 `.nvmrc`）。

```bash
# 安装（仓库根目录）
pnpm install

# 先构建 shared（api 和 web 均依赖其 dist 输出）
pnpm build:shared

# 并行开发 api + web
pnpm dev            # 同时启动 api:3001 + web:5173
pnpm dev:api        # 仅 api（tsx watch）
pnpm dev:web        # 仅 web（vite dev）

# 全量构建 / 类型检查
pnpm build          # shared → api → web 顺序构建
pnpm typecheck
pnpm lint

# Docker（生产部署）
docker compose up -d
```

尚无测试脚本；若后续加 Vitest，在对应 package 的 `package.json` 增加 `test` / `test:watch` 后再写入本节。

## 架构

pnpm workspace monorepo，三个包均已实现：

| 路径 | 包名 | 关键技术 | 职责 |
|------|------|----------|------|
| `packages/shared` | `@liushui/shared` | zod, TypeScript | Zod schema、金额（分）、日期工具；前后端共用 |
| `apps/api` | `@liushui/api` | Hono 4, Drizzle ORM, `@libsql/client`, bcryptjs, nanoid | REST API `/api/*`；Cookie 会话鉴权；SQLite |
| `apps/web` | `@liushui/web` | React 19, React Router 7, TanStack Query, Zustand, Recharts, Tailwind CSS 4, vite-plugin-pwa | 移动端优先 SPA + PWA 壳 |

### packages/shared

```
src/
  index.ts      # barrel export
  money.ts      # yuanToCents / centsToYuan / formatCNY / parseYuanInput
  date.ts       # todayDate / currentYearMonth / shiftYearMonth / listRecentYearMonths / formatYearMonthLabel
  schemas.ts    # transaction、category、budget、auth 等 Zod schema + 推断类型
```

- `money.ts`：金额统一用 **整数分（cents）** 入库，展示时格式化为人民币
- `date.ts`：业务日期用本地字符串 `YYYY-MM-DD` / `YYYY-MM`，避免时区问题
- `schemas.ts`：改 API 入参或金额规则时，**先改 shared**，再改 api/web，并 `pnpm build:shared`

### apps/api

```
src/
  index.ts                 # Hono app 入口：migrate() → 中间件 → 注册路由 → serve(:3001)
  db/
    client.ts              # @libsql/client + drizzle 初始化
    schema.ts              # Drizzle 表定义：users, sessions, categories, transactions, budgets, meta
    migrate.ts             # 启动时 CREATE TABLE IF NOT EXISTS + 索引
  lib/
    id.ts                  # newId(prefix) — nanoid
    time.ts                # nowIso(), daysFromNowIso()
  middleware/
    auth.ts                # requireAuth — 从 Cookie 验证会话，注入 userId + username
    rateLimit.ts           # 登录限流：每 IP 15 分钟内 5 次失败
  routes/
    health.ts              # GET /api/health
    auth.ts                # POST setup|login|logout, GET status|me
    categories.ts          # CRUD /api/categories（首次访问自动写入种子分类）
    transactions.ts        # CRUD /api/transactions（支持 ?yearMonth= 过滤）
    stats.ts               # GET summary|by-category|trend
    budgets.ts             # GET|PUT /api/budgets/:yearMonth
    exportImport.ts        # GET /api/export（JSON 备份）, POST /api/import
```

默认端口 `3001`。开发期 web 的 Vite 把 `/api` 代理到 `localhost:3001`。

### apps/web

```
src/
  main.tsx                 # 入口：QueryClientProvider + BrowserRouter
  App.tsx                  # 路由定义 + RequireAuth 守卫
  styles.css               # Tailwind CSS 4 (@import "tailwindcss") + iOS 毛玻璃系统
  lib/
    api.ts                 # 类型化 fetch 封装：auth, categoriesApi, transactionsApi, statsApi, budgetsApi, dataApi
  store/
    auth.ts                # Zustand auth store：checkAuth, login, logout
  components/
    AppShell.tsx            # 底部 4 Tab：流水、统计、预算、我的
    RequireAuth.tsx         # 鉴权守卫：未登录 → /login
    AmountInput.tsx         # ¥ 金额输入组件
    CategoryPicker.tsx      # 4 列分类图标选择器
    MonthSwitcher.tsx       # 月份左右切换
  pages/
    LoginPage.tsx           # 登录 / 首次设置（自动判断是否有用户）
    HomePage.tsx            # 摘要卡片 + 按月流水列表
    TransactionFormPage.tsx # 新建/编辑流水（类型、金额、分类、日期、备注）
    StatsPage.tsx           # 月统计：摘要 + Recharts 饼图（分类支出）+ 6 月趋势柱状图
    BudgetPage.tsx          # 总预算 + 分分类预算进度条
    SettingsPage.tsx        # 用户信息、分类管理、JSON 导出/导入、退出
```

默认端口 `5173`。样式：Tailwind CSS 4 通过 `@tailwindcss/vite` 插件加载（**无** `tailwind.config.*` 文件，配置在 CSS 中用 `@theme` 指令）。

## 数据库

- **引擎**：SQLite，通过 `@libsql/client` 访问（HTTP/TCP 协议，**零原生依赖**，Docker 中无需 gcc/make）
- **迁移**：`apps/api/src/db/migrate.ts`，启动时自动执行 `CREATE TABLE IF NOT EXISTS` + 索引，无独立迁移文件
- **6 张表**：`users`, `sessions`, `categories`, `transactions`, `budgets`, `meta`
- **索引**：`transactions(date)`, `transactions(category_id)`, `sessions(user_id)`
- **关键约定**：
  - 金额存 `amount_cents`（整数分），展示时用 `formatCNY()` 格式化为 `¥1,234.00`
  - 日期存 `YYYY-MM-DD` / `YYYY-MM` 字符串，不用 Unix 时间戳
  - 所有表用 text 主键（nanoid 生成），`created_at` / `updated_at` 存 ISO 字符串
  - `budgets.by_category` 存 JSON 字符串 `{"categoryId": cents}`

## API 端点（已实现）

所有端点挂载在 `/api` 下：

| 方法 | 路径 | 文件 | 鉴权 |
|------|------|------|------|
| GET | `/health` | `routes/health.ts` | 无 |
| POST | `/auth/setup` | `routes/auth.ts` | 无（仅无用户时可用） |
| POST | `/auth/login` | `routes/auth.ts` | 无 |
| POST | `/auth/logout` | `routes/auth.ts` | 需登录 |
| GET | `/auth/status` | `routes/auth.ts` | 无 |
| GET | `/auth/me` | `routes/auth.ts` | 需登录 |
| GET/POST | `/categories` | `routes/categories.ts` | 需登录 |
| PATCH/DELETE | `/categories/:id` | `routes/categories.ts` | 需登录 |
| GET/POST | `/transactions` | `routes/transactions.ts` | 需登录 |
| PATCH/DELETE | `/transactions/:id` | `routes/transactions.ts` | 需登录 |
| GET | `/stats/summary` | `routes/stats.ts` | 需登录 |
| GET | `/stats/by-category` | `routes/stats.ts` | 需登录 |
| GET | `/stats/trend` | `routes/stats.ts` | 需登录 |
| GET | `/budgets/:yearMonth` | `routes/budgets.ts` | 需登录 |
| PUT | `/budgets/:yearMonth` | `routes/budgets.ts` | 需登录 |
| GET | `/export` | `routes/exportImport.ts` | 需登录 |
| POST | `/import` | `routes/exportImport.ts` | 需登录 |

**中间件**：`requireAuth` 从 Cookie (`liushui_session`) 验会话；`loginRateLimit` 对 `/auth/login` 401 响应限流（15 分钟 5 次/ip）。

**生产 Cookie 策略**：`HttpOnly; Secure; SameSite=Lax`，前后端同域避免跨域。

## 前端路由与状态

**路由**（React Router 7）：

| 路径 | 页面 | 说明 |
|------|------|------|
| `/login` | `LoginPage` | 首次自动判断 setup/login |
| `/` | `HomePage` | 流水首页（AppShell 内） |
| `/stats` | `StatsPage` | 统计（AppShell 内） |
| `/budget` | `BudgetPage` | 预算（AppShell 内） |
| `/settings` | `SettingsPage` | 我的（AppShell 内） |
| `/transactions/new` | `TransactionFormPage` | 新建/编辑流水（独立页） |

`AppShell` 提供底部 4 Tab 导航，`RequireAuth` 鉴权守卫包裹除 `/login` 外所有路由。

**状态管理**：
- **Zustand** (`store/auth.ts`)：登录状态、当前用户、`checkAuth()` / `login()` / `logout()`
- **TanStack Query** (React Query 5)：所有服务端数据（流水、分类、统计、预算），在各 page 中通过 `lib/api.ts` 的自定义 hook 调用

**PWA**：`vite-plugin-pwa` + workbox，`autoUpdate` 模式。manifest 名「流水记账」，`theme_color: #0f766e`，`display: standalone`。

## 部署

```
deploy/
  Dockerfile.api    # 两阶段：node:22-slim 构建 → node:22-slim 运行，非 root
  Dockerfile.web    # 两阶段：node:22-alpine 构建 → nginx:1.27-alpine 运行
  nginx.conf        # /api 反代 → api:3001，SPA fallback，静态资源 1 年缓存
docker-compose.yml  # api + web 双服务，api_data volume 持久化，api 健康检查
.env.example        # SESSION_SECRET / ALLOWED_ORIGIN / DATABASE_PATH / PORT / NODE_ENV
```

启动：`docker compose up -d`。数据库文件在 `api_data` volume 中。Nginx 监听 80，生产环境前挂 Nginx/反向代理处理 TLS。

### 部署相关约束

- 国内 VPS 公网 80/443 网站服务通常要 **ICP 备案** 域名。
- 密钥与 `.env` 勿提交；`SESSION_SECRET`、`DATABASE_PATH` 等仅环境注入。

## MVP 边界

做：单用户登录、记账、分类、月统计图表、预算、JSON 备份还原、HTTPS 主屏幕。  
不做：多账户/转账、银行同步、OCR、OAuth、多用户、原生推送/小组件。

## 实现时注意

- 依赖版本以 lockfile 为准（React 19 / Hono 4 / Drizzle / Tailwind CSS 4 / zod 3.25 / Vite 6 等）。
- `@libsql/client` 通过 HTTP/TCP 访问 SQLite 文件，**零原生依赖**，本地和 Docker 均无需额外编译工具。
- shared 包 tsconfig 用 `ESNext + Bundler` 模式，api 包用 `NodeNext + NodeNext` 模式——两者不同，不要混用。
- Tailwind CSS 4 使用 `@tailwindcss/vite` 插件，样式配置在 `styles.css` 中用 `@theme` 指令，无 `tailwind.config.*` 文件。
- 启动前必须先 `pnpm build:shared`，api 和 web 都依赖 shared 的 `dist/` 输出。
- 不自动 `git commit` / `git push`，除非用户明确要求。
