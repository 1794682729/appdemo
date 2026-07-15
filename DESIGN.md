---
name: 流水记账
description: 极简个人流水账 PWA — 支付后 5 秒内完成记账
colors:
  ios-bg: "#F2F2F7"
  ios-accent: "#0A84FF"
  ios-danger: "#FF3B30"
  ios-income: "#34C759"
  ios-text: "#1C1C1E"
  ios-secondary: "#8E8E93"
  ios-tertiary: "#C7C7CC"
  ios-separator: "#E5E5EA"
  white-glass: "rgba(255, 255, 255, 0.68)"
  white-glass-heavy: "rgba(242, 242, 247, 0.72)"
  white-glass-light: "rgba(255, 255, 255, 0.54)"
  accent-glass: "rgba(10, 132, 255, 0.12)"
  black-glass-border: "rgba(255, 255, 255, 0.20)"
  row-divider: "rgba(60, 60, 67, 0.08)"
typography:
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Hiragino Sans GB", sans-serif'
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.5
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Hiragino Sans GB", sans-serif'
    fontSize: "17px"
    fontWeight: 500
    lineHeight: 1.3
  headline:
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Hiragino Sans GB", sans-serif'
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
  display:
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Hiragino Sans GB", sans-serif'
    fontSize: "44px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.005em"
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Hiragino Sans GB", sans-serif'
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.02em"
    textTransform: uppercase
  caption:
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Hiragino Sans GB", sans-serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  tab-label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Hiragino Sans GB", sans-serif'
    fontSize: "10px"
    fontWeight: 500
rounded:
  full: "9999px"
  xl: "28px"
  lg: "22px"
  md: "16px"
  sm: "12px"
spacing:
  xs: "2px"
  sm: "8px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  row-py: "13px"
  row-gap: "12px"
  page-px: "16px"
components:
  fab-primary:
    backgroundColor: "{colors.ios-accent}"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
    size: "44px"
  card-glass:
    backgroundColor: "{colors.white-glass}"
    rounded: "{rounded.md}"
    padding: "{spacing.xl}"
  tab-active:
    backgroundColor: "{colors.accent-glass}"
    textColor: "{colors.ios-accent}"
    rounded: "{rounded.lg}"
  tab-inactive:
    backgroundColor: "transparent"
    textColor: "{colors.ios-secondary}"
  segmented-active:
    backgroundColor: "rgba(255, 255, 255, 0.92)"
    textColor: "{colors.ios-text}"
    rounded: "{rounded.full}"
  segmented-inactive:
    backgroundColor: "transparent"
    textColor: "{colors.ios-text}"
  row-list:
    padding: "{spacing.row-py} {spacing.page-px}"
    height: "44px"
---

# Design System: 流水记账

## 1. Overview

**Creative North Star: "雾面玻璃桌面"**

想象一张毛玻璃桌面上摊着便签纸、一支笔和一台计算器。光线透过玻璃变得柔和，信息浮在表面却又与背景保持距离。这就是流水记账的视觉隐喻：信息清晰浮现，背景安静退后。

