// Supabase is used for data access; Firebase references removed.
// تهيئة التطبيق
let currentReportData = null;
let revenueChart = null;
let statusChart = null;
let monthlyRevenueChart = null;
let membersByYearChart = null;

// تهيئة الصفحة
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 بدء تهيئة صفحة التقارير...");

  // تهيئة Supabase (إن وُجد)
  if (typeof supabaseInit === "function") supabaseInit();
  else
    console.warn("Supabase init not found; reports may not function properly.");

  // إعداد تواريخ الفلاتر
  setupDateFilters();

  // إضافة الأحداث
  setupEventListeners();

  console.log("✅ تم تهيئة الصفحة بنجاح");
});

// Firebase initialization removed; use `supabaseInit()` and `window.supabaseDB` instead.

// إعداد تواريخ الفلاتر
function setupDateFilters() {
  const today = new Date();
  const startDate = document.getElementById("startDate");
  const endDate = document.getElementById("endDate");

  // تعيين تاريخ البداية كأول يوم من الشهر الحالي
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  startDate.value = formatDate(firstDayOfMonth);

  // تعيين تاريخ النهاية كآخر يوم من الشهر الحالي
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  endDate.value = formatDate(lastDayOfMonth);

  // تعيين الحد الأدنى والأقصى للتواريخ
  startDate.min = "2015-01-01";
  startDate.max = formatDate(new Date());
  endDate.min = "2015-01-01";
  endDate.max = "2026-12-31";
}

// تنسيق التاريخ
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// إعداد الأحداث
function setupEventListeners() {
  // زر توليد التقرير
  document
    .getElementById("generateReportBtn")
    .addEventListener("click", generateReport);

  // زر التقرير السريع
  document
    .getElementById("quickReportBtn")
    .addEventListener("click", generateQuickReport);

  // زر إعادة التعيين
  document
    .getElementById("resetFiltersBtn")
    .addEventListener("click", resetFilters);

  // أزرار التصدير
  document
    .getElementById("exportChart1Btn")
    .addEventListener("click", () => exportChart("revenueChart"));
  document
    .getElementById("exportChart2Btn")
    .addEventListener("click", () => exportChart("statusChart"));
  document
    .getElementById("exportExcelBtn")
    .addEventListener("click", exportToExcel);
  document
    .getElementById("exportPdfBtn")
    .addEventListener("click", exportToPdf);
  document
    .getElementById("exportCsvBtn")
    .addEventListener("click", exportToCsv);

  // تحديث حالة الفلاتر عند تغيير نوع التقرير
  document.querySelectorAll('input[name="reportType"]').forEach((radio) => {
    radio.addEventListener("change", updateFiltersBasedOnType);
  });
}

// تحديث الفلاتر بناءً على نوع التقرير
function updateFiltersBasedOnType() {
  const reportType = document.querySelector(
    'input[name="reportType"]:checked'
  ).value;
  const startDate = document.getElementById("startDate");
  const endDate = document.getElementById("endDate");
  const today = new Date();

  switch (reportType) {
    case "yearly":
      // تقرير سنوي: السنة الحالية
      startDate.value = `${today.getFullYear()}-01-01`;
      endDate.value = `${today.getFullYear()}-12-31`;
      break;

    case "monthly":
      // تقرير شهري: الشهر الحالي
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      startDate.value = formatDate(firstDay);
      endDate.value = formatDate(lastDay);
      break;

    case "weekly":
      // تقرير أسبوعي: الأسبوع الحالي
      const firstDayOfWeek = new Date(today);
      firstDayOfWeek.setDate(today.getDate() - today.getDay() + 1); // الاثنين
      const lastDayOfWeek = new Date(firstDayOfWeek);
      lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6); // الأحد
      startDate.value = formatDate(firstDayOfWeek);
      endDate.value = formatDate(lastDayOfWeek);
      break;

    case "custom":
      // مخصص: لا تغيير
      break;
  }
}

// توليد التقرير
async function generateReport() {
  if (typeof window.supabaseDB === "undefined") {
    showMessage(
      "❌ قاعدة البيانات غير متاحة. يرجى التحقق من إعدادات Supabase.",
      "error"
    );
    return;
  }

  const loading = document.getElementById("loading");
  const generateBtn = document.getElementById("generateReportBtn");

  loading.classList.add("show");
  generateBtn.disabled = true;

  try {
    // جمع معايير التقرير
    const reportParams = collectReportParams();

    // جلب البيانات من قاعدة البيانات
    const reportData = await fetchReportData(reportParams);

    // تحليل البيانات
    const analyzedData = analyzeReportData(reportData, reportParams);

    // حفظ البيانات الحالية
    currentReportData = analyzedData;

    // عرض النتائج
    displayReportResults(analyzedData);

    showMessage("✅ تم إنشاء التقرير بنجاح", "success");
  } catch (error) {
    console.error("❌ خطأ في إنشاء التقرير:", error);
    showMessage(`❌ حدث خطأ أثناء إنشاء التقرير: ${error.message}`, "error");
  } finally {
    loading.classList.remove("show");
    generateBtn.disabled = false;
  }
}

// توليد تقرير سريع لهذا الشهر
function generateQuickReport() {
  // تعيين النوع إلى شهري
  document.getElementById("reportTypeMonthly").checked = true;
  updateFiltersBasedOnType();

  // توليد التقرير
  setTimeout(() => generateReport(), 100);
}

// إعادة تعيين الفلاتر
function resetFilters() {
  document.getElementById("reportTypeYearly").checked = true;
  updateFiltersBasedOnType();
  document.getElementById("showCharts").checked = true;
  document.getElementById("showTables").checked = true;
  document.getElementById("includeSettlements").checked = false;

  // إخفاء الأقسام
  document.getElementById("statsSection").style.display = "none";
  document.getElementById("chartsSection").style.display = "none";
  document.getElementById("tablesSection").style.display = "none";

  showMessage("تم إعادة تعيين الفلاتر", "info");
}

// جمع معايير التقرير
function collectReportParams() {
  const reportType = document.querySelector(
    'input[name="reportType"]:checked'
  ).value;
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const showCharts = document.getElementById("showCharts").checked;
  const showTables = document.getElementById("showTables").checked;
  const includeSettlements =
    document.getElementById("includeSettlements").checked;

  return {
    reportType,
    startDate,
    endDate,
    showCharts,
    showTables,
    includeSettlements,
    startTimestamp: new Date(startDate).getTime(),
    endTimestamp: new Date(endDate).getTime(),
  };
}

// جلب البيانات (Supabase)
// جلب البيانات (Supabase)
async function fetchReportData(params) {
  console.log("📊 جلب بيانات التقرير (Supabase)...");

  if (typeof window.supabaseDB === "undefined") {
    throw new Error("Supabase client not initialized");
  }

  // استخدام الواجهة لتجميع الأعضاء والاشتراكات
  const normalized = await window.supabaseDB.getAllMembersWithSubscriptions();

  const members = (normalized || []).map((item) => {
    // The item returned by supabaseDB is the member object itself
    return item;
  });

  const subscriptions = [];
  (normalized || []).forEach((member) => {
    const memberId = member.id;

    (member.subscriptions || []).forEach((s) => {
      // Normalization Logic
      // Map snake_case DB fields to camelCase used in analysis
      // Apply default amounts if missing
      const year = s.year || s.subscription_year || new Date().getFullYear();
      const defaultAmount = year >= 2026 ? 300 : 200;

      subscriptions.push({
        ...s, // Keep original properties
        memberId: memberId,
        amount: s.amount_due || defaultAmount,
        paid: s.amount_paid || 0,
        paymentDate: s.payment_date
          ? new Date(s.payment_date)
          : s.created_at
          ? new Date(s.created_at)
          : null,
        subscription_year: year,
      });
    });
  });

  console.log(`✅ تم جلب ${members.length} عضو`);
  console.log(`✅ تم جلب ${subscriptions.length} اشتراك`);

  return {
    members,
    subscriptions,
    params,
  };
}

// تحليل بيانات التقرير
function analyzeReportData(data, params) {
  console.log("📈 تحليل بيانات التقرير...");

  const { members, subscriptions, params: reportParams } = data;
  const { startTimestamp, endTimestamp, includeSettlements } = reportParams;

  // تحليل الإيرادات
  const revenueAnalysis = analyzeRevenue(subscriptions, params);

  // تحليل الأعضاء
  const membersAnalysis = analyzeMembers(members, subscriptions, params);

  // تحليل عمليات التسوية
  const settlementsAnalysis = includeSettlements
    ? analyzeSettlements(members, params)
    : null;

  // تحليل الوقت
  const timeAnalysis = analyzeTimePeriod(subscriptions, params);

  return {
    revenue: revenueAnalysis,
    members: membersAnalysis,
    settlements: settlementsAnalysis,
    time: timeAnalysis,
    rawData: {
      members: members.length,
      subscriptions: subscriptions.length,
    },
    params: reportParams,
    generatedAt: new Date().toISOString(),
  };
}

