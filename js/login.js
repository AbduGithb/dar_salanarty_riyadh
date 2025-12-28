// نظام تسجيل الدخول
let loginAttempts = 0;
const maxAttempts = 5;
const lockoutTime = 15 * 60 * 1000; // 15 دقيقة بالملي ثانية

// تهيئة الصفحة
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 بدء تهيئة صفحة تسجيل الدخول...");

  // التحقق إذا كان المستخدم مسجل الدخول بالفعل
  checkExistingLogin();

  // تحديث حالة النظام
  updateSystemStatus();

  // إعداد الأحداث
  setupEventListeners();

  console.log("✅ تم تهيئة صفحة تسجيل الدخول بنجاح");
});

// التحقق من تسجيل الدخول المسبق
function checkExistingLogin() {
  const session = getSession();

  if (session && session.isLoggedIn) {
    const now = Date.now();
    const sessionAge = now - session.loginTime;
    const sessionTimeout = 8 * 60 * 60 * 1000; // 8 ساعات

    if (sessionAge < sessionTimeout) {
      // توجيه المستخدم للصفحة الرئيسية
      window.location.href = "index.html";
    } else {
      // انتهت الجلسة، قم بتسجيل الخروج
      clearSession();
    }
  }

  // التحقق من القفل المؤقت
  checkLoginLock();
}

// التحقق من حالة القفل
function checkLoginLock() {
  const lock = localStorage.getItem("loginLock");
  if (lock) {
    const lockData = JSON.parse(lock);
    const now = Date.now();

    if (now < lockData.unlockTime) {
      // الحساب مقفل
      const remaining = Math.ceil((lockData.unlockTime - now) / 1000 / 60);
      showMessage(
        `حسابك مقفل مؤقتاً. يرجى المحاولة بعد ${remaining} دقيقة`,
        "error"
      );
      disableLoginForm();
    } else {
      // انتهت مدة القفل
      localStorage.removeItem("loginLock");
      localStorage.removeItem("loginAttempts");
    }
  }
}

// إعداد الأحداث
function setupEventListeners() {
  // حدث إرسال النموذج
  document.getElementById("loginForm").addEventListener("submit", handleLogin);

  // حدث إظهار/إخفاء كلمة المرور
  document
    .getElementById("togglePassword")
    .addEventListener("click", togglePasswordVisibility);

  // حدث نسيت كلمة المرور
  document
    .getElementById("forgotPassword")
    .addEventListener("click", handleForgotPassword);

  // إضافة تأثيرات عند التركيز على الحقول
  setupInputEffects();
}

// التعامل مع تسجيل الدخول
async function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const rememberMe = document.getElementById("rememberMe").checked;

  // التحقق من القفل
  if (isAccountLocked()) {
    showMessage(
      "حسابك مقفل مؤقتاً بسبب عدة محاولات فاشلة. يرجى المحاولة لاحقاً.",
      "error"
    );
    return;
  }

  // التحقق من صحة المدخلات
  if (!validateInputs(username, password)) {
    return;
  }

  // إظهار شاشة التحميل
  showLoading(true);

  try {
    // محاكاة تأخير الشبكة
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // التحقق من بيانات الدخول
    const isValid = await validateCredentials(username, password);

    if (isValid) {
      // نجاح تسجيل الدخول
      await handleSuccessfulLogin(username, rememberMe);
    } else {
      // فشل تسجيل الدخول
      handleFailedLogin();
    }
  } catch (error) {
    console.error("❌ خطأ في تسجيل الدخول:", error);
    showMessage("حدث خطأ في النظام. يرجى المحاولة مرة أخرى.", "error");
  } finally {
    showLoading(false);
  }
}

