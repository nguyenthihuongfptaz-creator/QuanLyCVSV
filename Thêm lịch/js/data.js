/**
 * PlanSmart - Initial Data & Storage Management
 */

const STORAGE_KEYS = {
  USERS: 'plansmart_users',
  CURRENT_USER: 'plansmart_current_user',
  TASKS: 'plansmart_tasks',
  THEME: 'plansmart_theme',
  NOTIFICATIONS: 'plansmart_notifications',
  SNOOZED: 'plansmart_snoozed'
};

// Default Demo User
const DEFAULT_DEMO_USER = {
  id: 'user_demo_01',
  email: 'demo@schedulestudent.vn',
  password: '123456', // In client-side demonstration
  fullName: 'Nguyễn Thị Hường',
  title: ' Trưởng nhóm Dự án',
  bio: 'Tập trung vào giải pháp năng suất cao, kỷ luật cá nhân và quản trị thời gian hiệu quả.',
  phone: '0987639018',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HuongNguyen',
  joinedDate: '01/10/2026',
  streak: 7
};

// Domain Configuration (Lịch học vs Việc cá nhân)
const DOMAINS = {
  all: { id: 'all', label: 'Tất cả lịch trình', icon: 'ph-squares-four' },
  study: { id: 'study', label: 'Lịch học tập & Lớp học', icon: 'ph-graduation-cap', color: '#06b6d4' },
  personal_work: { id: 'personal_work', label: 'Công việc & Đời sống cá nhân', icon: 'ph-briefcase', color: '#6366f1' }
};

// Study Types
const STUDY_TYPES = {
  lecture: { id: 'lecture', label: 'Lên lớp lý thuyết', icon: '📖', color: '#06b6d4' },
  practice: { id: 'practice', label: 'Thực hành / Lab', icon: '🔬', color: '#10b981' },
  exam: { id: 'exam', label: 'Kiểm tra / Thi cử', icon: '📝', color: '#ef4444' },
  assignment: { id: 'assignment', label: 'Bài tập / Đồ án', icon: '💻', color: '#f59e0b' },
  course: { id: 'course', label: 'Khóa học ngoài / Tự học', icon: '🎓', color: '#8b5cf6' }
};

