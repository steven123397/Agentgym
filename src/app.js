import * as taskManager from './task-manager.js';
import * as planner from './planner.js';
import { renderWelcome } from './views/welcome.js';
import { renderTaskList } from './views/task-list.js';
import { renderTaskForm } from './views/task-form.js';
import { renderTodayPlan } from './views/today-plan.js';

class App {
  constructor() {
    this.currentView = 'tasks'; // 'tasks' or 'plan'
    this.init();
  }
  
  init() {
    this.render();
    this.setupNavigation();
  }
  
  render() {
    const hasTasks = taskManager.hasTasks();
    
    if (!hasTasks) {
      this.showWelcome();
    } else if (this.currentView === 'tasks') {
      this.showTaskList();
    } else {
      this.showTodayPlan();
    }
  }
  
  showWelcome() {
    renderWelcome(() => this.showCreateTaskForm());
  }
  
  showTaskList() {
    const tasks = taskManager.getAllTasks();
    renderTaskList(tasks, {
      onEdit: (task) => this.showEditTaskForm(task),
      onDelete: (taskId) => this.handleDeleteTask(taskId),
      onToggleComplete: (taskId) => this.handleToggleComplete(taskId),
      onCreateTask: () => this.showCreateTaskForm()
    });
  }
  
  showTodayPlan() {
    const plan = planner.getTodayPlanWithDetails();
    renderTodayPlan(plan, {
      onRegenerate: () => this.showTodayPlan()
    });
  }
  
  showCreateTaskForm() {
    renderTaskForm(null, {
      onSave: (taskData) => this.handleCreateTask(taskData),
      onCancel: () => this.render()
    });
  }
  
  showEditTaskForm(task) {
    renderTaskForm(task, {
      onSave: (taskData) => this.handleUpdateTask(task.id, taskData),
      onCancel: () => this.render()
    });
  }
  
  handleCreateTask(taskData) {
    const validation = taskManager.validateTask(taskData);
    if (!validation.valid) {
      alert(validation.errors.join('\n'));
      return;
    }
    
    taskManager.createTask(taskData);
    this.currentView = 'tasks';
    this.render();
  }
  
  handleUpdateTask(taskId, taskData) {
    const validation = taskManager.validateTask(taskData);
    if (!validation.valid) {
      alert(validation.errors.join('\n'));
      return;
    }
    
    taskManager.updateTask(taskId, taskData);
    this.render();
  }
  
  handleDeleteTask(taskId) {
    taskManager.deleteTask(taskId);
    
    // 检查是否还有任务
    if (!taskManager.hasTasks()) {
      this.currentView = 'tasks';
    }
    
    this.render();
  }
  
  handleToggleComplete(taskId) {
    taskManager.toggleTaskCompletion(taskId);
    this.render();
  }
  
  setupNavigation() {
    // 添加导航栏
    const nav = document.createElement('nav');
    nav.className = 'main-nav';
    nav.innerHTML = `
      <div class="nav-brand">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
          <path d="M2 17l10 5 10-5"></path>
          <path d="M2 12l10 5 10-5"></path>
        </svg>
        <span>专注任务规划器</span>
      </div>
      <div class="nav-links">
        <button class="nav-link active" data-view="tasks">全部任务</button>
        <button class="nav-link" data-view="plan">今日计划</button>
      </div>
    `;
    
    document.body.insertBefore(nav, document.body.firstChild);
    
    // 绑定导航事件
    nav.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const view = e.target.dataset.view;
        this.switchView(view);
      });
    });
  }
  
  switchView(view) {
    this.currentView = view;
    
    // 更新导航状态
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.view === view);
    });
    
    this.render();
  }
}

// 初始化应用
export function initApp() {
  new App();
}