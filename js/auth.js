// نظام التحقق من المصادقة والصلاحيات
const AUTH_CONFIG = {
  loginPage: "login.html",
  homePage: "index.html",
  sessionTimeout: 8 * 60 * 60 * 1000, // 8 ساعات
  checkInterval: 60000, // التحقق كل دقيقة
};

// تعريف الصلاحيات لكل صفحة
// تعديل PAGE_PERMISSIONS للسماح للجميع بالوصول
const PAGE_PERMISSIONS = {
  "index.html": {
    required: [],
    title: "الرئيسية",
    allowAll: true, // السماح للجميع
  },
  "add_data.html": {
    required: [],
    title: "إضافة عضو جديد",
    allowAll: true, // السماح للجميع
  },
  "members.html": {
    required: [],
    title: "قائمة الأعضاء",
    allowAll: true, // السماح للجميع
  },
  "reports.html": {
    required: [],
    title: "التقارير المالية",
    allowAll: true, // السماح للجميع
  },
  "committee.html": {
    required: [],
    title: "لجنة إدارة الدار",
    allowAll: true, // السماح للجميع
  },
  "admin-management.html": {
    required: ["super_admin"],
    title: "إدارة المسؤولين",
    allowAll: false, // للمسؤولين الرئيسيين فقط
  },
};

// تحديث دالة التحقق من الصلاحيات
function checkPermissions(userPermissions, requiredPermissions, pageInfo) {
  // إذا كانت الصفحة تسمح للجميع، السماح بالدخول
  if (pageInfo.allowAll === true) {
    return true;
  }

  // إذا لم تكن هناك صلاحيات مطلوبة، السماح بالدخول
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  // إذا كان المستخدم لديه صلاحية all، السماح بالدخول
  if (userPermissions.includes("all")) {
    return true;
  }

  // التحقق إذا كان المستخدم لديه أي من الصلاحيات المطلوبة
  const hasPermission = requiredPermissions.some((requiredPerm) =>
    userPermissions.includes(requiredPerm)
  );

  return hasPermission;
}

// تحديث دالة التحقق من المصادقة والصلاحيات
function checkAuthentication(pageName) {
  const session = getSession();
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  // النتيجة الافتراضية
  const result = {
    authenticated: false,
    authorized: false,
    session: null,
    pageInfo: null,
    requiredPermissions: [],
    userPermissions: [],
  };

  // الحصول على معلومات الصفحة
  result.pageInfo =
    PAGE_PERMISSIONS[pageName] || PAGE_PERMISSIONS["index.html"];
  result.requiredPermissions = result.pageInfo.required;

  // التحقق من تسجيل الدخول
  if (!session || !session.isLoggedIn || !isLoggedIn) {
    return result;
  }

  result.authenticated = true;
  result.session = session;
  result.userPermissions = session.permissions || ["all"]; // منح صلاحيات افتراضية

  // التحقق من انتهاء الجلسة
  const now = Date.now();
  const sessionAge = now - session.loginTime;

  if (sessionAge > AUTH_CONFIG.sessionTimeout) {
    clearSession();
    showSessionExpiredMessage();
    return { ...result, authenticated: false };
  }

  // التحقق من الصلاحيات
  result.authorized = checkPermissions(
    result.userPermissions,
    result.requiredPermissions,
    result.pageInfo
  );

  return result;
}
// قائمة الصلاحيات المقبولة
const ALL_PERMISSIONS = {
  view: "عرض البيانات",
  add: "إضافة بيانات",
  edit: "تعديل البيانات",
  delete: "حذف البيانات",
  reports: "التقارير",
  committee: "لجنة الإدارة",
  admins: "إدارة المسؤولين",
  super_admin: "مدير النظام",
};