// التحقق من صحة المدخلات
function validateInputs(username, password) {
  if (!username) {
    showMessage("يرجى إدخال اسم المستخدم", "warning");
    document.getElementById("username").focus();
    return false;
  }

  if (!password) {
    showMessage("يرجى إدخال كلمة المرور", "warning");
    document.getElementById("password").focus();
    return false;
  }

  if (password.length < 6) {
    showMessage("كلمة المرور يجب أن تكون على الأقل 6 أحرف", "warning");
    document.getElementById("password").focus();
    return false;
  }

  return true;
}

// التحقق من بيانات الاعتماد
async function validateCredentials(username, password) {
  try {
    // جلب كلمات المرور المخزنة
    const storedPassword = await getStoredPassword();

    if (!storedPassword) {
      // إذا لم تكن هناك كلمة مرور مخزنة، استخدم الافتراضي
      return checkDefaultCredentials(username, password);
    }

    // فك تشفير كلمة المرور المخزنة والمقارنة
    return await comparePasswords(password, storedPassword);
  } catch (error) {
    console.error("❌ خطأ في التحقق من كلمة المرور:", error);
    return false;
  }
}

// التحقق من بيانات الاعتماد الافتراضية
function checkDefaultCredentials(username, password) {
  // كلمة المرور الافتراضية للمرة الأولى
  const defaultUsername = "admin";
  const defaultPassword = "salanarty2024";

  if (username === defaultUsername && password === defaultPassword) {
    // حفظ كلمة المرور الجديدة (مشفرة)
    saveNewPassword(password);
    return true;
  }

  return false;
}

// فك تشفير ومقارنة كلمات المرور
async function comparePasswords(inputPassword, storedPassword) {
  try {
    // في نظام حقيقي، يجب استخدام تشفير من طرف واحد (hashing)
    // هنا نستخدم تشفير بسيط للتوضيح
    const encryptedInput = await simpleEncrypt(inputPassword);
    return encryptedInput === storedPassword;
  } catch (error) {
    console.error("❌ خطأ في مقارنة كلمات المرور:", error);
    return false;
  }
}

// تشفير بسيط (للاستبدال بـ bcrypt أو مشابه في نظام حقيقي)
async function simpleEncrypt(password) {
  // هذا تشفير بسيط للتوضيح فقط
  // في نظام حقيقي، استخدم: await bcrypt.hash(password, 10)
  return btoa(encodeURIComponent(password + "salanarty_salt"));
}

// حفظ كلمة مرور جديدة
async function saveNewPassword(password) {
  try {
    const encryptedPassword = await simpleEncrypt(password);
    localStorage.setItem("adminPassword", encryptedPassword);
    console.log("✅ تم حفظ كلمة المرور الجديدة");
  } catch (error) {
    console.error("❌ خطأ في حفظ كلمة المرور:", error);
  }
}

// جلب كلمة المرور المخزنة
async function getStoredPassword() {
  return localStorage.getItem("adminPassword");
}

// التعامل مع تسجيل الدخول الناجح
// async function handleSuccessfulLogin(username, rememberMe) {
//   // إعادة تعيين عداد المحاولات
//   resetLoginAttempts();

//   // إنشاء جلسة
//   createSession(username, rememberMe);

//   // تسجيل وقت الدخول
//   logLoginTime();

//   // تحديث عدد المستخدمين النشطين
//   updateActiveUsers();

//   // إظهار رسالة النجاح
//   showMessage("✅ تم تسجيل الدخول بنجاح! جاري التوجيه...", "success");

//   // توجيه المستخدم بعد تأخير قصير
//   setTimeout(() => {
//     window.location.href = "index.html";
//   }, 1500);
// }
// في login.js، نعدل handleSuccessfulLogin:

