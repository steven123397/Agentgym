import { DAILY_BUDGET_MINUTES, generateTodayPlan } from "./planner.js";

const app = document.querySelector("#app");
const STORAGE_KEY = "focus-planner.tasks.v1";
const priorities = ["high", "medium", "low"];
const priorityLabels = { high: "高", medium: "中", low: "低" };

if (!app) {
  throw new Error("Missing #app mount point");
}

const state = {
  activeView: "tasks",
  editingId: null,
  isFormOpen: false,
  notice: "",
  tasks: loadTasks(),
};

function parseTask(task) {
  if (!task || typeof task !== "object") return null;

  const title = typeof task.title === "string" ? task.title.trim() : "";
  const minutes = Number(task.minutes);

  if (
    !title ||
    !priorities.includes(task.priority) ||
    !Number.isInteger(minutes) ||
    minutes < 1 ||
    minutes > DAILY_BUDGET_MINUTES ||
    typeof task.dueAt !== "string" ||
    Number.isNaN(Date.parse(task.dueAt))
  ) {
    return null;
  }

  return {
    id: typeof task.id === "string" && task.id ? task.id : createId(),
    title,
    priority: task.priority,
    minutes,
    dueAt: task.dueAt,
    completed: Boolean(task.completed),
    createdAt: Number.isFinite(task.createdAt) ? task.createdAt : 0,
  };
}

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return [];

    const tasks = JSON.parse(saved);
    return Array.isArray(tasks) ? tasks.map(parseTask).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
    state.notice = "";
  } catch {
    state.notice = "浏览器无法保存数据；本次操作仅在当前页面有效。";
  }
}