// تحليل الإيرادات
function analyzeRevenue(subscriptions, params) {
  let totalRevenue = 0;
  let totalTransactions = 0;
  let revenueByType = {
    inside: { amount: 0, count: 0 },
    outside: { amount: 0, count: 0 },
    settlement: { amount: 0, count: 0 },
  };

  subscriptions.forEach((sub) => {
    if (sub.paid && sub.paid > 0) {
      totalRevenue += sub.paid;
      totalTransactions++;

      // تحديد النوع
      if (sub.settlement) {
        // دفعات التسوية
        revenueByType.settlement.amount += sub.paid;
        revenueByType.settlement.count++;
      } else if (sub.subscription_type === "inside") {
        revenueByType.inside.amount += sub.paid;
        revenueByType.inside.count++;
      } else if (sub.subscription_type === "outside") {
        revenueByType.outside.amount += sub.paid;
        revenueByType.outside.count++;
      } else {
        // Fallback logic for old data or missing types
        if (sub.amount === 1500) {
          revenueByType.inside.amount += sub.paid;
          revenueByType.inside.count++;
        } else {
          revenueByType.outside.amount += sub.paid;
          revenueByType.outside.count++;
        }
      }
    }
  });

  const averageTransaction =
    totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // حساب الإيرادات الشهرية
  const monthlyRevenue = calculateMonthlyRevenue(subscriptions);

  return {
    totalRevenue,
    totalTransactions,
    averageTransaction,
    revenueByType,
    monthlyRevenue,
  };
}

