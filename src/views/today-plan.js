import { getPriorityLabel, getPriorityClass, formatDuration } from '../utils.js';

export function renderTodayPlan(plan, { onRegenerate }) {
  const app = document.querySelector('#app');
  
  if (!plan || (plan.scheduledTasks.length === 0 && plan.unscheduledTasks.length === 0)) {
    app.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <h2>今日暂无计划</h2>
        <p>添加一些任务，然后生成今日计划</p>
        <button class="btn btn-primary" id="regenerate-plan">生成计划</button>
      </div>
    `;
    
    const regenerateButton = document.querySelector('#regenerate-plan');
    if (regenerateButton) {
      regenerateButton.addEventListener('click', onRegenerate);
    }
    return;
  }
  
  app.innerHTML = `
    <div class="plan-container">
      <div class="plan-header">
        <h2>今日计划</h2>
        <div class="plan-summary">
          <span class="plan-date">${plan.date}</span>
          <span class="plan-total">已安排 ${formatDuration(plan.totalMinutes)}</span>
          <button class="btn btn-secondary" id="regenerate-plan">重新生成</button>
        </div>
      </div>
      
      ${plan.scheduledTasks.length > 0 ? `
        <div class="plan-section">
          <h3>执行顺序</h3>
          <div class="plan-tasks">
            ${plan.scheduledTasks.map((task, index) => `
              <div class="plan-task-card" data-task-id="${task.id}">
                <div class="plan-task-order">${index + 1}</div>
                <div class="plan-task-content">
                  <h4 class="plan-task-title">${task.title}</h4>
                  <div class="plan-task-meta">
                    <span class="task-priority ${getPriorityClass(task.priority)}">
                      ${getPriorityLabel(task.priority)}
                    </span>
                    <span class="task-duration">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      ${formatDuration(task.duration)}
                    </span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      ${plan.unscheduledTasks.length > 0 ? `
        <div class="plan-section unscheduled">
          <h3>未安排任务</h3>
          <div class="plan-tasks">
            ${plan.unscheduledTasks.map(item => `
              <div class="plan-task-card unscheduled" data-task-id="${item.taskId}">
                <div class="plan-task-content">
                  <h4 class="plan-task-title">${item.taskTitle}</h4>
                  <div class="plan-task-meta">
                    <span class="unscheduled-reason">${item.reason}</span>
                    <span class="task-priority ${getPriorityClass(item.task.priority)}">
                      ${getPriorityLabel(item.task.priority)}
                    </span>
                    <span class="task-duration">
                      ${formatDuration(item.task.duration)}
                    </span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
  
  // 绑定事件
  const regenerateButton = document.querySelector('#regenerate-plan');
  if (regenerateButton) {
    regenerateButton.addEventListener('click', onRegenerate);
  }
}