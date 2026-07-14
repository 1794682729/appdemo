import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { migrate } from "./db/migrate.js";
import { healthRoute } from "./routes/health.js";
import { authRoute } from "./routes/auth.js";
import { categoriesRoute } from "./routes/categories.js";
import { transactionsRoute } from "./routes/transactions.js";
import { statsRoute } from "./routes/stats.js";
import { budgetsRoute } from "./routes/budgets.js";
import { exportImportRoute } from "./routes/exportImport.js";

migrate();

const app = new Hono().basePath("/api");

app.use("*", logger());
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "http://localhost:5173";

app.use(
  "*",
  cors({
    origin: (origin) => {
      // In production, ALLOWED_ORIGIN should be the actual domain (e.g. "https://liushui.example.com")
      // In dev, the vite proxy sends no origin so we fall back to localhost
      if (!origin) return ALLOWED_ORIGIN;
      if (origin === ALLOWED_ORIGIN) return origin;
      return null; // reject
    },
    credentials: true,
  }),
);

app.route("/", healthRoute);
app.route("/", authRoute);
app.route("/", categoriesRoute);
app.route("/", transactionsRoute);
app.route("/", statsRoute);
app.route("/", budgetsRoute);
app.route("/", exportImportRoute);

app.notFound((c) => c.json({ error: "Not Found" }, 404));
app.onError((err, c) => {
  console.error("[api error]", err);
  const message =
    process.env.NODE_ENV === "development"
      ? err.message
      : "服务器内部错误";
  return c.json({ error: message }, 500);
});

const port = Number(process.env.PORT || 3001);

console.log(`liushui api listening on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
