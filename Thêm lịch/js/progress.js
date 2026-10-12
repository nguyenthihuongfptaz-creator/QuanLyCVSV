/**
 * PlanSmart - Progress Tracking & KPI Analytics
 */

const ProgressTracker = {
  init() {
    this.render();
  },

  render() {
    const tasks = TaskManager.getAll();
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const urgentPending = tasks.filter(t => !t.completed && t.priority === 'p1').length;
    const user = Auth.currentUser;

    // 1. KPI Cards
    const totalEl = document.getElementById('kpiTotalTasks');
    const compEl = document.getElementById('kpiCompletedTasks');
    const rateEl = document.getElementById('kpiCompletionRate');
    const pendingEl = document.getElementById('kpiPendingTasks');
    const urgentEl = document.getElementById('kpiPendingUrgent');
    const streakEl = document.getElementById('kpiStreakDays');

    if (totalEl) totalEl.textContent = total;
    if (compEl) compEl.textContent = completed;
    if (rateEl) rateEl.textContent = `${rate}% tỷ lệ hoàn thành`;
    if (pendingEl) pendingEl.textContent = pending;
    if (urgentEl) urgentEl.textContent = `${urgentPending} việc khẩn cấp (P1)`;
    if (streakEl) streakEl.textContent = `${(user && user.streak) || 7} ngày`;

    // 2. Priority Progress Bars Breakdown
    const pContainer = document.getElementById('priorityProgressContainer');
    if (pContainer) {
      let pBarsHtml = '';
      const pKeys = ['p1', 'p2', 'p3', 'p4'];

      pKeys.forEach(pKey => {
        const pTasks = tasks.filter(t => t.priority === pKey);
        const pTotal = pTasks.length;
        const pComp = pTasks.filter(t => t.completed).length;
        const pPercent = pTotal > 0 ? Math.round((pComp / pTotal) * 100) : 0;
        const pInfo = PRIORITIES[pKey];

        pBarsHtml += `
          <div class="p-bar-item">
            <div class="p-bar-labels">
              <span style="color: ${pInfo.color}; font-weight: 700;">${pInfo.label}</span>
              <span>${pComp}/${pTotal} (${pPercent}%)</span>
            </div>
            <div class="p-bar-track">
              <div class="p-bar-fill ${pKey}" style="width: ${pPercent}%;"></div>
            </div>
          </div>
        `;
      });

      pContainer.innerHTML = pBarsHtml;
    }

    // 3. Radial Progress Gauge
    const radialCircle = document.getElementById('radialProgressCircle');
    const radialText = document.getElementById('radialPercentText');
    if (radialCircle && radialText) {
      radialText.textContent = `${rate}%`;
      // Circumference: 2 * PI * 65 ≈ 408.4
      const circumference = 408.4;
      const offset = circumference - (rate / 100) * circumference;
      radialCircle.style.strokeDashoffset = offset;
    }

    // 4. Category Breakdown Legend
    const legendContainer = document.getElementById('chartLegendContainer');
    if (legendContainer) {
      let legendHtml = '';
      Object.values(CATEGORIES).forEach(cat => {
        const catTasks = tasks.filter(t => t.category === cat.id);
        const catTotal = catTasks.length;
        if (catTotal > 0) {
          const catComp = catTasks.filter(t => t.completed).length;
          legendHtml += `
            <div class="legend-item">
              <div class="legend-left">
                <span class="legend-color" style="background: ${cat.color};"></span>
                <span>${cat.icon} ${cat.label}</span>
              </div>
              <strong>${catComp}/${catTotal}</strong>
            </div>
          `;
        }
      });

      if (!legendHtml) {
        legendHtml = `<div style="font-size: 12px; color: var(--text-muted); text-align: center;">Chưa có dữ liệu danh mục</div>`;
      }
      legendContainer.innerHTML = legendHtml;
    }

    // 5. Domain Comparison Progress (Lịch học vs Việc cá nhân)
    const domainProgressEl = document.getElementById('domainProgressComparison');
    if (domainProgressEl) {
      const studyTasks = tasks.filter(t => (t.domain || (t.category === 'study' ? 'study' : 'personal_work')) === 'study');
      const studyTotal = studyTasks.length;
      const studyComp = studyTasks.filter(t => t.completed).length;
      const studyPct = studyTotal > 0 ? Math.round((studyComp / studyTotal) * 100) : 0;

      const workTasks = tasks.filter(t => (t.domain || (t.category === 'study' ? 'study' : 'personal_work')) === 'personal_work');
      const workTotal = workTasks.length;
      const workComp = workTasks.filter(t => t.completed).length;
      const workPct = workTotal > 0 ? Math.round((workComp / workTotal) * 100) : 0;

      domainProgressEl.innerHTML = `
        <div class="domain-comparison-card study-comp-card">
          <div class="domain-comp-header">
            <div class="domain-comp-title">
              <i class="ph-bold ph-graduation-cap"></i>
              <h4>Lịch Học Tập & Lớp Học</h4>
            </div>
            <span class="comp-percent text-cyan">${studyPct}%</span>
          </div>
          <p class="comp-subtext">Đã hoàn thành ${studyComp} / ${studyTotal} buổi học & bài tập</p>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill fill-cyan" style="width: ${studyPct}%;"></div>
          </div>
        </div>

        <div class="domain-comparison-card work-comp-card">
          <div class="domain-comp-header">
            <div class="domain-comp-title">
              <i class="ph-bold ph-briefcase"></i>
              <h4>Công Việc & Đời Sống Cá Nhân</h4>
            </div>
            <span class="comp-percent text-indigo">${workPct}%</span>
          </div>
          <p class="comp-subtext">Đã hoàn thành ${workComp} / ${workTotal} công việc & kế hoạch</p>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill fill-indigo" style="width: ${workPct}%;"></div>
          </div>
        </div>
      `;
    }
  }
};
