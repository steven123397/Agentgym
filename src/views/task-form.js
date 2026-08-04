import { formatDate } from '../utils.js';

export function renderTaskForm(task = null, { onSave, onCancel }) {
  const isEditing = !!task;
  const title = isEditing ? '编辑任务' : '新建任务';
  
  // 创建模态框
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2>${title}</h2>
        <button class="btn btn-icon modal-close" id="close-modal">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <form class="task-form" id="task-form">
        <div class="form-group">
          <label for="task-title">任务标题 *</label>
          <input 
            type="text" 
            id="task-title" 
            name="title" 
            value="${task?.title || ''}" 
            placeholder="输入任务标题"
            required
          >
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="task-priority">优先级</label>
            <select id="task-priority" name="priority">
              <option value="low" ${task?.priority === 'low' ? 'selected' : ''}>低</option>
              <option value="medium" ${task?.priority === 'medium' || !task ? 'selected' : ''}>中</option>
              <option value="high" ${task?.priority === 'high' ? 'selected' : ''}>高</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="task-duration">预计耗时（分钟）*</label>
            <input 
              type="number" 
              id="task-duration" 
              name="duration" 
              value="${task?.duration || 30}" 
              min="1" 
              max="480"
              required
            >
          </div>
        </div>
        
        <div class="form-group">
          <label for="task-deadline">截止时间 *</label>
          <input 
            type="datetime-local" 
            id="task-deadline" 
            name="deadline" 
            value="${task ? formatDate(task.deadline) : ''}"
            required
          >
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" id="cancel-btn">取消</button>
          <button type="submit" class="btn btn-primary">${isEditing ? '保存修改' : '创建任务'}</button>
        </div>
      </form>
    </div>
  `;
  
  // 添加到页面
  document.body.appendChild(modal);
  
  // 聚焦到标题输入框
  setTimeout(() => {
    const titleInput = modal.querySelector('#task-title');
    if (titleInput) titleInput.focus();
  }, 100);
  
  // 绑定事件
  const form = modal.querySelector('#task-form');
  const closeBtn = modal.querySelector('#close-modal');
  const cancelBtn = modal.querySelector('#cancel-btn');
  
  // 关闭模态框
  function closeModal() {
    modal.remove();
    onCancel();
  }
  
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  
  // 点击遮罩关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // ESC键关闭
  document.addEventListener('keydown', function handleEsc(e) {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEsc);
    }
  });
  
  // 表单提交
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const taskData = {
      title: formData.get('title').trim(),
      priority: formData.get('priority'),
      duration: parseInt(formData.get('duration'), 10),
      deadline: new Date(formData.get('deadline')).toISOString()
    };
    
    // 验证
    if (!taskData.title) {
      alert('请输入任务标题');
      return;
    }
    
    if (taskData.duration <= 0 || taskData.duration > 480) {
      alert('预计耗时必须在1-480分钟之间');
      return;
    }
    
    onSave(taskData);
    modal.remove();
  });
}