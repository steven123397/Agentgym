import {
  PRIORITY_LABEL,
  PRIORITIES,
  createTask,
  updateTask,
  validateTaskInput,
  toDatetimeLocalValue,
  fromDatetimeLocalValue,
} from '../domain/task.js';
import {
  buildDailyPlan,
  DAY_BUDGET_MIN,
  REJECT_REASON_LABEL,
} from '../domain/planner.js';
import { loadTasks, saveTasks } from '../storage/tasks.js';

/**
 * @typedef {'list' | 'plan'} ViewId
 * @typedef {'idle' | 'create' | 'edit'} FormMode
 */

/**
 * 挂载整个应用到指定 DOM 节点。
 * @param {HTMLElement} root
 */
export const mountApp = (root) => {
  const loaded = loadTasks();
  /** @type {import('../domain/task.js').Task[]} */
  let tasks = loaded.tasks;
  /** @type {ViewId} */
  let view = 'list';
  /** @type {FormMode} */
  let formMode = 'idle';
  /** @type {string | null} */
  let editingId = null;
  /** @type {Record<string, string>} */
  let formErrors = {};
  /** @type {string | null} */
  let toast = loaded.warning;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let toastTimer = null;

  /* ── 状态操作 ── */

  const persist = () => {
    const result = saveTasks(tasks);
    if (!result.ok) showToast(result.error);
  };

  /** @param {string} message */
  const showToast = (message) => {
    toast = message;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast = null;
      toastTimer = null;
      render();
    }, 4000);
    render();
  };

  const closeForm = () => {
    formMode = 'idle';
    editingId = null;
    formErrors = {};
  };

  const openCreate = () => {
    formMode = 'create';
    editingId = null;
    formErrors = {};
    view = 'list';
    render();
  };

  /** @param {string} id */
  const openEdit = (id) => {
    formMode = 'edit';
    editingId = id;
    formErrors = {};
    view = 'list';
    render();
  };

  /** @param {string} id */
  const removeTask = (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    if (!globalThis.confirm(`确定删除任务「${task.title}」？`)) return;
    tasks = tasks.filter((t) => t.id !== id);
    if (editingId === id) closeForm();
    persist();
    render();
  };

  /** @param {string} id */
  const toggleDone = (id) => {
    tasks = tasks.map((t) =>
      t.id === id
        ? { ...t, done: !t.done, updatedAt: new Date().toISOString() }
        : t,
    );
    persist();
    render();
  };

  /** @param {HTMLFormElement} form */
  const submitForm = (form) => {
    const fd = new FormData(form);
    const input = {
      title: String(fd.get('title') ?? ''),
      priority: String(fd.get('priority') ?? ''),
      durationMin: String(fd.get('durationMin') ?? ''),
      dueAt: fromDatetimeLocalValue(String(fd.get('dueAt') ?? '')),
      done:
        formMode === 'edit'
          ? Boolean(tasks.find((t) => t.id === editingId)?.done)
          : false,
    };

    const result = validateTaskInput(input);
    if (!result.ok) {
      formErrors = result.errors;
      render();
      return;
    }

    if (formMode === 'edit' && editingId) {
      const existing = tasks.find((t) => t.id === editingId);
      if (!existing) {
        closeForm();
        render();
        return;
      }
      const next = updateTask(existing, result.value);
      tasks = tasks.map((t) => (t.id === editingId ? next : t));
    } else {
      tasks = [createTask(result.value), ...tasks];
    }

    closeForm();
    persist();
    render();
  };

  /* ── 渲染片段 ── */

  /** @returns {string} */
  const renderToast = () =>
    toast ? `<div class="toast" role="status">${escapeHtml(toast)}</div>` : '';

  /** @returns {string} */
  const renderTabs = () => `
    <div class="tabs" role="tablist" aria-label="视图切换">
      <button type="button" class="tab ${view === 'list' ? 'is-active' : ''}"
        role="tab" aria-selected="${view === 'list'}"
        data-action="view" data-view="list">全部任务</button>
      <button type="button" class="tab ${view === 'plan' ? 'is-active' : ''}"
        role="tab" aria-selected="${view === 'plan'}"
        data-action="view" data-view="plan">今日计划</button>
    </div>`;

  /** @returns {string} */
  const renderForm = () => {
    if (formMode === 'idle') return '';

    const editing = formMode === 'edit' ? tasks.find((t) => t.id === editingId) : null;
    if (formMode === 'edit' && !editing) return '';

    const title = editing?.title ?? '';
    const priority = editing?.priority ?? 'medium';
    const durationMin = editing ? String(editing.durationMin) : '30';
    const dueAt = editing
      ? toDatetimeLocalValue(editing.dueAt)
      : toDatetimeLocalValue(defaultDueIso());

    const err = (name) =>
      formErrors[name]
        ? `<p class="field-error" id="err-${name}">${escapeHtml(formErrors[name])}</p>`
        : '';
    const invalid = (name) => (formErrors[name] ? 'aria-invalid="true"' : '');

    return `
      <section class="panel form-panel" aria-labelledby="form-title">
        <div class="panel-head">
          <h2 id="form-title">${formMode === 'edit' ? '编辑任务' : '新增任务'}</h2>
          <button type="button" class="btn btn-ghost" data-action="form-cancel">取消</button>
        </div>
        <form class="task-form" data-form="task" novalidate>
          <label class="field">
            <span>标题</span>
            <input name="title" type="text" maxlength="80" required
              value="${escapeAttr(title)}" ${invalid('title')}
              aria-describedby="${formErrors.title ? 'err-title' : ''}" />
            ${err('title')}
          </label>
          <fieldset class="field field-priority">
            <legend>优先级</legend>
            <div class="segmented" role="radiogroup" aria-label="优先级">
              ${PRIORITIES.map(
                (p) => `
                <label class="segment ${priority === p ? 'is-active' : ''}">
                  <input type="radio" name="priority" value="${p}" ${priority === p ? 'checked' : ''} />
                  <span>${PRIORITY_LABEL[p]}</span>
                </label>`,
              ).join('')}
            </div>
            ${err('priority')}
          </fieldset>
          <div class="field-row">
            <label class="field">
              <span>预计耗时（分钟）</span>
              <input name="durationMin" type="number" min="1" max="480" step="1" required
                value="${escapeAttr(durationMin)}" ${invalid('durationMin')} />
              ${err('durationMin')}
            </label>
            <label class="field">
              <span>截止时间</span>
              <input name="dueAt" type="datetime-local" required
                value="${escapeAttr(dueAt)}" ${invalid('dueAt')} />
              ${err('dueAt')}
            </label>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">保存</button>
          </div>
        </form>
      </section>`;
  };

  /** 欢迎落地页 @returns {string} */
  const renderWelcome = () => `
    <div class="welcome" aria-labelledby="welcome-title">
      <div class="welcome-glow" aria-hidden="true"></div>
      <div class="welcome-card">
        <div class="welcome-brand">
          <span class="welcome-mark" aria-hidden="true">
            <svg viewBox="0 0 48 48" width="48" height="48" fill="none">
              <rect x="4" y="4" width="40" height="40" rx="14" fill="url(#wm)"/>
              <path d="M16 25.5 21.5 31 32 18" stroke="#fff" stroke-width="3.2"
                stroke-linecap="round" stroke-linejoin="round"/>
              <defs>
                <linearGradient id="wm" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#5b8cff"/><stop offset="1" stop-color="#2f6fed"/>
                </linearGradient>
              </defs>
            </svg>
          </span>
          <p class="eyebrow welcome-eyebrow">Focus Planner</p>
          <h1 id="welcome-title">把今天要做的事，排成一条清晰路径</h1>
          <p class="welcome-lead">
            记录任务、设定优先级与截止时间，系统会按确定性规则生成不超过 8 小时的今日执行计划。
          </p>
        </div>

        <ul class="welcome-features">
          <li>
            <span class="welcome-icon" aria-hidden="true">①</span>
            <div><strong>收集任务</strong><span>标题、优先级、耗时与截止，一次写清</span></div>
          </li>
          <li>
            <span class="welcome-icon" aria-hidden="true">②</span>
            <div><strong>智能排序</strong><span>高优先级优先，截止更近的先做</span></div>
          </li>
          <li>
            <span class="welcome-icon" aria-hidden="true">③</span>
            <div><strong>8 小时预算</strong><span>装不下的任务会标明原因，不硬塞</span></div>
          </li>
        </ul>

        <div class="welcome-actions">
          <button type="button" class="btn btn-primary btn-lg" data-action="create">
            创建第一个任务
          </button>
          <p class="welcome-hint">数据保存在本机浏览器，刷新不丢失</p>
        </div>

        <div class="welcome-preview" aria-hidden="true">
          <div class="welcome-preview-bar"><span></span><span></span><span></span></div>
          <div class="welcome-preview-row is-high">
            <em>1</em><div><b>完成设计文档</b><small>高 · 90 分钟</small></div>
          </div>
          <div class="welcome-preview-row is-med">
            <em>2</em><div><b>代码评审</b><small>中 · 45 分钟</small></div>
          </div>
          <div class="welcome-preview-row is-low">
            <em>3</em><div><b>整理周报</b><small>低 · 30 分钟</small></div>
          </div>
        </div>
      </div>
    </div>`;

  /** @returns {string} */
  const renderTaskList = () => {
    if (tasks.length === 0) {
      return `
        <section class="panel empty" aria-labelledby="empty-title">
          <h2 id="empty-title">还没有任务</h2>
          <p>创建第一个任务，开始规划今日专注时间。</p>
          <button type="button" class="btn btn-primary" data-action="create">新增任务</button>
        </section>`;
    }

    const sorted = [...tasks].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const due = Date.parse(a.dueAt) - Date.parse(b.dueAt);
      if (due !== 0) return due;
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    });

    return `
      <section class="panel" aria-labelledby="list-title">
        <div class="panel-head">
          <h2 id="list-title">全部任务 <span class="muted">(${tasks.length})</span></h2>
          <button type="button" class="btn btn-primary" data-action="create">新增任务</button>
        </div>
        <ul class="task-list">
          ${sorted.map((task) => renderTaskItem(task)).join('')}
        </ul>
      </section>`;
  };

  /** @param {import('../domain/task.js').Task} task */
  const renderTaskItem = (task) => `
    <li class="task-card ${task.done ? 'is-done' : ''}" data-id="${escapeAttr(task.id)}">
      <label class="check">
        <input type="checkbox" data-action="toggle-done" data-id="${escapeAttr(task.id)}"
          ${task.done ? 'checked' : ''} aria-label="标记完成：${escapeAttr(task.title)}" />
      </label>
      <div class="task-body">
        <div class="task-title-row">
          <span class="task-title">${escapeHtml(task.title)}</span>
          <span class="badge badge-${task.priority}">${PRIORITY_LABEL[task.priority]}</span>
        </div>
        <div class="task-meta">
          <span>${task.durationMin} 分钟</span>
          <span>截止 ${formatDue(task.dueAt)}</span>
        </div>
      </div>
      <div class="task-actions">
        <button type="button" class="btn btn-ghost" data-action="edit" data-id="${escapeAttr(task.id)}">编辑</button>
        <button type="button" class="btn btn-danger-ghost" data-action="delete" data-id="${escapeAttr(task.id)}">删除</button>
      </div>
    </li>`;

  /** @returns {string} */
  const renderPlan = () => {
    if (tasks.length === 0) {
      return `
        <section class="panel empty" aria-labelledby="plan-empty">
          <h2 id="plan-empty">今日计划</h2>
          <p>还没有任务可生成计划。先去添加几个吧。</p>
          <button type="button" class="btn btn-primary" data-action="create">新增任务</button>
        </section>`;
    }

    const plan = buildDailyPlan(tasks);
    const usedPct =
      plan.budgetMin === 0
        ? 0
        : Math.min(100, Math.round((plan.totalMin / plan.budgetMin) * 100));

    const scheduledBlock =
      plan.scheduled.length === 0
        ? `<div class="empty-inline"><p>今日暂无已排程任务。</p></div>`
        : `<ol class="plan-list">
            ${plan.scheduled
              .map(
                (item) => `
              <li class="plan-card">
                <span class="plan-order">${item.order}</span>
                <div class="task-body">
                  <div class="task-title-row">
                    <span class="task-title">${escapeHtml(item.task.title)}</span>
                    <span class="badge badge-${item.task.priority}">${PRIORITY_LABEL[item.task.priority]}</span>
                  </div>
                  <div class="task-meta">
                    <span>${item.task.durationMin} 分钟</span>
                    <span>时段 ${formatOffset(item.startOffsetMin)} – ${formatOffset(item.endOffsetMin)}</span>
                    <span>截止 ${formatDue(item.task.dueAt)}</span>
                  </div>
                </div>
              </li>`,
              )
              .join('')}
          </ol>`;

    const rejectedOpen = plan.rejected.filter((r) => r.reason !== 'already_done');
    const rejectedDone = plan.rejected.filter((r) => r.reason === 'already_done');

    const rejectedBlock =
      rejectedOpen.length === 0 && rejectedDone.length === 0
        ? ''
        : `
        <div class="rejected-block">
          <h3>未排入计划</h3>
          ${
            rejectedOpen.length === 0
              ? ''
              : `<ul class="rejected-list">
                  ${rejectedOpen
                    .map(
                      (r) => `
                    <li class="rejected-card">
                      <div class="task-title-row">
                        <span class="task-title">${escapeHtml(r.task.title)}</span>
                        <span class="badge badge-${r.task.priority}">${PRIORITY_LABEL[r.task.priority]}</span>
                      </div>
                      <p class="reason">${escapeHtml(REJECT_REASON_LABEL[r.reason])}</p>
                      <div class="task-meta">
                        <span>${r.task.durationMin} 分钟</span>
                        <span>截止 ${formatDue(r.task.dueAt)}</span>
                      </div>
                    </li>`,
                    )
                    .join('')}
                </ul>`
          }
          ${
            rejectedDone.length === 0
              ? ''
              : `<details class="done-details">
                  <summary>已完成（${rejectedDone.length}）</summary>
                  <ul class="rejected-list">
                    ${rejectedDone
                      .map(
                        (r) => `
                      <li class="rejected-card is-done">
                        <span class="task-title">${escapeHtml(r.task.title)}</span>
                        <p class="reason">${escapeHtml(REJECT_REASON_LABEL[r.reason])}</p>
                      </li>`,
                      )
                      .join('')}
                  </ul>
                </details>`
          }
        </div>`;

    return `
      <section class="panel" aria-labelledby="plan-title">
        <div class="panel-head">
          <h2 id="plan-title">今日计划</h2>
        </div>
        <div class="budget-bar" aria-label="今日时间占用">
          <div class="budget-meta">
            <span>已排 ${plan.totalMin} / ${plan.budgetMin} 分钟</span>
            <span>${usedPct}%</span>
          </div>
          <div class="budget-track">
            <div class="budget-fill" style="width:${usedPct}%"></div>
          </div>
        </div>
        <h3 class="subhead">执行顺序</h3>
        ${scheduledBlock}
        ${rejectedBlock}
      </section>`;
  };

  /* ── 主渲染 ── */

  const render = () => {
    const openCount = tasks.filter((t) => !t.done).length;
    const planPreview = buildDailyPlan(tasks);
    const showWelcome = tasks.length === 0 && formMode === 'idle';

    if (showWelcome) {
      root.innerHTML = `
        <div class="app-shell app-shell-welcome">
          ${renderToast()}
          ${renderWelcome()}
        </div>`;
      return;
    }

    if (tasks.length === 0 && formMode !== 'idle') {
      root.innerHTML = `
        <div class="app-shell app-shell-onboarding">
          ${renderToast()}
          <header class="app-header app-header-compact">
            <div>
              <p class="eyebrow">Focus Planner</p>
              <h1>专注任务规划器</h1>
            </div>
          </header>
          <div class="main-stack">${renderForm()}</div>
        </div>`;
      return;
    }

    root.innerHTML = `
      <div class="app-shell">
        ${renderToast()}
        <header class="app-header">
          <div>
            <p class="eyebrow">Focus Planner</p>
            <h1>专注任务规划器</h1>
          </div>
          <p class="header-summary">
            未完成 ${openCount} · 今日预算 ${DAY_BUDGET_MIN} 分钟
            ${view === 'plan' ? ` · 已排 ${planPreview.totalMin} 分钟` : ''}
          </p>
        </header>
        ${renderTabs()}
        <div class="main-stack">
          ${formMode !== 'idle' ? renderForm() : ''}
          ${view === 'list' ? renderTaskList() : renderPlan()}
        </div>
      </div>`;
  };

  /* ── 事件委托 ── */

  root.addEventListener('click', (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    const actionEl = target.closest('[data-action]');
    if (!actionEl) return;

    const action = actionEl.getAttribute('data-action');
    const id = actionEl.getAttribute('data-id');

    if (action === 'view') {
      const next = actionEl.getAttribute('data-view');
      if (next === 'list' || next === 'plan') {
        view = next;
        render();
      }
      return;
    }
    if (action === 'create') { openCreate(); return; }
    if (action === 'form-cancel') { closeForm(); render(); return; }
    if (action === 'edit' && id) { openEdit(id); return; }
    if (action === 'delete' && id) { removeTask(id); return; }
  });

  root.addEventListener('change', (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    if (
      target instanceof HTMLInputElement &&
      target.matches('[data-action="toggle-done"]')
    ) {
      const id = target.getAttribute('data-id');
      if (id) toggleDone(id);
    }

    if (
      target instanceof HTMLInputElement &&
      target.name === 'priority' &&
      target.type === 'radio'
    ) {
      const group = target.closest('.segmented');
      if (group) {
        group.querySelectorAll('.segment').forEach((el) => {
          el.classList.toggle(
            'is-active',
            el.querySelector('input')?.checked === true,
          );
        });
      }
    }
  });

  root.addEventListener('submit', (event) => {
    const form = /** @type {HTMLElement} */ (event.target);
    if (!(form instanceof HTMLFormElement)) return;
    if (form.getAttribute('data-form') !== 'task') return;
    event.preventDefault();
    submitForm(form);
  });

  render();
};

/* ── 工具函数 ── */

/** @returns {string} */
const defaultDueIso = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  return d.toISOString();
};

/** @param {string} iso */
const formatDue = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** @param {number} minutes */
const formatOffset = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${String(m).padStart(2, '0')}m`;
};

/** @param {string} value */
const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/** @param {string} value */
const escapeAttr = (value) => escapeHtml(value).replaceAll("'", '&#39;');