async function handleSuccessfulLogin(username, rememberMe) {
  // جلب بيانات المسؤول
  const admins = getAdmins();
  const admin = admins.find((a) => a.username === username);

  if (!admin) {
    showMessage("❌ لم يتم العثور على بيانات المسؤول", "error");
    return;
  }

  // إعادة تعيين عداد المحاولات
  resetLoginAttempts();

  // إنشاء جلسة مع بيانات المسؤول
  createSession(admin, rememberMe);

  // تسجيل وقت الدخول
  logLoginTime();

  // تحديث عدد المستخدمين النشطين
  updateActiveUsers();

  // إظهار رسالة النجاح
  showMessage("✅ تم تسجيل الدخول بنجاح! جاري التوجيه...", "success");

  // توجيه المستخدم بعد تأخير قصير
  setTimeout(() => {
    // إذا كان المسؤول هو مدير النظام، نوجهه إلى الصفحة الرئيسية، وإلا قد نوجهه إلى صفحة محددة
    window.location.href = "index.html";
  }, 1500);
}
// التعامل مع فشل تسجيل الدخول
function handleFailedLogin() {
  // زيادة عداد المحاولات
  loginAttempts = getLoginAttempts() + 1;
  localStorage.setItem("loginAttempts", loginAttempts);

  // التحقق إذا وصل إلى الحد الأقصى
  if (loginAttempts >= maxAttempts) {
    lockAccount();
    showMessage(
      `تم قفل الحساب مؤقتاً بسبب ${maxAttempts} محاولات فاشلة. يرجى المحاولة بعد 15 دقيقة.`,
      "error"
    );
    disableLoginForm();
  } else {
    const remaining = maxAttempts - loginAttempts;
    showMessage(
      `❌ اسم المستخدم أو كلمة المرور غير صحيحة. لديك ${remaining} محاولة${
        remaining > 1 ? "ات" : ""
      } متبقية.`,
      "error"
    );
  }

  // إضافة تأثير اهتزاز
  shakeLoginForm();
}

// قفل الحساب مؤقتاً
function lockAccount() {
  const lockData = {
    lockTime: Date.now(),
    unlockTime: Date.now() + lockoutTime,
  };
  localStorage.setItem("loginLock", JSON.stringify(lockData));
}

// التحقق إذا كان الحساب مقفلاً
function isAccountLocked() {
  const lock = localStorage.getItem("loginLock");
  if (!lock) return false;

  const lockData = JSON.parse(lock);
  return Date.now() < lockData.unlockTime;
}

// جلب عدد المحاولات
function getLoginAttempts() {
  return parseInt(localStorage.getItem("loginAttempts") || "0");
}

// إعادة تعيين عداد المحاولات
function resetLoginAttempts() {
  localStorage.removeItem("loginAttempts");
  localStorage.removeItem("loginLock");
}

// تعطيل نموذج الدخول
function disableLoginForm() {
  const form = document.getElementById("loginForm");
  const inputs = form.querySelectorAll("input, button");

  inputs.forEach((input) => {
    input.disabled = true;
  });

  // إعادة التفعيل بعد انتهاء القفل
  setTimeout(() => {
    inputs.forEach((input) => {
      input.disabled = false;
    });
    document.getElementById("loginMessage").innerHTML = "";
  }, lockoutTime);
}

// اهتزاز نموذج الدخول
function shakeLoginForm() {
  const form = document.getElementById("loginForm");
  form.style.animation = "none";

  setTimeout(() => {
    form.style.animation = "shake 0.5s";
  }, 10);

  setTimeout(() => {
    form.style.animation = "";
  }, 500);
}

// إظهار/إخفاء كلمة المرور
function togglePasswordVisibility() {
  const passwordInput = document.getElementById("password");
  const toggleButton = document.getElementById("togglePassword");
  const icon = toggleButton.querySelector("i");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    icon.className = "fas fa-eye-slash";
    toggleButton.setAttribute("aria-label", "إخفاء كلمة المرور");
  } else {
    passwordInput.type = "password";
    icon.className = "fas fa-eye";
    toggleButton.setAttribute("aria-label", "إظهار كلمة المرور");
  }
}

// التعامل مع نسيت كلمة المرور
function handleForgotPassword(event) {
  event.preventDefault();

  showMessage(
    "لإعادة تعيين كلمة المرور، يرجى التواصل مع المسؤول على: salanarty@gmail.com",
    "info"
  );

  // إظهار نموذج إعادة التعيين
  setTimeout(() => {
    showResetPasswordForm();
  }, 2000);
}