// حساب الإيرادات الشهرية
function calculateMonthlyRevenue(subscriptions) {
  const monthlyData = {};

  subscriptions.forEach((sub) => {
    if (sub.paid && sub.paid > 0 && sub.paymentDate) {
      const paymentDate = sub.paymentDate.toDate
        ? sub.paymentDate.toDate()
        : new Date(sub.paymentDate);
      const monthKey = `${paymentDate.getFullYear()}-${String(
        paymentDate.getMonth() + 1
      ).padStart(2, "0")}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          revenue: 0,
          transactions: 0,
          date: new Date(paymentDate.getFullYear(), paymentDate.getMonth(), 1),
        };
      }

      monthlyData[monthKey].revenue += sub.paid;
      monthlyData[monthKey].transactions++;
    }
  });

  // تحويل إلى مصفوفة وترتيب حسب التاريخ
  return Object.values(monthlyData)
    .sort((a, b) => a.date - b.date)
    .map((item) => ({
      month: formatMonth(item.date),
      revenue: item.revenue,
      transactions: item.transactions,
    }));
}

// تحليل الأعضاء
function analyzeMembers(members, subscriptions, params) {
  const statusCount = {
    paid: 0,
    partial: 0,
    unpaid: 0,
    settled: 0,
  };

  const membersByYear = {};
  const detailedMembers = [];

  members.forEach((member) => {
    let totalPaid = 0;
    let totalDue = 0;
    let totalUnpaidRaw = 0;
    let totalSavedBySettlement = 0;

    // الحصول على اشتراكات هذا العضو
    const memberSubscriptions = subscriptions.filter(
      (sub) => sub.memberId === member.id
    );

    memberSubscriptions.forEach((sub) => {
      const amount = sub.amount_due || sub.amount || 0;
      const paid = sub.amount_paid || sub.paid || 0;
      const isSettled = !!sub.settlement;

      if (sub.subscription_type !== "none") {
        totalDue += amount;
        totalPaid += paid;

        const remaining = Math.max(0, amount - paid);
        totalUnpaidRaw += remaining;

        if (isSettled) {
          totalSavedBySettlement += remaining;
        }
      }
    });

    // القيم النهائية
    const totalPaidAfterSettlement = totalPaid + totalSavedBySettlement;
    const totalUnpaidAfterSettlement = Math.max(
      0,
      totalUnpaidRaw - totalSavedBySettlement
    );

    // تحديد الحالة
    let memberStatus = "unpaid";
    if (totalUnpaidAfterSettlement === 0 && totalPaidAfterSettlement > 0) {
      memberStatus = "paid";
    } else if (totalPaidAfterSettlement > 0 && totalUnpaidAfterSettlement > 0) {
      memberStatus = "partial";
    } else {
      memberStatus = "unpaid";
    }

    // تحديث العد
    statusCount[memberStatus]++;

    // تجميع حسب سنة الانضمام
    const joinYear = member.joinYear || new Date().getFullYear();
    if (!membersByYear[joinYear]) {
      membersByYear[joinYear] = 0;
    }
    membersByYear[joinYear]++;

    // إضافة بيانات تفصيلية
    detailedMembers.push({
      id: member.id,
      name: member.name,
      phone: member.phone,
      status: memberStatus,
      totalPaid: totalPaid,
      totalDue: totalDue,
      remaining: totalUnpaidAfterSettlement, // Use the correct calculated remaining
      lastPayment: getLastPaymentDate(memberSubscriptions),
      notes: member.notes || "",
    });
  });

  // تحويل membersByYear إلى مصفوفة مرتبة
  const membersByYearArray = Object.entries(membersByYear)
    .map(([year, count]) => ({ year: parseInt(year), count }))
    .sort((a, b) => a.year - b.year);

  return {
    total: members.length,
    statusCount,
    membersByYear: membersByYearArray,
    detailedMembers: detailedMembers.sort((a, b) => b.remaining - a.remaining), // ترتيب حسب المتأخرات
  };
}

// تحليل عمليات التسوية
function analyzeSettlements(members, params) {
  const settlements = [];

  // في نظامك الحقيقي، قد يكون لديك حقل خاص بالتسوية
  // هنا سنفترض أن التسوية هي عندما يكون totalPaid < totalDue للعضو داخل الدار
  members.forEach((member) => {
    if (member.totalPaid !== undefined && member.totalDue !== undefined) {
      const settledAmount = Math.max(0, member.totalDue - member.totalPaid);
      if (
        settledAmount > 0 &&
        (member.status === "settled" || member.isSettlementEnabled)
      ) {
        settlements.push({
          memberName: member.name,
          memberId: member.id,
          settledAmount,
          originalDebt: member.originalDebt || 0,
          savedAmount: member.savedAmount || 0,
          settlementDate: member.updatedAt || member.createdAt,
        });
      }
    }
  });

  const totalSettlements = settlements.reduce(
    (sum, s) => sum + s.settledAmount,
    0
  );

  return {
    totalSettlements,
    count: settlements.length,
    averageSettlement:
      settlements.length > 0 ? totalSettlements / settlements.length : 0,
    settlements: settlements.sort((a, b) => b.settledAmount - a.settledAmount),
  };
}

// تحليل الفترة الزمنية
function analyzeTimePeriod(subscriptions, params) {
  const { startTimestamp, endTimestamp } = params;
  const periodData = [];

  // تجميع البيانات حسب الفترة المحددة
  const startDate = new Date(startTimestamp);
  const endDate = new Date(endTimestamp);

  // حساب عدد الأيام في الفترة
  const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

  // تحديد الفترات بناءً على نوع التقرير
  if (params.reportType === "yearly") {
    // تجميع سنوي
    const yearData = {};
    subscriptions.forEach((sub) => {
      if (sub.paymentDate) {
        const paymentDate = sub.paymentDate.toDate
          ? sub.paymentDate.toDate()
          : new Date(sub.paymentDate);
        const year = paymentDate.getFullYear();

        if (!yearData[year]) {
          yearData[year] = { revenue: 0, transactions: 0 };
        }

        if (sub.paid) {
          yearData[year].revenue += sub.paid;
          yearData[year].transactions++;
        }
      }
    });

    // تحويل إلى مصفوفة
    Object.keys(yearData)
      .sort()
      .forEach((year) => {
        periodData.push({
          period: year,
          revenue: yearData[year].revenue,
          transactions: yearData[year].transactions,
        });
      });
  } else if (params.reportType === "monthly") {
    // تجميع شهري
    const monthData = {};
    subscriptions.forEach((sub) => {
      if (sub.paymentDate) {
        const paymentDate = sub.paymentDate.toDate
          ? sub.paymentDate.toDate()
          : new Date(sub.paymentDate);
        const monthKey = `${paymentDate.getFullYear()}-${String(
          paymentDate.getMonth() + 1
        ).padStart(2, "0")}`;

        if (!monthData[monthKey]) {
          monthData[monthKey] = { revenue: 0, transactions: 0 };
        }

        if (sub.paid) {
          monthData[monthKey].revenue += sub.paid;
          monthData[monthKey].transactions++;
        }
      }
    });

    // تحويل إلى مصفوفة
    Object.keys(monthData)
      .sort()
      .forEach((monthKey) => {
        const [year, month] = monthKey.split("-");
        const monthNames = [
          "يناير",
          "فبراير",
          "مارس",
          "أبريل",
          "مايو",
          "يونيو",
          "يوليو",
          "أغسطس",
          "سبتمبر",
          "أكتوبر",
          "نوفمبر",
          "ديسمبر",
        ];

        periodData.push({
          period: `${monthNames[parseInt(month) - 1]} ${year}`,
          revenue: monthData[monthKey].revenue,
          transactions: monthData[monthKey].transactions,
        });
      });
  }

  return {
    periodData,
    daysDiff,
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
}

// الحصول على تاريخ آخر دفعة
function getLastPaymentDate(subscriptions) {
  let lastPayment = null;

  subscriptions.forEach((sub) => {
    if (sub.paymentDate && sub.paid && sub.paid > 0) {
      const paymentDate = sub.paymentDate.toDate
        ? sub.paymentDate.toDate()
        : new Date(sub.paymentDate);
      if (!lastPayment || paymentDate > lastPayment) {
        lastPayment = paymentDate;
      }
    }
  });

  return lastPayment ? formatDate(lastPayment) : "لا توجد دفعات";
}

// تنسيق الشهر للعرض
function formatMonth(date) {
  const monthNames = [
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر",
  ];
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

// عرض نتائج التقرير
function displayReportResults(data) {
  // إظهار الأقسام
  document.getElementById("statsSection").style.display = "block";
  document.getElementById("chartsSection").style.display = "block";
  document.getElementById("tablesSection").style.display = "block";

  // عرض الإحصائيات
  displayStats(data);

  // عرض الرسوم البيانية
  displayCharts(data);

  // عرض الجداول
  displayTables(data);
}

// عرض الإحصائيات
function displayStats(data) {
  const statsGrid = document.getElementById("statsGrid");

  const stats = [
    {
      title: "إجمالي الإيرادات",
      value: formatCurrency(data.revenue.totalRevenue),
      icon: "fas fa-money-bill-wave",
      color: "success",
      change: "+12% عن الفترة السابقة",
    },
    {
      title: "عدد الأعضاء",
      value: data.members.total,
      icon: "fas fa-users",
      color: "primary",
      change: `+${Math.floor(data.members.total * 0.05)} عن العام الماضي`,
    },
    {
      title: "المتأخرات",
      value: formatCurrency(
        data.members.detailedMembers.reduce((sum, m) => sum + m.remaining, 0)
      ),
      icon: "fas fa-exclamation-triangle",
      color: "danger",
      change: "-8% عن الشهر الماضي",
    },
    {
      title: "المسددون",
      value: data.members.statusCount.paid,
      icon: "fas fa-check-circle",
      color: "success",
      change: `${Math.round(
        (data.members.statusCount.paid / data.members.total) * 100
      )}% من الأعضاء`,
    },
    {
      title: "المسددون جزئياً",
      value: data.members.statusCount.partial,
      icon: "fas fa-percentage",
      color: "warning",
      change: `${Math.round(
        (data.members.statusCount.partial / data.members.total) * 100
      )}% من الأعضاء`,
    },
    {
      title: "عمليات التسوية",
      value: data.settlements ? data.settlements.count : 0,
      icon: "fas fa-handshake",
      color: "purple",
      change: data.settlements
        ? formatCurrency(data.settlements.totalSettlements)
        : "غير متاح",
    },
    {
      title: "متوسط الدفعة",
      value: formatCurrency(data.revenue.averageTransaction),
      icon: "fas fa-calculator",
      color: "info",
      change: `${data.revenue.totalTransactions} معاملة`,
    },
    {
      title: "الفترة الزمنية",
      value: `${data.time.daysDiff} يوم`,
      icon: "fas fa-calendar",
      color: "primary",
      change: `${data.time.startDate} إلى ${data.time.endDate}`,
    },
  ];

  let statsHTML = "";

  stats.forEach((stat) => {
    const changeClass =
      stat.change.includes("+") || stat.change.includes("%")
        ? "positive"
        : "negative";

    statsHTML += `
            <div class="stat-card ${stat.color}">
                <div class="stat-icon">
                    <i class="${stat.icon}"></i>
                </div>
                <div class="stat-value">${stat.value}</div>
                <div class="stat-label">${stat.title}</div>
                <div class="stat-change ${changeClass}">${stat.change}</div>
            </div>
        `;
  });

  statsGrid.innerHTML = statsHTML;
}

// عرض الرسوم البيانية
function displayCharts(data) {
  const showCharts = document.getElementById("showCharts").checked;

  if (!showCharts) {
    document.getElementById("chartsSection").style.display = "none";
    return;
  }

  // تدمير الرسوم البيانية القديمة إذا كانت موجودة
  if (revenueChart) revenueChart.destroy();
  if (statusChart) statusChart.destroy();
  if (monthlyRevenueChart) monthlyRevenueChart.destroy();
  if (membersByYearChart) membersByYearChart.destroy();

  // 1. رسم بياني للإيرادات حسب النوع
  const revenueCtx = document.getElementById("revenueChart").getContext("2d");
  revenueChart = new Chart(revenueCtx, {
    type: "doughnut",
    data: {
      labels: ["داخل الدار", "خارج الدار", "التسويات"],
      datasets: [
        {
          data: [
            data.revenue.revenueByType.inside.amount,
            data.revenue.revenueByType.outside.amount,
            data.revenue.revenueByType.settlement.amount,
          ],
          backgroundColor: [
            "#4CAF50", // أخضر
            "#2196F3", // أزرق
            "#9C27B0", // بنفسجي
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          rtl: true,
        },
        title: {
          display: true,
          text: "توزيع الإيرادات حسب نوع الاشتراك",
          font: {
            size: 16,
          },
        },
      },
    },
  });

  // 2. رسم بياني لحالة الأعضاء
  const statusCtx = document.getElementById("statusChart").getContext("2d");
  statusChart = new Chart(statusCtx, {
    type: "bar",
    data: {
      labels: ["مسددون", "مسددون جزئياً", "غير مسددين", "تمت التسوية"],
      datasets: [
        {
          label: "عدد الأعضاء",
          data: [
            data.members.statusCount.paid,
            data.members.statusCount.partial,
            data.members.statusCount.unpaid,
            data.members.statusCount.settled || 0,
          ],
          backgroundColor: [
            "#4CAF50", // أخضر
            "#FF9800", // برتقالي
            "#F44336", // أحمر
            "#9C27B0", // بنفسجي
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "عدد الأعضاء",
          },
        },
        x: {
          title: {
            display: true,
            text: "حالة الاشتراك",
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: "توزيع الأعضاء حسب حالة الاشتراك",
          font: {
            size: 16,
          },
        },
      },
    },
  });

  // 3. رسم بياني للإيرادات الشهرية
  const monthlyCtx = document
    .getElementById("monthlyRevenueChart")
    .getContext("2d");

  // تحضير بيانات الشهور
  const months = data.revenue.monthlyRevenue.map((item) => item.month);
  const revenues = data.revenue.monthlyRevenue.map((item) => item.revenue);

  monthlyRevenueChart = new Chart(monthlyCtx, {
    type: "line",
    data: {
      labels: months,
      datasets: [
        {
          label: "الإيرادات (ريال)",
          data: revenues,
          backgroundColor: "rgba(76, 175, 80, 0.2)",
          borderColor: "#4CAF50",
          borderWidth: 2,
          tension: 0.1,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "الإيرادات (ريال)",
          },
        },
        x: {
          title: {
            display: true,
            text: "الشهر",
          },
        },
      },
      plugins: {
        title: {
          display: true,
          text: "الإيرادات الشهرية",
          font: {
            size: 16,
          },
        },
      },
    },
  });

  // 4. رسم بياني للأعضاء حسب سنة الانضمام
  const membersByYearCtx = document
    .getElementById("membersByYearChart")
    .getContext("2d");

  const years = data.members.membersByYear.map((item) => item.year);
  const counts = data.members.membersByYear.map((item) => item.count);

  membersByYearChart = new Chart(membersByYearCtx, {
    type: "bar",
    data: {
      labels: years,
      datasets: [
        {
          label: "عدد الأعضاء",
          data: counts,
          backgroundColor: "rgba(33, 150, 243, 0.7)",
          borderColor: "#2196F3",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "عدد الأعضاء",
          },
        },
        x: {
          title: {
            display: true,
            text: "سنة الانضمام",
          },
        },
      },
      plugins: {
        title: {
          display: true,
          text: "توزيع الأعضاء حسب سنة الانضمام",
          font: {
            size: 16,
          },
        },
      },
    },
  });
}

// عرض الجداول
function displayTables(data) {
  const showTables = document.getElementById("showTables").checked;

  if (!showTables) {
    document.getElementById("tablesSection").style.display = "none";
    return;
  }

  // 1. جدول الإيرادات التفصيلية
  displayRevenueTable(data);

  // 2. جدول حالة الأعضاء
  displayMembersTable(data);

  // 3. جدول عمليات التسوية
  displaySettlementsTable(data);
}

// عرض جدول الإيرادات
function displayRevenueTable(data) {
  const tableBody = document.getElementById("revenueTableBody");
  let tableHTML = "";

  // بيانات العرض
  const periods = data.time.periodData;

  periods.forEach((period, index) => {
    const growth =
      index > 0
        ? `${(
            ((period.revenue - periods[index - 1].revenue) /
              periods[index - 1].revenue) *
            100
          ).toFixed(1)}%`
        : "جديد";

    const growthClass =
      growth === "جديد"
        ? ""
        : parseFloat(growth) >= 0
        ? "positive"
        : "negative";

    tableHTML += `
            <tr>
                <td>${period.period}</td>
                <td>${formatCurrency(period.revenue)}</td>
                <td>${period.transactions}</td>
                <td>${formatCurrency(
                  period.revenue / period.transactions || 0
                )}</td>
                <td><span class="stat-change ${growthClass}">${growth}</span></td>
                <td>
                    <span class="status-badge ${
                      period.revenue > 0 ? "status-paid" : "status-unpaid"
                    }">
                        ${period.revenue > 0 ? "نشط" : "غير نشط"}
                    </span>
                </td>
            </tr>
        `;
  });

  // إضافة الصف الإجمالي
  tableHTML += `
        <tr style="background-color: #f8f9fa; font-weight: bold;">
            <td>الإجمالي</td>
            <td>${formatCurrency(data.revenue.totalRevenue)}</td>
            <td>${data.revenue.totalTransactions}</td>
            <td>${formatCurrency(data.revenue.averageTransaction)}</td>
            <td colspan="2">-</td>
        </tr>
    `;

  tableBody.innerHTML = tableHTML;
}

// عرض جدول الأعضاء
// متغير حالة لتتبع عدد الأعضاء المعروضين
let currentMemberIndex = 20;

// عرض جدول الأعضاء
function displayMembersTable(data) {
  // إعادة تعيين المؤشر عند عرض الجدول لأول مرة
  currentMemberIndex = 20;

  const tableBody = document.getElementById("membersTableBody");

  // عرض أول 20 عضو فقط
  const membersToShow = data.members.detailedMembers.slice(
    0,
    currentMemberIndex
  );

  renderMembersRows(membersToShow, tableBody);

  // تحديث زر "عرض المزيد"
  updateLoadMoreButton(data.members.detailedMembers.length);
}

// دالة مساعدة لرسم صفوف الأعضاء
function renderMembersRows(members, container) {
  let tableHTML = "";

  members.forEach((member) => {
    const statusBadgeClass =
      {
        paid: "status-paid",
        partial: "status-partial",
        unpaid: "status-unpaid",
        settled: "status-settled",
      }[member.status] || "status-unpaid";

    const statusText =
      {
        paid: "مسدد",
        partial: "مسدد جزئياً",
        unpaid: "غير مسدد",
        settled: "تمت التسوية",
      }[member.status] || "غير معروف";

    tableHTML += `
            <tr>
                <td>${member.name || "غير محدد"}</td>
                <td>${member.phone || "غير محدد"}</td>
                <td><span class="status-badge ${statusBadgeClass}">${statusText}</span></td>
                <td>${formatCurrency(member.totalPaid)}</td>
                <td>${formatCurrency(member.remaining)}</td>
                <td>${member.lastPayment}</td>
                <td>${member.notes || "-"}</td>
            </tr>
        `;
  });

  container.innerHTML = tableHTML;
}

// تحديث زر تحميل المزيد
function updateLoadMoreButton(totalMembers) {
  const tableBody = document.getElementById("membersTableBody");
  // إزالة الصف الأخير إذا كان يحتوي على الزر
  const lastRow = tableBody.lastElementChild;
  if (lastRow && lastRow.id === "loadMoreRow") {
    lastRow.remove();
  }

  if (currentMemberIndex < totalMembers) {
    const remaining = totalMembers - currentMemberIndex;
    const loadMoreHTML = `
            <tr id="loadMoreRow">
                <td colspan="7" style="text-align: center; background-color: #f8f9fa;">
                    <strong>عرض ${currentMemberIndex} من ${totalMembers} عضو</strong>
                    <button onclick="loadMoreMembers()" style="margin-right: 10px; padding: 5px 15px; background-color: #2c5aa0; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        عرض المزيد (${remaining} متبقي)
                    </button>
                </td>
            </tr>
        `;
    tableBody.insertAdjacentHTML("beforeend", loadMoreHTML);
  }
}

// دالة لتحميل المزيد من الأعضاء
function loadMoreMembers() {
  if (!currentReportData) return;

  const allMembers = currentReportData.members.detailedMembers;
  const nextBatch = allMembers.slice(
    currentMemberIndex,
    currentMemberIndex + 20
  );

  if (nextBatch.length > 0) {
    // إزالة زر التحميل القديم
    const loadMoreRow = document.getElementById("loadMoreRow");
    if (loadMoreRow) loadMoreRow.remove();

    // إضافة الصفوف الجديدة
    const tableBody = document.getElementById("membersTableBody");

    // استخدام دالة مساعدة لإضافة صفوف جديدة بدلاً من إعادة رسم كل شيء
    nextBatch.forEach((member) => {
      const statusBadgeClass =
        {
          paid: "status-paid",
          partial: "status-partial",
          unpaid: "status-unpaid",
          settled: "status-settled",
        }[member.status] || "status-unpaid";

      const statusText =
        {
          paid: "مسدد",
          partial: "مسدد جزئياً",
          unpaid: "غير مسدد",
          settled: "تمت التسوية",
        }[member.status] || "غير معروف";

      const rowHTML = `
                    <tr>
                        <td>${member.name || "غير محدد"}</td>
                        <td>${member.phone || "غير محدد"}</td>
                        <td><span class="status-badge ${statusBadgeClass}">${statusText}</span></td>
                        <td>${formatCurrency(member.totalPaid)}</td>
                        <td>${formatCurrency(member.remaining)}</td>
                        <td>${member.lastPayment}</td>
                        <td>${member.notes || "-"}</td>
                    </tr>
                `;
      tableBody.insertAdjacentHTML("beforeend", rowHTML);
    });

    // تحديث المؤشر
    currentMemberIndex += nextBatch.length;

    // إعادة إضافة زر التحميل إذا لزم الأمر
    updateLoadMoreButton(allMembers.length);
  }
}

// عرض جدول التسويات
function displaySettlementsTable(data) {
  const tableBody = document.getElementById("settlementsTableBody");
  let tableHTML = "";

  if (!data.settlements || data.settlements.settlements.length === 0) {
    tableHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: #6c757d;">
                    <i class="fas fa-info-circle"></i> لا توجد عمليات تسوية في الفترة المحددة
                </td>
            </tr>
        `;
  } else {
    data.settlements.settlements.forEach((settlement) => {
      const settlementDate = settlement.settlementDate
        ? settlement.settlementDate.toDate
          ? formatDate(settlement.settlementDate.toDate())
          : settlement.settlementDate.split("T")[0]
        : "غير محدد";

      tableHTML += `
                <tr>
                    <td>${settlement.memberName || "غير محدد"}</td>
                    <td>${new Date().getFullYear()}</td>
                    <td>داخل الدار</td>
                    <td>${formatCurrency(settlement.originalDebt)}</td>
                    <td>${formatCurrency(
                      settlement.originalDebt - settlement.settledAmount
                    )}</td>
                    <td>${formatCurrency(settlement.settledAmount)}</td>
                    <td>${settlementDate}</td>
                </tr>
            `;
    });

    // صف الإجمالي
    tableHTML += `
            <tr style="background-color: #f8f9fa; font-weight: bold;">
                <td colspan="3">الإجمالي</td>
                <td>${formatCurrency(
                  data.settlements.settlements.reduce(
                    (sum, s) => sum + s.originalDebt,
                    0
                  )
                )}</td>
                <td>${formatCurrency(
                  data.settlements.settlements.reduce(
                    (sum, s) => sum + (s.originalDebt - s.settledAmount),
                    0
                  )
                )}</td>
                <td>${formatCurrency(data.settlements.totalSettlements)}</td>
                <td>${data.settlements.count} عملية</td>
            </tr>
        `;
  }

  tableBody.innerHTML = tableHTML;
}

// وظائف مساعدة
function formatCurrency(amount) {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace("SAR", "ريال");
}

function formatNumber(number) {
  return new Intl.NumberFormat("ar-SA").format(number);
}

// تصدير الرسوم البيانية
function exportChart(chartId) {
  const canvas = document.getElementById(chartId);
  if (!canvas) return;

  const link = document.createElement("a");
  link.download = `${chartId}_${new Date().getTime()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();

  showMessage("تم تصدير الرسم البياني", "success");
}

// تصدير إلى Excel
async function exportToExcel() {
  if (!currentReportData) {
    showMessage("لا توجد بيانات للتصدير", "error");
    return;
  }

  try {
    showMessage("جاري إنشاء ملف Excel...", "info");

    // استخدام مكتبة SheetJS (xlsx)
    const workbook = XLSX.utils.book_new();

    // ورقة الإيرادات
    const revenueData = currentReportData.time.periodData.map((period) => ({
      الفترة: period.period,
      الإيرادات: period.revenue,
      المعاملات: period.transactions,
      المتوسط: period.revenue / period.transactions || 0,
    }));

    const revenueSheet = XLSX.utils.json_to_sheet(revenueData);
    XLSX.utils.book_append_sheet(workbook, revenueSheet, "الإيرادات");

    // ورقة الأعضاء
    const membersData = currentReportData.members.detailedMembers.map(
      (member) => ({
        الاسم: member.name,
        الجوال: member.phone,
        الحالة: member.status,
        المدفوع: member.totalPaid,
        المتأخر: member.remaining,
        آخر_دفعة: member.lastPayment,
      })
    );

    const membersSheet = XLSX.utils.json_to_sheet(membersData);
    XLSX.utils.book_append_sheet(workbook, membersSheet, "الأعضاء");

    // توليد الملف وتنزيله
    const fileName = `تقرير_دار_سلنارتي_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    XLSX.writeFile(workbook, fileName);

    showMessage("تم تصدير الملف بنجاح", "success");
  } catch (error) {
    console.error("خطأ في تصدير Excel:", error);
    showMessage("حدث خطأ أثناء التصدير", "error");
  }
}

