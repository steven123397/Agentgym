import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDailyPlan, compareTasksForPlan, DAY_BUDGET_MIN } from '../src/domain/planner.js';
import { createTask } from '../src/domain/task.js';

/** 快速创建测试任务的辅助函数 */
const mkTask = (overrides = {}) =>
  createTask({
    title: overrides.title ?? '任务',
    priority: overrides.priority ?? 'medium',
    durationMin: overrides.durationMin ?? 60,
    dueAt: overrides.dueAt ?? '2026-08-02T18:00:00.000Z',
    done: overrides.done ?? false,
    id: overrides.id ?? crypto.randomUUID(),
    now: overrides.now ?? new Date('2026-08-01T08:00:00Z'),
  });

/* ── 基本功能 ── */

test('empty input produces empty plan', () => {
  const plan = buildDailyPlan([]);
  assert.equal(plan.scheduled.length, 0);
  assert.equal(plan.rejected.length, 0);
  assert.equal(plan.totalMin, 0);
  assert.equal(plan.budgetMin, DAY_BUDGET_MIN);
});

test('single task within budget is scheduled', () => {
  const t = mkTask({ durationMin: 120 });
  const plan = buildDailyPlan([t]);
  assert.equal(plan.scheduled.length, 1);
  assert.equal(plan.scheduled[0].task.id, t.id);
  assert.equal(plan.scheduled[0].order, 1);
  assert.equal(plan.scheduled[0].startOffsetMin, 0);
  assert.equal(plan.scheduled[0].endOffsetMin, 120);
  assert.equal(plan.totalMin, 120);
});

/* ── 优先级排序 ── */

test('high priority scheduled before low', () => {
  const low = mkTask({ priority: 'low', id: 'a-low', dueAt: '2026-08-02T10:00:00Z' });
  const high = mkTask({ priority: 'high', id: 'b-high', dueAt: '2026-08-05T10:00:00Z' });
  const plan = buildDailyPlan([low, high]);
  assert.equal(plan.scheduled[0].task.id, high.id);
  assert.equal(plan.scheduled[1].task.id, low.id);
});

test('same priority: earlier due first', () => {
  const later = mkTask({ dueAt: '2026-08-10T10:00:00Z', id: 'later' });
  const sooner = mkTask({ dueAt: '2026-08-03T10:00:00Z', id: 'sooner' });
  const plan = buildDailyPlan([later, sooner]);
  assert.equal(plan.scheduled[0].task.id, sooner.id);
});

test('same priority and due: earlier created first', () => {
  const t1 = mkTask({
    dueAt: '2026-08-05T10:00:00Z',
    id: 'first',
    now: new Date('2026-08-01T06:00:00Z'),
  });
  const t2 = mkTask({
    dueAt: '2026-08-05T10:00:00Z',
    id: 'second',
    now: new Date('2026-08-01T09:00:00Z'),
  });
  const plan = buildDailyPlan([t2, t1]);
  assert.equal(plan.scheduled[0].task.id, t1.id);
});

test('full tie broken by id', () => {
  const now = new Date('2026-08-01T08:00:00Z');
  const due = '2026-08-05T10:00:00Z';
  const ta = mkTask({ id: 'aaa', dueAt: due, now });
  const tb = mkTask({ id: 'bbb', dueAt: due, now });
  const plan = buildDailyPlan([tb, ta]);
  assert.equal(plan.scheduled[0].task.id, 'aaa');
  assert.equal(plan.scheduled[1].task.id, 'bbb');
});

/* ── 已完成任务 ── */

test('done tasks rejected with already_done', () => {
  const t = mkTask({ done: true });
  const plan = buildDailyPlan([t]);
  assert.equal(plan.scheduled.length, 0);
  assert.equal(plan.rejected.length, 1);
  assert.equal(plan.rejected[0].reason, 'already_done');
});

test('done tasks do not consume budget', () => {
  const done = mkTask({ done: true, durationMin: 400 });
  const open = mkTask({ durationMin: 400, id: 'open' });
  const plan = buildDailyPlan([done, open]);
  assert.equal(plan.scheduled.length, 1);
  assert.equal(plan.scheduled[0].task.id, 'open');
  assert.equal(plan.totalMin, 400);
});

/* ── 预算限制 ── */

test('task exceeding total budget rejected with exceeds_budget', () => {
  const t = mkTask({ durationMin: 481 });
  const plan = buildDailyPlan([t]);
  assert.equal(plan.scheduled.length, 0);
  assert.equal(plan.rejected[0].reason, 'exceeds_budget');
});

