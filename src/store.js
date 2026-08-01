export const STORAGE_KEY = "focus-planner:tasks:v1";

const PRIORITIES = new Set(["high", "medium", "low"]);

export function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeTask(raw) {
  if (!raw || typeof raw !== "object") return null;

  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (title.length === 0 || title.length > 80) return null;

  if (!PRIORITIES.has(raw.priority)) return null;

  const estimateMinutes = Number(raw.estimateMinutes);
  if (!Number.isInteger(estimateMinutes) || estimateMinutes < 1 || estimateMinutes > 1440) {
    return null;
  }

  const dueAt = Number(raw.dueAt);
  if (!Number.isFinite(dueAt)) return null;

  const id = typeof raw.id === "string" && raw.id.length > 0 ? raw.id : createId();
  const createdAt = Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : dueAt;

  return {
    id,
    title,
    priority: raw.priority,
    estimateMinutes,
    dueAt,
    completed: raw.completed === true,
    createdAt,
  };
}

export function loadTasks(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw == null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeTask).filter(Boolean);
  } catch (error) {
    console.warn("[store] 读取任务失败，已降级为空列表", error);
    return [];
  }
}

export function saveTasks(storage, tasks) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.warn("[store] 保存任务失败（数据仍保留在内存中）", error);
    return false;
  }
}
