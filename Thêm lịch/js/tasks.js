/**
 * PlanSmart - Task / Schedule Management (CRUD & State)
 */

const TaskManager = {
  tasks: [],
  currentDomain: 'all', // 'all' | 'study' | 'personal_work'
  currentFilter: 'all',
  currentSort: 'smart',
  searchQuery: '',
  selectedCategory: null,
  activePriorityFilters: ['p1', 'p2', 'p3', 'p4'],

  init() {
    this.tasks = Storage.getTasks();
    this.renderCategoryFilters();
    this.bindEvents();
    this.render();
  },

  setDomain(domain) {
    this.currentDomain = domain;
    
    // Sync topbar pill buttons
    document.querySelectorAll('.domain-pill-btn').forEach(btn => {
      if (btn.dataset.domain === domain) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    // Sync sidebar domain buttons
    document.querySelectorAll('.domain-nav-btn').forEach(btn => {
      if (btn.dataset.domain === domain) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    this.render();
    if (typeof Calendar !== 'undefined') Calendar.render();
    if (typeof ProgressTracker !== 'undefined') ProgressTracker.render();
    if (typeof SmartScheduler !== 'undefined') SmartScheduler.render();
  },

  getAll() {
    const user = Auth.currentUser;
    if (!user) return [];
    return this.tasks.filter(t => t.userId === user.id);
  },

  getById(id) {
    return this.tasks.find(t => t.id === id);
  },

  add(taskData) {
    const user = Auth.currentUser;
    if (!user) {
      throw new Error('Vui lòng đăng nhập để thêm công việc.');
    }

    const newTask = {
      id: 'task_' + Date.now(),
      userId: user.id,
      domain: taskData.domain || (taskData.category === 'study' ? 'study' : 'personal_work'),
      title: taskData.title.trim(),
      description: taskData.description || '',
      subject: taskData.subject || '',
      studyType: taskData.studyType || 'lecture',
      room: taskData.room || '',
      teacher: taskData.teacher || '',
      date: taskData.date,
      time: taskData.time || '09:00',
      endDate: taskData.endDate || taskData.date,
      endTime: taskData.endTime || '10:00',
      priority: taskData.priority || 'p3',
      category: taskData.category || (taskData.domain === 'study' ? 'study' : 'work'),
      tags: taskData.tags || [],
      reminder: taskData.reminder || '15m',
      completed: false,
      createdAt: new Date().toISOString()
    };

    this.tasks.unshift(newTask);
    Storage.saveTasks(this.tasks);
    this.render();
    App.refreshAllViews();
    return newTask;
  },

  update(id, updatedFields) {
    const index = this.tasks.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Không tìm thấy công việc để cập nhật.');

    this.tasks[index] = {
      ...this.tasks[index],
      ...updatedFields,
      updatedAt: new Date().toISOString()
    };

    Storage.saveTasks(this.tasks);
    this.render();
    App.refreshAllViews();
    return this.tasks[index];
  },

  delete(id) {
    const index = this.tasks.findIndex(t => t.id === id);
    if (index === -1) return false;

    this.tasks.splice(index, 1);
    Storage.saveTasks(this.tasks);
    this.render();
    App.refreshAllViews();
    return true;
  },

  toggleComplete(id) {
    const task = this.getById(id);
    if (!task) return;

    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;

    Storage.saveTasks(this.tasks);
    this.render();
    App.refreshAllViews();

    if (task.completed) {
      App.playSuccessSound();
      App.showToast(`Tuyệt vời! Đã hoàn thành "${task.title}"`, 'success');
    } else {
      App.showToast(`Đã chuyển "${task.title}" về trạng thái chờ xử lý`, 'info');
    }
  },

  getFilteredAndSortedTasks() {
    let list = this.getAll();

    // Domain filter (all, study, personal_work)
    if (this.currentDomain !== 'all') {
      list = list.filter(t => (t.domain || (t.category === 'study' ? 'study' : 'personal_work')) === this.currentDomain);
    }

    // Priority filter checkboxes
    list = list.filter(t => this.activePriorityFilters.includes(t.priority));

    // Category filter
    if (this.selectedCategory) {
      list = list.filter(t => t.category === this.selectedCategory);
    }

    // Status / View filter
    const todayStr = App.getTodayString();
    if (this.currentFilter === 'pending') {
      list = list.filter(t => !t.completed);
    } else if (this.currentFilter === 'completed') {
      list = list.filter(t => t.completed);
    } else if (this.currentFilter === 'today') {
      list = list.filter(t => t.date === todayStr);
    }

    // Search query
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(t => {
        const titleMatch = t.title.toLowerCase().includes(q);
        const descMatch = (t.description || '').toLowerCase().includes(q);
        const tagMatch = (t.tags || []).some(tag => tag.toLowerCase().includes(q));
        return titleMatch || descMatch || tagMatch;
      });
    }

    // Sorting
    list.sort((a, b) => {
      // Completed items go to bottom by default
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      if (this.currentSort === 'smart') {
        const scoreA = SmartScheduler.calculatePriorityScore(a);
        const scoreB = SmartScheduler.calculatePriorityScore(b);
        return scoreB - scoreA;
      } else if (this.currentSort === 'priority-desc') {
        const order = { p1: 1, p2: 2, p3: 3, p4: 4 };
        return (order[a.priority] || 99) - (order[b.priority] || 99);
      } else if (this.currentSort === 'date-asc') {
        return (a.date + ' ' + a.time).localeCompare(b.date + ' ' + b.time);
      } else if (this.currentSort === 'date-desc') {
        return (b.date + ' ' + b.time).localeCompare(a.date + ' ' + a.time);
      } else if (this.currentSort === 'name-asc') {
        return a.title.localeCompare(b.title, 'vi');
      }
      return 0;
    });

    return list;
  },

  renderCategoryFilters() {
    const container = document.getElementById('categoryFilterList');
    if (!container) return;

    let html = `
      <button class="category-filter-item ${!this.selectedCategory ? 'active' : ''}" data-cat="">
        <span>Tất cả danh mục</span>
        <span class="badge">${this.getAll().length}</span>
      </button>
    `;

    Object.values(CATEGORIES).forEach(cat => {
      const count = this.getAll().filter(t => t.category === cat.id).length;
      html += `
        <button class="category-filter-item ${this.selectedCategory === cat.id ? 'active' : ''}" data-cat="${cat.id}">
          <span>${cat.icon} ${cat.label}</span>
          <span class="badge">${count}</span>
        </button>
      `;
    });

    container.innerHTML = html;

    // Attach listeners
    container.querySelectorAll('.category-filter-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.cat || null;
        this.selectedCategory = cat;
        this.renderCategoryFilters();
        this.render();
        App.refreshAllViews();
      });
    });
  },

  render() {
    const container = document.getElementById('tasksListContainer');
    const emptyState = document.getElementById('tasksEmptyState');
    if (!container) return;

    const filtered = this.getFilteredAndSortedTasks();
    const allUserTasks = this.getAll();
    const todayStr = App.getTodayString();

    // Update count badges
    const countAllEl = document.getElementById('countAll');
    const countPendingEl = document.getElementById('countPending');
    const countCompletedEl = document.getElementById('countCompleted');
    const countTodayEl = document.getElementById('countToday');
    const badgeTotalEvents = document.getElementById('badgeTotalEvents');
    const badgePendingTasks = document.getElementById('badgePendingTasks');

    const totalCount = allUserTasks.length;
    const pendingCount = allUserTasks.filter(t => !t.completed).length;
    const completedCount = allUserTasks.filter(t => t.completed).length;
    const todayCount = allUserTasks.filter(t => t.date === todayStr).length;

    if (countAllEl) countAllEl.textContent = totalCount;
    if (countPendingEl) countPendingEl.textContent = pendingCount;
    if (countCompletedEl) countCompletedEl.textContent = completedCount;
    if (countTodayEl) countTodayEl.textContent = todayCount;
    if (badgeTotalEvents) badgeTotalEvents.textContent = totalCount;
    if (badgePendingTasks) badgePendingTasks.textContent = pendingCount;

    // Domain stats update
    const studyTasks = allUserTasks.filter(t => (t.domain || (t.category === 'study' ? 'study' : 'personal_work')) === 'study');
    const personalTasks = allUserTasks.filter(t => (t.domain || (t.category === 'study' ? 'study' : 'personal_work')) === 'personal_work');

    const studyCountPill = document.getElementById('studyCountPill');
    const personalCountPill = document.getElementById('personalCountPill');
    const badgeStudyNav = document.getElementById('badgeStudyNav');
    const badgeWorkNav = document.getElementById('badgeWorkNav');
    const badgeAllCount = document.getElementById('badgeAllCount');

    if (studyCountPill) studyCountPill.textContent = studyTasks.filter(t => !t.completed).length;
    if (personalCountPill) personalCountPill.textContent = personalTasks.filter(t => !t.completed).length;
    if (badgeStudyNav) badgeStudyNav.textContent = studyTasks.filter(t => !t.completed).length;
    if (badgeWorkNav) badgeWorkNav.textContent = personalTasks.filter(t => !t.completed).length;
    if (badgeAllCount) badgeAllCount.textContent = allUserTasks.filter(t => !t.completed).length;

    // Quick Progress Bar
    const quickRatio = document.getElementById('quickCompletedRatio');
    const quickPercent = document.getElementById('quickPercent');
    const quickProgressBar = document.getElementById('quickProgressBar');
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    if (quickRatio) quickRatio.textContent = `${completedCount} / ${totalCount}`;
    if (quickPercent) quickPercent.textContent = `${pct}%`;
    if (quickProgressBar) quickProgressBar.style.width = `${pct}%`;

    if (filtered.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    container.innerHTML = filtered.map(task => {
      const pInfo = PRIORITIES[task.priority] || PRIORITIES.p3;
      const catInfo = CATEGORIES[task.category] || CATEGORIES.work;
      const isOverdue = !task.completed && (task.date < todayStr);

      const isStudy = (task.domain || (task.category === 'study' ? 'study' : 'personal_work')) === 'study';
      const studyTypeInfo = (isStudy && task.studyType && STUDY_TYPES[task.studyType]) ? STUDY_TYPES[task.studyType] : null;

      const domainBadgeHtml = isStudy
        ? `<span class="badge-domain badge-study"><i class="ph-bold ph-graduation-cap"></i> Lịch Học</span>`
        : `<span class="badge-domain badge-work"><i class="ph-bold ph-briefcase"></i> Việc Cá Nhân</span>`;

      const studyTypeBadgeHtml = studyTypeInfo
        ? `<span class="badge-study-type">${studyTypeInfo.icon} ${studyTypeInfo.label}</span>`
        : '';

      const subjectBadgeHtml = (isStudy && task.subject)
        ? `<span class="badge-subject"><i class="ph ph-book-open"></i> ${this.escapeHtml(task.subject)}</span>`
        : '';

      const tagsHtml = (task.tags || []).map(t => `<span class="task-tag">#${t}</span>`).join(' ');

      return `
        <div class="task-item-card ${task.completed ? 'completed' : ''} ${isStudy ? 'card-study' : 'card-work'}" data-task-id="${task.id}">
          <button class="task-check-btn" title="${task.completed ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}">
            <i class="ph-bold ph-check"></i>
          </button>

          <div class="task-body">
            <div class="task-header-line">
              ${domainBadgeHtml}
              ${studyTypeBadgeHtml}
              ${subjectBadgeHtml}
              <span class="badge-priority ${task.priority}">${pInfo.shortLabel}</span>
              ${!isStudy ? `<span class="badge-category">${catInfo.icon} ${catInfo.label}</span>` : ''}
              <h3 class="task-title">${this.escapeHtml(task.title)}</h3>
            </div>

            ${task.description ? `<p class="task-notes">${this.escapeHtml(task.description)}</p>` : ''}

            <div class="task-meta">
              <span class="task-meta-item ${isOverdue ? 'overdue' : ''}">
                <i class="ph ph-calendar-blank"></i>
                ${App.formatDisplayDate(task.date)} ${task.time ? `(${task.time})` : ''}
                ${isOverdue ? '<strong>[Quá hạn]</strong>' : ''}
              </span>
              ${task.endDate && task.endDate !== task.date ? `
                <span class="task-meta-item">
                  <i class="ph ph-hourglass-high"></i> Hạn: ${App.formatDisplayDate(task.endDate)}
                </span>
              ` : ''}
              ${isStudy && task.room ? `
                <span class="task-meta-item highlight-meta">
                  <i class="ph ph-door"></i> ${this.escapeHtml(task.room)}
                </span>
              ` : ''}
              ${isStudy && task.teacher ? `
                <span class="task-meta-item">
                  <i class="ph ph-chalkboard-teacher"></i> ${this.escapeHtml(task.teacher)}
                </span>
              ` : ''}
              ${task.reminder && task.reminder !== 'none' ? `
                <span class="task-meta-item task-reminder-pill" title="Hẹn giờ nhắc: ${task.reminder}">
                  <i class="ph-bold ph-bell-ringing"></i> Nhắc ${task.reminder}
                </span>
              ` : ''}
              <div class="task-tags-wrap">${tagsHtml}</div>
            </div>
          </div>

          <div class="task-item-actions">
            <button class="icon-btn edit-task-btn" title="Chỉnh sửa công việc">
              <i class="ph ph-pencil-simple"></i>
            </button>
            <button class="icon-btn delete-task-btn text-danger" title="Xóa công việc">
              <i class="ph ph-trash"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.bindItemActions(container);
  },

  bindItemActions(container) {
    // Check complete
    container.querySelectorAll('.task-check-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.task-item-card');
        const id = card.dataset.taskId;
        this.toggleComplete(id);
      });
    });

    // Edit button
    container.querySelectorAll('.edit-task-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.task-item-card');
        const id = card.dataset.taskId;
        this.openEditModal(id);
      });
    });

    // Delete button
    container.querySelectorAll('.delete-task-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.task-item-card');
        const id = card.dataset.taskId;
        const task = this.getById(id);
        if (confirm(`Bạn có chắc chắn muốn xóa "${task ? task.title : 'công việc này'}" không?`)) {
          this.delete(id);
          App.showToast('Đã xóa công việc.', 'info');
        }
      });
    });

    // Click card to edit directly
    container.querySelectorAll('.task-item-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const id = card.dataset.taskId;
        this.openEditModal(id);
      });
    });
  },

  openEditModal(id) {
    const task = this.getById(id);
    if (!task) return;

    const modal = document.getElementById('taskModal');
    const title = document.getElementById('taskModalTitle');
    const formId = document.getElementById('taskFormId');
    const titleInput = document.getElementById('taskTitleInput');
    const descInput = document.getElementById('taskDescInput');
    const dateInput = document.getElementById('taskDateInput');
    const timeInput = document.getElementById('taskTimeInput');
    const endDateInput = document.getElementById('taskEndDateInput');
    const endTimeInput = document.getElementById('taskEndTimeInput');
    const catSelect = document.getElementById('taskCategorySelect');
    const tagsInput = document.getElementById('taskTagsInput');
    const formCompletedGroup = document.getElementById('formCompletedGroup');
    const taskCompletedCheck = document.getElementById('taskCompletedCheck');
    const btnDeleteInModal = document.getElementById('btnDeleteTaskInModal');

    title.textContent = 'Chỉnh Sửa Công Việc / Lịch Trình';
    formId.value = task.id;
    titleInput.value = task.title;
    descInput.value = task.description || '';
    dateInput.value = task.date;
    timeInput.value = task.time || '09:00';
    endDateInput.value = task.endDate || task.date;
    endTimeInput.value = task.endTime || '10:00';
    catSelect.value = task.category || 'work';
    tagsInput.value = (task.tags || []).join(', ');

    // Domain and Study fields
    const domain = task.domain || (task.category === 'study' ? 'study' : 'personal_work');
    const domainRadio = document.querySelector(`input[name="taskDomainRadio"][value="${domain}"]`);
    if (domainRadio) domainRadio.checked = true;

    const studyContainer = document.getElementById('studyFieldsContainer');
    if (studyContainer) studyContainer.style.display = domain === 'study' ? 'block' : 'none';

    const subjectInput = document.getElementById('studySubjectInput');
    const studyTypeSelect = document.getElementById('studyTypeSelect');
    const roomInput = document.getElementById('studyRoomInput');
    const teacherInput = document.getElementById('studyTeacherInput');

    if (subjectInput) subjectInput.value = task.subject || '';
    if (studyTypeSelect) studyTypeSelect.value = task.studyType || 'lecture';
    if (roomInput) roomInput.value = task.room || '';
    if (teacherInput) teacherInput.value = task.teacher || '';

    // Set reminder
    const reminderSelect = document.getElementById('taskReminderSelect');
    if (reminderSelect) reminderSelect.value = task.reminder || '15m';

    // Set priority radio
    const radio = document.querySelector(`input[name="priorityRadio"][value="${task.priority}"]`);
    if (radio) radio.checked = true;

    // Show completed checkbox in edit mode
    if (formCompletedGroup) formCompletedGroup.style.display = 'block';
    if (taskCompletedCheck) taskCompletedCheck.checked = !!task.completed;
    if (btnDeleteInModal) {
      btnDeleteInModal.style.display = 'inline-flex';
      btnDeleteInModal.onclick = () => {
        if (confirm(`Bạn có chắc muốn xóa "${task.title}" không?`)) {
          this.delete(task.id);
          modal.classList.remove('active');
          App.showToast('Đã xóa công việc thành công.', 'info');
        }
      };
    }

    modal.classList.add('active');
  },

  openCreateModal(initialDate = null) {
    const modal = document.getElementById('taskModal');
    const form = document.getElementById('taskForm');
    const title = document.getElementById('taskModalTitle');
    const formId = document.getElementById('taskFormId');
    const dateInput = document.getElementById('taskDateInput');
    const endDateInput = document.getElementById('taskEndDateInput');
    const reminderSelect = document.getElementById('taskReminderSelect');
    const formCompletedGroup = document.getElementById('formCompletedGroup');
    const btnDeleteInModal = document.getElementById('btnDeleteTaskInModal');

    form.reset();
    formId.value = '';
    title.textContent = 'Thêm Lịch Trình / Công Việc Mới';

    const defaultDate = initialDate || App.getTodayString();
    dateInput.value = defaultDate;
    endDateInput.value = defaultDate;

    // Default domain based on current view
    const defaultDomain = this.currentDomain === 'study' ? 'study' : 'personal_work';
    const domainRadio = document.querySelector(`input[name="taskDomainRadio"][value="${defaultDomain}"]`);
    if (domainRadio) domainRadio.checked = true;

    const studyContainer = document.getElementById('studyFieldsContainer');
    if (studyContainer) studyContainer.style.display = defaultDomain === 'study' ? 'block' : 'none';

    const titleLabel = document.getElementById('taskTitleLabel');
    const titleInput = document.getElementById('taskTitleInput');
    if (defaultDomain === 'study') {
      if (titleLabel) titleLabel.textContent = 'Tiêu đề buổi học / Bài tập';
      if (titleInput) titleInput.placeholder = 'Ví dụ: Học Lập trình Web Nâng cao...';
    } else {
      if (titleLabel) titleLabel.textContent = 'Tiêu đề công việc / Sự kiện';
      if (titleInput) titleInput.placeholder = 'Ví dụ: Họp báo cáo tiến độ quý 4...';
    }

    if (reminderSelect) reminderSelect.value = '15m';

    // Default priority p1 or p2
    const defaultPriorityRadio = document.querySelector('input[name="priorityRadio"][value="p1"]');
    if (defaultPriorityRadio) defaultPriorityRadio.checked = true;

    if (formCompletedGroup) formCompletedGroup.style.display = 'none';
    if (btnDeleteInModal) btnDeleteInModal.style.display = 'none';

    modal.classList.add('active');
  },

  bindEvents() {
    // Task modal close buttons
    const taskModal = document.getElementById('taskModal');
    const closeTaskModalBtn = document.getElementById('closeTaskModalBtn');
    const btnCancelTaskModal = document.getElementById('btnCancelTaskModal');

    if (closeTaskModalBtn) closeTaskModalBtn.addEventListener('click', () => taskModal.classList.remove('active'));
    if (btnCancelTaskModal) btnCancelTaskModal.addEventListener('click', () => taskModal.classList.remove('active'));

    // Domain Radio toggle in Form
    document.querySelectorAll('input[name="taskDomainRadio"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const val = e.target.value;
        const studyContainer = document.getElementById('studyFieldsContainer');
        const titleLabel = document.getElementById('taskTitleLabel');
        const titleInput = document.getElementById('taskTitleInput');
        if (val === 'study') {
          if (studyContainer) studyContainer.style.display = 'block';
          if (titleLabel) titleLabel.textContent = 'Tiêu đề buổi học / Bài tập';
          if (titleInput) titleInput.placeholder = 'Ví dụ: Học Lập trình Web Nâng cao...';
        } else {
          if (studyContainer) studyContainer.style.display = 'none';
          if (titleLabel) titleLabel.textContent = 'Tiêu đề công việc / Sự kiện';
          if (titleInput) titleInput.placeholder = 'Ví dụ: Họp báo cáo tiến độ quý 4...';
        }
      });
    });

    // Domain Switchers (Topbar pills & Sidebar items)
    document.querySelectorAll('.domain-pill-btn, .domain-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const domain = btn.dataset.domain;
        if (domain) this.setDomain(domain);
      });
    });

    // Add buttons
    const sidebarAddTaskBtn = document.getElementById('sidebarAddTaskBtn');
    const btnAddTaskFromList = document.getElementById('btnAddTaskFromList');
    const emptyStateAddBtn = document.getElementById('emptyStateAddBtn');
    const btnQuickAddCal = document.getElementById('btnQuickAddCal');

    if (sidebarAddTaskBtn) sidebarAddTaskBtn.addEventListener('click', () => this.openCreateModal());
    if (btnAddTaskFromList) btnAddTaskFromList.addEventListener('click', () => this.openCreateModal());
    if (emptyStateAddBtn) emptyStateAddBtn.addEventListener('click', () => this.openCreateModal());
    if (btnQuickAddCal) btnQuickAddCal.addEventListener('click', () => this.openCreateModal());

    // Task Form Submit (Create or Update)
    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
      taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('taskFormId').value;
        const title = document.getElementById('taskTitleInput').value;
        const desc = document.getElementById('taskDescInput').value;
        const date = document.getElementById('taskDateInput').value;
        const time = document.getElementById('taskTimeInput').value;
        const endDate = document.getElementById('taskEndDateInput').value || date;
        const endTime = document.getElementById('taskEndTimeInput').value || time;
        const category = document.getElementById('taskCategorySelect').value;
        const rawTags = document.getElementById('taskTagsInput').value;
        const tags = rawTags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

        const domainRadio = document.querySelector('input[name="taskDomainRadio"]:checked');
        const domain = domainRadio ? domainRadio.value : 'personal_work';

        const subject = document.getElementById('studySubjectInput')?.value || '';
        const studyType = document.getElementById('studyTypeSelect')?.value || 'lecture';
        const room = document.getElementById('studyRoomInput')?.value || '';
        const teacher = document.getElementById('studyTeacherInput')?.value || '';

        const priorityRadio = document.querySelector('input[name="priorityRadio"]:checked');
        const priority = priorityRadio ? priorityRadio.value : 'p3';

        const reminderSelect = document.getElementById('taskReminderSelect');
        const reminder = reminderSelect ? reminderSelect.value : '15m';

        const completedCheck = document.getElementById('taskCompletedCheck');
        const completed = completedCheck ? completedCheck.checked : false;

        try {
          if (id) {
            // Edit existing
            this.update(id, {
              title,
              description: desc,
              domain,
              subject,
              studyType,
              room,
              teacher,
              date,
              time,
              endDate,
              endTime,
              category: domain === 'study' ? 'study' : category,
              tags,
              priority,
              reminder,
              completed,
              completedAt: completed ? (this.getById(id).completedAt || new Date().toISOString()) : null
            });
            App.showToast('Cập nhật lịch trình thành công!', 'success');
          } else {
            // Create new
            this.add({
              title,
              description: desc,
              domain,
              subject,
              studyType,
              room,
              teacher,
              date,
              time,
              endDate,
              endTime,
              category: domain === 'study' ? 'study' : category,
              tags,
              priority,
              reminder
            });
            App.showToast(domain === 'study' ? 'Thêm lịch học mới thành công!' : 'Thêm công việc mới thành công!', 'success');
          }
          taskModal.classList.remove('active');
          if (typeof ReminderService !== 'undefined') {
            ReminderService.checkUpcomingTasks();
          }
        } catch (err) {
          App.showToast(err.message, 'danger');
        }
      });
    }

    // Filter pills (all, pending, completed, today)
    const filterPills = document.querySelectorAll('.filter-pill');
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.currentFilter = pill.dataset.filter;
        this.render();
      });
    });

    // Sort select
    const taskSortSelect = document.getElementById('taskSortSelect');
    if (taskSortSelect) {
      taskSortSelect.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.render();
      });
    }

    // Priority filter checkboxes in sidebar
    const priorityCheckboxes = document.querySelectorAll('.priority-filter-cb');
    priorityCheckboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        this.activePriorityFilters = Array.from(priorityCheckboxes)
          .filter(c => c.checked)
          .map(c => c.value);
        this.render();
        App.refreshAllViews();
      });
    });

    // Global Search Input
    const searchInput = document.getElementById('globalSearchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        if (clearSearchBtn) {
          clearSearchBtn.style.display = this.searchQuery ? 'block' : 'none';
        }
        this.render();
      });
    }
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        this.searchQuery = '';
        clearSearchBtn.style.display = 'none';
        this.render();
      });
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};