// Default Sample Tasks divided into Lịch học & Việc cá nhân
const DEFAULT_SAMPLE_TASKS = [
  // --- [LỊCH HỌC TẬP & LỚP HỌC] ---
  {
    id: 'study_001',
    userId: 'user_demo_01',
    domain: 'study',
    title: 'Học Lập trình Web Nâng cao (React & RESTful APIs)',
    subject: 'Lập trình Web',
    studyType: 'lecture',
    room: 'Phòng Lab A302 - Nhà A',
    teacher: 'ThS. Trần Quang Nam',
    description: 'Chương 4: Xây dựng Single Page App và đồng bộ dữ liệu API.',
    date: '2026-10-12',
    time: '07:30',
    endDate: '2026-10-12',
    endTime: '09:30',
    priority: 'p1', // Khẩn cấp & Quan trọng
    category: 'study',
    tags: ['web-dev', 'react', 'lab-a302'],
    reminder: '15m',
    completed: false,
    createdAt: '2026-10-10T08:00:00.000Z'
  },
  {
    id: 'study_002',
    userId: 'user_demo_01',
    domain: 'study',
    title: 'Lịch thi giữa kỳ: Cấu trúc Dữ liệu & Giải thuật',
    subject: 'Cấu trúc Dữ liệu & Giải thuật',
    studyType: 'exam',
    room: 'Giảng đường C3 - Phòng 105',
    teacher: 'TS. Nguyễn Hoàng Long',
    description: 'Thi trắc nghiệm + tự luận 90 phút. Mang theo thẻ sinh viên và máy tính bỏ túi.',
    date: '2026-10-14',
    time: '13:30',
    endDate: '2026-10-14',
    endTime: '15:00',
    priority: 'p1',
    category: 'study',
    tags: ['lich-thi', 'dsa', 'giua-ky'],
    reminder: '1d',
    completed: false,
    createdAt: '2026-10-09T09:00:00.000Z'
  },
  {
    id: 'study_003',
    userId: 'user_demo_01',
    domain: 'study',
    title: 'Hạn nộp bài tập lớn: Phân tích & Thiết kế Hệ thống',
    subject: 'PT & TK Hệ thống',
    studyType: 'assignment',
    room: 'Nộp qua LMS Portal',
    teacher: 'PGS. TS. Lê Minh Tuấn',
    description: 'Nộp file báo cáo PDF và file thiết kế sơ đồ Use Case, Class Diagram.',
    date: '2026-10-15',
    time: '23:59',
    endDate: '2026-10-15',
    endTime: '23:59',
    priority: 'p2',
    category: 'study',
    tags: ['bai-tap-lon', 'deadline', 'uml'],
    reminder: '1h',
    completed: false,
    createdAt: '2026-10-10T14:00:00.000Z'
  },
  {
    id: 'study_004',
    userId: 'user_demo_01',
    domain: 'study',
    title: 'Thực hành Cơ sở Dữ liệu Phân tán (SQL & NoSQL)',
    subject: 'CSDL Phân tán',
    studyType: 'practice',
    room: 'Phòng Lab B104',
    teacher: 'ThS. Hoàng Thị Mai',
    description: 'Cài đặt cụm MongoDB Replica Set và Sharding.',
    date: '2026-10-16',
    time: '09:45',
    endDate: '2026-10-16',
    endTime: '11:45',
    priority: 'p2',
    category: 'study',
    tags: ['mongodb', 'lab', 'nosql'],
    reminder: '15m',
    completed: false,
    createdAt: '2026-10-11T11:00:00.000Z'
  },

  // --- [CÔNG VIỆC & ĐỜI SỐNG CÁ NHÂN] ---
  {
    id: 'work_001',
    userId: 'user_demo_01',
    domain: 'personal_work',
    title: 'Họp nghiệm thu dự án chuyển đổi số với Ban Giám Đốc',
    description: 'Trình bày slide báo cáo KPI quý 3, kế hoạch mở rộng hạ tầng và giải ngân ngân sách.',
    date: '2026-10-12',
    time: '10:00',
    endDate: '2026-10-12',
    endTime: '11:30',
    priority: 'p1', // Khẩn cấp & Quan trọng
    category: 'work',
    tags: ['hop-dong', 'giam-doc', 'q3-kpi'],
    reminder: '15m',
    completed: false,
    createdAt: '2026-10-10T08:00:00.000Z'
  },
  {
    id: 'work_002',
    userId: 'user_demo_01',
    domain: 'personal_work',
    title: 'Vá lỗ hổng bảo mật khẩn cấp trên máy chủ thanh toán',
    description: 'Cập nhật bản vá OpenSSL và kiểm tra lại chứng chỉ SSL cho API gateway.',
    date: '2026-10-12',
    time: '14:00',
    endDate: '2026-10-12',
    endTime: '16:00',
    priority: 'p1',
    category: 'work',
    tags: ['security', 'urgent', 'server'],
    reminder: '30m',
    completed: false,
    createdAt: '2026-10-11T09:15:00.000Z'
  },
  {
    id: 'work_003',
    userId: 'user_demo_01',
    domain: 'personal_work',
    title: 'Chạy bộ 5km & Rèn luyện sức bền thể lực',
    description: 'Chạy công viên gần nhà, duy trì nhịp tim Zone 2 để hồi phục năng lượng.',
    date: '2026-10-12',
    time: '17:30',
    endDate: '2026-10-12',
    endTime: '18:30',
    priority: 'p2',
    category: 'health',
    tags: ['chay-bo', 'suc-khoe'],
    reminder: '15m',
    completed: false,
    createdAt: '2026-10-12T06:00:00.000Z'
  },
  {
    id: 'work_004',
    userId: 'user_demo_01',
    domain: 'personal_work',
    title: 'Thanh toán hóa đơn điện thoại và Internet tháng 10',
    description: 'Tự động trích nợ qua ứng dụng ngân hàng số.',
    date: '2026-10-12',
    time: '08:00',
    endDate: '2026-10-12',
    endTime: '08:15',
    priority: 'p3',
    category: 'finance',
    tags: ['hoa-don', 'tien-ich'],
    completed: true,
    completedAt: '2026-10-12T08:10:00.000Z',
    createdAt: '2026-10-08T11:00:00.000Z'
  },
  {
    id: 'work_005',
    userId: 'user_demo_01',
    domain: 'personal_work',
    title: 'Dọn dẹp hòm thư điện tử & sắp xếp lại thư mục Google Drive',
    description: 'Hủy đăng ký các newsletter không đọc và xóa file tạm.',
    date: '2026-10-15',
    time: '20:00',
    endDate: '2026-10-15',
    endTime: '21:00',
    priority: 'p4', // Thấp
    category: 'personal',
    tags: ['clean', 'drive'],
    completed: false,
    createdAt: '2026-10-07T16:00:00.000Z'
  },
  {
    id: 'work_006',
    userId: 'user_demo_01',
    domain: 'personal_work',
    title: 'Gặp gỡ gia đình và ăn tối cuối tuần',
    description: 'Đặt bàn nhà hàng chay ấm cúng cho cả nhà vào tối Thứ Bảy.',
    date: '2026-10-17',
    time: '18:30',
    endDate: '2026-10-17',
    endTime: '21:00',
    priority: 'p2',
    category: 'family',
    tags: ['gia-dinh', 'cuoi-tuan'],
    completed: false,
    createdAt: '2026-10-10T12:00:00.000Z'
  }
];

