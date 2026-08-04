// 生成唯一ID
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// 格式化日期为YYYY-MM-DD
export function formatDate(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

// 格式化日期时间为本地格式
export function formatDateTime(date) {
  return new Date(date).toLocaleString('zh-CN');
}

// 检查是否是今天
export function isToday(date) {
  const today = new Date();
  const d = new Date(date);
  return d.toDateString() === today.toDateString();
}

// 检查日期是否已过期
export function isPastDue(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

// 获取优先级标签
export function getPriorityLabel(priority) {
  const labels = {
    low: '低',
    medium: '中',
    high: '高'
  };
  return labels[priority] || priority;
}

// 获取优先级颜色类
export function getPriorityClass(priority) {
  return `priority-${priority}`;
}

// 格式化时长显示
export function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
}