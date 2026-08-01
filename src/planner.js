export const PRIORITY_RANK = Object.freeze({ high: 3, medium: 2, low: 1 });
export const DAY_BUDGET_MINUTES = 480;
export const WORKDAY_START_MINUTES = 9 * 60;

const priorityRank = (task) => PRIORITY_RANK[task.priority] ?? 0;
const finiteOr = (value, fallback) => (Number.isFinite(value) ? value : fallback);

export function compareTasks(a, b) {
  const rankDiff = priorityRank(b) - priorityRank(a);
  if (rankDiff !== 0) return rankDiff;

  const dueDiff = finiteOr(a.dueAt, Infinity) - finiteOr(b.dueAt, Infinity);
  if (dueDiff !== 0) return dueDiff;

  const createdDiff = (a.createdAt ?? 0) - (b.createdAt ?? 0);
  if (createdDiff !== 0) return createdDiff;

  return String(a.id).localeCompare(String(b.id));
}

export function buildTodayPlan(
  tasks,
  { now = Date.now(), budgetMinutes = DAY_BUDGET_MINUTES } = {},
) {
  const pending = tasks.filter((task) => !task.completed);
  const ordered = [...pending].sort(compareTasks);
  const scheduled = [];
  const excluded = [];
  let usedMinutes = 0;

  for (const task of ordered) {
    const neededMinutes = task.estimateMinutes;
    const remainingMinutes = budgetMinutes - usedMinutes;

    if (neededMinutes <= remainingMinutes) {
      scheduled.push({
        task,
        startMinutes: usedMinutes,
        endMinutes: usedMinutes + neededMinutes,
      });
      usedMinutes += neededMinutes;
    } else {
      excluded.push({ task, reason: "budget", neededMinutes, remainingMinutes });
    }
  }

  return { scheduled, excluded, usedMinutes, budgetMinutes, generatedAt: now };
}