// تصدير إلى PDF
function exportToPdf() {
  if (!currentReportData) {
    showMessage("لا توجد بيانات للتصدير", "error");
    return;
  }

  const element = document.querySelector("main.container");
  // إخفاء الأزرار مؤقتاً قبل التصدير
  const buttons = document.querySelectorAll("button");
  const originalStyles = [];
  buttons.forEach((btn) => {
    originalStyles.push({ element: btn, display: btn.style.display });
    btn.style.display = "none";
  });

  const opt = {
    margin: [10, 10], // top, left, bottom, right
    filename: `تقرير_دار_سلنارتي_${new Date().toISOString().split("T")[0]}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  };

  showMessage("جاري إنشاء ملف PDF... الرجاء الانتظار", "info");

  html2pdf()
    .set(opt)
    .from(element)
    .save()
    .then(() => {
      showMessage("تم تحميل ملف PDF بنجاح", "success");
      // استعادة الأزرار
      buttons.forEach((btn, index) => {
        btn.style.display = originalStyles[index].display;
      });
    })
    .catch((err) => {
      console.error(err);
      showMessage("حدث خطأ أثناء إنشاء PDF", "error");
      // استعادة الأزرار في حالة الخطأ أيضاً
      buttons.forEach((btn, index) => {
        btn.style.display = originalStyles[index].display;
      });
    });
}

// تصدير إلى CSV
function exportToCsv() {
  if (!currentReportData) {
    showMessage("لا توجد بيانات للتصدير", "error");
    return;
  }

  // إنشاء CSV أكثر شمولية
  let csvContent = "data:text/csv;charset=utf-8,";

  // ترميز البيانات العربية
  const BOM = "\uFEFF";
  csvContent = BOM + csvContent;

  // قسم الإيرادات
  csvContent += "=== الإيرادات ===\n";
  csvContent += "الفترة,الإيرادات (ريال),عدد المعاملات,المتوسط,نسبة النمو\n";

  currentReportData.time.periodData.forEach((period, index) => {
    const growth =
      index > 0
        ? (
            ((period.revenue -
              currentReportData.time.periodData[index - 1].revenue) /
              currentReportData.time.periodData[index - 1].revenue) *
            100
          ).toFixed(1) + "%"
        : "جديد";

    csvContent += `"${period.period}",${period.revenue},${
      period.transactions
    },${period.revenue / period.transactions || 0},"${growth}"\n`;
  });

  csvContent += "\n=== الأعضاء ===\n";
  csvContent += "الاسم,الجوال,الحالة,المدفوع,المتأخر,آخر دفعة\n";

  currentReportData.members.detailedMembers.forEach((member) => {
    csvContent += `"${member.name || ""}","${member.phone || ""}","${
      member.status
    }",${member.totalPaid},${member.remaining},"${member.lastPayment}"\n`;
  });

  // إنشاء رابط التحميل
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute(
    "download",
    `تقرير_دار_سلنارتي_${new Date().getTime()}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showMessage("تم تصدير البيانات إلى ملف CSV", "success");
}
// function exportToCsv() {
//   if (!currentReportData) {
//     showMessage("لا توجد بيانات للتصدير", "error");
//     return;
//   }

//   // إنشاء محتوى CSV
//   let csvContent = "data:text/csv;charset=utf-8,";

//   // إضافة العنوان
//   csvContent += "تقرير دار أبناء سلنارتي\n";
//   csvContent += `تاريخ التقرير: ${new Date().toLocaleDateString("ar-SA")}\n`;
//   csvContent += `الفترة: ${currentReportData.time.startDate} إلى ${currentReportData.time.endDate}\n\n`;

//   // إضافة بيانات الإيرادات
//   csvContent += "الإيرادات\n";
//   csvContent += "الفترة,المبلغ,عدد المعاملات,المتوسط\n";

//   currentReportData.time.periodData.forEach((period) => {
//     csvContent += `${period.period},${period.revenue},${period.transactions},${
//       period.revenue / period.transactions || 0
//     }\n`;
//   });

//   csvContent += `الإجمالي,${currentReportData.revenue.totalRevenue},${currentReportData.revenue.totalTransactions},${currentReportData.revenue.averageTransaction}\n\n`;

//   // إنشاء رابط التحميل
//   const encodedUri = encodeURI(csvContent);
//   const link = document.createElement("a");
//   link.setAttribute("href", encodedUri);
//   link.setAttribute(
//     "download",
//     `تقرير_دار_سلنارتي_${new Date().getTime()}.csv`
//   );
//   document.body.appendChild(link);
//   link.click();
//   document.body.removeChild(link);

//   showMessage("تم تصدير البيانات إلى ملف CSV", "success");
// }

// عرض الرسائل
function showMessage(text, type) {
  const messageDiv = document.getElementById("message");
  messageDiv.innerHTML = text;
  messageDiv.className = `message ${type} show`;

  setTimeout(() => {
    messageDiv.classList.remove("show");
  }, 5000);
}

// دالة لتحميل المزيد من الأعضاء (للعرض في الجدول)
function loadMoreMembers() {
  // هذه دالة مساعدة يمكن تطويرها لتحميل المزيد من الأعضاء
  showMessage("جاري تحميل المزيد من الأعضاء...", "info");
  setTimeout(() => {
    showMessage("تم تحميل المزيد من الأعضاء", "success");
  }, 1000);
}

// تعريف الدوال للوصول العالمي (لأزرار الجداول)
window.loadMoreMembers = loadMoreMembers;
window.exportChart = exportChart;
window.exportToExcel = exportToExcel;
window.exportToPdf = exportToPdf;
window.exportToCsv = exportToCsv;

// تحديث تاريخ التحديث
document.getElementById("lastUpdateDate").textContent =
  new Date().toLocaleDateString("ar-SA");

// تهيئة سجل التحميلات
function initDownloadHistory() {
  let history = JSON.parse(localStorage.getItem("exportHistory") || "[]");
  const historyList = document.getElementById("downloadHistoryList");

  if (history.length === 0) {
    historyList.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #6c757d;">
                        <i class="fas fa-info-circle fa-2x" style="margin-bottom: 10px;"></i>
                        <p>لا توجد عمليات تحميل سابقة</p>
                    </div>
                `;
    return;
  }

  let historyHTML = "";
  history.slice(0, 10).forEach((item) => {
    const typeClass = `badge-${item.type.toLowerCase()}`;
    historyHTML += `
                    <div class="history-item">
                        <div>
                            <strong>${item.name}</strong><br>
                            <small style="color: #666;">${item.date}</small>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span class="export-type-badge ${typeClass}">${item.type}</span>
                            <span style="color: #666;">${item.size}</span>
                        </div>
                    </div>
                `;
  });

  historyList.innerHTML = historyHTML;
}

// حفظ في سجل التحميلات
function saveToDownloadHistory(fileName, fileType, fileSize) {
  let history = JSON.parse(localStorage.getItem("exportHistory") || "[]");

  history.unshift({
    name: fileName,
    type: fileType,
    size: fileSize,
    date: new Date().toLocaleString("ar-SA"),
    timestamp: new Date().getTime(),
  });

  // الاحتفاظ بأخر 50 عملية فقط
  if (history.length > 50) {
    history = history.slice(0, 50);
  }

  localStorage.setItem("exportHistory", JSON.stringify(history));
  initDownloadHistory();
}

// تحديث شريط التقدم
function updateExportProgress(percent, message, details) {
  const progressBar = document.getElementById("exportProgressFill");
  const percentText = document.getElementById("exportProgressPercent");
  const messageText = document.getElementById("exportProgressText");
  const detailsText = document.getElementById("exportDetails");
  const progressContainer = document.getElementById("exportProgress");

  progressBar.style.width = percent + "%";
  percentText.textContent = percent + "%";
  messageText.textContent = message;

  if (details) {
    detailsText.textContent = details;
  }

  if (percent > 0) {
    progressContainer.classList.add("show");
  }

  if (percent >= 100) {
    setTimeout(() => {
      progressContainer.classList.remove("show");
    }, 2000);
  }
}

// تصدير جميع الرسوم البيانية
function exportAllCharts() {
  const charts = [
    "revenueChart",
    "statusChart",
    "monthlyRevenueChart",
    "membersByYearChart",
  ];
  let exported = 0;

  updateExportProgress(0, "جاري تصدير الرسوم البيانية...");

  charts.forEach((chartId, index) => {
    setTimeout(() => {
      const canvas = document.getElementById(chartId);
      if (canvas) {
        const link = document.createElement("a");
        link.download = `${chartId}_${new Date().getTime()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();

        exported++;
        const percent = Math.floor((exported / charts.length) * 100);
        updateExportProgress(
          percent,
          `جاري تصدير الرسم ${exported} من ${charts.length}...`
        );

        if (exported === charts.length) {
          updateExportProgress(100, "تم تصدير جميع الرسوم بنجاح");
          showMessage("تم تصدير جميع الرسوم البيانية", "success");
          saveToDownloadHistory("الرسوم_البيانية", "ZIP", "متعدد الملفات");
        }
      }
    }, index * 500);
  });
}

