/**
 * PlanSmart - Reminder & Due Date Notification Service
 */

const ReminderService = {
  notifications: [],
  snoozedTasks: {}, // { taskId: timestampUntil }
  checkIntervalId: null,
  activeAlertTask: null,
  audioAlertCtx: null,

  init() {
    this.notifications = Storage.getNotifications();
    this.snoozedTasks = Storage.getSnoozed();
    this.bindEvents();
    this.updateNotificationBadge();
    this.renderNotificationList();

    // Start background check loop every 10 seconds
    this.startCheckLoop();
    console.log('⏰ ReminderService initialized.');
  },

  startCheckLoop() {
    if (this.checkIntervalId) clearInterval(this.checkIntervalId);
    // Initial check right after load
    setTimeout(() => this.checkUpcomingTasks(), 1500);
    this.checkIntervalId = setInterval(() => {
      this.checkUpcomingTasks();
    }, 10000);
  },

  getCurrentDateTime() {
    // Current application date: 2026-10-12
    const nowReal = new Date();
    // Use real local hours & minutes with the base date 2026-10-12
    const y = 2026;
    const m = 9; // October (0-indexed)
    const d = 12;
    return new Date(y, m, d, nowReal.getHours(), nowReal.getMinutes(), nowReal.getSeconds());
  },

  getTaskScheduledDate(task) {
    if (!task.date) return null;
    const [year, month, day] = task.date.split('-').map(Number);
    let hour = 9, minute = 0;
    if (task.time) {
      const parts = task.time.split(':').map(Number);
      hour = parts[0] || 0;
      minute = parts[1] || 0;
    }
    return new Date(year, month - 1, day, hour, minute, 0);
  },

  getReminderOffsetMinutes(reminderSetting) {
    switch (reminderSetting) {
      case 'ontime': return 0;
      case '5m': return 5;
      case '15m': return 15;
      case '30m': return 30;
      case '1h': return 60;
      case '1d': return 1440;
      default: return null;
    }
  },

  checkUpcomingTasks() {
    const user = Auth.currentUser;
    if (!user) return;

    const tasks = TaskManager.getAll().filter(t => !t.completed);
    const now = this.getCurrentDateTime().getTime();

    tasks.forEach(task => {
      if (!task.reminder || task.reminder === 'none') return;

      const taskDate = this.getTaskScheduledDate(task);
      if (!taskDate) return;

      const offsetMinutes = this.getReminderOffsetMinutes(task.reminder);
      if (offsetMinutes === null) return;

      const reminderTargetTime = taskDate.getTime() - (offsetMinutes * 60 * 1000);

      // Check if snoozed
      const snoozedUntil = this.snoozedTasks[task.id];
      if (snoozedUntil && now < snoozedUntil) {
        return; // Still in snooze period
      }

      // Check if already notified for this exact scheduled time
      const alreadyNotified = this.notifications.some(n => 
        n.taskId === task.id && n.scheduledTime === taskDate.toISOString() && !n.snoozeRequested
      );

      // Trigger if current time has reached or passed the reminderTargetTime
      // (within a 2-hour window so we don't alert old past weeks)
      const diffMs = now - reminderTargetTime;
      const twoHoursMs = 2 * 60 * 60 * 1000;

      if (diffMs >= 0 && diffMs <= twoHoursMs && (!alreadyNotified || snoozedUntil)) {
        // Trigger Alarm!
        this.triggerReminderAlert(task, offsetMinutes);
      }
    });

    this.updateNotificationBadge();
  },

  triggerReminderAlert(task, offsetMinutes) {
    // Clear snooze entry if active
    if (this.snoozedTasks[task.id]) {
      delete this.snoozedTasks[task.id];
      Storage.saveSnoozed(this.snoozedTasks);
    }

    const taskDate = this.getTaskScheduledDate(task);
    const notifId = 'notif_' + Date.now();

    let reminderLabel = 'Đúng giờ hẹn';
    if (offsetMinutes === 5) reminderLabel = 'Trước 5 phút';
    else if (offsetMinutes === 15) reminderLabel = 'Trước 15 phút';
    else if (offsetMinutes === 30) reminderLabel = 'Trước 30 phút';
    else if (offsetMinutes === 60) reminderLabel = 'Trước 1 giờ';
    else if (offsetMinutes === 1440) reminderLabel = 'Trước 1 ngày';

    const notif = {
      id: notifId,
      taskId: task.id,
      taskTitle: task.title,
      priority: task.priority,
      category: task.category,
      scheduledTime: taskDate ? taskDate.toISOString() : '',
      timeString: task.time || '09:00',
      reminderLabel: reminderLabel,
      timestamp: new Date().toISOString(),
      read: false
    };

    // Add to notification list
    this.notifications.unshift(notif);
    // Keep max 50
    if (this.notifications.length > 50) this.notifications.pop();
    Storage.saveNotifications(this.notifications);

    // Play synthesized alarm sound
    this.playReminderChime();

    // Show Alarm Modal
    this.showDueAlertModal(task, reminderLabel);

    // Trigger Browser Desktop Notification if enabled
    this.showDesktopNotification(task, reminderLabel);

    // Vibrate device if mobile
    if ('vibrate' in navigator) {
      try { navigator.vibrate([200, 100, 200]); } catch {}
    }

    // Toast Alert
    App.showToast(`⏰ Nhắc nhở: "${task.title}" sắp đến giờ hẹn (${reminderLabel})`, 'info');

    // Ring bell animation
    const bellBtn = document.getElementById('notifBellBtn');
    if (bellBtn) {
      bellBtn.classList.add('ringing');
      setTimeout(() => bellBtn.classList.remove('ringing'), 4000);
    }

    this.updateNotificationBadge();
    this.renderNotificationList();
  },

  showDueAlertModal(task, reminderLabel) {
    this.activeAlertTask = task;
    const modal = document.getElementById('reminderAlertModal');
    if (!modal) return;

    const titleEl = document.getElementById('alertTaskTitle');
    const timeEl = document.getElementById('alertTaskTime');
    const priorityEl = document.getElementById('alertTaskPriority');
    const descEl = document.getElementById('alertTaskDesc');
    const labelEl = document.getElementById('alertReminderLabel');

    if (titleEl) titleEl.textContent = task.title;
    if (timeEl) timeEl.textContent = `${task.time || '09:00'} - ${App.formatDisplayDate(task.date)}`;
    if (labelEl) labelEl.textContent = reminderLabel;
    if (descEl) descEl.textContent = task.description || 'Không có ghi chú thêm.';

    if (priorityEl) {
      const pInfo = PRIORITIES[task.priority] || PRIORITIES.p3;
      priorityEl.className = `badge-priority ${task.priority}`;
      priorityEl.textContent = pInfo.shortLabel;
    }

    modal.classList.add('active');
  },

  closeDueAlertModal() {
    const modal = document.getElementById('reminderAlertModal');
    if (modal) modal.classList.remove('active');
    this.activeAlertTask = null;
  },

  snoozeActiveTask(minutes = 5) {
    if (!this.activeAlertTask) return;
    const taskId = this.activeAlertTask.id;
    const now = this.getCurrentDateTime().getTime();
    const snoozeUntil = now + (minutes * 60 * 1000);

    this.snoozedTasks[taskId] = snoozeUntil;
    Storage.saveSnoozed(this.snoozedTasks);

    App.showToast(`Đã hoãn báo lại "${this.activeAlertTask.title}" sau ${minutes} phút.`, 'info');
    this.closeDueAlertModal();
  },

  completeActiveTask() {
    if (!this.activeAlertTask) return;
    const taskId = this.activeAlertTask.id;
    TaskManager.toggleComplete(taskId);
    this.closeDueAlertModal();
  },

  playReminderChime() {
    try {
      if (!this.audioAlertCtx) {
        const AudioClass = window.AudioContext || window.webkitAudioContext;
        if (AudioClass) this.audioAlertCtx = new AudioClass();
      }

      if (this.audioAlertCtx && this.audioAlertCtx.state === 'suspended') {
        this.audioAlertCtx.resume();
      }

      if (this.audioAlertCtx) {
        const ctx = this.audioAlertCtx;
        const now = ctx.currentTime;

        // Two-tone bell melody (C6 -> G6 -> C6)
        const notes = [1046.50, 1567.98, 1046.50, 1567.98];
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = now + (index * 0.18);

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.25, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + 0.36);
        });
      }
    } catch (e) {
      console.warn('Audio chime fallback:', e);
    }
  },

  async requestDesktopNotificationPermission() {
    if (!('Notification' in window)) {
      App.showToast('Trình duyệt của bạn không hỗ trợ thông báo màn hình.', 'danger');
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        App.showToast('Đã kích hoạt thông báo màn hình máy tính!', 'success');
        this.updatePermissionBtn();
        return true;
      } else {
        App.showToast('Bạn đã từ chối quyền gửi thông báo màn hình.', 'info');
        return false;
      }
    } catch {
      return false;
    }
  },

  showDesktopNotification(task, reminderLabel) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    try {
      const notif = new Notification(`⏰ Đến hẹn: ${task.title}`, {
        body: `Thời gian: ${task.time || '09:00'} | Mức độ: ${PRIORITIES[task.priority]?.label || 'Ưu tiên'}\n${task.description || ''}`,
        icon: 'https://api.dicebear.com/7.x/identicon/svg?seed=PlanSmart',
        badge: 'https://api.dicebear.com/7.x/identicon/svg?seed=PlanSmart',
        tag: 'task_' + task.id
      });

      notif.onclick = () => {
        window.focus();
        TaskManager.openEditModal(task.id);
        notif.close();
      };
    } catch (err) {
      console.warn('Desktop notification error:', err);
    }
  },

  updateNotificationBadge() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;

    const unreadCount = this.notifications.filter(n => !n.read).length;
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  },

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    Storage.saveNotifications(this.notifications);
    this.updateNotificationBadge();
    this.renderNotificationList();
    App.showToast('Đã đánh dấu đã đọc tất cả thông báo.', 'info');
  },

  clearAllNotifications() {
    this.notifications = [];
    Storage.saveNotifications(this.notifications);
    this.updateNotificationBadge();
    this.renderNotificationList();
    App.showToast('Đã xóa tất cả thông báo nhắc nhở.', 'info');
  },

  renderNotificationList() {
    const container = document.getElementById('notifListContainer');
    const emptyState = document.getElementById('notifEmptyState');
    if (!container) return;

    if (this.notifications.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    container.innerHTML = this.notifications.map(notif => {
      const pInfo = PRIORITIES[notif.priority] || PRIORITIES.p3;
      const timeAgo = this.formatTimeAgo(notif.timestamp);

      return `
        <div class="notif-item ${notif.read ? 'read' : 'unread'}" data-notif-id="${notif.id}" data-task-id="${notif.taskId}">
          <div class="notif-icon-wrap ${notif.priority}">
            <i class="ph-bold ph-bell-ringing"></i>
          </div>
          <div class="notif-content">
            <div class="notif-title-row">
              <span class="badge-priority ${notif.priority}">${pInfo.shortLabel}</span>
              <span class="notif-time-ago">${timeAgo}</span>
            </div>
            <h4 class="notif-task-title">${TaskManager.escapeHtml(notif.taskTitle)}</h4>
            <p class="notif-detail"><i class="ph ph-clock"></i> ${notif.timeString} • ${notif.reminderLabel}</p>
          </div>
          <div class="notif-item-actions">
            <button class="notif-action-btn view-task-btn" title="Xem chi tiết công việc">
              <i class="ph ph-arrow-right"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach click events
    container.querySelectorAll('.notif-item').forEach(item => {
      item.addEventListener('click', () => {
        const notifId = item.dataset.notifId;
        const taskId = item.dataset.taskId;

        // Mark as read
        const n = this.notifications.find(x => x.id === notifId);
        if (n) {
          n.read = true;
          Storage.saveNotifications(this.notifications);
          this.updateNotificationBadge();
          this.renderNotificationList();
        }

        // Open task modal
        if (taskId) TaskManager.openEditModal(taskId);

        // Close dropdown
        const dropdown = document.getElementById('notifDropdown');
        if (dropdown) dropdown.classList.remove('active');
      });
    });
  },

  formatTimeAgo(isoString) {
    if (!isoString) return '';
    try {
      const past = new Date(isoString).getTime();
      const now = new Date().getTime();
      const diffSec = Math.floor((now - past) / 1000);

      if (diffSec < 60) return 'Vừa xong';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
      return `${Math.floor(diffSec / 86400)} ngày trước`;
    } catch {
      return '';
    }
  },

  updatePermissionBtn() {
    const btn = document.getElementById('btnRequestNotifPermission');
    if (!btn) return;
    if ('Notification' in window && Notification.permission === 'granted') {
      btn.innerHTML = '<i class="ph-bold ph-check"></i> <span>Đã bật thông báo màn hình</span>';
      btn.classList.add('btn-success-subtle');
      btn.disabled = true;
    } else {
      btn.innerHTML = '<i class="ph-bold ph-bell-simple"></i> <span>Bật thông báo màn hình</span>';
      btn.classList.remove('btn-success-subtle');
      btn.disabled = false;
    }
  },

  testReminderAlarm() {
    // Pick first pending task or create mock
    const tasks = TaskManager.getAll().filter(t => !t.completed);
    const sampleTask = tasks[0] || {
      id: 'test_task',
      title: 'Họp khẩn cấp với khách hàng đối tác',
      description: 'Kiểm tra âm thanh chuông báo và chức năng hoãn lại 5 phút.',
      date: App.getTodayString(),
      time: '10:00',
      priority: 'p1',
      category: 'work'
    };

    this.triggerReminderAlert(sampleTask, 15);
  },

  bindEvents() {
    // Notification Bell Dropdown Toggle
    const bellBtn = document.getElementById('notifBellBtn');
    const dropdown = document.getElementById('notifDropdown');

    if (bellBtn && dropdown) {
      bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
        this.updatePermissionBtn();
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('#notifDropdownWrapper')) {
          dropdown.classList.remove('active');
        }
      });
    }

    // Mark all read button
    const btnMarkAllRead = document.getElementById('btnMarkNotifsRead');
    if (btnMarkAllRead) {
      btnMarkAllRead.addEventListener('click', () => this.markAllAsRead());
    }

    // Clear all button
    const btnClearNotifs = document.getElementById('btnClearNotifs');
    if (btnClearNotifs) {
      btnClearNotifs.addEventListener('click', () => this.clearAllNotifications());
    }

    // Permission button
    const btnPerm = document.getElementById('btnRequestNotifPermission');
    if (btnPerm) {
      btnPerm.addEventListener('click', () => this.requestDesktopNotificationPermission());
    }

    // Test alarm button
    const btnTestAlarm = document.getElementById('btnTestAlarm');
    if (btnTestAlarm) {
      btnTestAlarm.addEventListener('click', () => {
        this.testReminderAlarm();
        if (dropdown) dropdown.classList.remove('active');
      });
    }

    // Due Alert Modal Actions
    const btnCompleteAlert = document.getElementById('btnAlertCompleteTask');
    const btnSnoozeAlert = document.getElementById('btnAlertSnoozeTask');
    const btnDismissAlert = document.getElementById('btnAlertDismiss');
    const closeAlertBtn = document.getElementById('closeAlertModalBtn');

    if (btnCompleteAlert) {
      btnCompleteAlert.addEventListener('click', () => this.completeActiveTask());
    }
    if (btnSnoozeAlert) {
      btnSnoozeAlert.addEventListener('click', () => this.snoozeActiveTask(5));
    }
    if (btnDismissAlert) {
      btnDismissAlert.addEventListener('click', () => this.closeDueAlertModal());
    }
    if (closeAlertBtn) {
      closeAlertBtn.addEventListener('click', () => this.closeDueAlertModal());
    }
  }
};
