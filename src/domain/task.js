/** @typedef {'low' | 'medium' | 'high'} Priority */

/** @typedef {{
 *   id: string,
 *   title: string,
 *   priority: Priority,
 *   durationMin: number,
 *   dueAt: string,
 *   done: boolean,
 *   createdAt: string,
 *   updatedAt: string,
 * }} Task */

export const PRIORITIES = /** @type {const} */ (['low', 'medium', 'high']);

/** @type {Record<Priority, number>} */
export const PRIORITY_WEIGHT = { low: 1, medium: 2, high: 3 };

/** @type {Record<Priority, string>} */
export const PRIORITY_LABEL = { low: '低', medium: '中', high: '高' };

export const TITLE_MAX = 80;
export const DURATION_MIN = 1;
export const DURATION_MAX = 480;

/**
 * @param {unknown} value
 * @returns {value is Priority}
 */
export const isPriority = (value) =>
  value === 'low' || value === 'medium' || value === 'high';

/**
 * 校验用户输入，返回规范化后的值或逐字段错误。
 * @param {object} input
 * @param {string} [input.title]
 * @param {string} [input.priority]
 * @param {unknown} [input.durationMin]
 * @param {string} [input.dueAt]
 * @param {boolean} [input.done]
 * @returns {{ ok: true, value: {
 *   title: string, priority: Priority, durationMin: number, dueAt: string, done: boolean,
 * }} | { ok: false, errors: Record<string, string> }}
 */
export const validateTaskInput = (input) => {
  /** @type {Record<string, string>} */
  const errors = {};

  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title) {
    errors.title = '请填写标题';
  } else if (title.length > TITLE_MAX) {
    errors.title = `标题不超过 ${TITLE_MAX} 字`;
  }

  if (!isPriority(input.priority)) {
    errors.priority = '请选择优先级';
  }

  const durationRaw =
    typeof input.durationMin === 'number'
      ? input.durationMin
      : Number(input.durationMin);
  if (!Number.isInteger(durationRaw)) {
    errors.durationMin = '预计耗时须为整数分钟';
  } else if (durationRaw < DURATION_MIN || durationRaw > DURATION_MAX) {
    errors.durationMin = `预计耗时须在 ${DURATION_MIN}–${DURATION_MAX} 分钟`;
  }

  const dueMs = input.dueAt ? Date.parse(String(input.dueAt)) : Number.NaN;
  if (Number.isNaN(dueMs)) {
    errors.dueAt = '请填写有效的截止时间';
  }

  const done = Boolean(input.done);

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      title,
      priority: /** @type {Priority} */ (input.priority),
      durationMin: durationRaw,
      dueAt: new Date(dueMs).toISOString(),
      done,
    },
  };
};

/**
 * 创建新任务。
 * @param {{
 *   title: string, priority: Priority, durationMin: number,
 *   dueAt: string, done?: boolean, id?: string, now?: Date,
 * }} fields
 * @returns {Task}
 */
export const createTask = (fields) => {
  const now = fields.now ?? new Date();
  const iso = now.toISOString();
  return {
    id: fields.id ?? crypto.randomUUID(),
    title: fields.title,
    priority: fields.priority,
    durationMin: fields.durationMin,
    dueAt: fields.dueAt,
    done: Boolean(fields.done),
    createdAt: iso,
    updatedAt: iso,
  };
};

/**
 * 用新字段覆盖已有任务，刷新 updatedAt。
 * @param {Task} task
 * @param {{
 *   title: string, priority: Priority, durationMin: number,
 *   dueAt: string, done?: boolean, now?: Date,
 * }} fields
 * @returns {Task}
 */
export const updateTask = (task, fields) => {
  const now = fields.now ?? new Date();
  return {
    ...task,
    title: fields.title,
    priority: fields.priority,
    durationMin: fields.durationMin,
    dueAt: fields.dueAt,
    done: fields.done !== undefined ? Boolean(fields.done) : task.done,
    updatedAt: now.toISOString(),
  };
};

/**
 * 从 localStorage 读出的原始对象规范化为 Task，不合法则返回 null。
 * @param {unknown} raw
 * @returns {Task | null}
 */
export const normalizeStoredTask = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const o = /** @type {Record<string, unknown>} */ (raw);

  if (typeof o.id !== 'string' || !o.id) return null;
  if (typeof o.title !== 'string') return null;
  if (!isPriority(o.priority)) return null;
  if (!Number.isInteger(o.durationMin)) return null;
  if (
    /** @type {number} */ (o.durationMin) < DURATION_MIN ||
    /** @type {number} */ (o.durationMin) > DURATION_MAX
  ) {
    return null;
  }
  if (typeof o.dueAt !== 'string' || Number.isNaN(Date.parse(o.dueAt))) return null;
  if (typeof o.done !== 'boolean') return null;
  if (typeof o.createdAt !== 'string' || Number.isNaN(Date.parse(o.createdAt))) return null;
  if (typeof o.updatedAt !== 'string' || Number.isNaN(Date.parse(o.updatedAt))) return null;

  const title = o.title.trim();
  if (!title || title.length > TITLE_MAX) return null;

  return {
    id: o.id,
    title,
    priority: o.priority,
    durationMin: /** @type {number} */ (o.durationMin),
    dueAt: new Date(o.dueAt).toISOString(),
    done: o.done,
    createdAt: new Date(o.createdAt).toISOString(),
    updatedAt: new Date(o.updatedAt).toISOString(),
  };
};

/**
 * ISO 字符串 → datetime-local input 值（本地时区）。
 * @param {string} iso
 * @returns {string}
 */
export const toDatetimeLocalValue = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * datetime-local input 值 → ISO 字符串。
 * @param {string} localValue
 * @returns {string}
 */
export const fromDatetimeLocalValue = (localValue) => {
  if (!localValue) return '';
  const ms = Date.parse(localValue);
  return Number.isNaN(ms) ? '' : new Date(ms).toISOString();
};
