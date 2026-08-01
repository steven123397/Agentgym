# 专注任务规划器 — 设计文档

## 1. 页面结构与主要交互

### 整体布局

单页应用，挂载于 `index.html` 的 `#app` 节点。根据任务数量与表单状态，在两种视图间切换：

**无任务且表单关闭 → 欢迎落地页：**

```
┌──────────────────────────────────────────────┐
│  品牌图标 + 产品标语 + 价值主张               │
│  三步核心能力说明（收集 → 排序 → 8h 预算）    │
│  主 CTA「创建第一个任务」                      │
│  桌面端右侧：计划预览装饰卡                    │
└──────────────────────────────────────────────┘
```

**有任务后 → 工作台：**

```
┌──────────────────────────────────────────────┐
│  Header：标题 + 未完成数 / 预算摘要            │
├──────────────────────────────────────────────┤
│  Tab 切换：[全部任务]  [今日计划]              │
├──────────────────────────────────────────────┤
│  主内容区（按当前 Tab 渲染）                   │
│  · 全部任务：任务卡片列表 + 新增按钮           │
│  · 今日计划：预算进度条 + 执行序列 + 未排入区  │
├──────────────────────────────────────────────┤
│  表单面板（新增/编辑时内联展开）               │
└──────────────────────────────────────────────┘
```

### 响应式

- 桌面：工作台最大宽度 720px；欢迎页 880px 双栏（文案 + 装饰预览）
- 移动端（≤560px）：全宽布局，按钮触控友好（≥44px），优先级用分段控件，欢迎页隐藏装饰预览

### 交互流程

| 操作 | 行为 |
|------|------|
| 首次进入 / 任务清空 | 显示欢迎落地页 |
| 新增任务 | 点击 CTA / 新增按钮 → 展开空表单 → 校验通过后写入并持久化；首条保存后自动进入工作台 |
| 编辑任务 | 点击「编辑」→ 表单预填当前值 → 保存覆盖 |
| 删除任务 | confirm 确认后删除；删光后回到欢迎页 |
| 标记完成 | 勾选 checkbox 切换 `done`；已完成任务在列表中置底、弱化样式 |
| 视图切换 | 顶部 Tab；切到「今日计划」时即时重算（不缓存） |
| 存储异常 | 顶部 toast 提示，4 秒后自动消失 |

### 信息层级

1. 任务标题 + 完成状态
2. 优先级徽章 + 截止时间
3. 预计耗时
4. 计划视图额外：执行序号、时间段偏移、未排入原因

---

## 2. 核心数据模型

```js
// Priority: 'low' | 'medium' | 'high'
// Task
{
  id: string,          // crypto.randomUUID()
  title: string,       // trim 后 1–80 字
  priority: Priority,
  durationMin: number, // 正整数，1–480
  dueAt: string,       // ISO 8601 UTC 字符串
  done: boolean,
  createdAt: string,   // ISO 8601
  updatedAt: string,   // ISO 8601
}
```

### 校验规则

| 字段 | 规则 |
|------|------|
| title | 必填，trim 后 1–80 字符 |
| priority | 必须为 low / medium / high 之一 |
| durationMin | 整数，1 ≤ n ≤ 480 |
| dueAt | 可解析为有效日期时间 |
| done | boolean |

校验失败时返回逐字段错误信息，不写入存储。从 localStorage 读出时逐条校验，跳过损坏项。

---

## 3. 模块职责划分

纯 ES module，无框架，偏函数式风格：

| 模块 | 路径 | 职责 |
|------|------|------|
| 领域模型 | `src/domain/task.js` | 优先级常量、校验、创建/更新工厂、存储规范化、日期格式转换 |
| 计划算法 | `src/domain/planner.js` | `buildDailyPlan(tasks, options)` 纯函数，无 I/O |
| 持久化 | `src/storage/tasks.js` | load / save、容错、版本字段 |
| UI 渲染 | `src/ui/app.js` | DOM 构建、事件委托、视图状态管理 |
| 入口 | `src/main.js` | 获取 `#app` 并调用 `mountApp` |
| 样式 | `src/style.css` | 全部视觉样式 |
| 测试 | `tests/task.test.js`、`tests/planner.test.js` | 领域与算法的单元测试 |

数据流：

```
用户事件 → app.js 更新内存 tasks 数组
         → storage.saveTasks(tasks) 持久化
         → 若在计划视图：planner.buildDailyPlan(tasks) 重算
         → render(state) 全量重绘
```

`planner` 和 `storage` 不依赖 DOM，可在 Node 中直接 import 测试。

---

## 4. 任务计划生成算法

### 常量

- `DAY_BUDGET_MIN = 480`（8 小时）

### 输入 / 输出

