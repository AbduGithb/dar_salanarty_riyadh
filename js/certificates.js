// نظام شهادات التقدير للأعضاء المميزين
let allMembers = [];
let paidMembers = [];
let currentDesign = "classic";
let currentCertificateIndex = 0;
let certificates = [];

// انتظار تهيئة supabase
async function waitForSupabaseDB() {
  const maxAttempts = 50;
  const interval = 100;

  for (let i = 0; i < maxAttempts; i++) {
    if (
      window.supabaseDB &&
      typeof window.supabaseDB.getAllMembersWithSubscriptions === "function"
    ) {
      console.log("✅ Supabase DB interface ready");
      return window.supabaseDB;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error("❌ Supabase DB not initialized after waiting");
}

// تحميل الأعضاء من قاعدة البيانات
async function loadMembers() {
  try {
    showMessage("جاري تحميل قائمة الأعضاء المميزين...", "info");

    // تهيئة Supabase إذا لم يكن مهيئاً
    if (typeof window.supabaseInit === "function") {
      await window.supabaseInit();
    }

    // انتظار تهيئة الواجهة البرمجية
    const db = await waitForSupabaseDB();

    // استخدام الواجهة لتجميع الأعضاء والاشتراكات
    const normalized = await db.getAllMembersWithSubscriptions();

    allMembers = (normalized || []).map((member) => {
      // حساب المدفوع والمتبقي
      let totalPaid = 0;
      let totalDue = 0;

      if (member.subscriptions && member.subscriptions.length > 0) {
        member.subscriptions.forEach((sub) => {
          // استخدام نفس الحقول البديلة كما في صفحة الأعضاء والتقارير
          const paidAmount = sub.amount_paid || sub.paid || sub.paidAmount || 0;
          const dueAmount = sub.amount_due || sub.amount || sub.due || 0;

          totalDue += dueAmount;
          totalPaid += paidAmount;
        });
      }

      const remaining = Math.max(0, totalDue - totalPaid);

      // تحديد حالة العضو
      let status = "unpaid";
      if (remaining === 0 && totalPaid > 0) {
        status = "paid";
      } else if (totalPaid > 0 && remaining > 0) {
        status = "partial";
      }

      return {
        id: member.id,
        name: member.name || "غير محدد",
        phone: member.phone || "غير محدد",
        joinYear: member.joinYear || new Date().getFullYear(),
        status: status,
        totalPaid: totalPaid,
        totalDue: totalDue,
        remaining: remaining,
        isSelected: false,
      };
    });

    console.log(`✅ تم جلب ${allMembers.length} عضو`);

    // تصفية الأعضاء المسددين
    filterPaidMembers();

    // تحديث الإحصائيات
    updateStats();

    showMessage("تم تحميل قائمة الأعضاء بنجاح", "success");
  } catch (error) {
    console.error("❌ خطأ في جلب الأعضاء:", error);
    showMessage(`❌ حدث خطأ أثناء جلب الأعضاء: ${error.message}`, "error");
  }
}

// تهيئة الصفحة
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 بدء تهيئة صفحة الشهادات...");

  // تحميل الأعضاء
  loadMembers();

  // إعداد الأحداث
  setupEventListeners();

  // تهيئة التاريخ
  initDate();

  console.log("✅ تم تهيئة الصفحة بنجاح");
});

// تصفية الأعضاء المسددين
function filterPaidMembers() {
  const filterType = document.querySelector(
    'input[name="memberFilter"]:checked'
  ).value;

  switch (filterType) {
    case "paid":
      paidMembers = allMembers.filter((m) => m.status === "paid");
      break;
    case "partial":
      paidMembers = allMembers.filter((m) => m.status === "partial");
      break;
    case "all":
      paidMembers = [...allMembers];
      break;
  }

  // عرض الأعضاء المصفاة
  displayMembers();
}