// التحقق من تسجيل الدخول عند تحميل أي صفحة
document.addEventListener("DOMContentLoaded", function () {
  // تخطي صفحة تسجيل الدخول نفسها
  if (window.location.pathname.includes("login.html")) {
    return;
  }

  // الحصول على اسم الصفحة الحالية
  const currentPage = getCurrentPageName();

  // التحقق من المصادقة والصلاحيات
  const authResult = checkAuthentication(currentPage);

  if (authResult.authenticated && authResult.authorized) {
    // إضافة زر تسجيل الخروج إذا كان مسجلاً
    addLogoutButton();

    // مراقبة انتهاء الجلسة
    startSessionMonitor();

    // تحديث عنوان الصفحة
    updatePageTitle(currentPage);
  } else if (!authResult.authenticated) {
    // إذا لم يكن مسجلاً
    redirectToLogin();
  } else {
    // إذا كان مسجلاً ولكن ليس لديه صلاحية
    showAccessDenied(authResult);
  }
});

// جلب اسم الصفحة الحالية
function getCurrentPageName() {
  const path = window.location.pathname;
  return path.substring(path.lastIndexOf("/") + 1) || "index.html";
}

// التحقق من المصادقة والصلاحيات
function checkAuthentication(pageName) {
  const session = getSession();
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  // النتيجة الافتراضية
  const result = {
    authenticated: false,
    authorized: false,
    session: null,
    pageInfo: null,
    requiredPermissions: [],
    userPermissions: [],
  };

  // الحصول على معلومات الصفحة
  result.pageInfo =
    PAGE_PERMISSIONS[pageName] || PAGE_PERMISSIONS["index.html"];
  result.requiredPermissions = result.pageInfo.required;

  // التحقق من تسجيل الدخول
  if (!session || !session.isLoggedIn || !isLoggedIn) {
    return result;
  }

  result.authenticated = true;
  result.session = session;
  result.userPermissions = session.permissions || [];

  // التحقق من انتهاء الجلسة
  const now = Date.now();
  const sessionAge = now - session.loginTime;

  if (sessionAge > AUTH_CONFIG.sessionTimeout) {
    clearSession();
    showSessionExpiredMessage();
    return { ...result, authenticated: false };
  }

  // التحقق من الصلاحيات
  result.authorized = checkPermissions(
    result.userPermissions,
    result.requiredPermissions
  );

  return result;
}

// التحقق من الصلاحيات
function checkPermissions(userPermissions, requiredPermissions) {
  // إذا لم تكن هناك صلاحيات مطلوبة، السماح بالدخول
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  // إذا كان المستخدم لديه صلاحية super_admin، السماح بالدخول
  if (
    userPermissions.includes("super_admin") ||
    userPermissions.includes("all")
  ) {
    return true;
  }

  // التحقق إذا كان المستخدم لديه أي من الصلاحيات المطلوبة
  const hasPermission = requiredPermissions.some((requiredPerm) =>
    userPermissions.includes(requiredPerm)
  );

  return hasPermission;
}

// جلب الجلسة الحالية
function getSession() {
  const session =
    sessionStorage.getItem("userSession") ||
    localStorage.getItem("userSession");
  return session ? JSON.parse(session) : null;
}

// مسح الجلسة
function clearSession() {
  sessionStorage.removeItem("userSession");
  localStorage.removeItem("userSession");
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("currentUserRole");
  localStorage.removeItem("currentUserFullName");
}

// توجيه إلى صفحة تسجيل الدخول
function redirectToLogin() {
  // حفظ الصفحة الحالية للعودة إليها بعد الدخول
  const currentPage = window.location.pathname;
  if (currentPage !== "/" && !currentPage.includes("login.html")) {
    sessionStorage.setItem("redirectAfterLogin", currentPage);
  }

  window.location.href = AUTH_CONFIG.loginPage;
}

