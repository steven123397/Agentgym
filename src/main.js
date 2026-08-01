import { buildTodayPlan, compareTasks } from "./planner.js";
import { createId, loadTasks, saveTasks } from "./store.js";
import {
  escapeHtml,
  formatDueLabel,
  formatMinutes,
  formatPlanTime,
  formatTimeOfDay,
  toDatetimeLocalValue,
} from "./format.js";

const app = document.querySelector("#app");

if (!app) {
  throw new Error("Missing #app mount point");
}

const PRIORITY_LABEL = { high: "高", medium: "中", low: "低" };

const getStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const state = {
  tasks: loadTasks(getStorage()),
  view: "all",
  enteredWorkspace: false,
  editingId: null,
};

function persist() {
  saveTasks(getStorage(), state.tasks);
}

function render() {
  const showLanding = state.tasks.length === 0 && !state.enteredWorkspace;
  app.innerHTML = showLanding ? renderLanding() : renderWorkspace();
}

/* ---------- 渲染 ---------- */

function renderLanding() {
  return `
    <section class="landing">
      <div class="landing-hero">
        <div class="hero-copy">
          <p class="eyebrow">专注任务规划器</p>
          <h1>把今天要做的事，<br />排成一张清晰的计划</h1>
          <p class="hero-sub">
            管理任务、设定优先级与截止时间，一键生成不超过 8 小时的今日执行计划，
            放不下的任务会明确告诉你原因。
          </p>
          <div class="hero-actions">
            <button type="button" class="btn btn-primary" data-action="open-create">创建第一个任务</button>
            <button type="button" class="btn btn-ghost" data-action="enter-workspace">直接进入工作台</button>
          </div>
        </div>
        <div class="hero-visual" aria-hidden="true">
          <div class="mini-card">
            <span class="mini-check done">✓</span>
            <span class="mini-title">整理周报数据</span>
            <span class="mini-time">09:00 – 10:00</span>
          </div>
          <div class="mini-card">
            <span class="mini-check high">●</span>
            <span class="mini-title">评审需求方案</span>
            <span class="mini-time">10:00 – 11:30</span>
          </div>
          <div class="mini-card">
            <span class="mini-check">○</span>
            <span class="mini-title">回复团队消息</span>
            <span class="mini-time">11:30 – 12:00</span>
          </div>
          <p class="mini-budget">已安排 3 小时 30 分钟 · 剩余 4 小时 30 分钟</p>
        </div>
      </div>
      <div class="feature-grid">
        <article class="feature-card">
          <span class="feature-icon">✓</span>
          <h2>任务管理</h2>
          <p>快速新增、编辑与删除任务，随手记录要做的事，完成状态一目了然。</p>
        </article>
        <article class="feature-card">
          <span class="feature-icon">⇅</span>
          <h2>智能排序</h2>
          <p>高优先级优先、截止时间更近优先，逾期任务自动置顶，顺序清晰可解释。</p>
        </article>
        <article class="feature-card">
          <span class="feature-icon">⏱</span>
          <h2>8 小时预算</h2>
          <p>今日计划不超过 8 小时；放不下的任务会明确给出原因，而不是硬塞进去。</p>
        </article>
      </div>
      ${renderDialog()}
    </section>
  `;
}

function renderWorkspace() {
  return `
    <section class="workspace">
      <header class="topbar">
        <div class="brand">专注任务规划器</div>
        <div class="view-switch" role="group" aria-label="切换视图">
          <button type="button" class="switch-btn${state.view === "all" ? " active" : ""}" data-action="view-all">全部任务</button>
          <button type="button" class="switch-btn${state.view === "plan" ? " active" : ""}" data-action="view-plan">今日计划</button>
        </div>
        <button type="button" class="btn btn-primary topbar-create" data-action="open-create">新增任务</button>
      </header>
      <main class="workspace-body">
        ${state.view === "plan" ? renderPlan() : renderAll()}
      </main>
      ${renderDialog()}
    </section>
  `;
}