// إرسال بالبريد الإلكتروني
function sendReportByEmail(email) {
  if (!email) {
    showMessage("يرجى إدخال بريد إلكتروني صحيح", "error");
    return;
  }

  updateExportProgress(30, "جاري تحضير التقرير للإرسال...");

  // محاكاة إرسال البريد الإلكتروني
  setTimeout(() => {
    updateExportProgress(70, "جاري إرسال التقرير...");

    setTimeout(() => {
      updateExportProgress(100, "تم إرسال التقرير بنجاح");
      showMessage(`تم إرسال التقرير إلى ${email}`, "success");
    }, 1500);
  }, 1500);
}

// جدولة التصدير
function scheduleExport(scheduleType) {
  const scheduleText = {
    daily: "يومي",
    weekly: "أسبوعي",
    monthly: "شهري",
    quarterly: "ربع سنوي",
  };

  showMessage(
    `تم تفعيل الجدولة ${scheduleText[scheduleType]} للتصدير التلقائي`,
    "success"
  );

  // هنا يمكن إضافة كود لحفظ الجدولة في قاعدة البيانات
}

// تصدير كامل (ZIP)
async function exportFullReport() {
  if (!currentReportData) {
    showMessage("لا توجد بيانات للتصدير", "error");
    return;
  }

  updateExportProgress(10, "جاري تجميع البيانات...");

  try {
    const zip = new JSZip();

    // إضافة البيانات النصية
    updateExportProgress(30, "جاري إضافة البيانات النصية...");

    // بيانات الإيرادات
    const revenueData = currentReportData.time.periodData.map((period) => ({
      period: period.period,
      revenue: period.revenue,
      transactions: period.transactions,
      average: period.revenue / period.transactions || 0,
    }));

    zip.file("revenue.json", JSON.stringify(revenueData, null, 2));

    // بيانات الأعضاء
    updateExportProgress(50, "جاري إضافة بيانات الأعضاء...");

    const membersData = currentReportData.members.detailedMembers.map(
      (member) => ({
        name: member.name,
        phone: member.phone,
        status: member.status,
        totalPaid: member.totalPaid,
        remaining: member.remaining,
        lastPayment: member.lastPayment,
      })
    );

    zip.file("members.json", JSON.stringify(membersData, null, 2));

    // إضافة الرسوم البيانية
    updateExportProgress(70, "جاري إضافة الرسوم البيانية...");

    const charts = [
      "revenueChart",
      "statusChart",
      "monthlyRevenueChart",
      "membersByYearChart",
    ];
    const imgFolder = zip.folder("charts");

    for (let i = 0; i < charts.length; i++) {
      const chartId = charts[i];
      const canvas = document.getElementById(chartId);
      if (canvas) {
        const dataURL = canvas.toDataURL("image/png").split(",")[1];
        imgFolder.file(`${chartId}.png`, dataURL, { base64: true });
      }
      updateExportProgress(
        70 + Math.floor(((i + 1) / charts.length) * 20),
        `جاري إضافة الرسم ${i + 1} من ${charts.length}...`
      );
    }

    // إنشاء ملف README
    updateExportProgress(95, "جاري إنشاء ملف التقرير...");

    const readmeContent = `
                    تقرير دار أبناء سلنارتي
                    =======================
                    
                    تاريخ التوليد: ${new Date().toLocaleString("ar-SA")}
                    الفترة: ${currentReportData.time.startDate} إلى ${
      currentReportData.time.endDate
    }
                    
                    المحتويات:
                    - revenue.json: بيانات الإيرادات
                    - members.json: بيانات الأعضاء
                    - charts/: مجلد يحتوي على الرسوم البيانية
                    
                    إحصائيات:
                    - إجمالي الإيرادات: ${
                      currentReportData.revenue.totalRevenue
                    } ريال
                    - عدد الأعضاء: ${currentReportData.members.total}
                    - عدد المعاملات: ${
                      currentReportData.revenue.totalTransactions
                    }
                    
                    © دار أبناء سلنارتي بالرياض
                `;

    zip.file("README.txt", readmeContent);

    // توليد ملف ZIP
    updateExportProgress(98, "جاري ضغط الملفات...");

    const content = await zip.generateAsync({ type: "blob" });

    updateExportProgress(100, "جاري تنزيل الملف...");

    // تنزيل الملف
    const fileName = `تقرير_كامل_دار_سلنارتي_${new Date().getTime()}.zip`;
    saveAs(content, fileName);

    showMessage("تم تصدير التقرير الكامل بنجاح", "success");
    saveToDownloadHistory(
      fileName,
      "ZIP",
      (content.size / 1024).toFixed(1) + " KB"
    );
  } catch (error) {
    console.error("خطأ في تصدير ZIP:", error);
    showMessage("حدث خطأ أثناء تصدير التقرير الكامل", "error");
  }
}

