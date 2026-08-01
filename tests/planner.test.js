import assert from "node:assert/strict";
import test from "node:test";

import { DAILY_BUDGET_MINUTES, generateTodayPlan } from "../src/planner.js";

const task = (overrides = {}) => ({
  id: "task-default",
  title: "默认任务",
  priority: "medium",
  minutes: 60,
  dueAt: "2026-08-02T10:00",
  completed: false,
  createdAt: 1,
  ...overrides,
});

test("today plan ranks priority before deadline", () => {
  const plan = generateTodayPlan([
    task({ id: "low", priority: "low", dueAt: "2026-08-01T09:00" }),
    task({ id: "medium-late", priority: "medium", dueAt: "2026-08-03T09:00" }),
    task({ id: "high", priority: "high", dueAt: "2026-08-04T09:00" }),
    task({ id: "medium-early", priority: "medium", dueAt: "2026-08-02T09:00" }),
  ]);

  assert.deepEqual(plan.scheduled.map(({ id }) => id), ["high", "medium-early", "medium-late", "low"]);
});

test("today plan never exceeds the daily budget and explains full-task constraint", () => {
  const plan = generateTodayPlan([
    task({ id: "first", priority: "high", minutes: 300 }),
    task({ id: "does-not-fit", priority: "high", minutes: 200, dueAt: "2026-08-02T11:00" }),
  ]);

  assert.equal(DAILY_BUDGET_MINUTES, 480);
  assert.equal(plan.totalMinutes, 300);
  assert.equal(plan.remainingMinutes, 180);
  assert.deepEqual(plan.scheduled.map(({ id }) => id), ["first"]);
  assert.equal(plan.unscheduled[0].task.id, "does-not-fit");
  assert.match(plan.unscheduled[0].reason, /剩余 180 分钟/);
  assert.match(plan.unscheduled[0].reason, /需 200 分钟/);
});

test("a task that exactly fills the remaining budget is scheduled", () => {
  const plan = generateTodayPlan([
    task({ id: "morning", minutes: 180 }),
    task({ id: "afternoon", minutes: 300, dueAt: "2026-08-02T11:00" }),
  ]);

  assert.deepEqual(plan.scheduled.map(({ id }) => id), ["morning", "afternoon"]);
  assert.equal(plan.totalMinutes, 480);
  assert.equal(plan.remainingMinutes, 0);
  assert.equal(plan.unscheduled.length, 0);
});

test("completed tasks are excluded and equal tasks use stable creation then id ordering", () => {
  const plan = generateTodayPlan([
    task({ id: "completed", priority: "high", completed: true, minutes: 480 }),
    task({ id: "later-created", createdAt: 2 }),
    task({ id: "b", createdAt: 1 }),
    task({ id: "a", createdAt: 1 }),
  ]);

  assert.deepEqual(plan.scheduled.map(({ id }) => id), ["a", "b", "later-created"]);
  assert.equal(plan.totalMinutes, 180);
});