function renderEmptyState(icon, title, desc, actionLabel = "创建第一个任务") {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <h2>${title}</h2>
      <p>${desc}</p>
      <button type="button" class="btn btn-primary" data-action="open-create">${actionLabel}</button>
    </div>
  `;
}

function renderAll() {
  if (state.tasks.length === 0) {
    return renderEmptyState("☝", "还没有任务", "创建第一个任务，开始规划今天的工作。");
  }

  const sorted = [...state.tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return compareTasks(a, b);
  });
  const pendingCount = state.tasks.filter((task) => !task.completed).length;

  return `
    <div class="view-head">
      <h2>全部任务</h2>
      <p class="view-count">${state.tasks.length} 个任务 · ${pendingCount} 个待办</p>
    </div>
    <ul class="task-list">
      ${sorted.map(renderTaskCard).join("")}
    </ul>
  `;
}

function renderTaskCard(task) {
  const due = formatDueLabel(task.dueAt);
  return `
    <li class="task-card${task.completed ? " is-done" : ""}" data-id="${task.id}">
      <label class="task-check" title="${task.completed ? "标记为未完成" : "标记为完成"}">
        <input type="checkbox" data-action="toggle-complete" data-id="${task.id}" ${task.completed ? "checked" : ""} aria-label="标记完成" />
      </label>
      <div class="task-main">
        <div class="task-title-row">
          <h3 class="task-title">${escapeHtml(task.title)}</h3>
          <span class="badge badge-${task.priority}">${PRIORITY_LABEL[task.priority]}</span>
        </div>
        <div class="task-meta">
          <span>预计 ${formatMinutes(task.estimateMinutes)}</span>
          <span class="meta-due${due.overdue ? " overdue" : ""}">${due.text}</span>
        </div>
      </div>
      <div class="task-actions">
        <button type="button" class="icon-btn" data-action="edit" data-id="${task.id}" aria-label="编辑任务">✎</button>
        <button type="button" class="icon-btn danger" data-action="delete" data-id="${task.id}" aria-label="删除任务">✕</button>
      </div>
    </li>
  `;
}

function renderPlan() {
  if (state.tasks.length === 0) {
    return renderEmptyState("☝", "还没有任务", "先创建任务，今日计划会在这里自动生成。");
  }

  const pending = state.tasks.filter((task) => !task.completed);
  if (pending.length === 0) {
    return renderEmptyState("✓", "今日没有待办任务", "所有任务都已完成。新增任务后，这里会自动生成今日计划。");
  }

  const plan = buildTodayPlan(state.tasks, { now: Date.now() });
  const scheduledCount = plan.scheduled.length;

  const timeline =
    scheduledCount > 0
      ? `<ol class="plan-timeline">
          ${plan.scheduled
            .map((item, index) => {
              const task = item.task;
              return `
                <li class="plan-item" data-id="${task.id}">
                  <span class="plan-rail" aria-hidden="true">${index + 1}</span>
                  <div class="plan-body">
                    <div class="plan-time">${formatPlanTime(plan.generatedAt, item.startMinutes)} – ${formatPlanTime(plan.generatedAt, item.endMinutes)}</div>
                    <div class="plan-title-row">
                      <h3>${escapeHtml(task.title)}</h3>
                      <span class="badge badge-${task.priority}">${PRIORITY_LABEL[task.priority]}</span>
                    </div>
                    <label class="plan-done-check">
                      <input type="checkbox" data-action="toggle-complete" data-id="${task.id}" aria-label="标记「${escapeHtml(task.title)}」为完成" />
                      <span>标记完成</span>
                    </label>
                  </div>
                </li>`;
            })
            .join("")}
        </ol>`
      : `<p class="plan-note">今日没有可安排的任务，原因见下方说明。</p>`;

  const excludedBlock =
    plan.excluded.length > 0
      ? `<section class="excluded-block" aria-label="无法安排的任务">
          <h2>无法安排的任务（${plan.excluded.length}）</h2>
          <ul>
            ${plan.excluded
              .map(({ task, neededMinutes, remainingMinutes }) => {
                const reason =
                  neededMinutes > plan.budgetMinutes
                    ? `预计耗时 ${formatMinutes(neededMinutes)}，超过单日 8 小时预算`
                    : remainingMinutes === 0
                      ? "今日 8 小时预算已用完"
                      : `今日剩余 ${remainingMinutes} 分钟，不足以完成（预计 ${neededMinutes} 分钟）`;
                return `
                  <li class="excluded-item">
                    <span class="excluded-title">${escapeHtml(task.title)}</span>
                    <span class="badge badge-${task.priority}">${PRIORITY_LABEL[task.priority]}</span>
                    <span class="excluded-reason">${reason}</span>
                  </li>`;
              })
              .join("")}
          </ul>
        </section>`
      : "";

  return `
    <div class="view-head">
      <h2>今日计划</h2>
      <p class="view-count">从 ${pending.length} 个待办任务生成 · 预算 8 小时</p>
    </div>
    <div class="plan-summary">
      <div class="summary-main">
        <span class="summary-value">${formatMinutes(plan.usedMinutes)}</span>
        <span class="summary-label">/ 8 小时 · 今日预算</span>
      </div>
      <div class="summary-meta">
        <span>已安排 ${scheduledCount} 项 · 剩余 ${formatMinutes(plan.budgetMinutes - plan.usedMinutes)}</span>
        <span>生成于 ${formatTimeOfDay(plan.generatedAt)} · 已完成任务不参与计划</span>
      </div>
    </div>
    ${timeline}
    ${excludedBlock}
  `;
}

function renderDialog() {
  return `
    <dialog id="task-dialog" aria-labelledby="task-dialog-title">
      <form id="task-form" novalidate>
        <div class="dialog-head">
          <h2 id="task-dialog-title" class="dialog-title">新增任务</h2>
          <button type="button" class="icon-btn" data-action="close-dialog" aria-label="关闭对话框">✕</button>
        </div>
        <div class="field">
          <label for="task-title">标题</label>
          <input id="task-title" name="title" type="text" maxlength="80" placeholder="例如：整理周报数据" autocomplete="off" />
          <p class="field-error" id="title-error" hidden></p>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="task-priority">优先级</label>
            <select id="task-priority" name="priority">
              <option value="low">低</option>
              <option value="medium" selected>中</option>
              <option value="high">高</option>
            </select>
          </div>
          <div class="field">
            <label for="task-estimate">预计耗时（分钟）</label>
            <input id="task-estimate" name="estimate" type="number" min="1" max="1440" step="1" placeholder="25" />
            <p class="field-error" id="estimate-error" hidden></p>
          </div>
        </div>
        <div class="field">
          <label for="task-due">截止时间</label>
          <input id="task-due" name="dueAt" type="datetime-local" />
          <p class="field-error" id="due-error" hidden></p>
        </div>
        <label class="check-field">
          <input type="checkbox" name="completed" />
          <span>已完成</span>
        </label>
        <div class="dialog-actions">
          <button type="button" class="btn btn-ghost" data-action="close-dialog">取消</button>
          <button type="submit" class="btn btn-primary">保存任务</button>
        </div>
      </form>
    </dialog>
  `;
}

/* ---------- 交互 ---------- */

function openTaskDialog(task = null) {
  const dialog = document.querySelector("#task-dialog");
  if (!dialog) return;
  const form = dialog.querySelector("#task-form");

  state.editingId = task ? task.id : null;
  dialog.querySelector(".dialog-title").textContent = task ? "编辑任务" : "新增任务";
  form.elements.title.value = task ? task.title : "";
  form.elements.priority.value = task ? task.priority : "medium";
  form.elements.estimate.value = task ? String(task.estimateMinutes) : "";
  form.elements.dueAt.value = task ? toDatetimeLocalValue(task.dueAt) : "";
  form.elements.completed.checked = task ? task.completed : false;
  showFormErrors(form, {});

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
  form.elements.title.focus();
}

function closeTaskDialog() {
  const dialog = document.querySelector("#task-dialog");
  if (!dialog) return;
  if (typeof dialog.close === "function") {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
  }
  state.editingId = null;
}

function setCompleted(id, checked) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;
  task.completed = checked;
  persist();
  render();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((task) => task.id !== id);
  persist();
  if (state.tasks.length === 0) {
    state.enteredWorkspace = false;
    state.view = "all";
  }
  render();
}

function handleDeleteClick(button, id) {
  if (button.dataset.armed === "1") {
    deleteTask(id);
    return;
  }
  button.dataset.armed = "1";
  button.textContent = "确认删除";
  button.classList.add("armed");
  window.setTimeout(() => {
    if (button.isConnected && button.dataset.armed === "1") {
      delete button.dataset.armed;
      button.textContent = "✕";
      button.classList.remove("armed");
    }
  }, 3000);
}

function validateTaskForm(form) {
  const errors = {};
  const title = form.elements.title.value.trim();
  const estimate = form.elements.estimate.value;
  const dueAt = form.elements.dueAt.value;

  if (!title) errors.title = "请输入任务标题";
  else if (title.length > 80) errors.title = "标题不能超过 80 个字符";

  const estimateNumber = Number(estimate);
  if (estimate === "" || !Number.isInteger(estimateNumber) || estimateNumber < 1 || estimateNumber > 1440) {
    errors.estimate = "请输入 1–1440 的整数分钟数";
  }

  if (!dueAt) errors.dueAt = "请选择截止时间";
  else if (Number.isNaN(new Date(dueAt).getTime())) errors.dueAt = "截止时间无效";

  return errors;
}

function showFormErrors(form, errors) {
  for (const key of ["title", "estimate", "dueAt"]) {
    const errorEl = form.querySelector(`#${key}-error`);
    if (!errorEl) continue;
    if (errors[key]) {
      errorEl.textContent = errors[key];
      errorEl.hidden = false;
      form.elements[key].setAttribute("aria-invalid", "true");
    } else {
      errorEl.textContent = "";
      errorEl.hidden = true;
      form.elements[key].removeAttribute("aria-invalid");
    }
  }
}

