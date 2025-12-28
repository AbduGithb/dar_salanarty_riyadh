// نظام إدارة المسؤولين المتعددين
let currentEditingId = null;

// تهيئة الصفحة
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 بدء تهيئة صفحة إدارة المسؤولين...");

  // التحقق من صلاحيات المستخدم
  checkAdminPermissions();

  // تحميل قائمة المسؤولين
  loadAdmins();

  // إعداد الأحداث
  setupEventListeners();

  // تحميل سجل الأنشطة
  loadActivityLog();

  console.log("✅ تم تهيئة الصفحة بنجاح");
});

// التحقق من صلاحيات المستخدم
function checkAdminPermissions() {
  const session = getSession();
  if (!session || session.role !== "super_admin") {
    alert("⛔ ليس لديك صلاحيات للوصول إلى هذه الصفحة");
    window.location.href = "index.html";
    return false;
  }
  return true;
}

// تحميل قائمة المسؤولين
function loadAdmins() {
  const admins = getAdmins();
  const tableBody = document.getElementById("adminsTableBody");
  const totalAdmins = document.getElementById("totalAdmins");
  const activeAdmins = document.getElementById("activeAdmins");
  const inactiveAdmins = document.getElementById("inactiveAdmins");

  let activeCount = 0;
  let inactiveCount = 0;

  tableBody.innerHTML = "";

  if (admins.length === 0) {
    tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: #6c757d; padding: 20px;">
                    <i class="fas fa-info-circle"></i> لا يوجد مسؤولين مضافة
                </td>
            </tr>
        `;
  } else {
    admins.forEach((admin, index) => {
      if (admin.isActive) activeCount++;
      else inactiveCount++;

      const row = document.createElement("tr");
      row.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    <strong>${admin.fullName}</strong>
                    ${
                      admin.id === 1
                        ? '<br><small style="color: #dc3545;">المسؤول الرئيسي</small>'
                        : ""
                    }
                </td>
                <td>${admin.username}</td>
                <td>
                    <span class="role-badge role-${admin.role}">
                        ${getRoleName(admin.role)}
                    </span>
                </td>
                <td>${admin.email || "-"}</td>
                <td>${formatDate(admin.created)}</td>
                <td>
                    <span class="status-badge ${
                      admin.isActive ? "status-active" : "status-inactive"
                    }">
                        ${admin.isActive ? "نشط" : "معطل"}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button type="button" class="btn-action btn-edit" onclick="editAdmin(${
                          admin.id
                        })" ${admin.id === 1 ? "disabled" : ""}>
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button type="button" class="btn-action btn-toggle" onclick="toggleAdminStatus(${
                          admin.id
                        })" ${admin.id === 1 ? "disabled" : ""}>
                            <i class="fas fa-power-off"></i> ${
                              admin.isActive ? "تعطيل" : "تفعيل"
                            }
                        </button>
                        <button type="button" class="btn-action btn-delete" onclick="deleteAdmin(${
                          admin.id
                        })" ${admin.id === 1 ? "disabled" : ""}>
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                </td>
            `;
      tableBody.appendChild(row);
    });
  }

  // تحديث الإحصائيات
  totalAdmins.textContent = admins.length;
  activeAdmins.textContent = activeCount;
  inactiveAdmins.textContent = inactiveCount;
}

// إعداد الأحداث
function setupEventListeners() {
  // حدث إرسال النموذج
  document.getElementById("adminForm").addEventListener("submit", saveAdmin);

  // حدث إعادة تعيين النموذج
  document.getElementById("resetFormBtn").addEventListener("click", resetForm);

  // حدث توليد كلمة مرور
  document
    .getElementById("generatePasswordBtn")
    .addEventListener("click", generatePassword);

  // حدث إظهار/إخفاء كلمة المرور
  document
    .getElementById("togglePassword")
    .addEventListener("click", togglePasswordVisibility);

  // حدث تغيير الدور
  document.getElementById("role").addEventListener("change", updatePermissions);
}

