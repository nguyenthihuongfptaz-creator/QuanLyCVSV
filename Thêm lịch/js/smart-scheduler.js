/**
 * PlanSmart - Smart Scheduler & Priority Recommendation Engine
 */

const SmartScheduler = {
  init() {
    this.bindEvents();
    this.render();
  },

  calculatePriorityScore(task) {
    if (task.completed) return -100;

    const baseWeight = (PRIORITIES[task.priority] && PRIORITIES[task.priority].weight) || 30;
    let urgencyBonus = 0;

    const todayStr = App.getTodayString();
    const taskDate = task.date;

    if (taskDate < todayStr) {
      // Overdue
      urgencyBonus = 60;
    } else if (taskDate === todayStr) {
      // Due today
      urgencyBonus = 45;
    } else {
      // Calculate days difference
      const d1 = new Date(todayStr);
      const d2 = new Date(taskDate);
      const diffDays = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        urgencyBonus = 30; // Tomorrow
      } else if (diffDays <= 3) {
        urgencyBonus = 18;
      } else if (diffDays <= 7) {
        urgencyBonus = 10;
      }
    }

    // Work / Study core category small weight
    let categoryBonus = 0;
    if (task.category === 'work') categoryBonus = 8;
    else if (task.category === 'study') categoryBonus = 6;
    else if (task.category === 'health') categoryBonus = 4;

    return baseWeight + urgencyBonus + categoryBonus;
  },

  getRecommendationReason(task, score) {
    const todayStr = App.getTodayString();
    if (task.date < todayStr) {
      return `⚠️ ĐÃ QUÁ HẠN! Cần xử lý ngay để không ảnh hưởng tiến độ chung.`;
    }
    if (task.priority === 'p1' && task.date === todayStr) {
      return `🔥 Nhiệm vụ P1 Khẩn cấp & Quan trọng phải xong trong ngày hôm nay.`;
    }
    if (task.priority === 'p1') {
      return `🔴 Mức độ ưu tiên cao nhất P1, khuyến nghị chuẩn bị tài liệu sớm.`;
    }
    if (task.priority === 'p2' && task.date === todayStr) {
      return `⭐ Quan trọng (P2) cho sự phát triển dài hạn, nên dành khối giờ tập trung sâu.`;
    }
    if (task.priority === 'p2') {
      return `📅 Nhiệm vụ chiến lược (P2), sắp xếp làm ngay sau khi hoàn thành các việc P1.`;
    }
    if (task.priority === 'p3') {
      return `💬 Việc bình thường (P3), có thể giải quyết nhanh hoặc ủy quyền cho người khác.`;
    }
    return `☕ Mức độ ưu tiên thấp (P4), thực hiện khi đã giải quyết xong các việc quan trọng hơn.`;
  },

  render() {
    this.renderSmartAIView();
    this.renderEisenhowerMatrix();
  },

  renderSmartAIView() {
    let tasks = TaskManager.getAll().filter(t => !t.completed);
    if (TaskManager.currentDomain !== 'all') {
      tasks = tasks.filter(t => (t.domain || (t.category === 'study' ? 'study' : 'personal_work')) === TaskManager.currentDomain);
    }
    const container = document.getElementById('smartRankedContainer');
    const rankedCountEl = document.getElementById('smartRankedCount');
    const topTitleEl = document.getElementById('topPriorityTaskTitle');
    const topReasonEl = document.getElementById('topPriorityTaskReason');
    const urgentCountEl = document.getElementById('urgentTasksCount');
    const efficiencyEl = document.getElementById('efficiencyScore');
    const focusTopTaskBtn = document.getElementById('focusTopTaskBtn');

    if (!container) return;

    if (tasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="ph-duotone ph-sparkle"></i>
          <h3>Không có công việc nào đang chờ thực hiện</h3>
          <p>Tất cả nhiệm vụ đã hoàn thành hoặc chưa có dữ liệu. Tuyệt vời!</p>
        </div>
      `;
      if (topTitleEl) topTitleEl.textContent = 'Hoàn thành 100%';
      if (topReasonEl) topReasonEl.textContent = 'Bạn đã xử lý hết toàn bộ nhiệm vụ.';
      if (urgentCountEl) urgentCountEl.textContent = '0 công việc';
      if (rankedCountEl) rankedCountEl.textContent = '0 nhiệm vụ';
      return;
    }

    // Rank tasks by score
    const scoredTasks = tasks.map(task => ({
      task,
      score: this.calculatePriorityScore(task),
      reason: this.getRecommendationReason(task, this.calculatePriorityScore(task))
    })).sort((a, b) => b.score - a.score);

    if (rankedCountEl) rankedCountEl.textContent = `${scoredTasks.length} nhiệm vụ đã được phân tích & xếp hạng`;

    // Top task insight
    const topItem = scoredTasks[0];
    if (topTitleEl) topTitleEl.textContent = topItem.task.title;
    if (topReasonEl) topReasonEl.textContent = topItem.reason;
    if (focusTopTaskBtn) {
      focusTopTaskBtn.onclick = () => {
        TaskManager.openEditModal(topItem.task.id);
      };
    }

    // Urgent count (<24h or overdue)
    const todayStr = App.getTodayString();
    const urgentTasks = tasks.filter(t => (t.priority === 'p1' || t.priority === 'p2') && (t.date <= todayStr));
    if (urgentCountEl) urgentCountEl.textContent = `${urgentTasks.length} công việc`;

    // Efficiency recommendation text
    if (efficiencyEl) {
      if (urgentTasks.length > 3) {
        efficiencyEl.textContent = 'Quá tải (Cần tập trung)';
      } else if (urgentTasks.length > 0) {
        efficiencyEl.textContent = 'Ưu tiên cao';
      } else {
        efficiencyEl.textContent = 'Cân bằng tối ưu';
      }
    }

    // Render ranked list
    container.innerHTML = scoredTasks.map((item, index) => {
      const pInfo = PRIORITIES[item.task.priority] || PRIORITIES.p3;
      const catInfo = CATEGORIES[item.task.category] || CATEGORIES.work;

      return `
        <div class="ranked-task-card ${index === 0 ? 'rank-1' : ''}" data-task-id="${item.task.id}">
          <div class="rank-badge">#${index + 1}</div>
          <div class="task-body">
            <div class="task-header-line">
              <span class="badge-priority ${item.task.priority}">${pInfo.shortLabel}</span>
              <span class="badge-category">${catInfo.icon} ${catInfo.label}</span>
              <h4 class="task-title">${TaskManager.escapeHtml(item.task.title)}</h4>
            </div>
            <p class="insight-desc" style="color: var(--text-main); font-weight: 500;">
              ${item.reason}
            </p>
            <div class="task-meta" style="margin-top: 6px;">
              <span><i class="ph ph-calendar"></i> ${App.formatDisplayDate(item.task.date)} lúc ${item.task.time || '09:00'}</span>
            </div>
          </div>
          <div class="ranked-score-pill">
            <span class="score-number">${item.score}</span>
            <span class="score-label">Điểm ưu tiên</span>
          </div>
          <button class="icon-btn edit-from-rank-btn" title="Xem chi tiết">
            <i class="ph ph-arrow-right"></i>
          </button>
        </div>
      `;
    }).join('');

    // Attach click events
    container.querySelectorAll('.ranked-task-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.taskId;
        TaskManager.openEditModal(id);
      });
    });
  },

  renderEisenhowerMatrix() {
    let tasks = TaskManager.getAll();
    if (TaskManager.currentDomain !== 'all') {
      tasks = tasks.filter(t => (t.domain || (t.category === 'study' ? 'study' : 'personal_work')) === TaskManager.currentDomain);
    }

    const q1List = document.getElementById('q1List');
    const q2List = document.getElementById('q2List');
    const q3List = document.getElementById('q3List');
    const q4List = document.getElementById('q4List');

    const q1Count = document.getElementById('q1Count');
    const q2Count = document.getElementById('q2Count');
    const q3Count = document.getElementById('q3Count');
    const q4Count = document.getElementById('q4Count');

    if (!q1List) return;

    const quadrants = {
      p1: { list: q1List, countEl: q1Count, items: [] },
      p2: { list: q2List, countEl: q2Count, items: [] },
      p3: { list: q3List, countEl: q3Count, items: [] },
      p4: { list: q4List, countEl: q4Count, items: [] }
    };

    tasks.forEach(task => {
      if (quadrants[task.priority]) {
        quadrants[task.priority].items.push(task);
      }
    });

    Object.keys(quadrants).forEach(key => {
      const q = quadrants[key];
      if (q.countEl) q.countEl.textContent = `${q.items.length} việc`;

      if (q.items.length === 0) {
        q.list.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 12px;">Chưa có nhiệm vụ</div>`;
      } else {
        q.list.innerHTML = q.items.map(task => {
          return `
            <div class="quadrant-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
              <span class="priority-dot ${task.priority}-dot"></span>
              <span style="flex: 1; font-weight: 600;">${TaskManager.escapeHtml(task.title)}</span>
              <span style="font-size: 11px; color: var(--text-muted);">${App.formatDisplayDate(task.date)}</span>
            </div>
          `;
        }).join('');

        q.list.querySelectorAll('.quadrant-item').forEach(item => {
          item.addEventListener('click', () => {
            const id = item.dataset.taskId;
            TaskManager.openEditModal(id);
          });
        });
      }
    });

    // Attach Add to Quadrant buttons
    document.querySelectorAll('.quadrant-add-btn').forEach(btn => {
      btn.onclick = () => {
        const priority = btn.dataset.priority;
        TaskManager.openCreateModal();
        const radio = document.querySelector(`input[name="priorityRadio"][value="${priority}"]`);
        if (radio) radio.checked = true;
      };
    });
  },

  bindEvents() {
    // Topbar Smart Sort Button
    const topbarSmartSortBtn = document.getElementById('topbarSmartSortBtn');
    if (topbarSmartSortBtn) {
      topbarSmartSortBtn.addEventListener('click', () => {
        App.switchView('tasks');
        const sortSelect = document.getElementById('taskSortSelect');
        if (sortSelect) {
          sortSelect.value = 'smart';
          TaskManager.currentSort = 'smart';
          TaskManager.render();
        }
        App.showToast('Đã sắp xếp danh sách công việc theo Điểm ưu tiên thông minh!', 'success');
      });
    }

    // Apply Smart Order in AI view
    const btnApplySmartOrder = document.getElementById('btnApplySmartOrder');
    if (btnApplySmartOrder) {
      btnApplySmartOrder.addEventListener('click', () => {
        App.switchView('tasks');
        const sortSelect = document.getElementById('taskSortSelect');
        if (sortSelect) {
          sortSelect.value = 'smart';
          TaskManager.currentSort = 'smart';
          TaskManager.render();
        }
        App.showToast('Đã áp dụng thứ tự ưu tiên đề xuất cho danh sách công việc!', 'success');
      });
    }

    // Eisenhower Help Dialog
    const btnHelpEisenhower = document.getElementById('btnHelpEisenhower');
    if (btnHelpEisenhower) {
      btnHelpEisenhower.addEventListener('click', () => {
        alert(
          'Nguyên lý Ma trận Eisenhower:\n\n' +
          '• P1 (Khẩn cấp & Quan trọng): Khủng hoảng, hạn chót gấp -> Cần LÀM NGAY.\n' +
          '• P2 (Quan trọng, Không khẩn): Kế hoạch dài hạn, phát triển bản thân -> Cần LÊN LỊCH & TẬP TRUNG.\n' +
          '• P3 (Khẩn cấp, Ít quan trọng): Gián đoạn, yêu cầu phụ -> Xem xét ỦY QUYỀN hoặc giải quyết nhanh.\n' +
          '• P4 (Không khẩn, Không quan trọng): Tiêu hao thời gian thừa thãi -> HÃY LOẠI BỎ.'
        );
      });
    }
  }
};