// إظهار رسالة رفض الوصول
function showAccessDenied(authResult) {
  const { session, pageInfo, requiredPermissions, userPermissions } =
    authResult;

  // إنشاء صفحة خطأ
  document.body.innerHTML = "";

  const errorPage = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>رفض الوصول - دار أبناء سلنارتي</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap" rel="stylesheet">
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    min-height: 100vh;
                    background: linear-gradient(135deg, #1e3a6f 0%, #2c5aa0 100%);
                    font-family: 'Cairo', sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                }
                
                .access-denied-container {
                    max-width: 800px;
                    width: 90%;
                    background: rgba(255, 255, 255, 0.95);
                    border-radius: 20px;
                    padding: 40px;
                    text-align: center;
                    box-shadow: 0 15px 50px rgba(0, 0, 0, 0.3);
                }
                
                .error-icon {
                    font-size: 80px;
                    color: #dc3545;
                    margin-bottom: 20px;
                }
                
                h1 {
                    color: #dc3545;
                    margin: 0 0 20px 0;
                    font-size: 36px;
                }
                
                h2 {
                    color: #2c5aa0;
                    margin: 30px 0 15px 0;
                }
                
                p {
                    color: #333;
                    line-height: 1.6;
                    font-size: 18px;
                }
                
                .user-info {
                    background-color: #f8f9fa;
                    border-radius: 10px;
                    padding: 20px;
                    margin: 20px 0;
                    text-align: right;
                }
                
                .user-info p {
                    margin: 10px 0;
                    color: #495057;
                }
                
                .permissions-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 15px;
                    margin: 20px 0;
                }
                
                .permission-card {
                    background-color: white;
                    border: 1px solid #dee2e6;
                    border-radius: 8px;
                    padding: 15px;
                    text-align: right;
                }
                
                .permission-card.required {
                    border-right: 4px solid #dc3545;
                }
                
                .permission-card.required h4 {
                    color: #dc3545;
                }
                
                .permission-card.has {
                    border-right: 4px solid #28a745;
                }
                
                .permission-card.has h4 {
                    color: #28a745;
                }
                
                .permission-card.missing {
                    border-right: 4px solid #ffc107;
                }
                
                .permission-card.missing h4 {
                    color: #ffc107;
                }
                
                .action-buttons {
                    display: flex;
                    gap: 15px;
                    justify-content: center;
                    margin-top: 30px;
                    flex-wrap: wrap;
                }
                
                .btn {
                    padding: 12px 30px;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 16px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    transition: all 0.3s ease;
                }
                
                .btn-primary {
                    background: linear-gradient(135deg, #2c5aa0, #1e3a6f);
                    color: white;
                }
                
                .btn-secondary {
                    background: linear-gradient(135deg, #6c757d, #495057);
                    color: white;
                }
                
                .btn-danger {
                    background: linear-gradient(135deg, #dc3545, #c82333);
                    color: white;
                }
                
                .btn:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
                }
                
                .missing-permissions {
                    background-color: #fff3cd;
                    border: 1px solid #ffeaa7;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                    color: #856404;
                }
                
                .missing-permissions ul {
                    margin: 10px 0;
                    padding-right: 20px;
                }
            </style>
        </head>
        <body>
            <div class="access-denied-container">
                <div class="error-icon">
                    <i class="fas fa-ban"></i>
                </div>
                
                <h1>⛔ ليس لديك صلاحية الوصول</h1>
                
                <p style="font-size: 20px; color: #dc3545;">
                    عفواً، ليس لديك الصلاحيات الكافية للوصول إلى هذه الصفحة.
                </p>
                
                <div class="user-info">
                    <p><strong>المستخدم:</strong> ${
                      session.fullName || session.username
                    }</p>
                    <p><strong>الدور:</strong> ${getRoleName(session.role)}</p>
                    <p><strong>الصفحة المطلوبة:</strong> ${pageInfo.title}</p>
                </div>
                
                <h2>تفاصيل الصلاحيات</h2>
                
                <div class="permissions-container">
                    <div class="permission-card required">
                        <h4><i class="fas fa-lock"></i> الصلاحيات المطلوبة:</h4>
                        ${requiredPermissions
                          .map(
                            (perm) => `
                            <p>• ${ALL_PERMISSIONS[perm] || perm}</p>
                        `
                          )
                          .join("")}
                    </div>
                    
                    <div class="permission-card has">
                        <h4><i class="fas fa-check-circle"></i> الصلاحيات المتوفرة:</h4>
                        ${userPermissions
                          .map(
                            (perm) => `
                            <p>• ${ALL_PERMISSIONS[perm] || perm}</p>
                        `
                          )
                          .join("")}
                    </div>
                </div>
                
                ${
                  requiredPermissions.some(
                    (perm) => !userPermissions.includes(perm)
                  )
                    ? `
                    <div class="missing-permissions">
                        <h4><i class="fas fa-exclamation-triangle"></i> الصلاحيات الناقصة:</h4>
                        <ul>
                            ${requiredPermissions
                              .filter((perm) => !userPermissions.includes(perm))
                              .map(
                                (perm) =>
                                  `<li>${ALL_PERMISSIONS[perm] || perm}</li>`
                              )
                              .join("")}
                        </ul>
                    </div>
                `
                    : ""
                }
                
                <div class="action-buttons">
                    <button onclick="window.location.href='index.html'" class="btn btn-primary">
                        <i class="fas fa-home"></i> العودة للرئيسية
                    </button>
                    
                    <button onclick="window.history.back()" class="btn btn-secondary">
                        <i class="fas fa-arrow-right"></i> العودة للخلف
                    </button>
                    
                    <button onclick="handleLogout()" class="btn btn-danger">
                        <i class="fas fa-sign-out-alt"></i> تسجيل الخروج
                    </button>
                </div>
                
                <p style="margin-top: 30px; color: #6c757d; font-size: 14px;">
                    <i class="fas fa-info-circle"></i>
                    للاستفسار عن الصلاحيات، يرجى التواصل مع مدير النظام
                </p>
            </div>
            
            <script>
                function handleLogout() {
                    // مسح الجلسة
                    sessionStorage.removeItem('userSession');
                    localStorage.removeItem('userSession');
                    localStorage.removeItem('isLoggedIn');
                    localStorage.removeItem('currentUser');
                    localStorage.removeItem('currentUserRole');
                    localStorage.removeItem('currentUserFullName');
                    
                    // توجيه إلى صفحة تسجيل الدخول
                    window.location.href = 'login.html';
                }
            </script>
        </body>
        </html>
    `;

  document.write(errorPage);
  document.close();
}

// إظهار رسالة انتهاء الجلسة
function showSessionExpiredMessage() {
  // يمكن عرض رسالة إذا أردت
  console.log("انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى");
}

// إضافة زر تسجيل الخروج
function addLogoutButton() {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const currentUserFullName = localStorage.getItem("currentUserFullName");
  const currentUserRole = localStorage.getItem("currentUserRole");

  if (!isLoggedIn) return;

  // البحث عن الهيدر
  const header = document.querySelector("header");
  if (!header) return;

  // إنشاء حاوية رئيسية
  const authContainer = document.createElement("div");
  authContainer.style.cssText = `
        display: flex;
        width: 100%;
        justify-content: space-between;
        align-items: center;
        padding: 10px 20px;
        background-color: rgba(44, 90, 160, 0.1);
        border-radius: 10px;
        margin-top: 10px;
    `;

  // قسم اليسار: زر تسجيل الخروج
  const leftSection = document.createElement("div");
  leftSection.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: flex-start;
        flex: 1;
    `;

  const logoutBtn = document.createElement("button");
  logoutBtn.id = "logoutBtn";
  logoutBtn.className = "logout-btn";
  logoutBtn.style.cssText = `
        background: linear-gradient(135deg, #dc3545, #c82333);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 20px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
        white-space: nowrap;
    `;
  logoutBtn.innerHTML = `
        <i class="fas fa-sign-out-alt"></i>
        تسجيل الخروج
    `;

  leftSection.appendChild(logoutBtn);

  // قسم اليمين: رسالة الترحيب مع معلومات المسؤول
  const rightSection = document.createElement("div");
  rightSection.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: flex-end;
        flex: 1;
        gap: 15px;
    `;

  // نقش يوضح نوع المسؤول
  const roleBadge = document.createElement("div");
  roleBadge.style.cssText = `
        padding: 8px 15px;
        background-color: ${getRoleColor(currentUserRole)};
        border-radius: 20px;
        color: white;
        font-weight: 600;
        font-size: 12px;
        white-space: nowrap;
    `;
  roleBadge.innerHTML = getRoleName(currentUserRole);

  // رسالة الترحيب
  const welcomeMsg = document.createElement("div");
  welcomeMsg.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 15px;
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        color: #333;
        font-weight: 600;
        white-space: nowrap;
    `;
  welcomeMsg.innerHTML = `
        <i class="fas fa-user-check"></i>
        <span>${currentUserFullName || "مسؤول النظام"}</span>
    `;

  rightSection.appendChild(roleBadge);
  rightSection.appendChild(welcomeMsg);

  // إضافة الأقسام إلى الحاوية الرئيسية
  authContainer.appendChild(leftSection);
  authContainer.appendChild(rightSection);

  // إضافة الحاوية بعد الهيدر
  header.parentNode.insertBefore(authContainer, header.nextSibling);

  // إضافة حدث تسجيل الخروج
  logoutBtn.addEventListener("click", handleLogout);
}

// التعامل مع تسجيل الخروج
function handleLogout() {
  if (confirm("هل تريد تسجيل الخروج من النظام؟")) {
    // مسح الجلسة
    clearSession();

    // إعادة التوجيه إلى صفحة تسجيل الدخول
    window.location.href = AUTH_CONFIG.loginPage;
  }
}

// مراقبة انتهاء الجلسة
function startSessionMonitor() {
  setInterval(() => {
    const session = getSession();
    if (session) {
      const now = Date.now();
      const sessionAge = now - session.loginTime;
      const remainingTime = AUTH_CONFIG.sessionTimeout - sessionAge;

      // إظهار تنبيه قبل 5 دقائق من انتهاء الجلسة
      if (remainingTime > 0 && remainingTime <= 5 * 60 * 1000) {
        showSessionWarning(Math.ceil(remainingTime / 60000));
      }
    }
  }, AUTH_CONFIG.checkInterval);
}

// إظهار تحذير انتهاء الجلسة
function showSessionWarning(minutesLeft) {
  // منع عرض التنبيهات المتعددة
  if (sessionStorage.getItem("sessionWarningShown")) {
    return;
  }

  const warningMessage = `
        <div class="session-warning" style="
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #ffc107, #ff9800);
            color: #856404;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 15px;
            animation: slideDown 0.5s ease;
        ">
            <i class="fas fa-clock" style="font-size: 24px;"></i>
            <div>
                <strong>انتباه:</strong> جلسة العمل ستنتهي خلال ${minutesLeft} دقيقة.
                <br>
                <small>يرجى حفظ عملك قبل انتهاء الجلسة.</small>
            </div>
            <button onclick="this.parentElement.remove(); sessionStorage.removeItem('sessionWarningShown');" 
                style="
                    background: none;
                    border: none;
                    color: #856404;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 5px;
                ">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

  // إضافة التنبيه إلى الصفحة
  document.body.insertAdjacentHTML("afterbegin", warningMessage);

  // وضع علامة بأن التنبيه قد تم عرضه
  sessionStorage.setItem("sessionWarningShown", "true");

  // إزالة العلامة بعد دقيقة
  setTimeout(() => {
    sessionStorage.removeItem("sessionWarningShown");
  }, 60000);
}

// دالات مساعدة للأدوار
function getRoleName(role) {
  const roles = {
    super_admin: "مدير النظام",
    accountant: "محاسب",
    viewer: "مشرف",
    editor: "محرر",
  };
  return roles[role] || role;
}

function getRoleColor(role) {
  const colors = {
    super_admin: "#dc3545",
    accountant: "#28a745",
    viewer: "#17a2b8",
    editor: "#ffc107",
  };
  return colors[role] || "#6c757d";
}

// تحديث عنوان الصفحة
function updatePageTitle(pageName) {
  const pageInfo = PAGE_PERMISSIONS[pageName];
  if (pageInfo && document.title) {
    document.title = `${pageInfo.title} - دار أبناء سلنارتي`;
  }
}

// إضافة أنيميشن للتنبيه
const warningStyle = document.createElement("style");
warningStyle.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translate(-50%, -100%);
        }
        to {
            opacity: 1;
            transform: translate(-50%, 0);
        }
    }
`;
document.head.appendChild(warningStyle);
