import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDailyPlan,
  compareTasksForPlan,
  DAY_BUDGET_MIN,
} from '../src/domain/planner.js';

/**
 * @param {Partial<import('../src/domain/task.js').Task>} & { id: string, title: string }
 */
const task = (overrides) => ({
  id: 't',
  title: 'task',
  priority: /** @type {const} */ ('medium'),
  durationMin: 60,
  dueAt: '2026-08-02T10:00:00.000Z',
  done: false,
  createdAt: '2026-08-01T08:00:00.000Z',
  updatedAt: '2026-08-01T08:00:00.000Z',
  ...overrides,
});

test('high priority is scheduled before low priority', () => {
  const plan = buildDailyPlan([
    task({ id: 'low', priority: 'low', dueAt: '2026-08-01T09:00:00.000Z' }),
    task({ id: 'high', priority: 'high', dueAt: '2026-08-10T09:00:00.000Z' }),
  ]);

  assert.deepEqual(
    plan.scheduled.map((s) => s.task.id),
    ['high', 'low'],
  );
});

test('same priority prefers earlier due date', () => {
  const plan = buildDailyPlan([
    task({ id: 'later', priority: 'high', dueAt: '2026-08-05T00:00:00.000Z' }),
    task({ id: 'sooner', priority: 'high', dueAt: '2026-08-02T00:00:00.000Z' }),
  ]);

  assert.equal(plan.scheduled[0].task.id, 'sooner');
  assert.equal(plan.scheduled[1].task.id, 'later');
});

test('completed tasks are rejected and not scheduled', () => {
  const plan = buildDailyPlan([
    task({ id: 'open', durationMin: 30 }),
    task({ id: 'done', done: true, durationMin: 30 }),
  ]);

  assert.deepEqual(
    plan.scheduled.map((s) => s.task.id),
    ['open'],
  );
  const doneReject = plan.rejected.find((r) => r.task.id === 'done');
  assert.ok(doneReject);
  assert.equal(doneReject.reason, 'already_done');
});

test('task longer than full budget is exceeds_budget', () => {
  const plan = buildDailyPlan([
    task({ id: 'huge', durationMin: DAY_BUDGET_MIN + 1 }),
    task({ id: 'ok', durationMin: 30 }),
  ]);

  assert.deepEqual(
    plan.scheduled.map((s) => s.task.id),
    ['ok'],
  );
  const huge = plan.rejected.find((r) => r.task.id === 'huge');
  assert.equal(huge?.reason, 'exceeds_budget');
  assert.equal(plan.totalMin, 30);
});

test('remaining time insufficient rejects later tasks', () => {
  const plan = buildDailyPlan(
    [
      task({
        id: 'a',
        priority: 'high',
        durationMin: 300,
        dueAt: '2026-08-01T00:00:00.000Z',
      }),
      task({
        id: 'b',
        priority: 'medium',
        durationMin: 200,
        dueAt: '2026-08-01T00:00:00.000Z',
      }),
    ],
    { budgetMin: 480 },
  );

  assert.deepEqual(
    plan.scheduled.map((s) => s.task.id),
    ['a'],
  );
  const b = plan.rejected.find((r) => r.task.id === 'b');
  assert.equal(b?.reason, 'insufficient_remaining');
  assert.equal(plan.totalMin, 300);
});

test('exactly full budget can be scheduled', () => {
  const plan = buildDailyPlan(
    [
      task({ id: 'a', durationMin: 240, priority: 'high' }),
      task({ id: 'b', durationMin: 240, priority: 'medium' }),
    ],
    { budgetMin: 480 },
  );

  assert.equal(plan.scheduled.length, 2);
  assert.equal(plan.totalMin, 480);
  assert.equal(plan.rejected.length, 0);
  assert.equal(plan.scheduled[0].startOffsetMin, 0);
  assert.equal(plan.scheduled[0].endOffsetMin, 240);
  assert.equal(plan.scheduled[1].startOffsetMin, 240);
  assert.equal(plan.scheduled[1].endOffsetMin, 480);
});

test('tie-break uses createdAt then id', () => {
  const a = task({
    id: 'a',
    priority: 'high',
    dueAt: '2026-08-02T00:00:00.000Z',
    createdAt: '2026-08-01T10:00:00.000Z',
  });
  const b = task({
    id: 'b',
    priority: 'high',
    dueAt: '2026-08-02T00:00:00.000Z',
    createdAt: '2026-08-01T09:00:00.000Z',
  });
  assert.ok(compareTasksForPlan(b, a) < 0);

  const c = task({
    id: 'c',
    priority: 'high',
    dueAt: '2026-08-02T00:00:00.000Z',
    createdAt: '2026-08-01T09:00:00.000Z',
  });
  const d = task({
    id: 'd',
    priority: 'high',
    dueAt: '2026-08-02T00:00:00.000Z',
    createdAt: '2026-08-01T09:00:00.000Z',
  });
  assert.ok(compareTasksForPlan(c, d) < 0);

  const plan = buildDailyPlan([a, b, d, c]);
  assert.deepEqual(
    plan.scheduled.map((s) => s.task.id),
    ['b', 'c', 'd', 'a'],
  );
});

test('does not schedule partial tasks when remaining is tight', () => {
  const plan = buildDailyPlan(
    [
      task({ id: 'fit', durationMin: 100, priority: 'high' }),
      task({ id: 'skip', durationMin: 50, priority: 'low' }),
    ],
    { budgetMin: 120 },
  );

  assert.deepEqual(
    plan.scheduled.map((s) => s.task.id),
    ['fit'],
  );
  assert.equal(
    plan.rejected.find((r) => r.task.id === 'skip')?.reason,
    'insufficient_remaining',
  );
});