// عرض الأعضاء في الشبكة
function displayMembers() {
  const membersGrid = document.getElementById("membersGrid");

  if (!membersGrid) return;

  if (paidMembers.length === 0) {
    membersGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <i class="fas fa-users-slash fa-3x" style="color: #6c757d; margin-bottom: 15px;"></i>
                <h4 style="color: #495057; margin: 10px 0;">لا يوجد أعضاء مطابقين للفلتر</h4>
                <p style="color: #6c757d;">جرب تغيير نوع التصفية في الأعلى</p>
            </div>
        `;
    return;
  }

  let membersHTML = "";

  paidMembers.forEach((member, index) => {
    const statusText =
      member.status === "paid"
        ? "مسدد كاملاً"
        : member.status === "partial"
        ? "مسدد جزئياً"
        : "غير مسدد";

    membersHTML += `
            <div class="member-card ${
              member.isSelected ? "selected" : ""
            }" data-index="${index}">
                <div class="member-header">
                    <h3 class="member-name">${member.name}</h3>
                    <span class="member-status status-${member.status}">
                        ${statusText}
                    </span>
                </div>
                
                <div class="member-details">
                    <div class="detail-item">
                        <span class="detail-label">رقم الجوال</span>
                        <span class="detail-value">${member.phone}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">سنة الانضمام</span>
                        <span class="detail-value">${member.joinYear}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">المبلغ المدفوع</span>
                        <span class="detail-value">${formatCurrency(
                          member.totalPaid
                        )}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">المبلغ المتأخر</span>
                        <span class="detail-value">${formatCurrency(
                          member.remaining
                        )}</span>
                    </div>
                </div>
                
                <div class="member-actions">
                    <button type="button" class="btn-sm btn-primary toggle-select" data-index="${index}">
                        <i class="fas ${
                          member.isSelected ? "fa-times" : "fa-check"
                        }"></i>
                        ${
                          member.isSelected
                            ? "إلغاء الاختيار"
                            : "اختيار للشهادة"
                        }
                    </button>
                    <button type="button" class="btn-sm btn-success generate-single" data-index="${index}">
                        <i class="fas fa-certificate"></i> إنشاء شهادة
                    </button>
                </div>
            </div>
        `;
  });

  membersGrid.innerHTML = membersHTML;

  // إضافة الأحداث للبطاقات
  addMemberCardEvents();
}

// إضافة الأحداث للبطاقات
function addMemberCardEvents() {
  // حدث اختيار/إلغاء العضو
  document.querySelectorAll(".toggle-select").forEach((button) => {
    button.addEventListener("click", function (e) {
      e.stopPropagation();
      const index = parseInt(this.getAttribute("data-index"));
      toggleMemberSelection(index);
    });
  });

  // حدث إنشاء شهادة فردية
  document.querySelectorAll(".generate-single").forEach((button) => {
    button.addEventListener("click", function (e) {
      e.stopPropagation();
      const index = parseInt(this.getAttribute("data-index"));
      generateCertificateForMember(index);
    });
  });

  // حدث النقر على البطاقة
  document.querySelectorAll(".member-card").forEach((card) => {
    card.addEventListener("click", function () {
      const index = parseInt(this.getAttribute("data-index"));
      toggleMemberSelection(index);
    });
  });
}

// تبديل اختيار العضو
function toggleMemberSelection(index) {
  if (paidMembers[index]) {
    paidMembers[index].isSelected = !paidMembers[index].isSelected;
    displayMembers();
    updateStats();
  }
}

// تحديث الإحصائيات
function updateStats() {
  const paidCount = allMembers.filter((m) => m.status === "paid").length;
  const partialCount = allMembers.filter((m) => m.status === "partial").length;
  const selectedCount = paidMembers.filter((m) => m.isSelected).length;

  const paidEl = document.getElementById("paidMembersCount");
  const partialEl = document.getElementById("partialMembersCount");
  const certEl = document.getElementById("certificatesCount");

  if (paidEl) paidEl.textContent = paidCount;
  if (partialEl) partialEl.textContent = partialCount;
  if (certEl) certEl.textContent = certificates.length;
}

// إعداد الأحداث
function setupEventListeners() {
  // أحداث التصفية
  document.querySelectorAll('input[name="memberFilter"]').forEach((radio) => {
    radio.addEventListener("change", filterPaidMembers);
  });

  // أحداث التصميم
  document.querySelectorAll(".design-item").forEach((item) => {
    item.addEventListener("click", function () {
      currentDesign = this.getAttribute("data-design");
      updateDesignSelection();
      if (certificates.length > 0) {
        displayCurrentCertificate();
      }
    });
  });

  // أحداث الأزرار الرئيسية
  const loadBtn = document.getElementById("loadMembersBtn");
  const genAllBtn = document.getElementById("generateAllBtn");
  const resetBtn = document.getElementById("resetAllBtn");

  if (loadBtn) loadBtn.addEventListener("click", loadMembers);
  if (genAllBtn) genAllBtn.addEventListener("click", generateAllCertificates);
  if (resetBtn) resetBtn.addEventListener("click", resetAll);

  // أحداث معاينة الشهادات
  const prevBtn = document.getElementById("prevCertBtn");
  const nextBtn = document.getElementById("nextCertBtn");
  const printCertBtn = document.getElementById("printCertBtn");
  const downloadCertBtn = document.getElementById("downloadCertBtn");
  const printAllBtn = document.getElementById("printAllBtn");
  const saveAllBtn = document.getElementById("saveAllBtn");

  if (prevBtn) prevBtn.addEventListener("click", showPreviousCertificate);
  if (nextBtn) nextBtn.addEventListener("click", showNextCertificate);
  if (printCertBtn)
    printCertBtn.addEventListener("click", printCurrentCertificate);
  if (downloadCertBtn)
    downloadCertBtn.addEventListener("click", downloadCurrentCertificate);
  if (printAllBtn) printAllBtn.addEventListener("click", printAllCertificates);
  if (saveAllBtn) saveAllBtn.addEventListener("click", saveAllAsPDF);

  // حدث إضافة الختم
  const stampBtn = document.getElementById("addStampBtn");
  if (stampBtn) stampBtn.addEventListener("click", addStampToCertificate);
}

// تحديث اختيار التصميم
function updateDesignSelection() {
  document.querySelectorAll(".design-item").forEach((item) => {
    item.classList.remove("active");
    if (item.getAttribute("data-design") === currentDesign) {
      item.classList.add("active");
    }
  });
}

// إنشاء شهادة لعضو واحد
function generateCertificateForMember(index) {
  const member = paidMembers[index];
  if (!member) return;

  const certificate = createCertificate(member);
  certificates.push(certificate);

  // الانتقال للشهادة الجديدة
  currentCertificateIndex = certificates.length - 1;

  // عرض الشهادة
  displayCurrentCertificate();

  // تحديث الإحصائيات
  updateStats();

  showMessage(`تم إنشاء شهادة تقدير لـ ${member.name}`, "success");
}

// إنشاء شهادات لجميع المختارين
function generateAllCertificates() {
  const selectedMembers = paidMembers.filter((m) => m.isSelected);

  if (selectedMembers.length === 0) {
    showMessage("لم يتم اختيار أي أعضاء لإنشاء الشهادات", "warning");
    return;
  }

  certificates = []; // إعادة تعيين الشهادات

  selectedMembers.forEach((member) => {
    const certificate = createCertificate(member);
    certificates.push(certificate);
  });

  currentCertificateIndex = 0;
  displayCurrentCertificate();
  updateStats();

  showMessage(`تم إنشاء ${certificates.length} شهادة تقدير`, "success");
}

// إنشاء كائن الشهادة
function createCertificate(member) {
  const title =
    document.getElementById("certificateTitle").value || "شهادة تقدير";
  const text = document.getElementById("certificateText").value;
  const date =
    document.getElementById("certificateDate").value || getCurrentDate();

  return {
    id: Date.now() + Math.random(),
    member: member,
    design: currentDesign,
    title: title,
    text: text,
    date: date,
    chairmanName: document.getElementById("chairmanName").value,
    chairmanTitle: document.getElementById("chairmanTitle").value,
    treasurerName: document.getElementById("treasurerName").value,
    treasurerTitle: document.getElementById("treasurerTitle").value,
    stampText: document.getElementById("stampText").value,
    createdAt: new Date().toISOString(),
  };
}

// عرض الشهادة الحالية
function displayCurrentCertificate() {
  const container = document.getElementById("certificateContainer");
  if (!container) return;

  if (certificates.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-certificate fa-3x"></i>
                <h4>لم يتم إنشاء أي شهادات بعد</h4>
                <p>اختر أعضاءً من القائمة أعلاه وأنشئ شهادات تقدير لهم</p>
            </div>
        `;
    return;
  }

  const cert = certificates[currentCertificateIndex];
  const member = cert.member;

  container.innerHTML = `
        <div class="certificate ${cert.design}" id="currentCertificate">
            ${cert.design === "golden" ? '<div class="gold-border"></div>' : ""}
            
            <div class="certificate-header">
                <div class="certificate-logo">
                    <i class="fas fa-award"></i>
                </div>
                <h1 class="certificate-title">${cert.title}</h1>
                <p class="certificate-subtitle">تـمـنـحـهـا إدارة دار أبناء سلنارتي بالرياض</p>
            </div>
            
            <div class="certificate-body">
                <div class="presented-to">تُـمَـنَـح هـذه الـشـهـادة الـتـقـديـريـة إلى</div>
                <h2 class="member-name-large">الـعـضـو / ${member.name}</h2>
                <p class="certificate-text">${cert.text}</p>
                <div class="certificate-date">وذلك تقديراً لجهوده وتعاونه المتميز خلال عام ${new Date().getFullYear()}</div>
            </div>
            
            <div class="certificate-footer">
                <div class="signatures">
                    <div class="signature-item">
                        <div class="signature-line"></div>
                        <div class="signature-name">${cert.chairmanName}</div>
                        <div class="signature-title">${cert.chairmanTitle}</div>
                    </div>
                    
                    <div class="signature-item">
                        <div class="signature-line"></div>
                        <div class="signature-name">${cert.treasurerName}</div>
                        <div class="signature-title">${
                          cert.treasurerTitle
                        }</div>
                    </div>
                </div>
                
                <div class="certificate-date-large">
                    <i class="fas fa-calendar-alt"></i>
                    التاريخ: ${formatArabicDate(cert.date)}
                </div>
            </div>
            
            ${
              cert.stampText
                ? `
                <div class="stamp" id="certificateStamp">
                    ${cert.stampText}
                </div>
            `
                : ""
            }
        </div>
    `;

  // تحديث معلومات الشهادة الحالية
  const infoEl = document.getElementById("currentCertInfo");
  if (infoEl) {
    infoEl.textContent = `الشهادة ${currentCertificateIndex + 1} من ${
      certificates.length
    }`;
  }
}

