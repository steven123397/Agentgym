export function renderWelcome(onCreateTask) {
  const app = document.querySelector('#app');
  
  app.innerHTML = `
    <div class="welcome-page">
      <div class="welcome-content">
        <div class="welcome-header">
          <div class="logo">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <h1 class="welcome-title">专注任务规划器</h1>
          <p class="welcome-subtitle">高效管理你的每日任务，智能生成执行计划</p>
        </div>
        
        <div class="welcome-features">
          <div class="feature-card">
            <div class="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <h3>时间管理</h3>
            <p>设置预计耗时，合理安排8小时工作预算</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h3>智能排序</h3>
            <p>根据优先级和截止时间自动排序任务</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <h3>今日计划</h3>
            <p>一键生成今日执行计划，明确优先级</p>
          </div>
        </div>
        
        <div class="welcome-actions">
          <button class="btn btn-primary btn-large" id="create-first-task">
            创建第一个任务
          </button>
          <p class="welcome-hint">开始规划你的专注时间</p>
        </div>
      </div>
      
      <div class="welcome-decoration">
        <div class="decoration-circle circle-1"></div>
        <div class="decoration-circle circle-2"></div>
        <div class="decoration-circle circle-3"></div>
      </div>
    </div>
  `;
  
  // 绑定事件
  const createButton = document.querySelector('#create-first-task');
  if (createButton) {
    createButton.addEventListener('click', onCreateTask);
  }
}