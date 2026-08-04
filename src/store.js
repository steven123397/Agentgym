const STORAGE_KEYS = {
  TASKS: 'focus-planner-tasks',
  LAST_PLAN_DATE: 'focus-planner-last-plan-date'
};

// 检查localStorage是否可用
function isStorageAvailable() {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

// 获取所有任务
export function getTasks() {
  if (!isStorageAvailable()) {
    console.warn('localStorage不可用，使用内存存储');
    return window._memoryTasks || [];
  }
  
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TASKS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('读取任务失败:', e);
    return [];
  }
}

// 保存所有任务
export function saveTasks(tasks) {
  if (!isStorageAvailable()) {
    window._memoryTasks = tasks;
    return;
  }
  
  try {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  } catch (e) {
    console.error('保存任务失败:', e);
  }
}

// 添加任务
export function addTask(task) {
  const tasks = getTasks();
  tasks.push(task);
  saveTasks(tasks);
  return task;
}

// 更新任务
export function updateTask(id, updates) {
  const tasks = getTasks();
  const index = tasks.findIndex(t => t.id === id);
  if (index !== -1) {
    tasks[index] = { ...tasks[index], ...updates, updatedAt: new Date().toISOString() };
    saveTasks(tasks);
    return tasks[index];
  }
  return null;
}

// 删除任务
export function deleteTask(id) {
  const tasks = getTasks();
  const filteredTasks = tasks.filter(t => t.id !== id);
  saveTasks(filteredTasks);
  return filteredTasks.length < tasks.length;
}

// 获取上次计划日期
export function getLastPlanDate() {
  if (!isStorageAvailable()) {
    return window._memoryLastPlanDate || null;
  }
  
  return localStorage.getItem(STORAGE_KEYS.LAST_PLAN_DATE);
}

// 设置上次计划日期
export function setLastPlanDate(date) {
  if (!isStorageAvailable()) {
    window._memoryLastPlanDate = date;
    return;
  }
  
  localStorage.setItem(STORAGE_KEYS.LAST_PLAN_DATE, date);
}

// 清除所有数据
export function clearAll() {
  if (!isStorageAvailable()) {
    window._memoryTasks = [];
    window._memoryLastPlanDate = null;
    return;
  }
  
  localStorage.removeItem(STORAGE_KEYS.TASKS);
  localStorage.removeItem(STORAGE_KEYS.LAST_PLAN_DATE);
}