// عرض الشهادة السابقة
function showPreviousCertificate() {
  if (certificates.length === 0) return;

  currentCertificateIndex =
    (currentCertificateIndex - 1 + certificates.length) % certificates.length;
  displayCurrentCertificate();
}

// عرض الشهادة التالية
function showNextCertificate() {
  if (certificates.length === 0) return;

  currentCertificateIndex = (currentCertificateIndex + 1) % certificates.length;
  displayCurrentCertificate();
}

// طباعة الشهادة الحالية
function printCurrentCertificate() {
  if (certificates.length === 0) {
    showMessage("لا توجد شهادات للطباعة", "warning");
    return;
  }

  const certificateElement = document.getElementById("currentCertificate");
  if (!certificateElement) return;

  // إنشاء نافذة طباعة
  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>شهادة تقدير - دار أبناء سلنارتي</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Scheherazade+New:wght@400;700&display=swap');
                
                body {
                    margin: 0;
                    padding: 50px;
                    font-family: 'Amiri', serif;
                    direction: rtl;
                    background: white;
                }
                
                ${
                  document.getElementById("paperSize").value === "A4"
                    ? `
                    @page {
                        size: A4;
                        margin: 20mm;
                    }
                `
                    : ""
                }
                
                .certificate {
                    width: 100%;
                    height: 100%;
                    position: relative;
                    text-align: center;
                }
                
                .certificate.classic {
                    border: 15px double #2c5aa0;
                    border-radius: 20px;
                    padding: 40px;
                    background: #f8f9fa;
                }
                
                .certificate.modern {
                    border: 2px solid #dee2e6;
                    border-radius: 10px;
                    padding: 40px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                }
                
                .certificate.golden {
                    border: 10px solid #ffd700;
                    border-radius: 15px;
                    padding: 40px;
                    background: linear-gradient(135deg, #fff9c4, #ffecb3);
                }
                
                .certificate.elegant {
                    border: 5px solid #9370db;
                    border-radius: 10px;
                    padding: 40px;
                    background: linear-gradient(135deg, #f8f0ff, #e6e6fa);
                }
                
                .certificate-title {
                    font-size: 36px;
                    color: #2c5aa0;
                    margin-bottom: 10px;
                }
                
                .certificate-subtitle {
                    font-size: 20px;
                    color: #6c757d;
                    margin-bottom: 30px;
                }
                
                .member-name-large {
                    font-size: 32px;
                    color: #2c5aa0;
                    margin: 20px 0;
                    padding: 10px 0;
                    border-top: 2px solid #dee2e6;
                    border-bottom: 2px solid #dee2e6;
                }
                
                .certificate-text {
                    font-size: 20px;
                    line-height: 1.8;
                    color: #495057;
                    margin: 20px 0;
                }
                
                .signatures {
                    display: flex;
                    justify-content: space-around;
                    margin-top: 50px;
                }
                
                .signature-line {
                    width: 200px;
                    height: 1px;
                    background: #333;
                    margin: 20px auto;
                }
                
                .stamp {
                    position: absolute;
                    bottom: 100px;
                    left: 100px;
                    width: 150px;
                    height: 150px;
                    border: 3px solid #dc3545;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: 'Scheherazade New', serif;
                    font-weight: 700;
                    color: #dc3545;
                    transform: rotate(-15deg);
                    background: white;
                    text-align: center;
                    padding: 10px;
                }
            </style>
        </head>
        <body>
            ${certificateElement.outerHTML}
        </body>
        </html>
    `);

  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}

// حفظ الشهادة كصورة
function downloadCurrentCertificate() {
  if (certificates.length === 0) {
    showMessage("لا توجد شهادات للحفظ", "warning");
    return;
  }

  const certificateElement = document.getElementById("currentCertificate");
  if (!certificateElement) return;

  showMessage("جاري تحويل الشهادة إلى صورة...", "info");

  html2canvas(certificateElement, {
    scale: 3,
    useCORS: true,
    backgroundColor: null,
  })
    .then((canvas) => {
      const link = document.createElement("a");
      link.download = `شهادة_تقدير_${
        certificates[currentCertificateIndex].member.name
      }_${new Date().getTime()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      showMessage("تم حفظ الشهادة كصورة", "success");
    })
    .catch((error) => {
      console.error("❌ خطأ في حفظ الصورة:", error);
      showMessage("حدث خطأ أثناء حفظ الصورة", "error");
    });
}

// طباعة جميع الشهادات
function printAllCertificates() {
  if (certificates.length === 0) {
    showMessage("لا توجد شهادات للطباعة", "warning");
    return;
  }

  const printWindow = window.open("", "_blank");
  let printHTML = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>شهادات تقدير - دار أبناء سلنارتي</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Scheherazade+New:wght@400;700&display=swap');
                
                body {
                    margin: 0;
                    padding: 20px;
                    font-family: 'Amiri', serif;
                    direction: rtl;
                    background: white;
                }
                
                .certificate {
                    page-break-inside: avoid;
                    page-break-after: always;
                    width: 100%;
                    height: 90vh;
                    position: relative;
                    text-align: center;
                    margin-bottom: 20px;
                }
                
                .certificate.classic {
                    border: 15px double #2c5aa0;
                    border-radius: 20px;
                    padding: 40px;
                    background: #f8f9fa;
                }
                
                .certificate-header {
                    margin-bottom: 30px;
                }
                
                .certificate-title {
                    font-size: 36px;
                    color: #2c5aa0;
                    margin-bottom: 10px;
                }
                
                .member-name-large {
                    font-size: 32px;
                    color: #2c5aa0;
                    margin: 20px 0;
                    padding: 10px 0;
                    border-top: 2px solid #dee2e6;
                    border-bottom: 2px solid #dee2e6;
                }
                
                .certificate-text {
                    font-size: 20px;
                    line-height: 1.8;
                    color: #495057;
                    margin: 20px 0;
                }
                
                .signatures {
                    display: flex;
                    justify-content: space-around;
                    margin-top: 50px;
                }
            </style>
        </head>
        <body>
    `;

  certificates.forEach((cert) => {
    printHTML += `
            <div class="certificate ${cert.design}">
                <div class="certificate-header">
                    <h1 class="certificate-title">${cert.title}</h1>
                    <p class="certificate-subtitle">تـمـنـحـهـا إدارة دار أبناء سلنارتي بالرياض</p>
                </div>
                
                <div class="certificate-body">
                    <div class="presented-to">تُـمَـنَـح هـذه الـشـهـادة الـتـقـديـريـة إلى</div>
                    <h2 class="member-name-large">الـعـضـو / ${
                      cert.member.name
                    }</h2>
                    <p class="certificate-text">${cert.text}</p>
                </div>
                
                <div class="certificate-footer">
                    <div class="signatures">
                        <div class="signature-item">
                            <div class="signature-line"></div>
                            <div class="signature-name">${
                              cert.chairmanName
                            }</div>
                            <div class="signature-title">${
                              cert.chairmanTitle
                            }</div>
                        </div>
                        
                        <div class="signature-item">
                            <div class="signature-line"></div>
                            <div class="signature-name">${
                              cert.treasurerName
                            }</div>
                            <div class="signature-title">${
                              cert.treasurerTitle
                            }</div>
                        </div>
                    </div>
                    
                    <div class="certificate-date">
                        التاريخ: ${formatArabicDate(cert.date)}
                    </div>
                </div>
            </div>
        `;
  });

  printHTML += "</body></html>";

  printWindow.document.write(printHTML);
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 1000);
}

// حفظ جميع الشهادات كـ PDF
async function saveAllAsPDF() {
  if (certificates.length === 0) {
    showMessage("لا توجد شهادات للحفظ", "warning");
    return;
  }

  showMessage("جاري إنشاء ملف PDF...", "info");

  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");

    for (let i = 0; i < certificates.length; i++) {
      if (i > 0) {
        pdf.addPage();
      }

      currentCertificateIndex = i;
      displayCurrentCertificate();

      const canvas = await html2canvas(
        document.getElementById("currentCertificate"),
        {
          scale: 2,
          useCORS: true,
          backgroundColor: null,
        }
      );

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 190; // عرض الصورة في PDF
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
    }

    pdf.save(`شهادات_تقدير_دار_سلنارتي_${new Date().getTime()}.pdf`);
    showMessage("تم حفظ جميع الشهادات كـ PDF", "success");
  } catch (error) {
    console.error("❌ خطأ في حفظ PDF:", error);
    showMessage("حدث خطأ أثناء حفظ PDF", "error");
  }
}

// إضافة ختم للشهادة
function addStampToCertificate() {
  const stampText = document.getElementById("stampText").value;
  if (!stampText.trim()) {
    showMessage("يرجى إدخال نص الختم", "warning");
    return;
  }

  if (certificates.length > 0) {
    certificates[currentCertificateIndex].stampText = stampText;
    displayCurrentCertificate();
    showMessage("تم إضافة الختم للشهادة", "success");
  }
}

// تهيئة التاريخ
function initDate() {
  const dateInput = document.getElementById("certificateDate");
  if (dateInput) {
    const today = new Date();
    const formattedDate = today.toISOString().split("T")[0];
    dateInput.value = formattedDate;
  }
}

// الحصول على التاريخ الحالي
function getCurrentDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// تنسيق التاريخ بالعربية
function formatArabicDate(dateString) {
  const date = new Date(dateString);
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString("ar-SA", options);
}

// تنسيق العملة - مطابقة للمواصفات الجديدة (English numerals, no decimals, comma separator, ر.س)
function formatCurrency(amount) {
  if (amount === undefined || amount === null) return "0 ر.س";
  return (
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + " ر.س"
  );
}

// إعادة تعيين الكل
function resetAll() {
  if (confirm("هل تريد إعادة تعيين جميع الإعدادات والشهادات؟")) {
    certificates = [];
    currentCertificateIndex = 0;

    paidMembers.forEach((member) => {
      member.isSelected = false;
    });

    displayMembers();
    displayCurrentCertificate();
    updateStats();

    // إعادة تعيين النموذج
    const titleInp = document.getElementById("certificateTitle");
    const textInp = document.getElementById("certificateText");
    if (titleInp) titleInp.value = "شهادة تقدير";
    if (textInp)
      textInp.value =
        "نظراً لالتزامه بسداد اشتراكاته بانتظام، وحرصه على مصلحة دار أبناء سلنارتي، يُقدم هذا التقدير تقديراً لجهوده وتعاونهم المتميز مع إدارة الدار.";

    showMessage("تم إعادة تعيين جميع الإعدادات", "info");
  }
}

// إظهار الرسائل
function showMessage(text, type) {
  const messageDiv = document.getElementById("message");
  if (!messageDiv) return;
  messageDiv.innerHTML = text;
  messageDiv.className = `message ${type} show`;

  setTimeout(() => {
    messageDiv.classList.remove("show");
  }, 5000);
}

// إضافة CSS إضافي
const additionalStyles = document.createElement("style");
additionalStyles.textContent = `
    .presented-to {
        font-size: 22px;
        color: #666;
        margin-bottom: 15px;
    }
    
    .certificate-logo {
        font-size: 48px;
        color: #2c5aa0;
        margin-bottom: 20px;
    }
    
    .certificate-date-large {
        font-size: 18px;
        color: #2c5aa0;
        margin-top: 30px;
        padding-top: 15px;
        border-top: 1px solid #dee2e6;
    }
    
    .gold-border {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border: 5px solid #ffd700;
        border-radius: 10px;
        pointer-events: none;
    }
`;
document.head.appendChild(additionalStyles);
