import { WORKDAY_START_MINUTES } from "./planner.js";

const pad = (n) => String(n).padStart(2, "0");

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatMinutes(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins} 分钟`;
  if (mins === 0) return `${hours} 小时`;
  return `${hours} 小时 ${mins} 分钟`;
}

export function toDatetimeLocalValue(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function startOfDay(ms) {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function formatDueLabel(dueAt, now = Date.now()) {
  const due = new Date(dueAt);
  const overdue = dueAt < now;
  const dayDiff = Math.round((startOfDay(dueAt) - startOfDay(now)) / 86400000);
  const time = `${pad(due.getHours())}:${pad(due.getMinutes())}`;

  let datePart;
  if (dayDiff === 0) datePart = "今天";
  else if (dayDiff === 1) datePart = "明天";
  else if (dayDiff === -1) datePart = "昨天";
  else datePart = `${due.getMonth() + 1}月${due.getDate()}日`;

  return { text: `${datePart} ${time}`, overdue };
}

export function formatTimeOfDay(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatPlanTime(now, offsetMinutes) {
  const base = new Date(now);
  const dayStart = new Date(base.getFullYear(), base.getMonth(), base.getDate()).getTime();
  const target = new Date(dayStart + (WORKDAY_START_MINUTES + offsetMinutes) * 60000);
  return `${pad(target.getHours())}:${pad(target.getMinutes())}`;
}