// إظهار نموذج إعادة تعيين كلمة المرور
function showResetPasswordForm() {
  const form = document.getElementById("loginForm");
  const loginBtn = document.getElementById("loginBtn");

  // إنشاء نموذج إعادة التعيين
  const resetHTML = `
        <div class="reset-password-form" id="resetPasswordForm">
            <h3 style="color: #2c5aa0; margin-bottom: 20px;">
                <i class="fas fa-key"></i> إعادة تعيين كلمة المرور
            </h3>
            
            <div class="form-group">
                <label for="currentPassword">
                    <i class="fas fa-lock"></i> كلمة المرور الحالية
                </label>
                <input type="password" id="currentPassword" placeholder="أدخل كلمة المرور الحالية">
            </div>
            
            <div class="form-group">
                <label for="newPassword">
                    <i class="fas fa-lock"></i> كلمة المرور الجديدة
                </label>
                <input type="password" id="newPassword" placeholder="أدخل كلمة المرور الجديدة">
            </div>
            
            <div class="form-group">
                <label for="confirmPassword">
                    <i class="fas fa-lock"></i> تأكيد كلمة المرور
                </label>
                <input type="password" id="confirmPassword" placeholder="أعد إدخال كلمة المرور الجديدة">
            </div>
            
            <div class="form-actions">
                <button type="button" id="submitResetBtn" class="btn-primary">
                    <i class="fas fa-save"></i> حفظ كلمة المرور الجديدة
                </button>
                <button type="button" id="cancelResetBtn" class="btn-secondary">
                    <i class="fas fa-times"></i> إلغاء
                </button>
            </div>
        </div>
    `;

  // إخفاء نموذج الدخول وإظهار نموذج إعادة التعيين
  form.style.display = "none";
  loginBtn.style.display = "none";

  form.insertAdjacentHTML("beforebegin", resetHTML);

  // إضافة أحداث لنموذج إعادة التعيين
  document
    .getElementById("submitResetBtn")
    .addEventListener("click", handlePasswordReset);
  document
    .getElementById("cancelResetBtn")
    .addEventListener("click", cancelPasswordReset);
}

// التعامل مع إعادة تعيين كلمة المرور
async function handlePasswordReset() {
  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  // التحقق من صحة المدخلات
  if (!currentPassword || !newPassword || !confirmPassword) {
    showMessage("يرجى ملء جميع الحقول", "warning");
    return;
  }

  if (newPassword.length < 6) {
    showMessage("كلمة المرور الجديدة يجب أن تكون على الأقل 6 أحرف", "warning");
    return;
  }

  if (newPassword !== confirmPassword) {
    showMessage("كلمتا المرور غير متطابقتين", "warning");
    return;
  }

  // التحقق من كلمة المرور الحالية
  const isValid = await validateCredentials("admin", currentPassword);
  if (!isValid) {
    showMessage("كلمة المرور الحالية غير صحيحة", "error");
    return;
  }

  // حفظ كلمة المرور الجديدة
  await saveNewPassword(newPassword);

  showMessage("✅ تم تغيير كلمة المرور بنجاح", "success");

  // العودة لنموذج الدخول بعد تأخير
  setTimeout(() => {
    cancelPasswordReset();
    showMessage("يرجى تسجيل الدخول باستخدام كلمة المرور الجديدة", "info");
  }, 2000);
}

// إلغاء إعادة تعيين كلمة المرور
function cancelPasswordReset() {
  const resetForm = document.getElementById("resetPasswordForm");
  const loginForm = document.getElementById("loginForm");
  const loginBtn = document.getElementById("loginBtn");

  if (resetForm) {
    resetForm.remove();
  }

  loginForm.style.display = "block";
  loginBtn.style.display = "block";
}

