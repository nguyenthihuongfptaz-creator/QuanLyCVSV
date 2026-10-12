/**
 * PlanSmart - Authentication & Profile Management
 */

const Auth = {
  currentUser: null,

  init() {
    this.currentUser = Storage.getCurrentUser();
    this.updateUserUI();
    this.bindEvents();
  },

  updateUserUI() {
    const loggedInWrap = document.getElementById('authLoggedIn');
    const loggedOutWrap = document.getElementById('authLoggedOut');
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    const sidebarUserName = document.getElementById('sidebarUserName');
    const sidebarUserEmail = document.getElementById('sidebarUserEmail');
    const topbarAvatar = document.getElementById('topbarAvatar');
    const topbarUserName = document.getElementById('topbarUserName');
    const dropdownUserName = document.getElementById('dropdownUserName');
    const dropdownUserEmail = document.getElementById('dropdownUserEmail');
    const streakCount = document.getElementById('streakCount');

    if (this.currentUser) {
      if (loggedInWrap) loggedInWrap.style.display = 'block';
      if (loggedOutWrap) loggedOutWrap.style.display = 'none';

      const shortName = this.currentUser.fullName.split(' ').pop();
      const avatarUrl = this.currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(this.currentUser.fullName)}`;

      if (sidebarAvatar) sidebarAvatar.src = avatarUrl;
      if (sidebarUserName) sidebarUserName.textContent = this.currentUser.fullName;
      if (sidebarUserEmail) sidebarUserEmail.textContent = this.currentUser.email;

      if (topbarAvatar) topbarAvatar.src = avatarUrl;
      if (topbarUserName) topbarUserName.textContent = shortName;

      if (dropdownUserName) dropdownUserName.textContent = this.currentUser.fullName;
      if (dropdownUserEmail) dropdownUserEmail.textContent = this.currentUser.email;

      if (streakCount) streakCount.textContent = this.currentUser.streak || 5;
    } else {
      if (loggedInWrap) loggedInWrap.style.display = 'none';
      if (loggedOutWrap) loggedOutWrap.style.display = 'flex';
      if (sidebarUserName) sidebarUserName.textContent = 'Chưa đăng nhập';
      if (sidebarUserEmail) sidebarUserEmail.textContent = 'Khách viếng thăm';
    }
  },

  register(fullName, email, password) {
    if (!fullName || !email || !password) {
      throw new Error('Vui lòng điền đầy đủ các thông tin bắt buộc.');
    }
    if (password.length < 6) {
      throw new Error('Mật khẩu cần tối thiểu 6 ký tự.');
    }

    const users = Storage.getUsers();
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('Địa chỉ email này đã được sử dụng. Vui lòng đăng nhập.');
    }

    const newUser = {
      id: 'user_' + Date.now(),
      email: email.trim().toLowerCase(),
      password: password,
      fullName: fullName.trim(),
      title: 'Thành viên mới',
      bio: 'Người dùng PlanSmart',
      phone: '',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`,
      joinedDate: new Date().toLocaleDateString('vi-VN'),
      streak: 1
    };

    users.push(newUser);
    Storage.saveUsers(users);
    Storage.setCurrentUser(newUser);
    this.currentUser = newUser;

    this.updateUserUI();
    return newUser;
  },

  login(email, password) {
    const users = Storage.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!user) {
      throw new Error('Không tìm thấy tài khoản với email này.');
    }
    if (user.password !== password) {
      throw new Error('Mật khẩu không chính xác. Vui lòng thử lại.');
    }

    Storage.setCurrentUser(user);
    this.currentUser = user;
    this.updateUserUI();
    return user;
  },

  logout() {
    Storage.setCurrentUser(null);
    this.currentUser = null;
    this.updateUserUI();
  },

  updateProfile(data) {
    if (!this.currentUser) throw new Error('Chưa đăng nhập.');

    const users = Storage.getUsers();
    const index = users.findIndex(u => u.id === this.currentUser.id);

    const updated = {
      ...this.currentUser,
      fullName: data.fullName || this.currentUser.fullName,
      title: data.title || this.currentUser.title,
      bio: data.bio || this.currentUser.bio,
      phone: data.phone || this.currentUser.phone,
      avatar: data.avatar || this.currentUser.avatar
    };

    if (index !== -1) {
      users[index] = updated;
      Storage.saveUsers(users);
    }
    Storage.setCurrentUser(updated);
    this.currentUser = updated;
    this.updateUserUI();
    return updated;
  },

  changePassword(oldPassword, newPassword) {
    if (!this.currentUser) throw new Error('Chưa đăng nhập.');
    if (this.currentUser.password !== oldPassword) {
      throw new Error('Mật khẩu hiện tại không chính xác.');
    }
    if (newPassword.length < 6) {
      throw new Error('Mật khẩu mới phải có tối thiểu 6 ký tự.');
    }

    const users = Storage.getUsers();
    const index = users.findIndex(u => u.id === this.currentUser.id);

    this.currentUser.password = newPassword;
    if (index !== -1) {
      users[index].password = newPassword;
      Storage.saveUsers(users);
    }
    Storage.setCurrentUser(this.currentUser);
    return true;
  },

  populateProfileModal() {
    if (!this.currentUser) return;
    const fullNameInput = document.getElementById('profileFullName');
    const emailInput = document.getElementById('profileEmail');
    const titleInput = document.getElementById('profileTitle');
    const phoneInput = document.getElementById('profilePhone');
    const bioInput = document.getElementById('profileBio');
    const previewAvatar = document.getElementById('profilePreviewAvatar');
    const avatarSeedInput = document.getElementById('avatarSeedInput');
    const joinedDateEl = document.getElementById('profileJoinedDate');

    if (fullNameInput) fullNameInput.value = this.currentUser.fullName || '';
    if (emailInput) emailInput.value = this.currentUser.email || '';
    if (titleInput) titleInput.value = this.currentUser.title || '';
    if (phoneInput) phoneInput.value = this.currentUser.phone || '';
    if (bioInput) bioInput.value = this.currentUser.bio || '';
    if (joinedDateEl) joinedDateEl.textContent = this.currentUser.joinedDate || '12/10/2026';
    if (previewAvatar) previewAvatar.src = this.currentUser.avatar;
    if (avatarSeedInput) avatarSeedInput.value = this.currentUser.fullName;

    // Calculate user task statistics
    const allTasks = Storage.getTasks().filter(t => t.userId === this.currentUser.id);
    const completedTasks = allTasks.filter(t => t.completed);
    const rate = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;

    const totalTasksEl = document.getElementById('profileTotalTasksCount');
    const compTasksEl = document.getElementById('profileCompletedTasksCount');
    const successRateEl = document.getElementById('profileSuccessRate');

    if (totalTasksEl) totalTasksEl.textContent = allTasks.length;
    if (compTasksEl) compTasksEl.textContent = completedTasks.length;
    if (successRateEl) successRateEl.textContent = `${rate}%`;
  },

  bindEvents() {
    // Auth Modal open triggers
    const btnOpenLogin = document.getElementById('btnOpenLogin');
    const btnOpenRegister = document.getElementById('btnOpenRegister');
    const authModal = document.getElementById('authModal');
    const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');

    if (btnOpenLogin) {
      btnOpenLogin.addEventListener('click', () => {
        this.switchAuthTab('login');
        authModal.classList.add('active');
      });
    }
    if (btnOpenRegister) {
      btnOpenRegister.addEventListener('click', () => {
        this.switchAuthTab('register');
        authModal.classList.add('active');
      });
    }
    if (closeAuthModalBtn) {
      closeAuthModalBtn.addEventListener('click', () => {
        authModal.classList.remove('active');
      });
    }

    // Tab switching in Auth Modal
    const tabLogin = document.getElementById('authTabLogin');
    const tabRegister = document.getElementById('authTabRegister');
    if (tabLogin) tabLogin.addEventListener('click', () => this.switchAuthTab('login'));
    if (tabRegister) tabRegister.addEventListener('click', () => this.switchAuthTab('register'));

    // Login Form Submit
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const pass = document.getElementById('loginPassword').value;
        try {
          this.login(email, pass);
          authModal.classList.remove('active');
          App.showToast(`Chào mừng ${this.currentUser.fullName} quay trở lại!`, 'success');
          App.refreshAllViews();
        } catch (err) {
          App.showToast(err.message, 'danger');
        }
      });
    }

    // Quick Demo Login Button
    const btnQuickDemo = document.getElementById('btnQuickDemoLogin');
    if (btnQuickDemo) {
      btnQuickDemo.addEventListener('click', () => {
        Storage.resetDemoData();
        this.currentUser = Storage.getCurrentUser();
        this.updateUserUI();
        authModal.classList.remove('active');
        App.showToast('Đã đăng nhập tài khoản mẫu demo thành công!', 'success');
        App.refreshAllViews();
      });
    }

    // Register Form Submit
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('regFullName').value;
        const email = document.getElementById('regEmail').value;
        const pass = document.getElementById('regPassword').value;
        const confirmPass = document.getElementById('regConfirmPassword').value;

        if (pass !== confirmPass) {
          App.showToast('Mật khẩu xác nhận không khớp.', 'danger');
          return;
        }

        try {
          this.register(name, email, pass);
          authModal.classList.remove('active');
          App.showToast(`Tạo tài khoản thành công! Xin chào ${name}.`, 'success');
          App.refreshAllViews();
        } catch (err) {
          App.showToast(err.message, 'danger');
        }
      });
    }

    // Logout
    const dropdownLogout = document.getElementById('dropdownLogout');
    if (dropdownLogout) {
      dropdownLogout.addEventListener('click', () => {
        this.logout();
        const dropdown = document.getElementById('profileDropdown');
        if (dropdown) dropdown.classList.remove('active');
        App.showToast('Bạn đã đăng xuất.', 'info');
        App.refreshAllViews();
      });
    }

    // Profile Dropdown Trigger
    const profileTriggerBtn = document.getElementById('topbarProfileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    if (profileTriggerBtn && profileDropdown) {
      profileTriggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('active');
      });
      document.addEventListener('click', () => {
        profileDropdown.classList.remove('active');
      });
    }

    // Open Profile Modal
    const dropdownOpenProfile = document.getElementById('dropdownOpenProfile');
    const openProfileMenuBtn = document.getElementById('openProfileMenuBtn');
    const profileModal = document.getElementById('profileModal');
    const closeProfileModalBtn = document.getElementById('closeProfileModalBtn');
    const btnCancelProfile = document.getElementById('btnCancelProfile');

    const openProfile = () => {
      this.populateProfileModal();
      if (profileDropdown) profileDropdown.classList.remove('active');
      if (profileModal) profileModal.classList.add('active');
    };

    if (dropdownOpenProfile) dropdownOpenProfile.addEventListener('click', openProfile);
    if (openProfileMenuBtn) openProfileMenuBtn.addEventListener('click', openProfile);
    if (closeProfileModalBtn) closeProfileModalBtn.addEventListener('click', () => profileModal.classList.remove('active'));
    if (btnCancelProfile) btnCancelProfile.addEventListener('click', () => profileModal.classList.remove('active'));

    // Profile Modal Tabs
    const profileTabBtns = document.querySelectorAll('.profile-tab-btn');
    profileTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        profileTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.profile-tab-content').forEach(content => {
          if (content.dataset.tabContent === targetTab) {
            content.style.display = 'block';
          } else {
            content.style.display = 'none';
          }
        });
      });
    });

    // Random Avatar Generator
    const btnRandomAvatar = document.getElementById('btnRandomAvatar');
    const previewAvatar = document.getElementById('profilePreviewAvatar');
    const avatarSeedInput = document.getElementById('avatarSeedInput');
    if (btnRandomAvatar && previewAvatar) {
      btnRandomAvatar.addEventListener('click', () => {
        const seeds = ['Felix', 'Luna', 'Alex', 'Jasper', 'Max', 'Zoe', 'Sam', 'Milo', 'Leo', 'Nova'];
        const randomSeed = seeds[Math.floor(Math.random() * seeds.length)] + Math.floor(Math.random() * 100);
        const newUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`;
        previewAvatar.src = newUrl;
        if (avatarSeedInput) avatarSeedInput.value = randomSeed;
      });
    }

    // Save Profile Info
    const profileInfoForm = document.getElementById('profileInfoForm');
    if (profileInfoForm) {
      profileInfoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fullName = document.getElementById('profileFullName').value;
        const title = document.getElementById('profileTitle').value;
        const phone = document.getElementById('profilePhone').value;
        const bio = document.getElementById('profileBio').value;
        const avatar = previewAvatar ? previewAvatar.src : '';

        try {
          this.updateProfile({ fullName, title, phone, bio, avatar });
          profileModal.classList.remove('active');
          App.showToast('Cập nhật hồ sơ cá nhân thành công!', 'success');
        } catch (err) {
          App.showToast(err.message, 'danger');
        }
      });
    }

    // Change Password Form
    const profilePasswordForm = document.getElementById('profilePasswordForm');
    if (profilePasswordForm) {
      profilePasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const oldPass = document.getElementById('oldPasswordInput').value;
        const newPass = document.getElementById('newPasswordInput').value;
        const confirmPass = document.getElementById('confirmNewPasswordInput').value;

        if (newPass !== confirmPass) {
          App.showToast('Mật khẩu mới xác nhận không khớp.', 'danger');
          return;
        }

        try {
          this.changePassword(oldPass, newPass);
          profileModal.classList.remove('active');
          profilePasswordForm.reset();
          App.showToast('Đổi mật khẩu thành công!', 'success');
        } catch (err) {
          App.showToast(err.message, 'danger');
        }
      });
    }

    // Toggle password eye icon buttons
    document.querySelectorAll('.toggle-password-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        if (input) {
          const isPass = input.type === 'password';
          input.type = isPass ? 'text' : 'password';
          const icon = btn.querySelector('i');
          if (icon) {
            icon.className = isPass ? 'ph ph-eye-slash' : 'ph ph-eye';
          }
        }
      });
    });
  },

  switchAuthTab(tab) {
    const tabLogin = document.getElementById('authTabLogin');
    const tabRegister = document.getElementById('authTabRegister');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const title = document.getElementById('authModalTitle');

    if (tab === 'login') {
      if (tabLogin) tabLogin.classList.add('active');
      if (tabRegister) tabRegister.classList.remove('active');
      if (loginForm) loginForm.style.display = 'flex';
      if (registerForm) registerForm.style.display = 'none';
      if (title) title.textContent = 'Đăng Nhập PlanSmart';
    } else {
      if (tabLogin) tabLogin.classList.remove('active');
      if (tabRegister) tabRegister.classList.add('active');
      if (loginForm) loginForm.style.display = 'none';
      if (registerForm) registerForm.style.display = 'flex';
      if (title) title.textContent = 'Đăng Ký Tài Khoản Mới';
    }
  }
};