test('exactly 480 minutes fills budget', () => {
  const t = mkTask({ durationMin: 480 });
  const plan = buildDailyPlan([t]);
  assert.equal(plan.scheduled.length, 1);
  assert.equal(plan.totalMin, 480);
});

test('tasks exceeding remaining rejected with insufficient_remaining', () => {
  const big = mkTask({ durationMin: 300, priority: 'high', id: 'big' });
  const mid = mkTask({ durationMin: 300, priority: 'medium', id: 'mid' });
  const plan = buildDailyPlan([big, mid]);
  assert.equal(plan.scheduled.length, 1);
  assert.equal(plan.scheduled[0].task.id, 'big');
  assert.equal(plan.rejected.length, 1);
  assert.equal(plan.rejected[0].reason, 'insufficient_remaining');
  assert.equal(plan.rejected[0].task.id, 'mid');
});

test('greedy fill: skips too-large, fits smaller later task', () => {
  const t1 = mkTask({ durationMin: 400, priority: 'high', id: 't1' });
  const t2 = mkTask({ durationMin: 200, priority: 'medium', id: 't2' });
  const t3 = mkTask({ durationMin: 80, priority: 'low', id: 't3' });
  // budget 480: t1(400) fits, t2(200) > remaining(80) rejected, t3(80) fits
  const plan = buildDailyPlan([t1, t2, t3]);
  assert.equal(plan.scheduled.length, 2);
  assert.equal(plan.scheduled[0].task.id, 't1');
  assert.equal(plan.scheduled[1].task.id, 't3');
  assert.equal(plan.totalMin, 480);
  assert.equal(plan.rejected.length, 1);
  assert.equal(plan.rejected[0].task.id, 't2');
});

test('duration exactly equal to remaining is scheduled', () => {
  const t1 = mkTask({ durationMin: 300, priority: 'high', id: 'a' });
  const t2 = mkTask({ durationMin: 180, priority: 'low', id: 'b' });
  const plan = buildDailyPlan([t1, t2]);
  assert.equal(plan.scheduled.length, 2);
  assert.equal(plan.totalMin, 480);
});

/* ── 自定义预算 ── */

test('custom budgetMin is respected', () => {
  const t = mkTask({ durationMin: 100 });
  const plan = buildDailyPlan([t], { budgetMin: 60 });
  assert.equal(plan.scheduled.length, 0);
  assert.equal(plan.rejected[0].reason, 'exceeds_budget');
  assert.equal(plan.budgetMin, 60);
});

test('zero budget rejects everything', () => {
  const t = mkTask({ durationMin: 1 });
  const plan = buildDailyPlan([t], { budgetMin: 0 });
  assert.equal(plan.scheduled.length, 0);
  assert.equal(plan.rejected[0].reason, 'exceeds_budget');
});

/* ── compareTasksForPlan 稳定性 ── */

test('compareTasksForPlan is deterministic', () => {
  const now = new Date('2026-08-01T08:00:00Z');
  const due = '2026-08-05T10:00:00Z';
  const a = mkTask({ id: 'x', priority: 'medium', dueAt: due, now });
  const b = mkTask({ id: 'y', priority: 'medium', dueAt: due, now });
  assert.equal(compareTasksForPlan(a, b), -1);
  assert.equal(compareTasksForPlan(b, a), 1);
  assert.equal(compareTasksForPlan(a, a), 0);
});

/* ── 多任务综合 ── */

test('mixed scenario: done + priority + budget overflow', () => {
  const done = mkTask({ done: true, id: 'done', priority: 'high', durationMin: 100 });
  const high = mkTask({ priority: 'high', id: 'high', durationMin: 200 });
  const med = mkTask({ priority: 'medium', id: 'med', durationMin: 250 });
  const low = mkTask({ priority: 'low', id: 'low', durationMin: 100 });

  const plan = buildDailyPlan([done, low, med, high]);

  // high(200) + med(250) = 450, low(100) > remaining(30) → rejected
  assert.equal(plan.scheduled.length, 2);
  assert.equal(plan.scheduled[0].task.id, 'high');
  assert.equal(plan.scheduled[1].task.id, 'med');
  assert.equal(plan.totalMin, 450);

  const reasons = Object.fromEntries(plan.rejected.map((r) => [r.task.id, r.reason]));
  assert.equal(reasons['done'], 'already_done');
  assert.equal(reasons['low'], 'insufficient_remaining');
});