// إعداد تأثيرات الحقول
function setupInputEffects() {
  const inputs = document.querySelectorAll("input");

  inputs.forEach((input) => {
    // تأثير عند التركيز
    input.addEventListener("focus", function () {
      this.parentElement.classList.add("focused");
    });

    // تأثير عند فقدان التركيز
    input.addEventListener("blur", function () {
      if (!this.value) {
        this.parentElement.classList.remove("focused");
      }
    });

    // تأثير عند الكتابة
    input.addEventListener("input", function () {
      if (this.value) {
        this.classList.add("has-value");
      } else {
        this.classList.remove("has-value");
      }
    });
  });
}

// إنشاء جلسة المستخدم
// function createSession(username, rememberMe) {
//   const session = {
//     isLoggedIn: true,
//     username: username,
//     loginTime: Date.now(),
//     rememberMe: rememberMe,
//     sessionId: generateSessionId(),
//   };

//   if (rememberMe) {
//     // تخزين في localStorage للتذكر
//     localStorage.setItem("userSession", JSON.stringify(session));
//   } else {
//     // تخزين في sessionStorage فقط
//     sessionStorage.setItem("userSession", JSON.stringify(session));
//   }

//   // أيضا تخزين في localStorage للتحقق من جميع الصفحات
//   localStorage.setItem("isLoggedIn", "true");
//   localStorage.setItem("currentUser", username);
// }
// إنشاء جلسة المستخدم
function createSession(admin, rememberMe) {
  const session = {
    isLoggedIn: true,
    id: admin.id,
    username: admin.username,
    fullName: admin.fullName,
    role: admin.role,
    loginTime: Date.now(),
    rememberMe: rememberMe,
    sessionId: generateSessionId(),
  };

  if (rememberMe) {
    localStorage.setItem("userSession", JSON.stringify(session));
  } else {
    sessionStorage.setItem("userSession", JSON.stringify(session));
  }

  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("currentUser", admin.username);
  localStorage.setItem("currentUserRole", admin.role);
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
}

// توليد معرف جلسة عشوائي
function generateSessionId() {
  return (
    "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
  );
}

// تسجيل وقت الدخول
function logLoginTime() {
  const loginLog = JSON.parse(localStorage.getItem("loginLog") || "[]");

  loginLog.push({
    username: "admin",
    time: new Date().toISOString(),
    ip: "local",
  });

  // الاحتفاظ بأخر 50 تسجيل دخول فقط
  if (loginLog.length > 50) {
    loginLog.shift();
  }

  localStorage.setItem("loginLog", JSON.stringify(loginLog));
}

// تحديث حالة النظام
function updateSystemStatus() {
  // تحديث وقت آخر تحديث
  const lastUpdate = localStorage.getItem("lastSystemUpdate");
  if (lastUpdate) {
    const date = new Date(lastUpdate);
    document.getElementById("lastSystemUpdate").textContent =
      date.toLocaleString("ar-SA");
  } else {
    document.getElementById("lastSystemUpdate").textContent =
      new Date().toLocaleString("ar-SA");
    localStorage.setItem("lastSystemUpdate", new Date().toISOString());
  }

  // تحديث عدد المستخدمين النشطين
  updateActiveUsers();
}

// تحديث عدد المستخدمين النشطين
function updateActiveUsers() {
  const activeUsers = localStorage.getItem("activeUsers") || "1";
  document.getElementById("activeUsers").textContent = activeUsers;
}

