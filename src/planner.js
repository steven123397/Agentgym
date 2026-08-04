import { getTasks, getLastPlanDate, setLastPlanDate } from './store.js';
import { formatDate, isPastDue } from './utils.js';

const DAILY_BUDGET_MINUTES = 480; // 8小时

// 优先级权重
const PRIORITY_WEIGHTS = {
  high: 3,
  medium: 2,
  low: 1
};

// 生成今日计划
export function generateTodayPlan() {
  const today = formatDate(new Date());
  const lastPlanDate = getLastPlanDate();
  
  // 如果今天已经生成过计划，返回缓存（这里简化为重新生成）
  // 实际应用中可以缓存计划结果
  
  const tasks = getTasks();
  
  // 过滤已完成任务
  const pendingTasks = tasks.filter(task => !task.completed);
  
  // 按优先级和截止时间排序
  const sortedTasks = [...pendingTasks].sort((a, b) => {
    // 高优先级优先
    const priorityDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    
    // 同优先级按截止时间排序（更近的优先）
    const deadlineA = new Date(a.deadline);
    const deadlineB = new Date(b.deadline);
    return deadlineA - deadlineB;
  });
  
  let remainingMinutes = DAILY_BUDGET_MINUTES;
  const scheduled = [];
  const unscheduled = [];
  
  for (const task of sortedTasks) {
    // 检查任务是否已过期
    if (isPastDue(task.deadline)) {
      unscheduled.push({
        taskId: task.id,
        taskTitle: task.title,
        reason: '已过期'
      });
      continue;
    }
    
    // 检查剩余时间是否足够
    if (task.duration > remainingMinutes) {
      unscheduled.push({
        taskId: task.id,
        taskTitle: task.title,
        reason: '时间不足'
      });
      continue;
    }
    
    // 安排任务
    scheduled.push(task.id);
    remainingMinutes -= task.duration;
  }
  
  const plan = {
    date: today,
    tasks: scheduled,
    totalMinutes: DAILY_BUDGET_MINUTES - remainingMinutes,
    unscheduled
  };
  
  // 更新上次计划日期
  setLastPlanDate(today);
  
  return plan;
}

// 获取今日计划（带任务详情）
export function getTodayPlanWithDetails() {
  const plan = generateTodayPlan();
  const allTasks = getTasks();
  
  const scheduledTasks = plan.tasks
    .map(taskId => allTasks.find(t => t.id === taskId))
    .filter(Boolean);
  
  const unscheduledTasks = plan.unscheduled
    .map(item => ({
      ...item,
      task: allTasks.find(t => t.id === item.taskId)
    }))
    .filter(item => item.task);
  
  return {
    ...plan,
    scheduledTasks,
    unscheduledTasks
  };
}

// 检查是否需要重新生成计划
export function shouldRegeneratePlan() {
  const lastPlanDate = getLastPlanDate();
  const today = formatDate(new Date());
  return lastPlanDate !== today;
}