export const DAILY_BUDGET_MINUTES = 8 * 60;

const priorityRank = {
  high: 0,
  medium: 1,
  low: 2,
};

const dueTimestamp = (dueAt) => {
  const timestamp = Date.parse(dueAt);
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
};

export const compareTasksForPlan = (first, second) => {
  const priorityDifference = priorityRank[first.priority] - priorityRank[second.priority];

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  const dueDifference = dueTimestamp(first.dueAt) - dueTimestamp(second.dueAt);

  if (dueDifference !== 0) {
    return dueDifference;
  }

  const createdDifference = first.createdAt - second.createdAt;

  if (createdDifference !== 0) {
    return createdDifference;
  }

  return first.id.localeCompare(second.id);
};

export const generateTodayPlan = (tasks, budgetMinutes = DAILY_BUDGET_MINUTES) => {
  const candidates = tasks.filter((task) => !task.completed).toSorted(compareTasksForPlan);
  const scheduled = [];
  const unscheduled = [];
  let remainingMinutes = budgetMinutes;

  for (const task of candidates) {
    if (task.minutes <= remainingMinutes) {
      scheduled.push(task);
      remainingMinutes -= task.minutes;
      continue;
    }

    unscheduled.push({
      task,
      reason: `剩余 ${remainingMinutes} 分钟，不足以完整安排此任务（需 ${task.minutes} 分钟）。`,
    });
  }

  return {
    scheduled,
    unscheduled,
    totalMinutes: budgetMinutes - remainingMinutes,
    remainingMinutes,
  };
};
