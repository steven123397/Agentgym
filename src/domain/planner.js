import { PRIORITY_WEIGHT } from './task.js';

/** @typedef {import('./task.js').Task} Task */
/** @typedef {'already_done' | 'exceeds_budget' | 'insufficient_remaining'} RejectReason */

export const DAY_BUDGET_MIN = 8 * 60;

/** @type {Record<RejectReason, string>} */
export const REJECT_REASON_LABEL = {
  already_done: '已完成，不纳入计划',
  exceeds_budget: '单任务耗时超过今日 8 小时上限',
  insufficient_remaining: '剩余可用时间不足',
};

/**
 * 确定性排序比较器：优先级降序 → 截止升序 → 创建升序 → id 字典序。
 * @param {Task} a
 * @param {Task} b
 * @returns {number}
 */
export const compareTasksForPlan = (a, b) => {
  const pw = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
  if (pw !== 0) return pw;

  const due = Date.parse(a.dueAt) - Date.parse(b.dueAt);
  if (due !== 0) return due;

  const created = Date.parse(a.createdAt) - Date.parse(b.createdAt);
  if (created !== 0) return created;

  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
};

/**
 * 确定性今日计划：高优先级 → 截止近 → 贪心装入 8h 预算。
 *
 * @param {Task[]} tasks
 * @param {{ budgetMin?: number }} [options]
 * @returns {{
 *   scheduled: Array<{ task: Task, order: number, startOffsetMin: number, endOffsetMin: number }>,
 *   rejected: Array<{ task: Task, reason: RejectReason }>,
 *   totalMin: number,
 *   budgetMin: number,
 * }}
 */
export const buildDailyPlan = (tasks, options = {}) => {
  const budgetMin =
    typeof options.budgetMin === 'number' && options.budgetMin >= 0
      ? options.budgetMin
      : DAY_BUDGET_MIN;

  /** @type {Array<{ task: Task, reason: RejectReason }>} */
  const rejected = [];
  /** @type {Task[]} */
  const candidates = [];

  for (const task of tasks) {
    if (task.done) {
      rejected.push({ task, reason: 'already_done' });
    } else {
      candidates.push(task);
    }
  }

  candidates.sort(compareTasksForPlan);

  /** @type {Array<{ task: Task, order: number, startOffsetMin: number, endOffsetMin: number }>} */
  const scheduled = [];
  let remaining = budgetMin;
  let cursor = 0;
  let order = 1;

  for (const task of candidates) {
    if (task.durationMin > budgetMin) {
      rejected.push({ task, reason: 'exceeds_budget' });
      continue;
    }
    if (task.durationMin > remaining) {
      rejected.push({ task, reason: 'insufficient_remaining' });
      continue;
    }

    const startOffsetMin = cursor;
    const endOffsetMin = cursor + task.durationMin;
    scheduled.push({ task, order, startOffsetMin, endOffsetMin });
    cursor = endOffsetMin;
    remaining -= task.durationMin;
    order += 1;
  }

  return { scheduled, rejected, totalMin: cursor, budgetMin };
};