// حفظ المسؤول
async function saveAdmin(event) {
  event.preventDefault();

  // جمع بيانات النموذج
  const adminData = {
    id: document.getElementById("adminId").value || Date.now(),
    fullName: document.getElementById("fullName").value.trim(),
    username: document.getElementById("username").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    role: document.getElementById("role").value,
    password: document.getElementById("password").value,
    confirmPassword: document.getElementById("confirmPassword").value,
    permissions: getSelectedPermissions(),
    created: currentEditingId
      ? undefined
      : new Date().toISOString().split("T")[0],
    isActive: true,
  };

  // التحقق من البيانات
  if (!validateAdminData(adminData)) {
    return;
  }

  try {
    // جلب المسؤولين الحاليين
    const admins = getAdmins();

    // التحقق من عدم تكرار اسم المستخدم
    const usernameExists = admins.some(
      (admin) =>
        admin.username === adminData.username &&
        admin.id !== parseInt(adminData.id)
    );

    if (usernameExists) {
      showMessage("اسم المستخدم موجود مسبقاً", "error");
      return;
    }

    // تشفير كلمة المرور
    adminData.password = encryptPassword(adminData.password);
    delete adminData.confirmPassword;

    if (currentEditingId) {
      // تحديث المسؤول الموجود
      const index = admins.findIndex(
        (a) => a.id === parseInt(currentEditingId)
      );
      if (index !== -1) {
        admins[index] = { ...admins[index], ...adminData };
        showMessage("تم تحديث بيانات المسؤول بنجاح", "success");
        logActivity(`تم تحديث بيانات المسؤول: ${adminData.fullName}`);
      }
    } else {
      // إضافة مسؤول جديد
      admins.push(adminData);
      showMessage("تم إضافة المسؤول الجديد بنجاح", "success");
      logActivity(`تم إضافة مسؤول جديد: ${adminData.fullName}`);
    }

    // حفظ التغييرات
    saveAdmins(admins);

    // إعادة تحميل القائمة
    loadAdmins();

    // إعادة تعيين النموذج
    resetForm();
  } catch (error) {
    console.error("❌ خطأ في حفظ المسؤول:", error);
    showMessage("حدث خطأ أثناء حفظ البيانات", "error");
  }
}

// التحقق من صحة بيانات المسؤول
function validateAdminData(data) {
  if (!data.fullName || !data.username || !data.role || !data.password) {
    showMessage("يرجى ملء جميع الحقول المطلوبة", "warning");
    return false;
  }

  if (data.password.length < 6) {
    showMessage("كلمة المرور يجب أن تكون 6 أحرف على الأقل", "warning");
    return false;
  }

  if (data.password !== data.confirmPassword) {
    showMessage("كلمتا المرور غير متطابقتين", "warning");
    return false;
  }

  return true;
}

// الحصول على الصلاحيات المحددة
function getSelectedPermissions() {
  const permissions = [];
  if (document.getElementById("permView").checked) permissions.push("view");
  if (document.getElementById("permAdd").checked) permissions.push("add");
  if (document.getElementById("permEdit").checked) permissions.push("edit");
  if (document.getElementById("permDelete").checked) permissions.push("delete");
  if (document.getElementById("permReports").checked)
    permissions.push("reports");
  if (document.getElementById("permCommittee").checked)
    permissions.push("committee");
  if (document.getElementById("permAdmins").checked) permissions.push("admins");
  return permissions;
}

// تحديث الصلاحيات حسب الدور
function updatePermissions() {
  const role = document.getElementById("role").value;

  // إعادة تعيين جميع الصلاحيات
  document.querySelectorAll(".permission-item input").forEach((cb) => {
    cb.checked = false;
    cb.disabled = false;
  });

  // تحديد الصلاحيات حسب الدور
  switch (role) {
    case "super_admin":
      document.querySelectorAll(".permission-item input").forEach((cb) => {
        cb.checked = true;
      });
      break;
    case "accountant":
      document.getElementById("permView").checked = true;
      document.getElementById("permEdit").checked = true;
      document.getElementById("permReports").checked = true;
      document.getElementById("permCommittee").checked = true;
      break;
    case "editor":
      document.getElementById("permView").checked = true;
      document.getElementById("permAdd").checked = true;
      document.getElementById("permEdit").checked = true;
      break;
    case "viewer":
      document.getElementById("permView").checked = true;
      // تعطيل باقي الخيارات
      document
        .querySelectorAll(".permission-item input:not(#permView)")
        .forEach((cb) => {
          cb.disabled = true;
        });
      break;
  }
}