整个界面建立在一套三层玻璃体系上——导航栏的重玻璃 (40px blur)、卡片的日常玻璃 (24px blur)、强调区域的淡玻璃 (20px blur)。玻璃后面是 iOS 系统标准的浅灰底色 (#F2F2F7)，不是纯白，不是 cream，不是 warm-neutral。就是 iOS 的灰。

字体是系统原生的 SF Pro Display + PingFang SC，不做字体选择。颜色是 iOS 语义色板：蓝 = 交互、红 = 支出/危险、绿 = 收入。没有装饰色。没有渐变按钮。没有自定义滚动条。设计退后，让「记账」这个动作成为焦点。

**Key Characteristics:**
- 三层毛玻璃体系定义深度，不用阴影
- iOS 系统语义色板，无装饰色
- 单一系统字体族，靠字重和大小区分层级
- 44px 最小触控区，拇指优先
- 淡入淡出过渡，无弹跳，无编排动画

## 2. Colors

语义色板。每个颜色都对应一个功能角色，不看色相排序。

### Primary
- **iOS Blue** (#0A84FF): 唯一强调色。用于主按钮 (FAB)、激活态标签、链接、选中指示器。在任一屏幕上占比不超过 10%。它的克制使用就是它的力量。

### Semantic
- **iOS Red** (#FF3B30): 支出金额、删除按钮、超预算警告、危险操作。不用作装饰。
- **iOS Green** (#34C759): 收入金额、成功状态。不与红色同时用于同一条目。
- **iOS Secondary Gray** (#8E8E93): 辅助文字、日期标签、占位符。必须通过 4.5:1 对比度。
- **iOS Tertiary Gray** (#C7C7CC): 仅用于禁用态和非关键装饰。不用于正文。
- **iOS Separator** (#E5E5EA): 分割线。仅用于列表项之间，不用作卡片边框。

### Neutral
- **iOS Background** (#F2F2F7): 页面底色。iOS 系统标准浅灰，不暖不冷，零色度偏移。
- **Near-Black Text** (#1C1C1E): 正文和标题。不是纯黑 (#000)，带极轻微的冷调。
- **White Glass** (rgba(255,255,255,0.68)): 卡片底色。半透明白色覆盖在 #F2F2F7 上产生层次。
- **White Glass Heavy** (rgba(242,242,247,0.72)): 导航栏底色。更高的不透明度 + 底色色调，适配长时间停留区域。
- **Accent Glass** (rgba(10,132,255,0.12)): 蓝色毛玻璃强调区。Hero 卡片、头像、分类图标背景。
- **Row Divider** (rgba(60,60,67,0.08)): 列表行之间的 0.5px 分割线。不用于卡片外边框。

### Named Rules
**The One Accent Rule.** iOS Blue 占任一屏幕面积不超过 10%。FAB 按钮、活跃标签、选中态——仅此而已。蓝色不作背景、不作装饰、不作渐变。它的稀缺就是它的信号。

**The Semantic Color Rule.** 红 = 支出/删除/危险，绿 = 收入/成功。这两个颜色的语义绝对不交叉。一条流水不能同时用红色和绿色。灰色系只传达「非活跃」或「辅助」，不传达情绪。

## 3. Typography

**Font Family:** SF Pro Display (系统默认) + PingFang SC (中文)
**Fallback:** -apple-system, BlinkMacSystemFont, sans-serif

**Character:** 系统原生字体，无配对。靠字重 (400→500→600→700) 和大小 (10px→12px→13px→17px→18px→44px) 建立层级。没有 display/body 双字体，没有衬线标题。iOS 系统怎么做，这里怎么做。

### Hierarchy
- **Display** (700, 44px, 1.1, -0.005em): 首页月结余大数字。唯一出现的场景。tablular-nums 等宽数字。
- **Headline** (600, 18px, 1.3): 支出/收入子数字。比 Display 小两级，保持信息层级清晰。
- **Title** (500, 17px, 1.3): 列表项标题、分类名、卡片标题。iOS 标准 body 字重加半级。
- **Body** (400, 17px, 1.5): 备注文字、表单内容、设置项。标准 iOS body 规格。
- **Caption** (400, 13px, 1.4): 辅助信息、时间戳、提示文字。比 body 小一级。
- **Label** (600, 12px, 0.02em, uppercase): 段落标签。「支出」「收入」「月预算」。大写 + 宽松字距。
- **Tab Label** (500, 10px): 底部导航标签。最小可读尺寸。

### Named Rules
**The Single Family Rule.** 全应用只用一套字体族。不引入第二个字体作「设计感」。SF Pro Display 包含足够多的字重变体来建立清晰层级。

**The No-Fluid Rule.** 字号全部固定 rem/px，不用 clamp() 流体缩放。移动端 PWA 只有一个视口宽度，流体字号只会让本该一致的元素在不同屏幕尺寸下跑偏。

## 4. Elevation

这个系统用 **毛玻璃模糊** 而非投影来建立深度。三层模糊定义了完整 Z 轴：

- **Heavy (40px blur):** 底部导航栏。浮动在所有内容之上，最高层级。
- **Medium (24px blur):** 卡片、列表容器。内容区标准层级。
- **Light (20px blur):** 强调背景 (accent-glass)、分类图标背景。最低玻璃层级。

纯投影仅用于 FAB 按钮 (蓝色 glow：0 4px 16px + 0 8px 32px) 和 glass-card 的微结构阴影 (0 1px 2px + 0 4px 12px + 0 8px 24px，三层叠加，透明度递减)。卡片阴影是结构性的（定义卡片边界），不是装饰性的。

### Named Rules
**The Blur-Not-Shadow Rule.** 用 backdrop-filter blur 建立层次，不用 box-shadow。投影只在两个地方出现：FAB 按钮的蓝色辉光和卡片的微结构边界。任何元素不同时使用投影 + 1px 边框作为装饰。

**The Glass Tier Rule.** 一个元素只属于一层玻璃。不要在一个卡片内嵌套另一个 glass-card。不要堆叠毛玻璃。

## 5. Components

### Buttons
- **FAB (Primary Action):** 圆形 (44x44px)，iOS Blue 实色背景，白色 "+" 字，蓝色辉光投影。active: scale(0.9)。用于新建流水——全应用最重要的按钮。
- **Text Button:** 无背景，iOS Blue 文字，15px medium。用于导航性操作（"记第一笔"、"新增"）。
- **Danger Button:** 无背景，iOS Red 文字，14px。用于删除操作。始终附带确认弹窗。
- **Full-Width Button:** 全宽圆角 pill (rounded-full)，iOS Blue 实色背景，白色 15px medium。用于表单提交（"添加"、"生成 Token"）。

### Cards
- **Glass Card:** 白色半透明 (rgba(255,255,255,0.68))，24px blur，16px 圆角，三层微结构阴影。内部 padding 24px (p-6)。不嵌套。
- **Hero Card:** accent-glass 底色 (rgba(10,132,255,0.12))，28px 圆角，叠加径向渐变 (blue + green at 低透明度)。仅用于首页月结余。
- **Accent Card:** accent-glass 底色，22px 圆角。用于头像、信息提示卡片。

### Navigation
- **Tab Bar:** floating glass-heavy (40px blur)，28px 圆角，白色 20% 半透明边框。固定在底部，水平居中，max-w-lg。4 个 tab，每个包含 emoji 图标 + 10px 标签。活跃态: accent-glass 背景 + iOS Blue 文字。非活跃态: iOS Secondary gray。
- **Settings Row:** 44px 最小高度，13px 上下 padding，16px 左右 padding，12px gap。项之间 0.5px row-divider 分割线。左图标 + 正文 + 右辅助文字的标准三列布局。

### Inputs
- **Text Input:** glass-card 背景，12px (rounded-xl) 或 16px (rounded-2xl) 圆角，15px 字号。无边框，靠背景区分。聚焦态无 ring，靠背景亮度变化暗示。
- **Segmented Control:** 半透明灰色背景 (rgba(118,118,128,0.12))，12px blur，完全圆角 (pill)。活跃段: 几乎纯白背景 + 微阴影。非活跃段: 透明。250ms cubic-bezier(0.25, 0.1, 0.25, 1) 过渡。

### Chips / Tags
- **Category Icon Circle:** accent-glass 背景，40x40px 圆形，居中 emoji 图标 (18px)。用于流水列表和分类选择器。
- **Month Switcher:** 水平排列: 左箭头 + 月份文字 (17px semibold) + 右箭头。无背景，纯文字 + emoji。

### Empty States
- **Empty State:** 垂直居中，glass-card 圆形图标容器 (64x64px，20px 圆角) + 灰色说明文字 + iOS Blue 文字按钮。不显示空白页，始终提供下一步操作。

## 6. Do's and Don'ts

### Do:
- **Do** 用三层玻璃 (40/24/20px blur) 建立 Z 轴深度
- **Do** iOS Blue 仅在 FAB、活跃标签、链接上使用，总面积 ≤10%
- **Do** 红色 = 支出/删除，绿色 = 收入/成功，语义永不交叉
- **Do** 所有可触控元素至少 44x44px
- **Do** 列表项之间用 0.5px row-divider，不用 1px 边框
- **Do** 卡片用 16px 圆角，按钮用完全圆角 (pill)
- **Do** 过渡用 200-250ms cubic-bezier 缓出，不弹跳
- **Do** prefers-reduced-motion 时禁用所有动画

### Don't:
- **Don't** 在卡片上同时使用 1px 边框和超过 8px 的投影 (ghost-card 模式)
- **Don't** 卡片圆角超过 28px (圆角过大是 AI 特征)
- **Don't** 嵌套卡片 (卡片内放卡片永远是错的)
- **Don't** 用花哨的财务仪表盘风格 (深色背景、发光卡片、大数字 KPI)
- **Don't** 用 SaaS 数据看板风格 (KPI 卡片网格、渐变面积图)
- **Don't** 用复杂的多列交易表格 (排序、筛选、分页)
- **Don't** 用过度装饰的图标和插画
- **Don't** 用弹窗 (Modal) 处理可以用内联完成的操作
- **Don't** 用 gradient text (`background-clip: text`)
- **Don't** 用 side-stripe border (左边框 >1px 作为彩色装饰条)
- **Don't** 用系统默认字体之外的第二个字体族
- **Don't** 用 clamp() 流体字号
- **Don't** 用弹性/弹跳缓动曲线 (bounce/elastic easing)
