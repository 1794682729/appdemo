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

# 先构建 shared（api/web 依赖其 dist）
pnpm build:shared

# 并行开发 api + web（需 apps 已就绪）
pnpm dev
pnpm dev:api
pnpm dev:web

# 全量构建 / 类型检查
pnpm build
pnpm typecheck
pnpm lint
```

当前仅 `packages/shared` 已落地；`apps/api`、`apps/web` 按 monorepo 规划实现中。实现后：

- API 默认端口：`3001`
- Web 默认端口：`5173`，开发期把 `/api` 代理到后端
- 生产：Nginx 同域托管静态前端 + 反代 `/api`（见计划中的 `docker-compose` / `deploy/`）

尚无测试脚本；若后续加 Vitest，在对应 package 的 `package.json` 增加 `test` / `test:watch` 后再写入本节。

## 架构（目标结构）

pnpm workspace monorepo：

| 路径 | 包名 | 职责 |
|------|------|------|
| `packages/shared` | `@liushui/shared` | Zod schema、金额（分）、日期 `YYYY-MM(-DD)` 工具；**前后端共用** |
| `apps/api` | `@liushui/api` | Hono + Drizzle + SQLite；REST `/api/*`；Cookie 会话鉴权 |
| `apps/web` | `@liushui/web` | Vite + React + Tailwind；移动端优先 SPA + 轻量 PWA 壳 |

数据落在服务端 SQLite（单用户够用；备份=拷 DB 文件 + 设置页 JSON 导出）。  
金额：**整数分（cents）** 入库，展示再格式化为人民币；业务日期用本地日历字符串，避免时区把「今天」算错。

### 已存在的 shared 约定

- `money.ts`：`yuanToCents` / `centsToYuan` / `formatCNY` / `parseYuanInput`
- `date.ts`：`todayDate`、`currentYearMonth`、`shiftYearMonth` 等
- `schemas.ts`：login/setup、category、transaction、budget 等 Zod 定义

改 API 入参或金额规则时，**先改 shared**，再改 api/web，并 `pnpm build:shared`。

### API 形状（规划）

```
POST /api/auth/setup | login | logout
GET  /api/auth/me
CRUD /api/categories, /api/transactions
GET  /api/stats/summary|by-category|trend
GET|PUT /api/budgets/:yearMonth
GET  /api/export   POST /api/import
```

除 setup/login 与 health 外需登录。生产 Cookie：`HttpOnly; Secure; SameSite=Lax`，**前后端同域**避免跨域 Cookie。

## MVP 边界

做：单用户登录、记账、分类、月统计图表、预算、JSON 备份、HTTPS 主屏幕。  
不做：多账户/转账、银行同步、OCR、OAuth、多用户、原生推送/小组件。

## 部署相关约束

- 国内 VPS 公网 80/443 网站服务通常要 **ICP 备案** 域名。
- 部署形态：Docker Compose → Nginx(TLS) + api 容器；数据目录持久化。
- 密钥与 `.env` 勿提交；`SESSION_SECRET`、`DATABASE_PATH` 等仅环境注入。

## 实现时注意

- 依赖版本尽量按已批准计划锁定（Vite 6 / React 19 / Hono 4 / Drizzle / Tailwind 4 / zod 3.25 等），装完以 lockfile 为准。
- `better-sqlite3` 为原生模块：本地与 Docker 使用匹配的 Node 镜像。
- 不自动 `git commit` / `git push`，除非用户明确要求。