// تعديل مسؤول
function editAdmin(id) {
  const admins = getAdmins();
  const admin = admins.find((a) => a.id === id);

  if (!admin) {
    showMessage("المسؤول غير موجود", "error");
    return;
  }

  // تعبئة النموذج
  document.getElementById("adminId").value = admin.id;
  document.getElementById("fullName").value = admin.fullName;
  document.getElementById("username").value = admin.username;
  document.getElementById("email").value = admin.email || "";
  document.getElementById("phone").value = admin.phone || "";
  document.getElementById("role").value = admin.role;
  document.getElementById("password").value = "********";
  document.getElementById("confirmPassword").value = "********";

  // تعيين الصلاحيات
  updatePermissions();
  if (admin.permissions) {
    admin.permissions.forEach((perm) => {
      const checkbox = document.getElementById(
        `perm${perm.charAt(0).toUpperCase() + perm.slice(1)}`
      );
      if (checkbox) checkbox.checked = true;
    });
  }

  // تحديث حالة التحرير
  currentEditingId = id;
  document.getElementById("saveAdminBtn").innerHTML =
    '<i class="fas fa-save"></i> تحديث المسؤول';

  showMessage("جاري تحرير بيانات المسؤول", "info");
}

// تغيير حالة المسؤول
function toggleAdminStatus(id) {
  if (id === 1) {
    showMessage("لا يمكن تعطيل المسؤول الرئيسي", "warning");
    return;
  }

  if (confirm("هل تريد تغيير حالة هذا المسؤول؟")) {
    const admins = getAdmins();
    const admin = admins.find((a) => a.id === id);

    if (admin) {
      admin.isActive = !admin.isActive;
      saveAdmins(admins);
      loadAdmins();

      const action = admin.isActive ? "تم تفعيل" : "تم تعطيل";
      showMessage(`${action} المسؤول بنجاح`, "success");
      logActivity(`${action} المسؤول: ${admin.fullName}`);
    }
  }
}

// حذف مسؤول
function deleteAdmin(id) {
  if (id === 1) {
    showMessage("لا يمكن حذف المسؤول الرئيسي", "warning");
    return;
  }

  if (confirm("هل أنت متأكد من حذف هذا المسؤول؟")) {
    const admins = getAdmins();
    const adminIndex = admins.findIndex((a) => a.id === id);

    if (adminIndex !== -1) {
      const adminName = admins[adminIndex].fullName;
      admins.splice(adminIndex, 1);
      saveAdmins(admins);
      loadAdmins();

      showMessage("تم حذف المسؤول بنجاح", "success");
      logActivity(`تم حذف المسؤول: ${adminName}`);
    }
  }
}

// توليد كلمة مرور عشوائية
function generatePassword() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";

  // تأكد من وجود حرف كبير وصغير ورقم ورمز
  password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
  password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
  password += "0123456789"[Math.floor(Math.random() * 10)];
  password += "!@#$%^&*"[Math.floor(Math.random() * 8)];

  // إضافة 6 أحرف عشوائية إضافية
  for (let i = 0; i < 6; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }

  // خلط الأحرف
  password = password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");

  // تعيين كلمة المرور
  document.getElementById("password").value = password;
  document.getElementById("confirmPassword").value = password;

  showMessage("تم توليد كلمة مرور قوية", "info");
}

// إظهار/إخفاء كلمة المرور
function togglePasswordVisibility() {
  const passwordInput = document.getElementById("password");
  const toggleButton = document.getElementById("togglePassword");
  const icon = toggleButton.querySelector("i");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    icon.className = "fas fa-eye-slash";
  } else {
    passwordInput.type = "password";
    icon.className = "fas fa-eye";
  }
}

// إعادة تعيين النموذج
function resetForm() {
  document.getElementById("adminForm").reset();
  document.getElementById("adminId").value = "";
  document.getElementById("saveAdminBtn").innerHTML =
    '<i class="fas fa-save"></i> حفظ المسؤول';
  currentEditingId = null;
  updatePermissions();
  showMessage("تم إعادة تعيين النموذج", "info");
}