// إظهار/إخفاء شاشة التحميل
function showLoading(show) {
  let overlay = document.getElementById("loadingOverlay");

  if (!overlay && show) {
    overlay = document.createElement("div");
    overlay.id = "loadingOverlay";
    overlay.className = "loading-overlay";
    overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <p style="color: #2c5aa0; font-weight: bold; font-size: 18px;">جاري تسجيل الدخول...</p>
            <p style="color: #666; margin-top: 10px;">يرجى الانتظار</p>
        `;
    document.body.appendChild(overlay);
  }

  if (overlay) {
    overlay.classList.toggle("show", show);
  }
}

// إظهار الرسائل
function showMessage(text, type) {
  const messageDiv = document.getElementById("loginMessage");
  messageDiv.innerHTML = text;
  messageDiv.className = `message ${type} show`;

  setTimeout(() => {
    messageDiv.classList.remove("show");
  }, 5000);
}

// إضافة CSS للاهتزاز
const style = document.createElement("style");
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    .focused {
        transform: translateY(-2px);
    }
    
    .has-value {
        border-color: #4CAF50 !important;
    }
    
    .form-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
    }
    
    .reset-password-form {
        animation: fadeIn 0.5s ease;
        padding: 20px;
        background-color: #f8f9fa;
        border-radius: 10px;
        border: 2px solid #e9ecef;
    }
`;
document.head.appendChild(style);
// إضافة كائن المسؤولين الافتراضي
// تحديث DEFAULT_ADMINS لمنح جميع المسؤولين صلاحيات كاملة
const DEFAULT_ADMINS = [
  {
    id: 1,
    username: "admin",
    password: "salanarty2024",
    fullName: "مدير النظام الرئيسي",
    role: "super_admin",
    email: "salanarty@gmail.com",
    phone: "+966502191635",
    created: "2024-01-01",
    isActive: true,
    permissions: ["all"], // صلاحيات كاملة
  },
  {
    id: 2,
    username: "accountant",
    password: "accountant2024",
    fullName: "المحاسب",
    role: "accountant",
    email: "accountant@salanarty.com",
    phone: "+966502191636",
    created: "2024-01-01",
    isActive: true,
    permissions: ["all"], // صلاحيات كاملة
  },
  {
    id: 3,
    username: "editor",
    password: "editor2024",
    fullName: "محرر البيانات",
    role: "editor",
    email: "editor@salanarty.com",
    phone: "+966502191637",
    created: "2024-01-01",
    isActive: true,
    permissions: ["all"], // صلاحيات كاملة
  },
  {
    id: 4,
    username: "viewer",
    password: "viewer2024",
    fullName: "مشرف",
    role: "viewer",
    email: "viewer@salanarty.com",
    phone: "+966502191638",
    created: "2024-01-01",
    isActive: true,
    permissions: ["all"], // صلاحيات كاملة
  },
];

// دالة لترقية جميع المسؤولين الحاليين لمنحهم صلاحيات كاملة
function upgradeAllAdminsToFullPermissions() {
  const admins = getAdmins();
  let updated = false;

  admins.forEach((admin) => {
    if (!admin.permissions || !admin.permissions.includes("all")) {
      admin.permissions = ["all"];
      updated = true;
      console.log(`✅ تم ترقية صلاحيات ${admin.username} إلى صلاحيات كاملة`);
    }
  });

  if (updated) {
    saveAdmins(admins);
    console.log("✅ تم ترقية جميع المسؤولين إلى صلاحيات كاملة");
  }
}

// استدعاء الترقية عند تهيئة المسؤولين
function initializeAdmins() {
  if (!localStorage.getItem("admins")) {
    const encryptedAdmins = DEFAULT_ADMINS.map((admin) => ({
      ...admin,
      password: encryptPassword(admin.password),
    }));
    localStorage.setItem("admins", JSON.stringify(encryptedAdmins));
    console.log("✅ تم تهيئة المسؤولين الافتراضيين بصلاحيات كاملة");
  } else {
    // ترقية المسؤولين الموجودين
    upgradeAllAdminsToFullPermissions();
  }
}

// دالة لتهيئة المسؤولين في localStorage
function initializeAdmins() {
  if (!localStorage.getItem("admins")) {
    const encryptedAdmins = DEFAULT_ADMINS.map((admin) => ({
      ...admin,
      password: encryptPassword(admin.password),
    }));
    localStorage.setItem("admins", JSON.stringify(encryptedAdmins));
    console.log("✅ تم تهيئة المسؤولين الافتراضيين");
  }
}

// دالة لتشفير كلمة المرور
function encryptPassword(password) {
  // في نظام حقيقي استخدم مكتبة مثل bcrypt
  // هذا مثال مبسط للتوضيح
  return btoa(encodeURIComponent(password + "salanarty_salt_2024"));
}

// دالة لفك تشفير كلمة المرور
function decryptPassword(encrypted) {
  try {
    return decodeURIComponent(atob(encrypted)).replace(
      "salanarty_salt_2024",
      ""
    );
  } catch (e) {
    return null;
  }
}

// جلب جميع المسؤولين
function getAdmins() {
  const admins = localStorage.getItem("admins");
  return admins ? JSON.parse(admins) : [];
}

// حفظ المسؤولين
function saveAdmins(admins) {
  localStorage.setItem("admins", JSON.stringify(admins));
}

// تعديل دالة التحقق من بيانات الاعتماد
async function validateCredentials(username, password) {
  try {
    // جلب المسؤولين
    const admins = getAdmins();

    // البحث عن المسؤول
    const admin = admins.find(
      (a) =>
        a.username === username &&
        a.isActive &&
        a.password === encryptPassword(password)
    );

    return admin || null;
  } catch (error) {
    console.error("❌ خطأ في التحقق من كلمة المرور:", error);
    return null;
  }
}

// تهيئة المسؤولين عند تحميل الصفحة
initializeAdmins();

// إضافة دالة للتحقق من صلاحيات المسؤول بعد تسجيل الدخول
function checkUserPermissions() {
  const session = getSession();
  if (!session) return false;

  // تحديد الصفحة التي حاول المستخدم الوصول إليها قبل تسجيل الدخول
  const redirectPage = sessionStorage.getItem("redirectAfterLogin");
  const currentPage = redirectPage
    ? redirectPage.split("/").pop()
    : "index.html";

  // التحقق من الصلاحيات
  const pageInfo =
    PAGE_PERMISSIONS[currentPage] || PAGE_PERMISSIONS["index.html"];

  // checkPermissions and PAGE_PERMISSIONS are defined in auth.js
  const hasPermission =
    typeof checkPermissions === "function"
      ? checkPermissions(session.permissions || [], pageInfo.required)
      : true; // fallback if auth.js not loaded

  if (hasPermission) {
    // حذف الصفحة المخزنة
    sessionStorage.removeItem("redirectAfterLogin");
    return currentPage;
  } else {
    // إذا لم يكن لديه صلاحية، توجيه للرئيسية
    showMessage(
      "ليس لديك صلاحية الوصول للصفحة المطلوبة. تم توجيهك للرئيسية.",
      "warning"
    );
    return "index.html";
  }
}

// دالة التعامل مع تسجيل الدخول الناجح
async function handleSuccessfulLogin(username, rememberMe) {
  const admins = getAdmins();
  const admin = admins.find((a) => a.username === username);

  if (!admin) {
    showMessage("❌ لم يتم العثور على بيانات المسؤول", "error");
    return;
  }

  // إعادة تعيين عداد المحاولات
  resetLoginAttempts();

  // إنشاء جلسة مع بيانات المسؤول
  createSession(admin, rememberMe);

  // تسجيل وقت الدخول
  logLoginTime(admin.id);

  // تحديث عدد المستخدمين النشطين
  updateActiveUsers();

  // إظهار رسالة النجاح مع نوع المسؤول
  const roleName =
    typeof getRoleName === "function" ? getRoleName(admin.role) : admin.role;
  showMessage(`✅ تم تسجيل الدخول بنجاح! (${roleName})`, "success");

  // التحقق من الصلاحيات وتوجيه المستخدم
  setTimeout(() => {
    const redirectTo = checkUserPermissions();
    window.location.href = redirectTo;
  }, 1500);
}