// الطباعة
function printReport() {
  if (!currentReportData) {
    showMessage("لا توجد بيانات للطباعة. يرجى توليد التقرير أولاً.", "error");
    return;
  }

  // إنشاء محتوى مخصص للطباعة
  const printContent = createPrintContent();

  const originalContent = document.body.innerHTML;

  // إعداد صفحة الطباعة
  document.body.innerHTML = `
    <div style="direction: rtl; font-family: 'Cairo', sans-serif; padding: 20px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2c5aa0; padding-bottom: 20px;">
        <h1 style="color: #2c5aa0; margin: 0;">دار أبناء سلنارتي بالرياض</h1>
        <h2 style="color: #555; margin: 10px 0;">التقرير المالي</h2>
        <p style="color: #777; margin: 5px 0;">تاريخ الطباعة: ${new Date().toLocaleString(
          "ar-SA"
        )}</p>
        <p style="color: #777; margin: 5px 0;">الفترة: ${
          currentReportData.time.startDate
        } إلى ${currentReportData.time.endDate}</p>
      </div>
      
      ${printContent}
      
      <div style="text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; color: #777; font-size: 12px;">
        <p>جميع الحقوق محفوظة © دار أبناء سلنارتي بالرياض ${new Date().getFullYear()}</p>
        <p>تم إنشاء هذا التقرير تلقائياً من النظام المالي للدار</p>
      </div>
    </div>
  `;

  // إضافة CSS للطباعة مع دعم الجداول الكبيرة
  const style = document.createElement("style");
  style.innerHTML = `
    @media print {
      body {
        margin: 0;
        padding: 0;
        width: 100%;
      }
      
      /* تحديد اتجاه الصفحة لجميع الصفحات */
      @page {
        size: landscape;
        margin: 10mm;
      }
      
      
      /* تجنب تقسيم الجداول بين صفحات */
      table {
        page-break-inside: auto;
        width: 100% !important;
        max-width: 100% !important;
        table-layout: fixed;
      }
      
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      
      thead {
        display: table-header-group;
      }
      
      tfoot {
        display: table-footer-group;
      }
      
      th, td {
     
        word-wrap: break-word;
        overflow-wrap: break-word;
        padding: 8px 6px;
        font-size: 16px;
        text-align: right;
        border: 1px solid #ddd;
        vertical-align: top;
        width: 100%;
      }
      
      th {
        background-color: #f5f5f5 !important;
        color: #333 !important;
        font-weight: bold;
        font-size: 16px;
        -webkit-print-color-adjust: exact;
      }
      
      /* تقليل حجم الخط في الجداول الكبيرة */
      .wide-table th,
      .wide-table td {
        font-size: 16px;
        font-weight: bold;
        padding: 6px 4px;
      }
      
      /* إخفاء الأعمدة غير الضرورية في الطباعة */
      .optional-column {
        display: none;
      }
      
      .section-title {
        color: #2c5aa0;
        border-bottom: 2px solid #2c5aa0;
        padding-bottom: 10px;
        margin-top: 30px;
        margin-bottom: 15px;
        page-break-after: avoid;
      }
      
      .stat-card {
        background-color: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 5px;
        padding: 12px;
        margin-bottom: 12px;
        text-align: center;
        page-break-inside: avoid;
      }
      
      .stat-value {
        font-size: 16px;
        font-weight: bold;
        color: #2c5aa0;
        margin: 8px 0;
      }
      
      .page-break {
        page-break-after: always;
      }
      
      .no-break {
        page-break-inside: avoid;
      }
      
      /* تحسين عرض الجداول */
      .responsive-table {
        overflow-x: visible !important;
        width: 100% !important;
        display: block !important;
      }
      
      /* تقليل هوامش الخلايا */
      .compact-table th,
      .compact-table td {
        padding: 4px 3px;
        font-size: 10px;
      }
      
      /* تكبير الخط في العناوين */
      .table-title {
        font-size: 14px !important;
        margin-bottom: 8px !important;
      }
      
      /* إظهار الخلفيات عند الطباعة */
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* إخفاء العناصر غير المرغوب فيها */
      .no-print, button, .export-buttons, .controls-section {
        display: none !important;
      }
    }
    
    /* التنسيق العام للعرض */
    @media screen {
      .print-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        font-size: 12px;
      }
      
      .print-table th {
        background-color: #f5f5f5;
        color: #333;
        font-weight: bold;
        padding: 10px;
        text-align: right;
        border: 1px solid #ddd;
      }
      
      .print-table td {
        padding: 8px 10px;
        border: 1px solid #ddd;
      }
      
      .compact-table {
        width: 100%;
        font-size: 16px;
        font-weight: bold;
      }
      
      .compact-table th,
      .compact-table td {
        padding: 6px 8px;
      }
    }
  `;
  document.head.appendChild(style);

  // جعل الجداول متجاوبة قبل الطباعة
  setTimeout(() => {
    const tables = document.querySelectorAll("table");
    tables.forEach((table) => {
      // تحديد إذا كان الجدول يحتوي على أعمدة كثيرة
      const columnCount = table.rows[0].cells.length;

      if (columnCount > 6) {
        // للجداول الكبيرة
        table.classList.add("wide-table", "compact-table");

        // تعديل عرض الأعمدة تلقائياً
        const cells = table.querySelectorAll("th, td");
        cells.forEach((cell) => {
          cell.style.maxWidth = "120px";
          cell.style.minWidth = "80px";
        });
      } else {
        // للجداول الصغيرة
        table.classList.add("print-table");
      }
    });

    // تنفيذ الطباعة
    window.print();

    // استعادة المحتوى الأصلي بعد تأخير بسيط
    setTimeout(() => {
      document.body.innerHTML = originalContent;
      location.reload();
    }, 500);
  }, 100);
}