// تحميل سجل الأنشطة
function loadActivityLog() {
  const activities = JSON.parse(
    localStorage.getItem("adminActivities") || "[]"
  );
  const activityList = document.getElementById("activityList");

  if (activities.length === 0) {
    activityList.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #6c757d;">
                <i class="fas fa-info-circle fa-2x"></i>
                <p>لا توجد أنشطة مسجلة</p>
            </div>
        `;
    return;
  }

  let activityHTML = "";
  activities.slice(0, 10).forEach((activity) => {
    activityHTML += `
            <div class="activity-item">
                <div class="activity-info">
                    <div class="activity-icon">
                        <i class="fas fa-user-cog"></i>
                    </div>
                    <div class="activity-text">
                        <p><strong>${activity.admin}</strong> ${activity.action}</p>
                        <div class="activity-time">${activity.time}</div>
                    </div>
                </div>
            </div>
        `;
  });

  activityList.innerHTML = activityHTML;
}

// تسجيل النشاط
function logActivity(action) {
  const activities = JSON.parse(
    localStorage.getItem("adminActivities") || "[]"
  );
  const session = getSession();

  activities.unshift({
    admin: session ? session.fullName : "النظام",
    action: action,
    time: new Date().toLocaleString("ar-SA"),
  });

  // الاحتفاظ بأخر 50 نشاط فقط
  if (activities.length > 50) {
    activities.pop();
  }

  localStorage.setItem("adminActivities", JSON.stringify(activities));
  loadActivityLog();
}

// تنسيق التاريخ
function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("ar-SA");
}

// إظهار الرسائل
function showMessage(text, type) {
  const messageDiv = document.getElementById("message");
  messageDiv.innerHTML = text;
  messageDiv.className = `message ${type} show`;

  setTimeout(() => {
    messageDiv.classList.remove("show");
  }, 5000);
}
// إضافة دالة لتحديد الصلاحيات الافتراضية حسب الدور
// تعديل دالة الحصول على الصلاحيات الافتراضية
function getDefaultPermissions(role) {
  // منح جميع المسؤولين صلاحيات كاملة
  return ["all"];
}

// تحديث دالة حفظ المسؤول لمنح الصلاحيات الكاملة تلقائياً
async function saveAdmin(event) {
  event.preventDefault();

  // جمع بيانات النموذج
  const role = document.getElementById("role").value;
  const adminData = {
    id: document.getElementById("adminId").value || Date.now(),
    fullName: document.getElementById("fullName").value.trim(),
    username: document.getElementById("username").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    role: role,
    password: document.getElementById("password").value,
    confirmPassword: document.getElementById("confirmPassword").value,
    permissions: ["all"], // صلاحيات كاملة للجميع
    created: currentEditingId
      ? undefined
      : new Date().toISOString().split("T")[0],
    isActive: true,
  };

  // ... باقي الكود
}

// تعديل دالة تحميل المسؤولين لإظهار الصلاحيات
function loadAdmins() {
  const admins = getAdmins();
  const tableBody = document.getElementById("adminsTableBody");

  tableBody.innerHTML = "";

  admins.forEach((admin, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <strong>${admin.fullName}</strong>
                ${
                  admin.id === 1
                    ? '<br><small style="color: #dc3545;">المسؤول الرئيسي</small>'
                    : ""
                }
            </td>
            <td>${admin.username}</td>
            <td>
                <span class="role-badge role-${
                  admin.role
                }" style="background-color: #28a745;">
                    ${getRoleName(admin.role)}
                </span>
            </td>
            <td>${admin.email || "-"}</td>
            <td>${formatDate(admin.created)}</td>
            <td>
                <span class="status-badge status-active">
                    <i class="fas fa-check-circle"></i> صلاحيات كاملة
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button type="button" class="btn-action btn-edit" onclick="editAdmin(${
                      admin.id
                    })">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button type="button" class="btn-action btn-danger" onclick="deleteAdmin(${
                      admin.id
                    })" ${admin.id === 1 ? "disabled" : ""}>
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
            </td>
        `;
    tableBody.appendChild(row);
  });
}

// إزالة زر التعطيل/التفعيل (لأن الجميع مفعلين)
// تحديث CSS للدور
const style = document.createElement("style");
style.textContent = `
    .role-badge {
        display: inline-block;
        padding: 5px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        color: white;
        background-color: #28a745 !important;
    }
    
    .status-badge {
        background-color: #d4edda !important;
        color: #155724 !important;
    }
`;
document.head.appendChild(style);
// تعديل دالة حفظ المسؤول
