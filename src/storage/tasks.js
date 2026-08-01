import { normalizeStoredTask } from '../domain/task.js';

export const STORAGE_KEY = 'agentgym.focusPlanner.v1';
export const STORAGE_VERSION = 1;

/**
 * 从解析后的 JSON 中提取合法任务列表。
 * @param {unknown} data
 * @returns {import('../domain/task.js').Task[]}
 */
const parseTasksPayload = (data) => {
  if (!data || typeof data !== 'object') return [];
  const payload = /** @type {Record<string, unknown>} */ (data);
  if (!Array.isArray(payload.tasks)) return [];

  /** @type {import('../domain/task.js').Task[]} */
  const tasks = [];
  for (const item of payload.tasks) {
    const task = normalizeStoredTask(item);
    if (task) tasks.push(task);
  }
  return tasks;
};

/**
 * 从 localStorage 加载任务列表。
 * @param {Pick<Storage, 'getItem'>} [storage]
 * @returns {{ tasks: import('../domain/task.js').Task[], warning: string | null }}
 */
export const loadTasks = (storage = globalThis.localStorage) => {
  try {
    if (!storage) {
      return { tasks: [], warning: '当前环境无法使用本地存储，刷新后数据会丢失。' };
    }
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return { tasks: [], warning: null };
    }
    const data = JSON.parse(raw);
    return { tasks: parseTasksPayload(data), warning: null };
  } catch {
    return { tasks: [], warning: '本地数据已损坏，已忽略并使用空列表。' };
  }
};

/**
 * 将任务列表写入 localStorage。
 * @param {import('../domain/task.js').Task[]} tasks
 * @param {Pick<Storage, 'setItem'>} [storage]
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export const saveTasks = (tasks, storage = globalThis.localStorage) => {
  try {
    if (!storage) {
      return { ok: false, error: '当前环境无法使用本地存储。' };
    }
    const payload = { version: STORAGE_VERSION, tasks };
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return { ok: true };
  } catch {
    return { ok: false, error: '保存失败（可能超出存储配额）。当前会话内仍可继续编辑。' };
  }
};
