# 专注任务规划器 — 设计文档

## 1. 页面结构与主要交互

### 布局

单页应用，挂载于 `#app`，自上而下：

```
无任务且未打开表单（欢迎落地页）：
┌─────────────────────────────────────────┐
│ 品牌区 + 价值主张 + 三步特性             │
│ 主 CTA「创建第一个任务」                   │
│ 桌面侧：计划预览装饰卡                   │
└─────────────────────────────────────────┘

有任务后的工作台：
┌─────────────────────────────────────────┐
│ Header：标题 + 今日可用容量摘要          │
├─────────────────────────────────────────┤
│ 视图切换：[全部任务] [今日计划]          │
├─────────────────────────────────────────┤
│ 主区（按视图切换）                       │
│  · 全部任务：列表 +「新增任务」          │
│  · 今日计划：已排程列表 + 未排入列表     │
├─────────────────────────────────────────┤
│ 表单抽屉/面板（新增/编辑时展开）         │
└─────────────────────────────────────────┘
```

- 桌面：工作台最大宽度约 720px；欢迎页约 880px 双栏；表单以卡片内联展开。
- 移动端：全宽、按钮触控友好（≥44px）、优先级用分段控件而非难点的下拉；欢迎页隐藏装饰预览，保留文案与 CTA。

### 交互

| 操作 | 行为 |
|------|------|
| 首次进入 | `tasks.length === 0` 且表单关闭 → 欢迎落地页 |
| 新增 | 欢迎页/列表点 CTA → 打开空表单 → 校验通过后写入列表并持久化；首条保存后进入工作台 |
| 编辑 | 列表项「编辑」→ 表单预填 → 保存覆盖原任务 |
| 删除 | 确认后删除并刷新视图；删光后回到欢迎页 |
| 完成 | 勾选切换 `done`；已完成在「全部任务」中降权展示（置底、弱化样式） |
| 视图切换 | 顶部 Tab；切到「今日计划」时**即时重算**计划（不缓存旧结果） |
| 空状态 | 无任务用欢迎页；计划视图无排程时显示引导文案 |
| 错误 | 表单字段旁即时错误；存储失败时顶部 toast |

### 信息层级

1. 标题 + 完成状态  
2. 优先级徽章 + 截止时间  
3. 预计耗时  
4. 计划视图额外：序号、累计占用分钟、未排入原因

---

## 2. 核心数据模型

```js
// Priority: 'low' | 'medium' | 'high'
// Task
{
  id: string,          // crypto.randomUUID()
  title: string,       // trim 后非空，≤80 字
  priority: 'low' | 'medium' | 'high',
  durationMin: number, // 正整数，1–480
  dueAt: string,       // ISO 8601 本地日期时间，存 UTC ISO 字符串
  done: boolean,
  createdAt: string,   // ISO
  updatedAt: string,   // ISO
}
```

### 校验规则

- `title`：必填，trim 后 1–80 字符  
- `priority`：三选一  
- `durationMin`：整数，1 ≤ n ≤ 480  
- `dueAt`：可解析为有效时间  
- `done`：boolean  

无效任务不写入存储；从 storage 读出时跳过损坏项并记日志。

---

## 3. 模块职责划分

偏函数式、无框架，纯 ES module：

| 模块 | 路径 | 职责 |
|------|------|------|
| 领域常量/校验 | `src/domain/task.js` | 优先级序、创建/更新工厂、`validateTaskInput`、规范化 |
| 计划算法 | `src/domain/planner.js` | `buildDailyPlan(tasks, options)` → 纯函数，无 I/O |
| 持久化 | `src/storage/tasks.js` | load/save、版本迁移、容错 |
| UI 渲染 | `src/ui/app.js` | DOM 结构、事件绑定、视图状态 |
| 入口 | `src/main.js` | 挂载、组装依赖 |
| 样式 | `src/style.css` | 布局与视觉 |
| 测试 | `tests/planner.test.js` 等 | 算法与存储边界 |

数据流：

```
用户事件 → app.js 更新内存 tasks
         → storage.save(tasks)
         → 若在计划视图：planner.buildDailyPlan(tasks)
         → render(state)
```

`planner` 与 `storage` 不依赖 DOM；便于 Node 测试直接 import。

---

## 4. 任务计划生成算法

### 常量

- `DAY_BUDGET_MIN = 8 * 60`（480 分钟）

### 输入

- `tasks: Task[]`
- `options?: { budgetMin?: number, now?: Date }`（测试可注入；默认 480 与当前时间）

### 输出