function readTaskForm(form) {
  return {
    title: form.elements.title.value.trim(),
    priority: form.elements.priority.value,
    estimateMinutes: Number(form.elements.estimate.value),
    dueAt: new Date(form.elements.dueAt.value).getTime(),
    completed: form.elements.completed.checked,
  };
}

function handleTaskSubmit(event) {
  const form = event.target.closest("#task-form");
  if (!form) return;
  event.preventDefault();

  const errors = validateTaskForm(form);
  showFormErrors(form, errors);
  if (Object.keys(errors).length > 0) return;

  const data = readTaskForm(form);
  if (state.editingId) {
    const existing = state.tasks.find((task) => task.id === state.editingId);
    if (existing) Object.assign(existing, data);
  } else {
    state.tasks.push({ ...data, id: createId(), createdAt: Date.now() });
  }

  state.editingId = null;
  state.enteredWorkspace = true;
  persist();
  closeTaskDialog();
  render();
}

function handleClick(event) {
  const trigger = event.target.closest("[data-action]");
  if (!trigger) return;
  const action = trigger.dataset.action;
  const id = trigger.dataset.id;

  switch (action) {
    case "open-create":
      openTaskDialog();
      break;
    case "enter-workspace":
      state.enteredWorkspace = true;
      render();
      break;
    case "view-all":
      state.view = "all";
      render();
      break;
    case "view-plan":
      state.view = "plan";
      render();
      break;
    case "edit": {
      const task = state.tasks.find((item) => item.id === id);
      if (task) openTaskDialog(task);
      break;
    }
    case "delete":
      handleDeleteClick(trigger, id);
      break;
    case "toggle-complete":
      setCompleted(id, trigger.checked);
      break;
    case "close-dialog":
      closeTaskDialog();
      break;
    default:
      break;
  }
}

app.addEventListener("click", handleClick);
app.addEventListener("click", (event) => {
  const dialog = event.target.closest("dialog");
  if (dialog && event.target === dialog) closeTaskDialog();
});
app.addEventListener("submit", handleTaskSubmit);

render();