function createId() {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "未设置";

  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function toLocalInputValue(value) {
  if (!value) return "";

  return value.slice(0, 16);
}

function taskCountLabel() {
  const activeCount = state.tasks.filter((task) => !task.completed).length;
  return `${activeCount} 项待专注 · ${state.tasks.length} 项总任务`;
}

function openCreateForm() {
  state.editingId = null;
  state.isFormOpen = true;
  render();
  app.querySelector("#task-title")?.focus();
}

function openEditForm(id) {
  state.editingId = id;
  state.isFormOpen = true;
  render();
  app.querySelector("#task-title")?.focus();
}

function closeForm() {
  state.editingId = null;
  state.isFormOpen = false;
  render();
}

function renderWelcome() {
  app.innerHTML = `
    <section class="welcome-shell" aria-labelledby="welcome-title">
      <nav class="welcome-nav" aria-label="产品信息">
        <a class="brand" href="#top" aria-label="专注任务规划器首页">
          <span class="brand-mark">F</span>
          Focusplan
        </a>
        <span class="nav-note">今天，把重要的事留给自己</span>
      </nav>
      <div class="welcome-grid" id="top">
        <div class="welcome-copy">
          <p class="eyebrow">清醒地安排，专注地完成</p>
          <h1 id="welcome-title">给真正重要的事，<em>一段完整的时间。</em></h1>
          <p class="hero-text">把待办从脑海中取出来。Focusplan 按优先级与截止时间，为你编排一份不超过 8 小时的今日执行计划。</p>
          <div class="hero-actions">
            <button class="button button-primary" type="button" data-action="create">创建第一个任务 <span aria-hidden="true">→</span></button>
            <a class="text-link" href="#how-it-works">了解它如何工作</a>
          </div>
        </div>
        <aside class="hero-plan-card" aria-label="今日计划预览">
          <div class="plan-card-topline"><span>今日专注预算</span><strong>08:00</strong></div>
          <div class="budget-ring"><span>480</span><small>分钟</small></div>
          <div class="preview-task preview-task-high"><span class="preview-dot"></span><div><strong>优先完成</strong><small>截止时间临近的高优任务</small></div></div>
          <div class="preview-task"><span class="preview-dot"></span><div><strong>保留完整时段</strong><small>不拆分，不透支</small></div></div>
        </aside>
      </div>
      <section class="feature-section" id="how-it-works" aria-label="核心能力">
        <article><span class="feature-number">01</span><h2>收拢任务</h2><p>记录优先级、预计时长与截止时间，让每项承诺有据可循。</p></article>
        <article><span class="feature-number">02</span><h2>理顺次序</h2><p>高优任务在前；同等优先级时，离截止更近的先做。</p></article>
        <article><span class="feature-number">03</span><h2>守住边界</h2><p>每天最多 8 小时。放不下的任务被清楚标记，而不是悄悄挤进日程。</p></article>
      </section>
    </section>`;
}

function taskFormMarkup(task) {
  const isEditing = Boolean(task);
  const values = task ?? { priority: "high", minutes: 60, dueAt: "", title: "" };

  return `
    <section class="task-form-panel" aria-labelledby="form-title">
      <div class="form-heading">
        <div><p class="eyebrow">${isEditing ? "完善任务" : "新的专注块"}</p><h2 id="form-title">${isEditing ? "编辑任务" : "添加任务"}</h2></div>
        <button class="icon-button" type="button" data-action="cancel-form" aria-label="关闭表单">×</button>
      </div>
      <form id="task-form" novalidate>
        <input type="hidden" name="id" value="${isEditing ? escapeHtml(task.id) : ""}">
        <label class="field field-full">任务标题
          <input id="task-title" name="title" maxlength="80" required value="${escapeHtml(values.title)}" placeholder="例如：完成产品方案" autocomplete="off">
          <span class="field-error" data-error-for="title"></span>
        </label>
        <div class="form-grid">
          <label class="field">优先级
            <select name="priority">
              ${priorities.map((priority) => `<option value="${priority}" ${values.priority === priority ? "selected" : ""}>${priorityLabels[priority]}优先级</option>`).join("")}
            </select>
          </label>
          <label class="field">预计耗时（分钟）
            <input name="minutes" type="number" min="1" max="480" step="1" required value="${values.minutes}">
            <span class="field-error" data-error-for="minutes"></span>
          </label>
        </div>
        <label class="field field-full">截止时间
          <input name="dueAt" type="datetime-local" required value="${toLocalInputValue(values.dueAt)}">
          <span class="field-error" data-error-for="dueAt"></span>
        </label>
        <div class="form-actions"><button class="button button-quiet" type="button" data-action="cancel-form">取消</button><button class="button button-primary" type="submit">${isEditing ? "保存修改" : "保存任务"}</button></div>
      </form>
    </section>`;
}

function taskCardMarkup(task) {
  return `
    <article class="task-card ${task.completed ? "is-complete" : ""}">
      <button class="check-button" type="button" data-action="toggle" data-id="${escapeHtml(task.id)}" aria-label="${task.completed ? "标记为未完成" : "标记为已完成"}" aria-pressed="${task.completed}">${task.completed ? "✓" : ""}</button>
      <div class="task-content">
        <div class="task-title-row"><h3>${escapeHtml(task.title)}</h3><span class="priority priority-${task.priority}">${priorityLabels[task.priority]}优先级</span></div>
        <p class="task-meta"><span>${task.minutes} 分钟</span><span aria-hidden="true">·</span><time datetime="${escapeHtml(task.dueAt)}">截止 ${formatDateTime(task.dueAt)}</time></p>
      </div>
      <div class="task-actions"><button class="small-button" type="button" data-action="edit" data-id="${escapeHtml(task.id)}">编辑</button><button class="small-button small-button-danger" type="button" data-action="delete" data-id="${escapeHtml(task.id)}">删除</button></div>
    </article>`;
}

function renderTasksView() {
  const openTasks = state.tasks.filter((task) => !task.completed);
  const completedTasks = state.tasks.filter((task) => task.completed);

  return `
    <section class="workspace-content" aria-labelledby="workspace-title">
      <div class="section-heading"><div><p class="eyebrow">任务清单</p><h2 id="workspace-title">所有任务</h2></div><span class="count-chip">${taskCountLabel()}</span></div>
      ${state.isFormOpen ? taskFormMarkup(state.editingId ? state.tasks.find((task) => task.id === state.editingId) : null) : ""}
      <div class="task-list">
        ${openTasks.length ? openTasks.map(taskCardMarkup).join("") : `<div class="empty-inline"><strong>所有任务都完成了。</strong><span>先休息一下，或添加下一件重要的事。</span></div>`}
      </div>
      ${completedTasks.length ? `<section class="completed-section"><h3>已完成 <span>${completedTasks.length}</span></h3><div class="task-list">${completedTasks.map(taskCardMarkup).join("")}</div></section>` : ""}
    </section>`;
}

function renderPlanView() {
  const plan = generateTodayPlan(state.tasks);
  const noActiveTasks = state.tasks.every((task) => task.completed);

  return `
    <section class="workspace-content" aria-labelledby="plan-title">
      <div class="section-heading"><div><p class="eyebrow">自动编排</p><h2 id="plan-title">今日计划</h2></div><span class="budget-chip"><strong>${plan.totalMinutes}</strong> / ${DAILY_BUDGET_MINUTES} 分钟</span></div>
      <section class="plan-summary"><div><span>已安排专注时间</span><strong>${plan.totalMinutes}<small> 分钟</small></strong></div><div><span>剩余可用时间</span><strong>${plan.remainingMinutes}<small> 分钟</small></strong></div><p>先处理高优任务；同优先级按截止时间排序。任务只会在可完整执行时被安排。</p></section>
      ${noActiveTasks ? `<div class="plan-empty"><span class="empty-icon">✓</span><h3>今天的任务已经全部完成</h3><p>添加一项新任务，开始安排下一段专注时间。</p><button class="button button-primary" type="button" data-action="create">添加任务</button></div>` : ""}
      ${plan.scheduled.length ? `<section class="plan-list"><h3>按这个顺序开始</h3>${plan.scheduled.map((task, index) => `<article class="plan-item"><span class="plan-order">${String(index + 1).padStart(2, "0")}</span><div><h4>${escapeHtml(task.title)}</h4><p>${priorityLabels[task.priority]}优先级 · ${task.minutes} 分钟 · 截止 ${formatDateTime(task.dueAt)}</p></div><span class="plan-duration">${task.minutes}m</span></article>`).join("")}</section>` : ""}
      ${plan.unscheduled.length ? `<section class="unscheduled-list"><h3>暂不安排</h3>${plan.unscheduled.map(({ task, reason }) => `<article><div><h4>${escapeHtml(task.title)}</h4><p>${reason}</p></div><span>${task.minutes}m</span></article>`).join("")}</section>` : ""}
    </section>`;
}

function renderWorkspace() {
  app.innerHTML = `
    <div class="app-shell">
      <header class="app-header"><a class="brand" href="#" data-action="home"><span class="brand-mark">F</span>Focusplan</a><button class="button button-primary button-compact" type="button" data-action="create">+ 新建任务</button></header>
      ${state.notice ? `<p class="notice" role="status">${escapeHtml(state.notice)}</p>` : ""}
      <div class="workspace-layout">
        <aside class="workspace-aside"><p class="eyebrow">专注而不忙乱</p><h1>为今天<br>腾出完整时间。</h1><p>将注意力留给最重要的事情。每日预算最多 8 小时，不做无声的过度承诺。</p><div class="aside-stat"><strong>${state.tasks.filter((task) => !task.completed).length}</strong><span>项待专注任务</span></div></aside>
        <main class="workspace-main">
          <nav class="view-tabs" aria-label="任务视图"><button class="tab ${state.activeView === "tasks" ? "is-active" : ""}" type="button" data-action="view" data-view="tasks">全部任务</button><button class="tab ${state.activeView === "plan" ? "is-active" : ""}" type="button" data-action="view" data-view="plan">今日计划</button></nav>
          ${state.activeView === "tasks" ? renderTasksView() : renderPlanView()}
        </main>
      </div>
    </div>`;
}

function render() {
  if (state.tasks.length === 0 && !state.isFormOpen) {
    renderWelcome();
    return;
  }

  renderWorkspace();
}

function showFieldError(form, name, message) {
  const error = form.querySelector(`[data-error-for="${name}"]`);
  const field = form.elements.namedItem(name);
  error.textContent = message;
  field.setAttribute("aria-invalid", "true");
}

function clearFieldErrors(form) {
  form.querySelectorAll(".field-error").forEach((error) => { error.textContent = ""; });
  form.querySelectorAll("[aria-invalid]").forEach((field) => field.removeAttribute("aria-invalid"));
}

function handleFormSubmit(form) {
  clearFieldErrors(form);
  const values = Object.fromEntries(new FormData(form));
  const title = String(values.title ?? "").trim();
  const minutes = Number(values.minutes);
  const dueAt = String(values.dueAt ?? "");
  let valid = true;

  if (!title) { showFieldError(form, "title", "请输入任务标题。"); valid = false; }
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > DAILY_BUDGET_MINUTES) { showFieldError(form, "minutes", "请输入 1 至 480 之间的整数。"); valid = false; }
  if (!dueAt || Number.isNaN(Date.parse(dueAt))) { showFieldError(form, "dueAt", "请选择有效的截止时间。"); valid = false; }
  if (!valid) return;

  const existingIndex = state.tasks.findIndex((task) => task.id === values.id);
  const task = {
    id: existingIndex >= 0 ? state.tasks[existingIndex].id : createId(),
    title,
    priority: priorities.includes(values.priority) ? values.priority : "medium",
    minutes,
    dueAt,
    completed: existingIndex >= 0 ? state.tasks[existingIndex].completed : false,
    createdAt: existingIndex >= 0 ? state.tasks[existingIndex].createdAt : Date.now(),
  };

  if (existingIndex >= 0) state.tasks[existingIndex] = task;
  else state.tasks.unshift(task);

  saveTasks();
  state.isFormOpen = false;
  state.editingId = null;
  state.activeView = "tasks";
  render();
}

function handleClick(event) {
  const control = event.target.closest("[data-action]");
  if (!control) return;

  const { action, id, view } = control.dataset;

  if (action === "create") openCreateForm();
  if (action === "cancel-form") closeForm();
  if (action === "home") { state.activeView = "tasks"; render(); }
  if (action === "view" && ["tasks", "plan"].includes(view)) { state.activeView = view; render(); }
  if (action === "edit") openEditForm(id);
  if (action === "toggle") {
    state.tasks = state.tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task);
    saveTasks();
    render();
  }
  if (action === "delete") {
    const task = state.tasks.find((candidate) => candidate.id === id);
    if (task && window.confirm(`删除“${task.title}”？此操作无法撤销。`)) {
      state.tasks = state.tasks.filter((candidate) => candidate.id !== id);
      state.editingId = null;
      state.isFormOpen = false;
      saveTasks();
      render();
    }
  }
}

app.addEventListener("click", handleClick);
app.addEventListener("submit", (event) => {
  if (event.target.matches("#task-form")) {
    event.preventDefault();
    handleFormSubmit(event.target);
  }
});

render();
