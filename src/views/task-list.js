import { formatDateTime, getPriorityLabel, getPriorityClass, formatDuration } from '../utils.js';

export function renderTaskList(tasks, { onEdit, onDelete, onToggleComplete, onCreateTask }) {
  const app = document.querySelector('#app');
  
  if (tasks.length === 0) {
    app.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h2>暂无任务</h2>
        <p>创建你的第一个任务，开始规划专注时间</p>
        <button class="btn btn-primary" id="create-task-empty">创建任务</button>
      </div>
    `;
    
    const createButton = document.querySelector('#create-task-empty');
    if (createButton) {
      createButton.addEventListener('click', onCreateTask);
    }
    return;
  }
  
  app.innerHTML = `
    <div class="task-list-container">
      <div class="task-list-header">
        <h2>全部任务</h2>
        <button class="btn btn-primary" id="create-task">+ 新建任务</button>
      </div>
      
      <div class="task-list">
        ${tasks.map(task => `
          <div class="task-card ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
            <div class="task-checkbox">
              <input type="checkbox" ${task.completed ? 'checked' : ''} data-task-id="${task.id}">
              <span class="checkmark"></span>
            </div>
            
            <div class="task-content">
              <div class="task-header">
                <h3 class="task-title">${task.title}</h3>
                <span class="task-priority ${getPriorityClass(task.priority)}">
                  ${getPriorityLabel(task.priority)}
                </span>
              </div>
              
              <div class="task-meta">
                <span class="task-duration">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  ${formatDuration(task.duration)}
                </span>
                
                <span class="task-deadline">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  ${formatDateTime(task.deadline)}
                </span>
              </div>
            </div>
            
            <div class="task-actions">
              <button class="btn btn-icon btn-edit" data-task-id="${task.id}" title="编辑">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="btn btn-icon btn-delete" data-task-id="${task.id}" title="删除">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  // 绑定事件
  const createButton = document.querySelector('#create-task');
  if (createButton) {
    createButton.addEventListener('click', onCreateTask);
  }
  
  // 绑定复选框事件
  document.querySelectorAll('.task-checkbox input').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const taskId = e.target.dataset.taskId;
      onToggleComplete(taskId);
    });
  });
  
  // 绑定编辑按钮事件
  document.querySelectorAll('.btn-edit').forEach(button => {
    button.addEventListener('click', (e) => {
      const taskId = e.target.closest('.btn-edit').dataset.taskId;
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        onEdit(task);
      }
    });
  });
  
  // 绑定删除按钮事件
  document.querySelectorAll('.btn-delete').forEach(button => {
    button.addEventListener('click', (e) => {
      const taskId = e.target.closest('.btn-delete').dataset.taskId;
      if (confirm('确定要删除这个任务吗？')) {
        onDelete(taskId);
      }
    });
  });
}