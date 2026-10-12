/**
 * PlanSmart - Main Application Coordinator & UI Orchestration
 */

const App = {
  activeView: 'calendar',
  audioCtx: null,

  init() {
    this.initTheme();
    this.bindNavigation();
    this.bindAppControls();
    
    // Initialize Submodules
    Auth.init();
    TaskManager.init();
    ReminderService.init();
    SmartScheduler.init();
    Calendar.init();
    ProgressTracker.init();

    console.log('🚀 PlanSmart initialized successfully.');
  },

  getTodayString() {
    return '2026-10-12'; // Aligned with the current system time
  },

  formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  },

  switchView(viewName) {
    this.activeView = viewName;

    // Sidebar items highlight
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.dataset.view === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Content view sections
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.remove('active');
    });

    const targetMap = {
      'calendar': 'viewCalendar',
      'tasks': 'viewTasks',
      'smart-ai': 'viewSmartAI',
      'eisenhower': 'viewEisenhower',
      'analytics': 'viewAnalytics'
    };

    const targetId = targetMap[viewName];
    const targetSection = document.getElementById(targetId);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Close mobile sidebar on navigate
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('active');

    // Trigger re-render of views that need layout recalculations
    if (viewName === 'calendar') Calendar.render();
    if (viewName === 'tasks') TaskManager.render();
    if (viewName === 'smart-ai') SmartScheduler.renderSmartAIView();
    if (viewName === 'eisenhower') SmartScheduler.renderEisenhowerMatrix();
    if (viewName === 'analytics') ProgressTracker.render();
  },

  refreshAllViews() {
    TaskManager.renderCategoryFilters();
    TaskManager.render();
    Calendar.render();
    SmartScheduler.render();
    ProgressTracker.render();
    if (typeof ReminderService !== 'undefined') {
      ReminderService.checkUpcomingTasks();
      ReminderService.updateNotificationBadge();
      ReminderService.renderNotificationList();
    }
  },

  bindNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.dataset.view;
        if (view) this.switchView(view);
      });
    });

    // Mobile sidebar toggle
    const openSidebarBtn = document.getElementById('openSidebarBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const sidebar = document.getElementById('sidebar');

    if (openSidebarBtn && sidebar) {
      openSidebarBtn.addEventListener('click', () => sidebar.classList.add('active'));
    }
    if (closeSidebarBtn && sidebar) {
      closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('active'));
    }
  },

  initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
        this.updateThemeIcon(newTheme);
        this.showToast(`Đã chuyển sang giao diện ${newTheme === 'dark' ? 'Tối' : 'Sáng'}`, 'info');
      });
    }
  },

  updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (icon) {
      icon.className = theme === 'dark' ? 'ph ph-moon' : 'ph ph-sun';
    }
  },

  bindAppControls() {
    // Dropdown backup export
    const dropdownBackup = document.getElementById('dropdownBackup');
    if (dropdownBackup) {
      dropdownBackup.addEventListener('click', () => {
        const data = {
          user: Auth.currentUser,
          tasks: TaskManager.getAll(),
          exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PlanSmart_Backup_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Đã tải xuống file sao lưu dữ liệu!', 'success');
      });
    }

    // Reset demo
    const dropdownResetDemo = document.getElementById('dropdownResetDemo');
    if (dropdownResetDemo) {
      dropdownResetDemo.addEventListener('click', () => {
        if (confirm('Khôi phục dữ liệu mẫu ban đầu? Tất cả thay đổi chưa sao lưu sẽ được làm mới.')) {
          Storage.resetDemoData();
          Auth.currentUser = Storage.getCurrentUser();
          Auth.updateUserUI();
          TaskManager.tasks = Storage.getTasks();
          this.refreshAllViews();
          this.showToast('Đã khôi phục dữ liệu mẫu mặc định thành công!', 'success');
        }
      });
    }
  },

  playSuccessSound() {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      if (this.audioCtx) {
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        // Play an energetic pleasant arpeggio chime (E5 -> G#5 -> B5)
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.exponentialRampToValueAtTime(830.61, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.16);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.36);
      }
    } catch {
      // Audio autoplay policy fallback (silent pass)
    }
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;

    let iconClass = 'ph-info';
    if (type === 'success') iconClass = 'ph-check-circle';
    if (type === 'danger') iconClass = 'ph-warning-circle';

    toast.innerHTML = `
      <i class="ph-bold ${iconClass}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};

// Auto-run on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
