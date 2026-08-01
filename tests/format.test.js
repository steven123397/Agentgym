import assert from "node:assert/strict";
import test from "node:test";
import {
  escapeHtml,
  formatDueLabel,
  formatMinutes,
  formatPlanTime,
  formatTimeOfDay,
  toDatetimeLocalValue,
} from "../src/format.js";

test("escapeHtml 转义 HTML 特殊字符", () => {
  assert.equal(escapeHtml(`<script>&"'`), "&lt;script&gt;&amp;&quot;&#39;");
});

test("formatMinutes 输出中文时长", () => {
  assert.equal(formatMinutes(45), "45 分钟");
  assert.equal(formatMinutes(120), "2 小时");
  assert.equal(formatMinutes(90), "1 小时 30 分钟");
});

test("toDatetimeLocalValue 输出本地 datetime-local 值", () => {
  const d = new Date(2026, 0, 5, 9, 30);
  assert.equal(toDatetimeLocalValue(d), "2026-01-05T09:30");
});

test("formatDueLabel 标记逾期并区分今天/明天/更远日期", () => {
  const now = new Date(2026, 5, 15, 12, 0).getTime();

  const overdue = formatDueLabel(new Date(2026, 5, 15, 9, 0).getTime(), now);
  assert.equal(overdue.overdue, true);
  assert.match(overdue.text, /^今天/);

  const today = formatDueLabel(new Date(2026, 5, 15, 18, 0).getTime(), now);
  assert.equal(today.overdue, false);
  assert.match(today.text, /^今天/);

  const tomorrow = formatDueLabel(new Date(2026, 5, 16, 9, 0).getTime(), now);
  assert.match(tomorrow.text, /^明天/);

  const nextWeek = formatDueLabel(new Date(2026, 5, 22, 9, 0).getTime(), now);
  assert.match(nextWeek.text, /^6月22日/);
});

test("formatTimeOfDay 输出 HH:mm", () => {
  assert.equal(formatTimeOfDay(new Date(2026, 5, 15, 14, 5)), "14:05");
});

test("formatPlanTime 从 09:00 起按偏移累加", () => {
  const now = new Date(2026, 5, 15, 10, 0).getTime();
  assert.equal(formatPlanTime(now, 0), "09:00");
  assert.equal(formatPlanTime(now, 150), "11:30");
});
