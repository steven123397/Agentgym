import { generateId } from './utils.js';
import * as store from './store.js';

// 创建新任务
export function createTask(taskData) {
  const task = {
    id: generateId(),
    title: taskData.title || '',
    priority: taskData.priority || 'medium',
    duration: taskData.duration || 30,
    deadline: taskData.deadline || new Date().toISOString(),
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  return store.addTask(task);
}

// 更新任务
export function updateTask(id, updates) {
  return store.updateTask(id, updates);
}

// 删除任务
export function deleteTask(id) {
  return store.deleteTask(id);
}

// 切换任务完成状态
export function toggleTaskCompletion(id) {
  const tasks = store.getTasks();
  const task = tasks.find(t => t.id === id);
  if (task) {
    return store.updateTask(id, { completed: !task.completed });
  }
  return null;
}

// 获取所有任务
export function getAllTasks() {
  return store.getTasks();
}

// 获取未完成任务
export function getPendingTasks() {
  return store.getTasks().filter(t => !t.completed);
}

// 获取已完成任务
export function getCompletedTasks() {
  return store.getTasks().filter(t => t.completed);
}

// 检查是否有任务
export function hasTasks() {
  return store.getTasks().length > 0;
}

// 验证任务数据
export function validateTask(taskData) {
  const errors = [];
  
  if (!taskData.title || taskData.title.trim() === '') {
    errors.push('任务标题不能为空');
  }
  
  if (taskData.title && taskData.title.length > 100) {
    errors.push('任务标题不能超过100个字符');
  }
  
  if (!taskData.duration || taskData.duration <= 0) {
    errors.push('预计耗时必须大于0');
  }
  
  if (taskData.duration > 480) {
    errors.push('预计耗时不能超过8小时');
  }
  
  if (!taskData.deadline) {
    errors.push('截止时间不能为空');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}