import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTodayPlan,
  compareTasks,
  DAY_BUDGET_MINUTES,
  PRIORITY_RANK,
  WORKDAY_START_MINUTES,
} from "../src/planner.js";

const NOW = new Date(2026, 6, 15, 10, 0).getTime();

const makeTask = (overrides = {}) => ({
  id: overrides.id ?? "t-1",
  title: overrides.title ?? "任务",
  priority: overrides.priority ?? "medium",
  estimateMinutes: overrides.estimateMinutes ?? 60,
  dueAt: overrides.dueAt ?? NOW + 3_600_000,
  completed: overrides.completed ?? false,
  createdAt: overrides.createdAt ?? NOW - 10_000,
});

test("常量：优先级权重、8 小时预算、工作日起始时间", () => {
  assert.deepEqual(PRIORITY_RANK, { high: 3, medium: 2, low: 1 });
  assert.equal(DAY_BUDGET_MINUTES, 480);
  assert.equal(WORKDAY_START_MINUTES, 540);
});

test("空任务列表生成空计划", () => {
  const plan = buildTodayPlan([], { now: NOW });
  assert.deepEqual(plan.scheduled, []);
  assert.deepEqual(plan.excluded, []);
  assert.equal(plan.usedMinutes, 0);
});

test("已完成任务不进入今日计划", () => {
  const done = makeTask({ id: "done", completed: true });
  const todo = makeTask({ id: "todo" });
  const plan = buildTodayPlan([done, todo], { now: NOW });
  assert.deepEqual(plan.scheduled.map((item) => item.task.id), ["todo"]);
});

test("高优先级优先于低优先级，即使截止时间更晚", () => {
  const high = makeTask({ id: "high", priority: "high", dueAt: NOW + 86_400_000 });
  const low = makeTask({ id: "low", priority: "low", dueAt: NOW + 3_600_000 });
  const plan = buildTodayPlan([low, high], { now: NOW });
  assert.deepEqual(plan.scheduled.map((item) => item.task.id), ["high", "low"]);
});

test("同优先级下截止时间更近的任务优先", () => {
  const later = makeTask({ id: "later", dueAt: NOW + 7_200_000 });
  const sooner = makeTask({ id: "sooner", dueAt: NOW + 3_600_000 });
  const plan = buildTodayPlan([later, sooner], { now: NOW });
  assert.deepEqual(plan.scheduled.map((item) => item.task.id), ["sooner", "later"]);
});

test("逾期任务在同优先级中排最前", () => {
  const overdue = makeTask({ id: "overdue", dueAt: NOW - 86_400_000 });
  const today = makeTask({ id: "today", dueAt: NOW + 3_600_000 });
  const plan = buildTodayPlan([today, overdue], { now: NOW });
  assert.deepEqual(plan.scheduled.map((item) => item.task.id), ["overdue", "today"]);
});

test("计划总时长不超过 8 小时，放不下的任务进入 excluded", () => {
  const tasks = [
    makeTask({ id: "a", estimateMinutes: 200 }),
    makeTask({ id: "b", estimateMinutes: 200 }),
    makeTask({ id: "c", estimateMinutes: 200 }),
  ];
  const plan = buildTodayPlan(tasks, { now: NOW });
  assert.deepEqual(plan.scheduled.map((item) => item.task.id), ["a", "b"]);
  assert.deepEqual(plan.excluded.map((item) => item.task.id), ["c"]);
  assert.equal(plan.usedMinutes, 400);
  assert.equal(plan.excluded[0].reason, "budget");
  assert.equal(plan.excluded[0].neededMinutes, 200);
  assert.equal(plan.excluded[0].remainingMinutes, 80);
});

test("恰好用满 8 小时预算", () => {
  const tasks = [
    makeTask({ id: "a", estimateMinutes: 180 }),
    makeTask({ id: "b", estimateMinutes: 180 }),
    makeTask({ id: "c", estimateMinutes: 120 }),
  ];
  const plan = buildTodayPlan(tasks, { now: NOW });
  assert.equal(plan.scheduled.length, 3);
  assert.equal(plan.usedMinutes, DAY_BUDGET_MINUTES);
  assert.deepEqual(plan.excluded, []);
});

test("单个任务超过 8 小时时排除并给出预算原因", () => {
  const plan = buildTodayPlan([makeTask({ estimateMinutes: 500 })], { now: NOW });
  assert.deepEqual(plan.scheduled, []);
  assert.equal(plan.excluded.length, 1);
  assert.equal(plan.excluded[0].neededMinutes, 500);
  assert.equal(plan.excluded[0].remainingMinutes, DAY_BUDGET_MINUTES);
});

test("放不下的任务被跳过，后续更小任务仍可放入（顺序忠实）", () => {
  const tasks = [
    makeTask({ id: "a", priority: "high", estimateMinutes: 300 }),
    makeTask({ id: "b", priority: "medium", estimateMinutes: 250 }),
    makeTask({ id: "c", priority: "medium", estimateMinutes: 200, dueAt: NOW + 7_200_000 }),
  ];
  const plan = buildTodayPlan(tasks, { now: NOW, budgetMinutes: 500 });
  assert.deepEqual(plan.scheduled.map((item) => item.task.id), ["a", "c"]);
  assert.deepEqual(plan.excluded.map((item) => item.task.id), ["b"]);
  assert.equal(plan.usedMinutes, 500);
});

test("计划时间偏移按顺序累加", () => {
  const tasks = [
    makeTask({ id: "a", estimateMinutes: 60 }),
    makeTask({ id: "b", estimateMinutes: 90 }),
  ];
  const plan = buildTodayPlan(tasks, { now: NOW });
  assert.deepEqual(
    plan.scheduled.map((item) => [item.startMinutes, item.endMinutes]),
    [
      [0, 60],
      [60, 150],
    ],
  );
});

test("相同输入与 now 生成完全相同的计划（确定性）", () => {
  const tasks = [
    makeTask({ id: "b" }),
    makeTask({ id: "a", priority: "high" }),
    makeTask({ id: "c", completed: true }),
  ];
  const first = buildTodayPlan(tasks, { now: NOW });
  const second = buildTodayPlan(tasks, { now: NOW });
  assert.deepEqual(first, second);
});

test("compareTasks 完全相同时按 id 稳定排序", () => {
  const list = [makeTask({ id: "b" }), makeTask({ id: "a" })];
  list.sort(compareTasks);
  assert.deepEqual(list.map((task) => task.id), ["a", "b"]);
});