```js
// 输入
buildDailyPlan(tasks: Task[], options?: { budgetMin?: number })

// 输出
{
  scheduled: Array<{ task, order, startOffsetMin, endOffsetMin }>,
  rejected: Array<{ task, reason: RejectReason }>,
  totalMin: number,
  budgetMin: number,
}

// RejectReason: 'already_done' | 'exceeds_budget' | 'insufficient_remaining'
```

### 步骤（确定性）

1. **分流**：`done === true` → rejected（reason: `already_done`），其余为候选集
2. **排序**（多级比较，保证全确定性）：
   - priority 降序：high(3) > medium(2) > low(1)
   - dueAt 升序（截止越近越前）
   - createdAt 升序（同截止时先创建的优先）
   - id 字典序（最终 tie-break）
3. **贪心装入**：
   - `remaining = budgetMin`
   - 遍历候选：
     - `durationMin > budgetMin` → rejected（`exceeds_budget`，单任务超全日上限）
     - `durationMin > remaining` → rejected（`insufficient_remaining`）
     - 否则 → scheduled，更新 remaining 与偏移量

### 可解释性

每条未排入任务带 reason，UI 映射中文：

| reason | 文案 |
|--------|------|
| already_done | 已完成，不纳入计划 |
| exceeds_budget | 单任务耗时超过今日 8 小时上限 |
| insufficient_remaining | 剩余可用时间不足 |

---

## 5. 关键边界情况

| 场景 | 处理 |
|------|------|
| 无任务 | 欢迎落地页 + 引导新增 |
| 全部已完成 | scheduled 为空；rejected 均为 already_done |
| 单任务 > 480 分钟 | exceeds_budget，不占预算 |
| 多任务总和 > 480 | 按序装到装不下为止 |
| 时长恰好等于 remaining | 可安排 |
| 同优先级同截止 | createdAt → id 保证稳定 |
| localStorage 不可用 | 内存可用，toast 提示无法持久化 |
| 损坏 JSON / 缺字段 | 丢弃坏项，保留合法项 |
| 标题仅空格 | 校验失败 |
| 编辑时 id 不变 | 仅刷新 updatedAt |
| 任务全部删除 | 回到欢迎落地页 |

---

## 6. localStorage 数据结构

```js
// key
const STORAGE_KEY = 'agentgym.focusPlanner.v1'

// value (JSON)
{
  version: 1,
  tasks: Task[]
}
```

- 只持久化任务列表；计划每次现算，不入库
- `loadTasks`：无 key → 空列表；JSON 解析失败 → 空列表 + 警告
- `saveTasks`：整表替换写入；写入失败 → 返回错误信息

---

## 7. 测试与验证方案

### 自动化（`npm test`）

1. 保留 `tests/baseline.test.js`（挂载点与入口脚本检查）
2. 新增 `tests/task.test.js`：
   - validateTaskInput 各字段校验
   - createTask / updateTask 工厂
   - normalizeStoredTask 损坏数据过滤
3. 新增 `tests/planner.test.js`：
   - 高优先级先于低优先级
   - 同优先级截止近的在前
   - 已完成不进 scheduled
   - 超时任务 exceeds_budget
   - 预算耗尽后 insufficient_remaining
   - 恰好 480 分钟可排满
   - 排序稳定性（id tie-break）
   - 空输入

### 手工验证

- `npm run dev` → `http://127.0.0.1:4173`
- 增删改查、完成切换、两视图切换、刷新后数据保留
- 窄屏布局检查

---

## 8. 主要取舍

| 取舍 | 原因 |
|------|------|
| 无构建工具 / 无框架 | 基座已是原生 ESM + 静态服务器，保持简单 |
| 计划不持久化 | 任务一变即应重算，避免脏缓存 |
| 「今日」= 8h 预算池 | TASK 强调 8h 上限与优先级排序，不要求按日期过滤「仅今天到期」 |
| 表单内联展开 | 单页足够，无需路由，减少状态复杂度 |
| 全量 innerHTML 重绘 | 任务量小，简单可靠，避免虚拟 DOM 开销 |
| 事件委托 | 重绘后无需重新绑定，统一在 root 上监听 |
| FP 纯函数 planner | 易测试、确定性清晰 |

---

## 9. 文件变更清单

| 文件 | 动作 |
|------|------|
| `docs/DESIGN.md` | 新建（本文） |
| `src/domain/task.js` | 新建 |
| `src/domain/planner.js` | 新建 |
| `src/storage/tasks.js` | 新建 |
| `src/ui/app.js` | 新建 |
| `src/main.js` | 改：挂载 mountApp |
| `src/style.css` | 改：完整页面样式 |
| `tests/task.test.js` | 新建 |
| `tests/planner.test.js` | 新建 |
| `index.html` / `package.json` / `scripts/` | 不改 |
