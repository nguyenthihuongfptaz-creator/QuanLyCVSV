/**
 * PlanSmart - Calendar Engine (Month, Week, Day Views)
 */

const Calendar = {
  currentDate: new Date(2026, 9, 12), // October 12, 2026 (matching system date)
  selectedDate: new Date(2026, 9, 12),
  viewMode: 'month', // 'month' | 'week' | 'day'

  init() {
    this.bindEvents();
    this.render();
  },

  render() {
    this.updateHeaderLabel();

    const monthWrapper = document.getElementById('monthViewWrapper');
    const weekWrapper = document.getElementById('weekViewWrapper');
    const dayWrapper = document.getElementById('dayViewWrapper');

    if (this.viewMode === 'month') {
      if (monthWrapper) monthWrapper.style.display = 'block';
      if (weekWrapper) weekWrapper.style.display = 'none';
      if (dayWrapper) dayWrapper.style.display = 'none';
      this.renderMonthView();
    } else if (this.viewMode === 'week') {
      if (monthWrapper) monthWrapper.style.display = 'none';
      if (weekWrapper) weekWrapper.style.display = 'flex';
      if (dayWrapper) dayWrapper.style.display = 'none';
      this.renderWeekView();
    } else if (this.viewMode === 'day') {
      if (monthWrapper) monthWrapper.style.display = 'none';
      if (weekWrapper) weekWrapper.style.display = 'none';
      if (dayWrapper) dayWrapper.style.display = 'block';
      this.renderDayView();
    }
  },

  updateHeaderLabel() {
    const label = document.getElementById('calCurrentMonthYear');
    if (!label) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth() + 1;

    if (this.viewMode === 'month') {
      label.textContent = `Tháng ${month}, ${year}`;
    } else if (this.viewMode === 'week') {
      const weekStart = this.getStartOfWeek(this.currentDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      label.textContent = `${weekStart.getDate()}/${weekStart.getMonth() + 1} - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}, ${year}`;
    } else if (this.viewMode === 'day') {
      const options = { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' };
      label.textContent = this.currentDate.toLocaleDateString('vi-VN', options);
    }
  },

  renderMonthView() {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday as first day of week (0: Sun -> 6: Sat in JS)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday is 6th offset from Monday

    const totalDays = lastDayOfMonth.getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    let daysHtml = '';
    const todayStr = App.getTodayString();

    // Previous month padding days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = this.formatDateIso(prevDate);
      daysHtml += this.renderDayCell(prevDate, dateStr, dayNum, true, false);
    }

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      const dateStr = this.formatDateIso(date);
      const isToday = dateStr === todayStr;
      daysHtml += this.renderDayCell(date, dateStr, day, false, isToday);
    }

    // Next month padding days to complete 35 or 42 cells grid
    const totalCells = startDayOfWeek + totalDays;
    const remainingCells = totalCells > 35 ? (42 - totalCells) : (35 - totalCells);

    for (let day = 1; day <= remainingCells; day++) {
      const nextDate = new Date(year, month + 1, day);
      const dateStr = this.formatDateIso(nextDate);
      daysHtml += this.renderDayCell(nextDate, dateStr, day, true, false);
    }

    grid.innerHTML = daysHtml;
    this.bindCellEvents(grid);
  },

  renderDayCell(date, dateStr, dayNumber, isOtherMonth, isToday) {
    let tasks = TaskManager.getAll().filter(t => t.date === dateStr);
    
    // Domain filter (all, study, personal_work)
    if (TaskManager.currentDomain !== 'all') {
      tasks = tasks.filter(t => (t.domain || (t.category === 'study' ? 'study' : 'personal_work')) === TaskManager.currentDomain);
    }

    // Priority filter applied to calendar too
    const filteredTasks = tasks.filter(t => TaskManager.activePriorityFilters.includes(t.priority));

    const eventsHtml = filteredTasks.slice(0, 3).map(task => {
      const pClass = task.priority;
      const isStudy = (task.domain || (task.category === 'study' ? 'study' : 'personal_work')) === 'study';
      const hasReminder = task.reminder && task.reminder !== 'none';
      return `
        <div class="event-pill ${pClass} ${isStudy ? 'pill-study' : 'pill-work'} ${task.completed ? 'completed' : ''}" 
             data-task-id="${task.id}" 
             title="${task.title} (${task.time || ''}${hasReminder ? ' - Nhắc ' + task.reminder : ''}${isStudy && task.room ? ' - ' + task.room : ''})">
          ${isStudy ? '<i class="ph-bold ph-graduation-cap" style="font-size: 10px; flex-shrink: 0; color: #06b6d4;"></i>' : ''}
          ${hasReminder ? '<i class="ph-bold ph-bell" style="font-size: 10px; flex-shrink: 0;"></i>' : ''}
          <span>${task.time ? task.time + ' ' : ''}${TaskManager.escapeHtml(task.title)}</span>
        </div>
      `;
    }).join('');

    const moreCount = filteredTasks.length - 3;
    const moreHtml = moreCount > 0 ? `<div style="font-size: 10px; color: var(--text-muted); font-weight: 700; margin-top: 2px;">+${moreCount} việc khác</div>` : '';

    return `
      <div class="cal-day-cell ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}" data-date="${dateStr}">
        <div class="day-cell-top">
          <span class="day-number">${dayNumber}</span>
          ${isToday ? '<span style="font-size: 10px; color: var(--primary); font-weight: 800;">Hôm nay</span>' : ''}
        </div>
        <div class="day-events-list">
          ${eventsHtml}
          ${moreHtml}
        </div>
      </div>
    `;
  },

  bindCellEvents(container) {
    // Click day cell to create task on this date
    container.querySelectorAll('.cal-day-cell').forEach(cell => {
      cell.addEventListener('click', (e) => {
        if (e.target.closest('.event-pill')) return;
        const dateStr = cell.dataset.date;
        TaskManager.openCreateModal(dateStr);
      });
    });

    // Click event pill to edit task
    container.querySelectorAll('.event-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = pill.dataset.taskId;
        TaskManager.openEditModal(taskId);
      });
    });
  },

  renderWeekView() {
    const headerGrid = document.getElementById('weekHeaderGrid');
    const colsContainer = document.getElementById('weekColumnsContainer');
    if (!headerGrid || !colsContainer) return;

    const startOfWeek = this.getStartOfWeek(this.currentDate);
    const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
    const todayStr = App.getTodayString();

    let headerHtml = '<div style="padding: 10px; color: var(--text-muted);">Giờ</div>';
    let colsHtml = '';

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      const dateStr = this.formatDateIso(d);
      const isToday = dateStr === todayStr;

      headerHtml += `
        <div class="week-header-day ${isToday ? 'today-header' : ''}" style="${isToday ? 'color: var(--primary); font-weight: 800;' : ''}">
          <div>${dayNames[i]}</div>
          <div style="font-size: 15px;">${d.getDate()}/${d.getMonth() + 1}</div>
        </div>
      `;

      // Get tasks on this day
      let dayTasks = TaskManager.getAll().filter(t => t.date === dateStr);
      if (TaskManager.currentDomain !== 'all') {
        dayTasks = dayTasks.filter(t => (t.domain || (t.category === 'study' ? 'study' : 'personal_work')) === TaskManager.currentDomain);
      }

      const tasksCardsHtml = dayTasks.map(t => {
        // Calculate vertical position roughly based on time (07:00 to 22:00)
        let hour = 9;
        if (t.time) {
          const parts = t.time.split(':');
          hour = parseInt(parts[0], 10);
        }
        const topOffset = Math.max(0, (hour - 7) * 52) + 4;
        const pClass = t.priority;

        return `
          <div class="week-task-card event-pill ${pClass} ${t.completed ? 'completed' : ''}" 
               style="top: ${topOffset}px;" 
               data-task-id="${t.id}"
               title="${t.title}">
            <strong>${t.time || '09:00'}</strong> ${TaskManager.escapeHtml(t.title)}
          </div>
        `;
      }).join('');

      colsHtml += `
        <div class="week-day-col" data-date="${dateStr}">
          ${tasksCardsHtml}
        </div>
      `;
    }

    headerGrid.innerHTML = headerHtml;
    colsContainer.innerHTML = colsHtml;

    // Attach click events
    colsContainer.querySelectorAll('.week-day-col').forEach(col => {
      col.addEventListener('click', (e) => {
        if (e.target.closest('.week-task-card')) return;
        const dateStr = col.dataset.date;
        TaskManager.openCreateModal(dateStr);
      });
    });

    colsContainer.querySelectorAll('.week-task-card').forEach(card => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = card.dataset.taskId;
        TaskManager.openEditModal(id);
      });
    });
  },

  renderDayView() {
    const titleEl = document.getElementById('dayViewCurrentDate');
    const badgeEl = document.getElementById('dayViewCountBadge');
    const listEl = document.getElementById('dayScheduleList');
    if (!listEl) return;

    const dateStr = this.formatDateIso(this.currentDate);
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    if (titleEl) titleEl.textContent = this.currentDate.toLocaleDateString('vi-VN', options);

    let tasks = TaskManager.getAll().filter(t => t.date === dateStr);
    if (TaskManager.currentDomain !== 'all') {
      tasks = tasks.filter(t => (t.domain || (t.category === 'study' ? 'study' : 'personal_work')) === TaskManager.currentDomain);
    }
    tasks.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));

    if (badgeEl) badgeEl.textContent = `${tasks.length} mục`;

    if (tasks.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <i class="ph-duotone ph-calendar-blank"></i>
          <h3>Không có lịch trình cho ngày này</h3>
          <p>Hãy bấm vào bên dưới để thêm kế hoạch mới.</p>
          <button class="btn btn-primary btn-sm" id="btnDayViewAdd">Thêm lịch ngay</button>
        </div>
      `;
      const addBtn = document.getElementById('btnDayViewAdd');
      if (addBtn) addBtn.onclick = () => TaskManager.openCreateModal(dateStr);
      return;
    }

    listEl.innerHTML = tasks.map(task => {
      const pInfo = PRIORITIES[task.priority] || PRIORITIES.p3;
      const catInfo = CATEGORIES[task.category] || CATEGORIES.work;

      return `
        <div class="task-item-card ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
          <button class="task-check-btn">
            <i class="ph-bold ph-check"></i>
          </button>
          <div class="task-body">
            <div class="task-header-line">
              <span class="badge-priority ${task.priority}">${pInfo.shortLabel}</span>
              <span class="badge-category">${catInfo.icon} ${catInfo.label}</span>
              <h3 class="task-title">${TaskManager.escapeHtml(task.title)}</h3>
            </div>
            ${task.description ? `<p class="task-notes">${TaskManager.escapeHtml(task.description)}</p>` : ''}
            <div class="task-meta">
              <span><i class="ph ph-clock"></i> ${task.time || 'Cả ngày'} - ${task.endTime || 'Kết thúc'}</span>
            </div>
          </div>
          <div class="task-item-actions">
            <button class="icon-btn edit-task-btn"><i class="ph ph-pencil-simple"></i></button>
            <button class="icon-btn delete-task-btn text-danger"><i class="ph ph-trash"></i></button>
          </div>
        </div>
      `;
    }).join('');

    TaskManager.bindItemActions(listEl);
  },

  getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday is start
    return new Date(d.setDate(diff));
  },

  formatDateIso(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  bindEvents() {
    const prevBtn = document.getElementById('calPrevBtn');
    const nextBtn = document.getElementById('calNextBtn');
    const todayBtn = document.getElementById('calTodayBtn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.viewMode === 'month') {
          this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        } else if (this.viewMode === 'week') {
          this.currentDate.setDate(this.currentDate.getDate() - 7);
        } else if (this.viewMode === 'day') {
          this.currentDate.setDate(this.currentDate.getDate() - 1);
        }
        this.render();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.viewMode === 'month') {
          this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        } else if (this.viewMode === 'week') {
          this.currentDate.setDate(this.currentDate.getDate() + 7);
        } else if (this.viewMode === 'day') {
          this.currentDate.setDate(this.currentDate.getDate() + 1);
        }
        this.render();
      });
    }

    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        this.currentDate = new Date(2026, 9, 12);
        this.render();
      });
    }

    // View mode switchers (month, week, day)
    const modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.viewMode = btn.dataset.mode;
        this.render();
      });
    });
  }
};