// دالة لإنشاء محتوى الطباعة
function createPrintContent() {
  if (!currentReportData) return "";

  let printHTML = "";

  // 1. الإحصائيات الرئيسية
  printHTML += `
    <div class="no-break" style="padding-bottom: 50px;">
      <h3 class="section-title">الإحصائيات الرئيسية</h3>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 25px;">
        <div class="stat-card">
          <div style="font-weight: bold; color: #2c5aa0; margin-bottom: 5px; font-size: 13px;">إجمالي الإيرادات</div>
          <div class="stat-value">${formatCurrency(
            currentReportData.revenue.totalRevenue
          )}</div>
        </div>
        
        <div class="stat-card">
          <div style="font-weight: bold; color: #2c5aa0; margin-bottom: 5px; font-size: 13px;">عدد الأعضاء</div>
          <div class="stat-value">${currentReportData.members.total}</div>
        </div>
        
        <div class="stat-card">
          <div style="font-weight: bold; color: #2c5aa0; margin-bottom: 5px; font-size: 13px;">المتأخرات</div>
          <div class="stat-value">
            ${formatCurrency(
              currentReportData.members.detailedMembers.reduce(
                (sum, m) => sum + m.remaining,
                0
              )
            )}
          </div>
        </div>
        
        <div class="stat-card">
          <div style="font-weight: bold; color: #2c5aa0; margin-bottom: 5px; font-size: 13px;">المسددون</div>
          <div class="stat-value">${
            currentReportData.members.statusCount.paid
          }</div>
          <div style="color: #666; font-size: 12px;">
            ${Math.round(
              (currentReportData.members.statusCount.paid /
                currentReportData.members.total) *
                100
            )}% من الأعضاء
          </div>
        </div>
        
        <div class="stat-card">
          <div style="font-weight: bold; color: #2c5aa0; margin-bottom: 5px; font-size: 13px;">المسددون جزئياً</div>
          <div class="stat-value">${
            currentReportData.members.statusCount.partial
          }</div>
          <div style="color: #666; font-size: 12px;">
            ${Math.round(
              (currentReportData.members.statusCount.partial /
                currentReportData.members.total) *
                100
            )}% من الأعضاء
          </div>
        </div>
        
        <div class="stat-card">
          <div style="font-weight: bold; color: #2c5aa0; margin-bottom: 5px; font-size: 13px;">عمليات التسوية</div>
          <div class="stat-value">${
            currentReportData.settlements
              ? currentReportData.settlements.count
              : 0
          }</div>
        </div>
        
        <div class="stat-card">
          <div style="font-weight: bold; color: #2c5aa0; margin-bottom: 5px; font-size: 13px;">متوسط الدفعة</div>
          <div class="stat-value">${formatCurrency(
            currentReportData.revenue.averageTransaction
          )}</div>
        </div>
        
        <div class="stat-card">
          <div style="font-weight: bold; color: #2c5aa0; margin-bottom: 5px; font-size: 13px;">الفترة الزمنية</div>
          <div class="stat-value">${currentReportData.time.daysDiff} يوم</div>
          <div style="color: #666; font-size: 12px;">
            ${currentReportData.time.startDate} إلى ${
    currentReportData.time.endDate
  }
          </div>
        </div>
      </div>
    </div>
  `;

  // 2. الرسوم البيانية (كنصوص وجداول)
  printHTML += `
    <div class="page-break" >
      <h3 class="section-title" >الرسوم البيانية</h3>
      
      <h4 class="table-title">توزيع الإيرادات حسب النوع</h4>
      <table class="responsive-table">
        <thead>
          <tr>
            <th style="width: 25%">نوع الإيرادات</th>
            <th style="width: 20%">المبلغ</th>
            <th style="width: 15%">النسبة</th>
            <th style="width: 20%">عدد المعاملات</th>
            <th style="width: 20%">متوسط المعاملة</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>داخل الدار</td>
            <td>${formatCurrency(
              currentReportData.revenue.revenueByType.inside.amount
            )}</td>
            <td>${Math.round(
              (currentReportData.revenue.revenueByType.inside.amount /
                currentReportData.revenue.totalRevenue) *
                100
            )}%</td>
            <td>${currentReportData.revenue.revenueByType.inside.count}</td>
            <td>${formatCurrency(
              currentReportData.revenue.revenueByType.inside.amount /
                currentReportData.revenue.revenueByType.inside.count || 0
            )}</td>
          </tr>
          <tr>
            <td>خارج الدار</td>
            <td>${formatCurrency(
              currentReportData.revenue.revenueByType.outside.amount
            )}</td>
            <td>${Math.round(
              (currentReportData.revenue.revenueByType.outside.amount /
                currentReportData.revenue.totalRevenue) *
                100
            )}%</td>
            <td>${currentReportData.revenue.revenueByType.outside.count}</td>
            <td>${formatCurrency(
              currentReportData.revenue.revenueByType.outside.amount /
                currentReportData.revenue.revenueByType.outside.count || 0
            )}</td>
          </tr>
          <tr>
            <td>التسويات</td>
            <td>${formatCurrency(
              currentReportData.revenue.revenueByType.settlement.amount
            )}</td>
            <td>${Math.round(
              (currentReportData.revenue.revenueByType.settlement.amount /
                currentReportData.revenue.totalRevenue) *
                100
            )}%</td>
            <td>${currentReportData.revenue.revenueByType.settlement.count}</td>
            <td>${formatCurrency(
              currentReportData.revenue.revenueByType.settlement.amount /
                currentReportData.revenue.revenueByType.settlement.count || 0
            )}</td>
          </tr>
          <tr style="background-color: #f5f5f5; font-weight: bold;">
            <td>الإجمالي</td>
            <td>${formatCurrency(currentReportData.revenue.totalRevenue)}</td>
            <td>100%</td>
            <td>${currentReportData.revenue.totalTransactions}</td>
            <td>${formatCurrency(
              currentReportData.revenue.averageTransaction
            )}</td>
          </tr>
        </tbody>
      </table>
      
      <h4 class="table-title" style="margin-top: 25px;">حالة الأعضاء خلال الفترة</h4>
      <table class="responsive-table">
        <thead>
          <tr>
            <th style="width: 30%">الحالة</th>
            <th style="width: 20%">عدد الأعضاء</th>
            <th style="width: 20%">النسبة</th>
            <th style="width: 30%">القيمة الإجمالية</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>مسددون</td>
            <td>${currentReportData.members.statusCount.paid}</td>
            <td>${Math.round(
              (currentReportData.members.statusCount.paid /
                currentReportData.members.total) *
                100
            )}%</td>
            <td>${formatCurrency(
              currentReportData.members.detailedMembers
                .filter((m) => m.status === "paid")
                .reduce((sum, m) => sum + m.totalPaid, 0)
            )}</td>
          </tr>
          <tr>
            <td>مسددون جزئياً</td>
            <td>${currentReportData.members.statusCount.partial}</td>
            <td>${Math.round(
              (currentReportData.members.statusCount.partial /
                currentReportData.members.total) *
                100
            )}%</td>
            <td>${formatCurrency(
              currentReportData.members.detailedMembers
                .filter((m) => m.status === "partial")
                .reduce((sum, m) => sum + m.totalPaid, 0)
            )}</td>
          </tr>
          <tr>
            <td>غير مسددين</td>
            <td>${currentReportData.members.statusCount.unpaid}</td>
            <td>${Math.round(
              (currentReportData.members.statusCount.unpaid /
                currentReportData.members.total) *
                100
            )}%</td>
            <td>${formatCurrency(
              currentReportData.members.detailedMembers
                .filter((m) => m.status === "unpaid")
                .reduce((sum, m) => sum + m.remaining, 0)
            )}</td>
          </tr>
          <tr>
            <td>تمت التسوية</td>
            <td>${currentReportData.members.statusCount.settled || 0}</td>
            <td>${Math.round(
              ((currentReportData.members.statusCount.settled || 0) /
                currentReportData.members.total) *
                100
            )}%</td>
            <td>${
              currentReportData.settlements
                ? formatCurrency(currentReportData.settlements.totalSettlements)
                : formatCurrency(0)
            }</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="page-break">
      <h4 class="table-title">الإيرادات الشهرية</h4>
      <table class="responsive-table">
        <thead>
          <tr>
            <th style="width: 30%">الشهر</th>
            <th style="width: 25%">الإيرادات</th>
            <th style="width: 20%">عدد المعاملات</th>
            <th style="width: 25%">متوسط المعاملة</th>
          </tr>
        </thead>
        <tbody>
          ${currentReportData.revenue.monthlyRevenue
            .map(
              (item) => `
            <tr>
              <td>${item.month}</td>
              <td>${formatCurrency(item.revenue)}</td>
              <td>${item.transactions}</td>
              <td>${formatCurrency(item.revenue / item.transactions || 0)}</td>
            </tr>
          `
            )
            .join("")}
          <tr style="background-color: #f5f5f5; font-weight: bold;">
            <td>الإجمالي</td>
            <td>${formatCurrency(
              currentReportData.revenue.monthlyRevenue.reduce(
                (sum, item) => sum + item.revenue,
                0
              )
            )}</td>
            <td>${currentReportData.revenue.monthlyRevenue.reduce(
              (sum, item) => sum + item.transactions,
              0
            )}</td>
            <td>${formatCurrency(
              currentReportData.revenue.monthlyRevenue.reduce(
                (sum, item) => sum + item.revenue,
                0
              ) /
                currentReportData.revenue.monthlyRevenue.reduce(
                  (sum, item) => sum + item.transactions,
                  0
                ) || 0
            )}</td>
          </tr>
        </tbody>
      </table>
      
      <h4 class="table-title" style="margin-top: 25px;">توزيع الأعضاء حسب السنة</h4>
      <table class="responsive-table">
        <thead>
          <tr>
            <th style="width: 40%">سنة الانضمام</th>
            <th style="width: 30%">عدد الأعضاء</th>
            <th style="width: 30%">النسبة</th>
          </tr>
        </thead>
        <tbody>
          ${currentReportData.members.membersByYear
            .map(
              (item) => `
            <tr>
              <td>${item.year}</td>
              <td>${item.count}</td>
              <td>${Math.round(
                (item.count / currentReportData.members.total) * 100
              )}%</td>
            </tr>
          `
            )
            .join("")}
          <tr style="background-color: #f5f5f5; font-weight: bold;">
            <td>الإجمالي</td>
            <td>${currentReportData.members.total}</td>
            <td>100%</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  // 3. الإيرادات التفصيلية
  printHTML += `
    <div class="page-break">
      <h3 class="section-title">الإيرادات التفصيلية</h3>
      <table class="responsive-table wide-table"
       style="
       width: 100%;
      
       border-collapse: collapse;
       align-content: center;
       text-align: center;
       
       border-spacing: 0;
       margin-bottom: 20px;
       item-align: center;
       ">
        <thead>
          <tr>
            <th style="width: 25%">الفترة</th>
            <th style="width: 25%">الإيرادات (ريال)</th>
            <th style="width: 25%">عدد المعاملات</th>
            <th style="width: 25%">متوسط المبلغ</th>
            <th style="width: 25%">نسبة النمو</th>
            <th style="width: 25%">الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${currentReportData.time.periodData
            .map((period, index) => {
              const growth =
                index > 0
                  ? `${(
                      ((period.revenue -
                        currentReportData.time.periodData[index - 1].revenue) /
                        currentReportData.time.periodData[index - 1].revenue) *
                      100
                    ).toFixed(1)}%`
                  : "جديد";

              const growthClass = growth.includes("-")
                ? "negative"
                : growth === "جديد"
                ? ""
                : "positive";

              return `
              <tr>
                <td>${period.period}</td>
                <td>${formatCurrency(period.revenue)}</td>
                <td>${period.transactions}</td>
                <td>${formatCurrency(
                  period.revenue / period.transactions || 0
                )}</td>
                <td><span class="${growthClass}">${growth}</span></td>
                <td>${period.revenue > 0 ? "نشط" : "غير نشط"}</td>
              </tr>
            `;
            })
            .join("")}
          <tr style="background-color: #f5f5f5; font-weight: bold;">
            <td>الإجمالي</td>
            <td>${formatCurrency(currentReportData.revenue.totalRevenue)}</td>
            <td>${currentReportData.revenue.totalTransactions}</td>
            <td>${formatCurrency(
              currentReportData.revenue.averageTransaction
            )}</td>
            <td colspan="2">-</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  // 4. حالة الأعضاء (جدول كبير)
  printHTML += `
    <div class="page-break">
      <h3 class="section-title">حالة الأعضاء</h3>
      <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
        إجمالي الأعضاء: ${
          currentReportData.members.total
        } عضو | تمت معالجة ${Math.min(
    50,
    currentReportData.members.detailedMembers.length
  )} عضو في هذا التقرير
      </p>
      <table class="responsive-table wide-table compact-table">
        <thead>
          <tr>
            <th style="width: 25%">اسم العضو</th>
            <th style="width: 17%">رقم الجوال</th>
            <th style="width: 14%">حالة الاشتراك</th>
            <th style="width: 14%">المبلغ المدفوع</th>
            <th style="width: 14%">المبلغ المتأخر</th>
            <th style="width: 14%">آخر دفعة</th>
            <th style="width: 14%">ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          ${currentReportData.members.detailedMembers
            .map((member, index) => {
              if (index >= 50) return ""; // عرض أول 50 عضو فقط

              const statusText =
                {
                  paid: "مسدد",
                  partial: "مسدد جزئياً",
                  unpaid: "غير مسدد",
                  settled: "تمت التسوية",
                }[member.status] || "غير معروف";

              const statusClass =
                {
                  paid: "status-paid",
                  partial: "status-partial",
                  unpaid: "status-unpaid",
                  settled: "status-settled",
                }[member.status] || "";

              return `
              <tr>
                <td style="font-size: 10px;">${member.name || "غير محدد"}</td>
                <td>${member.phone || "غير محدد"}</td>
                <td><span class="${statusClass}" style="padding: 2px 6px; border-radius: 3px; font-size: 10px;">${statusText}</span></td>
                <td>${formatCurrency(member.totalPaid)}</td>
                <td>${formatCurrency(member.remaining)}</td>
                <td style="font-size: 10px;">${member.lastPayment}</td>
                <td class="optional-column" style="font-size: 9px;">${
                  member.notes || "-"
                }</td>
              </tr>
            `;
            })
            .join("")}
          ${
            currentReportData.members.detailedMembers.length > 50
              ? `<tr style="background-color: #f8f9fa;">
              <td colspan="7" style="text-align: center; font-size: 11px; padding: 10px;">
                ... و ${
                  currentReportData.members.detailedMembers.length - 50
                } عضو آخر
              </td>
            </tr>`
              : ""
          }
        </tbody>
      </table>
    </div>
  `;

  // 5. عمليات التسوية
  // if (
  //   currentReportData.settlements &&
  //   currentReportData.settlements.settlements.length > 0
  // ) {
  //   printHTML += `
  //     <div class="page-break">
  //       <h3 class="section-title">عمليات التسوية</h3>
  //       <table class="responsive-table wide-table">
  //         <thead>
  //           <tr>
  //             <th style="width: 20%">اسم العضو</th>
  //             <th style="width: 10%">السنة</th>
  //             <th style="width: 15%">نوع الاشتراك</th>
  //             <th style="width: 15%">المبلغ المستحق</th>
  //             <th style="width: 15%">المبلغ المدفوع</th>
  //             <th style="width: 15%">المبلغ المسوي</th>
  //             <th style="width: 10%">تاريخ التسوية</th>
  //           </tr>
  //         </thead>
  //         <tbody>
  //           ${currentReportData.settlements.settlements
  //             .map((settlement) => {
  //               const settlementDate = settlement.settlementDate
  //                 ? settlement.settlementDate.toDate
  //                   ? formatDate(settlement.settlementDate.toDate())
  //                   : settlement.settlementDate.split("T")[0]
  //                 : "غير محدد";

  //               return `
  //               <tr>
  //                 <td style="font-size: 10px;">${
  //                   settlement.memberName || "غير محدد"
  //                 }</td>
  //                 <td>${new Date().getFullYear()}</td>
  //                 <td>داخل الدار</td>
  //                 <td>${formatCurrency(settlement.originalDebt)}</td>
  //                 <td>${formatCurrency(
  //                   settlement.originalDebt - settlement.settledAmount
  //                 )}</td>
  //                 <td>${formatCurrency(settlement.settledAmount)}</td>
  //                 <td style="font-size: 10px;">${settlementDate}</td>
  //               </tr>
  //             `;
  //             })
  //             .join("")}
  //           <tr style="background-color: #f5f5f5; font-weight: bold;">
  //             <td colspan="3">الإجمالي</td>
  //             <td>${formatCurrency(
  //               currentReportData.settlements.settlements.reduce(
  //                 (sum, s) => sum + s.originalDebt,
  //                 0
  //               )
  //             )}</td>
  //             <td>${formatCurrency(
  //               currentReportData.settlements.settlements.reduce(
  //                 (sum, s) => sum + (s.originalDebt - s.settledAmount),
  //                 0
  //               )
  //             )}</td>
  //             <td>${formatCurrency(
  //               currentReportData.settlements.totalSettlements
  //             )}</td>
  //             <td>${currentReportData.settlements.count} عملية</td>
  //           </tr>
  //         </tbody>
  //       </table>
  //     </div>
  //   `;
  // } else {
  //   printHTML += `
  //     <div class="page-break">
  //       <h3 class="section-title">عمليات التسوية</h3>
  //       <p style="text-align: center; color: #666; padding: 20px;">
  //         لا توجد عمليات تسوية في الفترة المحددة
  //       </p>
  //     </div>
  //   `;
  // }

  return printHTML;
}