```js
{
  scheduled: Array<{ task, order, startOffsetMin, endOffsetMin }>,
  // start/endOffset 相对「今日专注块起点」的累计分钟，仅作展示
  rejected: Array<{ task, reason: RejectReason }>,
  totalMin: number,
  budgetMin: number,
}

// RejectReason:
// 'already_done' | 'exceeds_budget' | 'insufficient_remaining'
```

### 步骤（确定性）

1. **分流**  
   - `done === true` → 全部进入 `rejected`，原因 `already_done`（不参与排序竞争）。  
   - 其余为候选集。

2. **排序**（稳定、全确定性）  
   比较键依次：  
   1. `priority` 降序：high=3 > medium=2 > low=1  
   2. `dueAt` 升序（越近越前）  
   3. `createdAt` 升序（同截止时先创建的优先）  
   4. `id` 升序（最终 tie-break）

3. **贪心装入**  
   - `remaining = budgetMin`  
   - 按排序依次处理每个候选 `t`：  
     - 若 `t.durationMin > budgetMin` → `rejected`，原因 `exceeds_budget`（单任务超过全日上限，永远无法安排）  
     - 否则若 `t.durationMin > remaining` → `rejected`，原因 `insufficient_remaining`  
     - 否则装入 `scheduled`，`remaining -= t.durationMin`，记录 order 与 offset

4. **不**按截止日过滤「仅今日」：任务池是用户全部未完成任务；「今日计划」= 在 8h 预算内按优先级排出的执行序列。截止只影响排序权重。

### 可解释性

每条未排入任务必须带 `reason`，UI 映射中文：

| reason | 文案 |
|--------|------|
| already_done | 已完成，不纳入计划 |
| exceeds_budget | 单任务耗时超过今日 8 小时上限 |
| insufficient_remaining | 剩余可用时间不足 |

---

## 5. 关键边界情况

| 场景 | 处理 |
|------|------|
| 无任务 | 空状态 + 引导新增 |
| 全部已完成 | 计划 scheduled 空；rejected 均为 already_done |
| 单任务 > 480 分钟 | exceeds_budget，不占预算 |
| 多个任务总和 > 480 | 按序装到装不下为止 |
| 时长恰好等于 remaining | 可安排 |
| 同优先级同时截止 | createdAt → id |
| localStorage 不可用/配额满 | 内存仍可用；提示无法持久化 |
| 损坏 JSON / 缺字段 | 丢弃坏项，保留合法项 |
| 标题仅空格 | 校验失败 |
| 编辑时 id 不变 | updatedAt 刷新 |

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

- 只持久化任务列表；计划每次现算，不入库。  
- `load`：无 key → `{ version: 1, tasks: [] }`；version 不匹配时按可识别字段尽力解析，否则清空并警告。  
- `save`：整表替换写入。

---

## 7. 测试与验证方案

### 自动化（`npm test`）

1. 保留 `tests/baseline.test.js`（挂载点与入口脚本）。  
2. 新增 `tests/planner.test.js`：  
   - 高优先级先于低  
   - 同优先级截止近的在前  
   - 已完成不进 scheduled  
   - 超时任务 exceeds_budget  
   - 预算耗尽后 insufficient_remaining  
   - 恰好 480 分钟可排满  
   - 排序稳定性（id tie-break）  
3. 可选 `tests/task.test.js`：校验与规范化。

### 手工

- `npm run dev` → 打开 `http://127.0.0.1:4173`  
- 增删改、完成切换、两视图切换、刷新后数据仍在  
- 窄屏布局可接受  

---

## 8. 主要取舍

| 取舍 | 原因 |
|------|------|
| 无构建工具/无框架 | 基座已是原生 ESM + 静态服务器，保持简单 |
| 计划不持久化 | 任务一变即应重算；避免脏缓存 |
| 「今日」= 8h 预算池，非日历过滤 | TASK 强调 8h 上限与优先级/截止排序，不要求按 due 日期筛「仅今天到期」 |
| 表单内联而非路由 | 单页足够，减少状态机复杂度 |
| 完成任务仍显示在「全部」并标 rejected | 满足「已完成不进入计划」同时可审计 |
| FP 纯函数 planner | 易测、确定性清晰 |

---

## 9. 文件变更清单（实现时）

| 文件 | 动作 |
|------|------|
| `docs/DESIGN.md` | 新建（本文） |
| `src/domain/task.js` | 新建 |
| `src/domain/planner.js` | 新建 |
| `src/storage/tasks.js` | 新建 |
| `src/ui/app.js` | 新建 |
| `src/main.js` | 改：挂载 app |
| `src/style.css` | 改：完整页面样式 |
| `tests/planner.test.js` | 新建 |
| `tests/task.test.js` | 新建 |
| `index.html` / `package.json` / dev-server | **不改**（除非发现阻塞） |