// Category Definitions
const CATEGORIES = {
  work: { id: 'work', label: 'Công việc', icon: '💼', color: '#6366f1' },
  study: { id: 'study', label: 'Học tập', icon: '📚', color: '#06b6d4' },
  personal: { id: 'personal', label: 'Cá nhân', icon: '👤', color: '#8b5cf6' },
  health: { id: 'health', label: 'Sức khỏe', icon: '🏃', color: '#10b981' },
  finance: { id: 'finance', label: 'Tài chính', icon: '💰', color: '#f59e0b' },
  family: { id: 'family', label: 'Gia đình', icon: '🏠', color: '#ec4899' }
};

// Priority Labels & Weightings
const PRIORITIES = {
  p1: {
    id: 'p1',
    label: 'Khẩn cấp & Quan trọng',
    shortLabel: 'P1: Làm ngay',
    color: '#ef4444',
    weight: 100,
    quadrant: 'q1',
    desc: 'Cần giải quyết ngay lập tức, có ảnh hưởng nghiêm trọng nếu trễ'
  },
  p2: {
    id: 'p2',
    label: 'Quan trọng, Không khẩn cấp',
    shortLabel: 'P2: Lên lịch',
    color: '#f97316',
    weight: 70,
    quadrant: 'q2',
    desc: 'Mục tiêu chiến lược, phát triển cá nhân, phòng ngừa rủi ro'
  },
  p3: {
    id: 'p3',
    label: 'Bình thường',
    shortLabel: 'P3: Ủy quyền',
    color: '#3b82f6',
    weight: 40,
    quadrant: 'q3',
    desc: 'Việc gián đoạn phát sinh hoặc có thể giao phó'
  },
  p4: {
    id: 'p4',
    label: 'Thấp',
    shortLabel: 'P4: Bỏ qua / Rảnh làm',
    color: '#10b981',
    weight: 10,
    quadrant: 'q4',
    desc: 'Công việc không quá quan trọng, chỉ xử lý khi rảnh rỗi'
  }
};

// Storage Service Wrapper
const Storage = {
  getUsers() {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!data) {
      const initialUsers = [DEFAULT_DEMO_USER];
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(initialUsers));
      return initialUsers;
    }
    try {
      return JSON.parse(data);
    } catch {
      return [DEFAULT_DEMO_USER];
    }
  },

  saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  getCurrentUser() {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!data) {
      // Auto login default demo user if not logged in
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(DEFAULT_DEMO_USER));
      return DEFAULT_DEMO_USER;
    }
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_DEMO_USER;
    }
  },

  setCurrentUser(user) {
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } else {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    }
  },

  getTasks() {
    const data = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(DEFAULT_SAMPLE_TASKS));
      return DEFAULT_SAMPLE_TASKS;
    }
    try {
      const parsed = JSON.parse(data);
      // Auto-migrate domain if missing
      return parsed.map(t => {
        if (!t.domain) {
          t.domain = (t.category === 'study') ? 'study' : 'personal_work';
        }
        return t;
      });
    } catch {
      return DEFAULT_SAMPLE_TASKS;
    }
  },

  saveTasks(tasks) {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  },

  getNotifications() {
    const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveNotifications(notifs) {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
  },

  getSnoozed() {
    const data = localStorage.getItem(STORAGE_KEYS.SNOOZED);
    if (!data) return {};
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  },

  saveSnoozed(snoozed) {
    localStorage.setItem(STORAGE_KEYS.SNOOZED, JSON.stringify(snoozed));
  },

  resetDemoData() {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([DEFAULT_DEMO_USER]));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(DEFAULT_DEMO_USER));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(DEFAULT_SAMPLE_TASKS));
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    localStorage.removeItem(STORAGE_KEYS.SNOOZED);
  }
};