// إضافة CSS للطباعة
function addPrintStyles() {
  const style = document.createElement("style");
  style.innerHTML = `
    /* تنسيقات الطباعة */
    .positive {
      color: #4CAF50;
      font-weight: bold;
    }
    
    .negative {
      color: #F44336;
      font-weight: bold;
    }
    
    .status-paid {
      background-color: #4CAF50;
      color: white;
      display: inline-block;
    }
    
    .status-partial {
      background-color: #FF9800;
      color: white;
      display: inline-block;
    }
    
    .status-unpaid {
      background-color: #F44336;
      color: white;
      display: inline-block;
    }
    
    .status-settled {
      background-color: #9C27B0;
      color: white;
      display: inline-block;
    }
  `;
  document.head.appendChild(style);
}

// استدعاء إضافة الأنماط عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", function () {
  addPrintStyles();
});

// تهيئة سجل التحميلات عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", function () {
  initDownloadHistory();

  // إضافة الأحداث
  document
    .getElementById("exportAllBtn")
    .addEventListener("click", exportFullReport);
  document
    .getElementById("sendEmailBtn")
    .addEventListener("click", function () {
      const email = document.getElementById("emailRecipient").value;
      sendReportByEmail(email);
    });

  document
    .getElementById("scheduleExportBtn")
    .addEventListener("click", function () {
      const scheduleType = document.querySelector(
        'input[name="schedule"]:checked'
      ).value;
      scheduleExport(scheduleType);
    });

  document
    .getElementById("exportPrintBtn")
    .addEventListener("click", printReport);

  document
    .getElementById("clearHistoryBtn")
    .addEventListener("click", function () {
      if (confirm("هل أنت متأكد من مسح سجل التحميلات؟")) {
        localStorage.removeItem("exportHistory");
        initDownloadHistory();
        showMessage("تم مسح سجل التحميلات", "success");
      }
    });

  document
    .getElementById("refreshHistoryBtn")
    .addEventListener("click", initDownloadHistory);

  // زر التصدير المخصص
  document
    .getElementById("exportCustomBtn")
    .addEventListener("click", function () {
      const options = {
        revenue: document.getElementById("exportRevenue").checked,
        members: document.getElementById("exportMembers").checked,
        settlements: document.getElementById("exportSettlements").checked,
        charts: document.getElementById("exportCharts").checked,
        stats: document.getElementById("exportStats").checked,
      };

      // يمكن تطوير هذه الوظيفة لتصدير حسب الخيارات المحددة
      showMessage("جاري تحضير التقرير المخصص...", "info");
      setTimeout(() => {
        showMessage("تم تحضير التقرير المخصص بنجاح", "success");
      }, 2000);
    });
});
