# 流水记账

个人自用记账 Web 应用，部署在国内 VPS，手机 Safari「添加到主屏幕」使用。

## 技术栈

| 层 | 选型 | 版本 |
|----|------|------|
| 前端 | Vite + React + Tailwind CSS | 6 / 19 / 4 |
| 后端 | Hono + Drizzle ORM + SQLite | 4 / 0.44 / better-sqlite3 |
| 图表 | Recharts | 2 |
| 部署 | Docker + Nginx | Compose |

## 快速开始（本地开发）

要求：**Node.js >= 20.19**（推荐 22）、**pnpm 9.15**

```bash
# 安装依赖
pnpm install

# 构建共享包
pnpm build:shared

# 并行启动 API (:3001) 和前端 (:5173)
pnpm dev

# 或分别启动
pnpm dev:api
pnpm dev:web
```

打开 `http://localhost:5173`，首次访问会提示创建管理员账号。

前端开发服务器已配置 `/api` 代理到 `localhost:3001`，无需额外 CORS 配置。

## 项目结构

```
liushuiApp/
├── apps/
│   ├── api/          # Hono + Drizzle + SQLite REST API
│   │   └── src/
│   │       ├── db/           # Schema / 迁移 / 客户端
│   │       ├── middleware/   # 鉴权 / 限流
│   │       └── routes/       # auth, categories, transactions, stats, budgets, export
│   └── web/          # Vite React SPA + PWA
│       └── src/
│           ├── components/   # AmountInput, CategoryPicker, MonthSwitcher, AppShell, RequireAuth
│           ├── pages/        # Home, Stats, Budget, Settings, Login, TransactionForm
│           ├── lib/api.ts    # 前端 API 客户端（类型化）
│           └── store/        # Zustand 状态
├── packages/
│   └── shared/       # 前后端共享：money.ts、date.ts、schemas.ts (Zod)
├── deploy/           # Dockerfile + Nginx 配置
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/auth/status` | 是否已初始化 |
| POST | `/api/auth/setup` | 创建首个用户 |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/auth/me` | 当前用户 |
| GET/POST/PATCH/DELETE | `/api/categories` | 分类 CRUD |
| GET/POST/PATCH/DELETE | `/api/transactions` | 流水 CRUD（?yearMonth=YYYY-MM） |
| GET | `/api/stats/summary` | 月汇总 |
| GET | `/api/stats/by-category` | 分类支出 |
| GET | `/api/stats/trend` | 近 N 月趋势 |
| GET/PUT | `/api/budgets/:yearMonth` | 预算 |
| GET | `/api/export` | JSON 全量导出 |
| POST | `/api/import` | JSON 导入覆盖 |

除 `health`、`status`、`setup`、`login` 外均需登录（Cookie 会话，7 天有效）。

## 生产部署

### 1. 前置条件

- **国内 VPS**（2 核 2G 即可），安装 Docker + Docker Compose
- **域名已 ICP 备案**（国内云厂商强制要求）
- 域名 A 记录指向 VPS IP

### 2. 部署步骤

```bash
# 在 VPS 上
git clone git@github.com:1794682729/appdemo.git
cd appdemo

# 创建环境变量
cp .env.example .env
# 编辑 .env：生成 SESSION_SECRET，填写 ALLOWED_ORIGIN

# 生成会话密钥
openssl rand -hex 32

# 启动
docker compose up -d --build
```

### 3. 配置 HTTPS

```bash
# 安装 certbot（以 Ubuntu + nginx 为例）
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your.domain.com
```

> 如果使用 docker-compose 中的 nginx，将证书挂载到容器内或在外层 nginx 终止 TLS 后反代到 `web:80`。

### 4. 数据库备份

SQLite 文件位于 Docker volume `api_data` 中：

```bash
# 手动备份
docker cp $(docker compose ps -q api):/app/data/liushui.db ./backup-$(date +%Y%m%d).db

# 或通过 API 导出 JSON
curl -b cookies.txt https://your.domain.com/api/export > backup.json
```

建议 crontab 每日自动备份：

```cron
0 3 * * * cd /path/to/appdemo && docker compose exec -T api cp /app/data/liushui.db /app/data/backup-$(date +\%Y\%m\%d).db
```

### 5. 添加到 iPhone 主屏幕

1. Safari 打开 `https://your.domain.com`
2. 底部「分享」→「添加到主屏幕」
3. 命名「流水」→ 添加

## 安全

- 密码使用 bcrypt（12 rounds）哈希
- Cookie HttpOnly + Secure + SameSite=Lax
- CORS 由 `ALLOWED_ORIGIN` 环境变量限制
- 登录失败限流：同一 IP 15 分钟内最多 5 次
- 生产环境错误不暴露内部细节

## MVP 范围

**已实现：** 单用户登录、记账 CRUD、分类管理、月统计图表、月预算、JSON 备份恢复、PWA 壳

**不在此版本：** 多用户、多账户/转账、银行同步、OCR、原生推送/小组件
