import assert from 'node:assert/strict';
import test from 'node:test';
import {
  validateTaskInput,
  createTask,
  updateTask,
  normalizeStoredTask,
  toDatetimeLocalValue,
  fromDatetimeLocalValue,
  TITLE_MAX,
} from '../src/domain/task.js';

/* ── validateTaskInput ── */

test('validateTaskInput accepts valid input', () => {
  const result = validateTaskInput({
    title: '写报告',
    priority: 'high',
    durationMin: 60,
    dueAt: '2026-08-02T18:00',
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.title, '写报告');
    assert.equal(result.value.priority, 'high');
    assert.equal(result.value.durationMin, 60);
    assert.equal(result.value.done, false);
  }
});

test('validateTaskInput trims title', () => {
  const result = validateTaskInput({
    title: '  有空格  ',
    priority: 'low',
    durationMin: 10,
    dueAt: '2026-08-02T18:00',
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.title, '有空格');
});

test('validateTaskInput rejects empty title', () => {
  const result = validateTaskInput({
    title: '   ',
    priority: 'low',
    durationMin: 10,
    dueAt: '2026-08-02T18:00',
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.title);
});

test('validateTaskInput rejects title over max length', () => {
  const result = validateTaskInput({
    title: 'x'.repeat(TITLE_MAX + 1),
    priority: 'low',
    durationMin: 10,
    dueAt: '2026-08-02T18:00',
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.title);
});

test('validateTaskInput rejects invalid priority', () => {
  const result = validateTaskInput({
    title: 'test',
    priority: 'urgent',
    durationMin: 10,
    dueAt: '2026-08-02T18:00',
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.priority);
});

test('validateTaskInput rejects non-integer duration', () => {
  const result = validateTaskInput({
    title: 'test',
    priority: 'low',
    durationMin: 10.5,
    dueAt: '2026-08-02T18:00',
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.durationMin);
});

test('validateTaskInput rejects duration out of range', () => {
  for (const val of [0, -1, 481]) {
    const result = validateTaskInput({
      title: 'test',
      priority: 'low',
      durationMin: val,
      dueAt: '2026-08-02T18:00',
    });
    assert.equal(result.ok, false, `duration ${val} should fail`);
  }
});

test('validateTaskInput accepts boundary durations 1 and 480', () => {
  for (const val of [1, 480]) {
    const result = validateTaskInput({
      title: 'test',
      priority: 'low',
      durationMin: val,
      dueAt: '2026-08-02T18:00',
    });
    assert.equal(result.ok, true, `duration ${val} should pass`);
  }
});

test('validateTaskInput rejects invalid dueAt', () => {
  const result = validateTaskInput({
    title: 'test',
    priority: 'low',
    durationMin: 10,
    dueAt: 'not-a-date',
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.dueAt);
});

test('validateTaskInput collects multiple errors', () => {
  const result = validateTaskInput({
    title: '',
    priority: 'bad',
    durationMin: -5,
    dueAt: '',
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.title);
    assert.ok(result.errors.priority);
    assert.ok(result.errors.durationMin);
    assert.ok(result.errors.dueAt);
  }
});

/* ── createTask / updateTask ── */

test('createTask produces a valid task', () => {
  const now = new Date('2026-08-01T10:00:00Z');
  const task = createTask({
    title: '测试',
    priority: 'medium',
    durationMin: 30,
    dueAt: '2026-08-02T18:00:00.000Z',
    id: 'fixed-id',
    now,
  });
  assert.equal(task.id, 'fixed-id');
  assert.equal(task.title, '测试');
  assert.equal(task.done, false);
  assert.equal(task.createdAt, now.toISOString());
  assert.equal(task.updatedAt, now.toISOString());
});

test('updateTask preserves id and refreshes updatedAt', () => {
  const t1 = createTask({
    title: '旧',
    priority: 'low',
    durationMin: 10,
    dueAt: '2026-08-02T18:00:00.000Z',
    id: 'id-1',
    now: new Date('2026-08-01T08:00:00Z'),
  });
  const t2 = updateTask(t1, {
    title: '新',
    priority: 'high',
    durationMin: 60,
    dueAt: '2026-08-03T12:00:00.000Z',
    now: new Date('2026-08-01T12:00:00Z'),
  });
  assert.equal(t2.id, 'id-1');
  assert.equal(t2.title, '新');
  assert.equal(t2.priority, 'high');
  assert.equal(t2.createdAt, t1.createdAt);
  assert.notEqual(t2.updatedAt, t1.updatedAt);
});

/* ── normalizeStoredTask ── */

test('normalizeStoredTask accepts valid object', () => {
  const raw = {
    id: 'abc',
    title: '任务',
    priority: 'high',
    durationMin: 60,
    dueAt: '2026-08-02T18:00:00.000Z',
    done: false,
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: '2026-08-01T08:00:00.000Z',
  };
  const task = normalizeStoredTask(raw);
  assert.ok(task);
  assert.equal(task.id, 'abc');
});

test('normalizeStoredTask rejects null / non-object', () => {
  assert.equal(normalizeStoredTask(null), null);
  assert.equal(normalizeStoredTask(42), null);
  assert.equal(normalizeStoredTask('str'), null);
});

test('normalizeStoredTask rejects missing fields', () => {
  assert.equal(normalizeStoredTask({ id: 'x' }), null);
  assert.equal(normalizeStoredTask({}), null);
});

test('normalizeStoredTask rejects bad priority', () => {
  const raw = {
    id: 'abc',
    title: '任务',
    priority: 'urgent',
    durationMin: 60,
    dueAt: '2026-08-02T18:00:00.000Z',
    done: false,
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: '2026-08-01T08:00:00.000Z',
  };
  assert.equal(normalizeStoredTask(raw), null);
});

test('normalizeStoredTask rejects out-of-range duration', () => {
  const base = {
    id: 'abc',
    title: '任务',
    priority: 'low',
    dueAt: '2026-08-02T18:00:00.000Z',
    done: false,
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: '2026-08-01T08:00:00.000Z',
  };
  assert.equal(normalizeStoredTask({ ...base, durationMin: 0 }), null);
  assert.equal(normalizeStoredTask({ ...base, durationMin: 481 }), null);
});

/* ── datetime-local 转换 ── */

test('toDatetimeLocalValue formats correctly', () => {
  const val = toDatetimeLocalValue('2026-08-02T18:30:00.000Z');
  // 本地时区可能不同，只检查格式
  assert.match(val, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
});

test('toDatetimeLocalValue returns empty for invalid', () => {
  assert.equal(toDatetimeLocalValue('bad'), '');
});

test('fromDatetimeLocalValue round-trips', () => {
  const iso = '2026-08-02T18:00:00.000Z';
  const local = toDatetimeLocalValue(iso);
  const back = fromDatetimeLocalValue(local);
  // 精度到分钟
  assert.equal(back.slice(0, 16), iso.slice(0, 16));
});

test('fromDatetimeLocalValue returns empty for empty input', () => {
  assert.equal(fromDatetimeLocalValue(''), '');
});
