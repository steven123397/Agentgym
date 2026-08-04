# 专注任务规划器设计文档

## 1. 页面结构和主要交互

### 页面层级
- **初始页面（欢迎页）**：首次进入或无任务时显示，展示产品价值，引导用户创建第一个任务
- **主工作台**：任务管理界面，包含任务列表和今日计划视图

### 视图切换
- 默认显示"全部任务"视图
- 可切换到"今日计划"视图
- 当任务被全部删除时，自动返回初始页面

### 主要交互流程
1. 用户首次访问 → 初始页面
2. 点击"创建第一个任务" → 弹出任务编辑表单
3. 创建任务后 → 进入主工作台（全部任务视图）
4. 在主工作台可切换视图、编辑、删除、标记完成任务
5. 生成今日计划 → 显示计划结果（包含无法安排的任务及原因）

## 2. 核心数据模型

### 任务（Task）
```javascript
{
  id: string,           // 唯一标识符（时间戳+随机数）
  title: string,        // 任务标题
  priority: 'low' | 'medium' | 'high',  // 优先级
  duration: number,     // 预计耗时（分钟）
  deadline: string,     // 截止时间（ISO格式）
  completed: boolean,   // 是否已完成
  createdAt: string,    // 创建时间
  updatedAt: string     // 更新时间
}
```

### 今日计划（TodayPlan）
```javascript
{
  date: string,         // 计划日期（YYYY-MM-DD）
  tasks: string[],      // 任务ID列表（按执行顺序）
  totalMinutes: number, // 总计划时间（分钟）
  unscheduled: Array<{  // 无法安排的任务
    taskId: string,
    reason: string      // 原因说明
  }>
}
```

## 3. 模块职责划分

### 文件结构
```
src/
├── main.js           # 入口文件，初始化应用
├── app.js            # 应用主控制器，管理视图切换
├── store.js          # 数据存储层（localStorage）
├── task-manager.js   # 任务管理逻辑（CRUD操作）
├── planner.js        # 计划生成算法
├── views/
│   ├── welcome.js    # 初始页面视图
│   ├── task-list.js  # 任务列表视图
│   ├── task-form.js  # 任务编辑表单
│   └── today-plan.js # 今日计划视图
└── utils.js          # 工具函数（日期处理、ID生成等）
```

### 模块职责
- **app.js**：管理应用状态，协调视图切换
- **store.js**：封装localStorage操作，提供数据持久化
- **task-manager.js**：实现任务的增删改查逻辑
- **planner.js**：实现计划生成算法
- **views/**：各页面的渲染和交互逻辑

## 4. 任务计划生成算法

### 算法规则
1. **过滤已完成任务**：排除`completed: true`的任务
2. **按优先级排序**：高 > 中 > 低
3. **同优先级按截止时间排序**：截止时间更近的优先
4. **时间预算**：每日最多安排8小时（480分钟）
5. **安排逻辑**：
   - 按排序顺序依次尝试安排任务
   - 如果剩余时间不足任务耗时，则标记为"时间不足"
   - 如果任务截止时间早于今天，则标记为"已过期"
   - 如果任务截止时间就是今天，优先安排
6. **输出**：返回已安排的任务列表和无法安排的任务列表（含原因）

### 算法伪代码
```
function generateTodayPlan(tasks):
  today = 当前日期
  availableMinutes = 480  // 8小时
  
  // 过滤已完成任务
  pendingTasks = tasks.filter(t => !t.completed)
  
  // 排序：高优先级 > 截止时间近
  sortedTasks = pendingTasks.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority
    return a.deadline - b.deadline
  })
  
  scheduled = []
  unscheduled = []
  
  for task in sortedTasks:
    if task.duration > availableMinutes:
      unscheduled.push({taskId: task.id, reason: "时间不足"})
      continue
    
    if task.deadline < today:
      unscheduled.push({taskId: task.id, reason: "已过期"})
      continue
    
    scheduled.push(task.id)
    availableMinutes -= task.duration
  
  return {scheduled, unscheduled, totalMinutes: 480 - availableMinutes}
```

## 5. 关键边界情况

### 数据边界
- 任务标题为空或超长
- 任务耗时为0或负数
- 截止时间格式无效
- localStorage存储满或被禁用

### 业务边界
- 无任务时显示初始页面
- 所有任务完成后显示空状态
- 任务数量极多时的性能考虑
- 日期跨天时的计划重置

### 用户交互边界
- 表单验证失败
- 删除确认
- 并发操作（快速点击）

## 6. localStorage 数据结构

### 存储键
- `focus-planner-tasks`：任务列表
- `focus-planner-last-plan-date`：上次生成计划的日期

### 数据格式
```javascript
// focus-planner-tasks
[
  {
    id: "1699123456789-abc123",
    title: "完成设计文档",
    priority: "high",
    duration: 120,
    deadline: "2026-08-05T18:00:00.000Z",
    completed: false,
    createdAt: "2026-08-04T10:00:00.000Z",
    updatedAt: "2026-08-04T10:00:00.000Z"
  }
]

// focus-planner-last-plan-date
"2026-08-04"
```

## 7. 测试和验证方案

### 单元测试
- 任务CRUD操作
- 计划生成算法的各种情况
- localStorage操作

### 集成测试
- 视图切换逻辑
- 表单验证
- 数据持久化

### 手动验证
- 页面启动和基本交互
- 移动端适配
- 数据刷新后保留
- 初始页面显示

### 测试用例
1. 创建任务 → 验证任务出现在列表
2. 编辑任务 → 验证修改生效
3. 删除任务 → 验证任务消失
4. 标记完成 → 验证任务状态更新
5. 生成计划 → 验证计划正确性
6. 刷新页面 → 验证数据保留
7. 删除所有任务 → 验证返回初始页面

## 8. 实现中的主要取舍

### 设计取舍
1. **单文件 vs 多模块**：选择多模块，提高可维护性
2. **状态管理**：使用简单的对象存储，不引入复杂状态库
3. **样式方案**：使用原生CSS，不引入框架，保持简单
4. **ID生成**：使用时间戳+随机数，简单够用

### 功能取舍
1. **任务编辑**：使用模态框而非独立页面，减少页面跳转
2. **计划生成**：实时生成，不缓存结果（除日期检查）
3. **数据验证**：前端验证为主，不依赖后端

### 性能考虑
1. **大量任务**：使用虚拟滚动（如果任务超过100个）
2. **localStorage**：定期清理过期数据
3. **渲染优化**：使用文档片段减少重绘

## 9. 视觉设计要点

### 初始页面
- 清晰的价值主张标题
- 主操作按钮突出显示
- 简要功能说明图标+文字
- 轻量装饰元素（渐变背景、卡片阴影）

### 主工作台
- 顶部导航栏：视图切换
- 任务列表：卡片式布局，显示优先级颜色标识
- 悬浮操作按钮：快速创建任务
- 响应式布局：移动端单列，桌面端多列

### 颜色方案
- 主色调：蓝色系（#3B82F6）
- 优先级颜色：高（红色）、中（黄色）、低（绿色）
- 背景：浅灰色（#F9FAFB）
- 文字：深灰色（#111827）