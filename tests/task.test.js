import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createTask,
  normalizeStoredTask,
  validateTaskInput,
} from '../src/domain/task.js';
import { loadTasks, saveTasks, STORAGE_KEY } from '../src/storage/tasks.js';

test('validateTaskInput rejects blank title and bad duration', () => {
  const blank = validateTaskInput({
    title: '   ',
    priority: 'high',
    durationMin: 30,
    dueAt: '2026-08-02T12:00:00.000Z',
  });
  assert.equal(blank.ok, false);
  if (!blank.ok) assert.ok(blank.errors.title);

  const duration = validateTaskInput({
    title: 'ok',
    priority: 'low',
    durationMin: 0,
    dueAt: '2026-08-02T12:00:00.000Z',
  });
  assert.equal(duration.ok, false);
  if (!duration.ok) assert.ok(duration.errors.durationMin);
});

test('validateTaskInput accepts valid payload', () => {
  const result = validateTaskInput({
    title: '  写设计  ',
    priority: 'medium',
    durationMin: '45',
    dueAt: '2026-08-02T18:00:00.000Z',
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.title, '写设计');
    assert.equal(result.value.durationMin, 45);
  }
});

test('createTask fills ids and timestamps', () => {
  const now = new Date('2026-08-01T12:00:00.000Z');
  const t = createTask({
    title: 'A',
    priority: 'high',
    durationMin: 20,
    dueAt: '2026-08-03T00:00:00.000Z',
    now,
    id: 'fixed-id',
  });
  assert.equal(t.id, 'fixed-id');
  assert.equal(t.createdAt, now.toISOString());
  assert.equal(t.done, false);
});

test('normalizeStoredTask drops corrupt rows', () => {
  assert.equal(normalizeStoredTask(null), null);
  assert.equal(normalizeStoredTask({ id: 'x' }), null);
  const ok = normalizeStoredTask({
    id: '1',
    title: 'T',
    priority: 'low',
    durationMin: 10,
    dueAt: '2026-08-02T00:00:00.000Z',
    done: false,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  });
  assert.ok(ok);
  assert.equal(ok?.title, 'T');
});

test('saveTasks and loadTasks round-trip via memory storage', () => {
  /** @type {Map<string, string>} */
  const map = new Map();
  const storage = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
  };

  const sample = [
    createTask({
      id: 'a1',
      title: '持久化',
      priority: 'high',
      durationMin: 15,
      dueAt: '2026-08-04T00:00:00.000Z',
      now: new Date('2026-08-01T00:00:00.000Z'),
    }),
  ];

  const saved = saveTasks(sample, storage);
  assert.equal(saved.ok, true);
  assert.ok(map.get(STORAGE_KEY));

  const loaded = loadTasks(storage);
  assert.equal(loaded.tasks.length, 1);
  assert.equal(loaded.tasks[0].title, '持久化');
  assert.equal(loaded.warning, null);
});

test('loadTasks ignores broken json', () => {
  const storage = {
    getItem: () => '{not-json',
    setItem: () => {},
  };
  const loaded = loadTasks(storage);
  assert.deepEqual(loaded.tasks, []);
  assert.ok(loaded.warning);
});