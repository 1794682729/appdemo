# Design Critique: 流水记账

**⚠️ DEGRADED: single-context (detect.mjs blocked by safety sandbox, no browser automation available)**

**Method:** manual inline · **Target:** `apps/web/src/` (全应用 6 页面 + 6 组件)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | 保存有反馈、加载有 spinner，缺少网络状态提示 |
| 2 | Match System / Real World | 4 | 完全遵循 iOS 系统惯例，用户零学习成本 |
| 3 | User Control and Freedom | 3 | 有取消/返回，缺少撤销删除功能 |
| 4 | Consistency and Standards | 4 | 跨页面组件一致，glass-card、ios-row、segmented 统一复用 |
| 5 | Error Prevention | 3 | 金额校验 + 分类必选 + 删除确认，但未做草稿保存 |
| 6 | Recognition Rather Than Recall | 4 | 底部 Tab 始终可见，图标 + 文字标签，分类用 emoji |
| 7 | Flexibility and Efficiency | 2 | 无键盘快捷键、无批量操作、无搜索/筛选 |
| 8 | Aesthetic and Minimalist Design | 4 | 三层毛玻璃 + 语义色板 + 系统字体，克制干净 |
| 9 | Error Recovery | 3 | 错误提示清晰，但网络失败时无重试按钮 |
| 10 | Help and Documentation | 2 | 设置页有 Back Tap 引导，无入门指引或 FAQ |
| **Total** | | **32/40** | **Good — 基础扎实，有针对性改进空间** |

## Anti-Patterns Verdict

**LLM assessment:** 整体不是 AI 生成的模板感。三个关键决策避开了 AI slop：背景是 `#F2F2F7`（iOS 系统灰），不是 cream/sand/warm-neutral；字体是系统原生栈，没有引入 Inter/Geist/display font；毛玻璃有明确的功能层级（40/24/20px blur），不是装饰性 glassmorphism。

但有一个弱信号：hero card 的 `uppercase tracking-wide` 标签（"07 月结余"）隐约接近 eyebrow 反模式，不过只在首页出现一次，且功能明确（标注月份），不算 AI grammar。

**Deterministic scan:** 不可用（沙箱限制）。**Visual overlays:** 无浏览器环境，跳过。

## What's Working

1. **毛玻璃深度体系很扎实。** 40/24/20px blur 三层各有明确用途（nav/card/accent），不堆叠、不嵌套。
2. **颜色语义模型完全正确。** 红=支出/危险，绿=收入，蓝=交互。iOS Blue 控制在 ≤10% 屏幕面积。
3. **组件一致性极好。** `glass-card`、`ios-row-glass`、`segmented-ios26` 被 6 个页面一致复用。

## Priority Issues

### [P1] 统计页饼图配色与设计系统断裂
**Why:** COLORS 数组定义了 9 个独立色值，紫色/橙色不在语义色板中。
**Fix:** 用 iOS 语义色的明度/色度变体构建饼图色板，删掉紫色和橙色。

### [P1] 首页列表空状态缺乏引导
**Why:** 新用户首次使用时无上下文，不知道这是什么、怎么用。
**Fix:** 新用户空状态加简短说明 + 更大入口 + 暗示高级功能。

### [P2] 预算页缺少分类预算进度条
**Why:** 用户设了分类预算后无法一眼看到哪个分类超支。
**Fix:** 每个分类加 mini 进度条，80%+ 橙色提醒，100%+ 红色。

### [P2] 流水列表无关键词搜索
**Why:** 用户找特定流水只能逐月翻页。
**Fix:** 首页顶部加搜索框，前端过滤当前月份流水。

### [P3] 页面切换零过渡
**Why:** Tab 切换是即时跳变，缺少 iOS 原生交叉淡入淡出感。
**Fix:** 150ms opacity + translateY 入场过渡。
