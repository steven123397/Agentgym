import assert from "node:assert/strict";
import test from "node:test";
import { STORAGE_KEY, createId, loadTasks, normalizeTask, saveTasks } from "../src/store.js";

const makeFakeStorage = () => {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => {
      data.set(key, String(value));
    },
    removeItem: (key) => {
      data.delete(key);
    },
    data,
  };
};

const validTask = () => ({
  id: "abc",
  title: "写周报",
  priority: "high",
  estimateMinutes: 45,
  dueAt: 1754035200000,
  completed: false,
  createdAt: 1754031000000,
});

test("存储键包含版本号", () => {
  assert.equal(STORAGE_KEY, "focus-planner:tasks:v1");
});

test("空存储返回空数组", () => {
  assert.deepEqual(loadTasks(makeFakeStorage()), []);
});

test("保存后可完整读回", () => {
  const storage = makeFakeStorage();
  const tasks = [validTask()];
  saveTasks(storage, tasks);
  assert.equal(storage.getItem(STORAGE_KEY), JSON.stringify(tasks));
  assert.deepEqual(loadTasks(storage), tasks);
});

test("损坏的 JSON 安全降级为空数组", () => {
  const storage = makeFakeStorage();
  storage.setItem(STORAGE_KEY, "{not json");
  assert.deepEqual(loadTasks(storage), []);
});

test("非数组 JSON 安全降级为空数组", () => {
  const storage = makeFakeStorage();
  storage.setItem(STORAGE_KEY, '{"foo":1}');
  assert.deepEqual(loadTasks(storage), []);
});

test("非法任务条目被剔除", () => {
  const storage = makeFakeStorage();
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify([
      validTask(),
      { ...validTask(), title: "   " },
      { ...validTask(), priority: "urgent" },
      { ...validTask(), estimateMinutes: 0 },
      { ...validTask(), dueAt: "not-a-date" },
    ]),
  );
  assert.deepEqual(loadTasks(storage), [validTask()]);
});

test("normalizeTask 补全缺失的可选字段", () => {
  const normalized = normalizeTask({ ...validTask(), completed: undefined, createdAt: undefined });
  assert.equal(normalized.completed, false);
  assert.equal(typeof normalized.createdAt, "number");
});

test("createId 生成非空字符串", () => {
  assert.equal(typeof createId(), "string");
  assert.ok(createId().length > 0);
});
