// =============================================
// Legacy Firebase settings removed
// =============================================
// All database operations now use Supabase via `supabaseInit()` and `window.supabaseDB`
// الانتظار حتى تهيئة Supabase
$(document).ready(async function () {
  console.log("🚀 بدء تحميل صفحة الأعضاء...");

  try {
    // تهيئة Supabase
    if (typeof window.supabaseInit === "function") {
      await window.supabaseInit();
      console.log("✅ تم تهيئة Supabase بنجاح");
    }

    // تحميل البيانات بعد تهيئة Supabase
    await loadMembersData();
  } catch (error) {
    console.error("❌ فشل في تهيئة Supabase:", error);
    showMessage("فشل في الاتصال بقاعدة البيانات. يرجى تحديث الصفحة.", "error");
  }

  // تهيئة واجهة المستخدم
  initUI();
});
// =============================================
// 2. المتغيرات العامة
// =============================================
let membersData = [];
let dataTable = null;
let currentEditMemberId = null;
let currentDeleteMemberId = null;
let isLoadingMembers = false; // guard to avoid concurrent loads causing duplicates
const currentYear = new Date().getFullYear();

// =============================================
// 3. تهيئة الصفحة
// =============================================
$(document).ready(function () {
  console.log("🚀 بدء تحميل صفحة الأعضاء...");

  // تهيئة Supabase (إن وُجد)
  if (typeof supabaseInit === "function") supabaseInit();

  // ثم تهيئة واجهة المستخدم
  initUI();
});

// =============================================
// 4. Firebase initialization removed (Supabase-only)
// =============================================
// Firebase init removed — calls to Supabase should be used via `supabaseInit()` and `window.supabaseDB`.

// =============================================
// 5. دالة تحميل بيانات الأعضاء
// =============================================
async function loadMembersData() {
  if (isLoadingMembers) {
    console.log("⚠️ loadMembersData already running — skipping duplicate call");
    return;
  }

  isLoadingMembers = true;
  $("#tableLoading").show();

  try {
    // الانتظار حتى اكتمال تهيئة Supabase
    if (window.supabaseInitialized === undefined) {
      try {
        if (typeof window.supabaseInit === "function") {
          await window.supabaseInit();
        }
      } catch (e) {
        console.error("فشل تهيئة Supabase:", e);
      }
    }

    if (!window.supabaseInitialized || !window.supabaseDB) {
      showMessage("❌ قاعدة البيانات غير متاحة. يرجى تهيئة Supabase.", "error");
      $("#tableLoading").hide();
      isLoadingMembers = false;
      return;
    }

    // جلب الأعضاء من Supabase
    const members = await window.supabaseDB.getAllMembersWithSubscriptions();

    membersData = members.map((item) => {
      const member = item;
      let totalPaid = 0;
      let totalDue = 0;
      let totalUnpaidRaw = 0; // Total unpaid ignoring settlements
      let totalSavedBySettlement = 0;

      let paidYears = 0;
      let unpaidYears = 0;
      let insideYears = 0;
      let outsideYears = 0;

      // حساب الإحصائيات من الاشتراكات
      if (member.subscriptions && Array.isArray(member.subscriptions)) {
        member.subscriptions.forEach((sub) => {
          if (sub.subscription_type !== "none") {
            const amount = sub.amount_due || 0;
            const paid = sub.amount_paid || 0;
            const isSettled = !!sub.settlement;

            totalDue += amount;
            totalPaid += paid;

            const remaining = Math.max(0, amount - paid);
            totalUnpaidRaw += remaining;

            if (isSettled) {
              totalSavedBySettlement += remaining;
            }

            if (sub.subscription_type === "inside") insideYears++;
            if (sub.subscription_type === "outside") outsideYears++;

            if (paid >= amount) {
              paidYears++;
            } else {
              unpaidYears++;
            }
          }
        });
      }

      // حساب القيم النهائية بعد التسوية
      const totalPaidAfterSettlement = totalPaid + totalSavedBySettlement;
      const totalUnpaidAfterSettlement = Math.max(
        0,
        totalUnpaidRaw - totalSavedBySettlement
      );

      // تحديد حالة العضو
      let status = "غير مسدد";
      if (totalUnpaidAfterSettlement === 0 && totalPaidAfterSettlement > 0) {
        status = "تم السداد";
      } else if (
        totalPaidAfterSettlement > 0 &&
        totalUnpaidAfterSettlement > 0
      ) {
        status = "تم السداد جزئياً";
      }

      return {
        id: member.id,
        name: member.name || member.full_name || "",
        phone: member.phone || member.contact_phone || "",
        membershipNumber:
          member.membership_number || member.membershipNumber || "",
        joinYear: member.join_year || member.joinYear || "",
        notes: member.notes || "",
        original_debt: member.original_debt || 0,
        saved_amount: member.saved_amount || 0,
        createdAt: member.created_at ? new Date(member.created_at) : null,
        updatedAt: member.updated_at ? new Date(member.updated_at) : null,
        totalPaid: totalPaid,
        totalDue: totalDue,
        totalUnpaid: totalUnpaidRaw,
        totalSavedBySettlement: totalSavedBySettlement,
        totalPaidAfterSettlement: totalPaidAfterSettlement,
        totalUnpaidAfterSettlement: totalUnpaidAfterSettlement,
        paidYears: paidYears,
        unpaidYears: unpaidYears,
        insideYears: insideYears,
        outsideYears: outsideYears,
        status: status,
        lastUpdate: member.updated_at
          ? new Date(member.updated_at).toLocaleDateString("ar-SA")
          : "غير محدد",
      };
    });

    renderMembersTable();
    calculateSummary();

    showMessage(
      `تم تحميل ${membersData.length} عضو من قاعدة البيانات`,
      "success"
    );
  } catch (error) {
    console.error("❌ خطأ في جلب البيانات:", error);
    showMessage(`حدث خطأ في جلب البيانات: ${error.message || error}`, "error");
  } finally {
    isLoadingMembers = false;
    $("#tableLoading").hide();
  }
}
// =============================================
// 6. دالة إعادة تحميل البيانات
// =============================================
async function refreshMembersData() {
  console.log("🔄 إعادة تحميل بيانات الأعضاء...");
  showMessage("جاري تحديث البيانات...", "info");
  await loadMembersData();
}

// =============================================
// Supabase specific loader
// =============================================
async function loadMembersDataSupabase() {
  const normalized = await window.supabaseDB.getAllMembersWithSubscriptions();
  membersData = [];

  for (const item of normalized) {
    const m = item.m;
    const subs = item.subs || [];

    // map fields to the shape expected by UI
    const member = {};
    member.id = m.id;
    member.name = m.name || m.full_name || m.display_name || "";
    member.phone = m.phone || m.contact_phone || "";
    member.membershipNumber =
      m.membership_number || m.membershipNumber || m.membershipNumber || "";
    member.joinYear = m.join_year || m.joinYear || "";
    member.createdAt = m.created_at
      ? new Date(m.created_at)
      : m.createdAt || null;
    member.updatedAt = m.updated_at
      ? new Date(m.updated_at)
      : m.updatedAt || null;

    // compute totals similar to Firebase logic
    let totalPaid = 0;
    let totalUnpaid = 0;
    let totalSavedBySettlement = 0;
    let years = {};

    subs.forEach((s) => {
      const year = s.year || s.year;
      const amount =
        s.amount_due || s.amount || s.due || (year === 2026 ? 300 : 200);
      const paidAmount = s.amount_paid || s.paid || s.paidAmount || 0;
      const isSettled = !!s.settlement;
      const savedAmount = isSettled ? Math.max(0, amount - paidAmount) : 0;

      years[year] = {
        amount: amount,
        paid: paidAmount > 0,
        paidAmount: paidAmount,
        settlement: isSettled,
        savedAmount: savedAmount,
      };

      totalPaid += paidAmount;
      totalSavedBySettlement += savedAmount;
      totalUnpaid += Math.max(0, amount - paidAmount);
    });

    const totalPaidAfterSettlement = totalPaid + totalSavedBySettlement;
    const totalUnpaidAfterSettlement = Math.max(
      0,
      totalUnpaid - totalSavedBySettlement
    );

    let status = "غير مسدد";
    const hasPaid = totalPaidAfterSettlement > 0;
    if (totalUnpaidAfterSettlement === 0 && hasPaid) status = "تم السداد";
    else if (hasPaid && totalUnpaidAfterSettlement > 0)
      status = "تم السداد جزئياً";

    member.totalPaid = totalPaid;
    member.totalSavedBySettlement = totalSavedBySettlement;
    member.totalPaidAfterSettlement = totalPaidAfterSettlement;
    member.totalUnpaid = totalUnpaid;
    member.totalUnpaidAfterSettlement = totalUnpaidAfterSettlement;
    member.status = status;
    member.years = years;
    member.lastUpdate = member.updatedAt
      ? new Date(member.updatedAt).toLocaleDateString("ar-SA")
      : "غير محدد";

    membersData.push(member);
  }

  // dedupe and finalize
  const byId = {};
  membersData.forEach((m) => {
    byId[m.id] = m;
  });
  membersData = Object.values(byId);

  renderMembersTable();
  calculateSummary();
}

// =============================================
// 7. تهيئة واجهة المستخدم
// =============================================
function initUI() {
  // إضافة زر تحديث البيانات
  $(".action-buttons").prepend(`
            <button type="button" id="refreshBtn" class="btn-primary">
                <i class="fas fa-sync-alt"></i> تحديث البيانات
            </button>
        `);

  // إعداد أحداث الأزرار
  $("#searchBtn").click(searchMembers);
  $("#resetFiltersBtn").click(resetFilters);
  $("#exportBtn").click(exportToExcel);
  $("#printBtn").click(printList);
  $("#refreshBtn").click(refreshMembersData);

  // إعداد أحداث البحث أثناء الكتابة
  $("#searchName").on("input", searchMembers);
  $("#searchPhone").on("input", searchMembers);
  $("#filterStatus").change(searchMembers);

  // إعداد حدث إغلاق المودال (عام لجميع المودالات)
  $(".close-modal").click(function () {
    $(this).closest(".modal").hide();
  });

  // إغلاق المودال عند النقر خارج المحتوى (عام)
  $(window).click(function (event) {
    if ($(event.target).is(".modal")) {
      $(event.target).hide();
    }
  });

  // حفظ التعديلات من مودال التعديل
  $("#saveMemberEditBtn").click(saveMemberEdit);

  // تأكيد الحذف من مودال الحذف
  $("#confirmDeleteBtn").click(executeDeleteMember);

  console.log("✅ تم تهيئة واجهة المستخدم");
}

// =============================================
// 8. عرض البيانات في الجدول
// =============================================
function renderMembersTable() {
  // تنظيف الجدول السابق
  if (dataTable) {
    dataTable.destroy();
  }

  // تعبئة بيانات الجدول
  const tableBody = $("#membersTableBody");
  tableBody.empty();

  if (membersData.length === 0) {
    $("#membersTable").hide();
    $("#noDataMessage").remove();
    tableBody.parent().parent().before(`
                <div id="noDataMessage" class="message info show" style="text-align: center; padding: 40px;">
                    <i class="fas fa-info-circle" style="font-size: 3rem; color: #6c757d; margin-bottom: 20px;"></i>
                    <h3>لا توجد بيانات أعضاء</h3>
                    <p>لم يتم العثور على أعضاء في قاعدة البيانات.</p>
                    <p>يمكنك <a href="./add_data.html" style="color: #2c5aa0; font-weight: bold;">إضافة أعضاء جدد</a> للبدء.</p>
                </div>
            `);
    return;
  }

  $("#noDataMessage").remove();

  membersData.forEach((member, index) => {
    const statusClass = getStatusClass(member.status);
    const unpaidAmount = member.totalUnpaidAfterSettlement || 0;

    const row = `
                <tr >
                    <td>${index + 1}</td>
                    <td>${member.name || "غير محدد"}</td>
                    <td>${member.phone || "غير محدد"}</td>
                    <td>${member.membershipNumber || "غير محدد"}</td>
                    <td>${member.joinYear || "غير محدد"}</td>
                    <td><strong>${(member.totalPaid !== undefined
                      ? member.totalPaid
                      : member.totalPaidAfterSettlement || 0
                    ).toFixed(2)}</strong> ريال</td>
                    <td><strong>${(member.totalUnpaidAfterSettlement !==
                    undefined
                      ? member.totalUnpaidAfterSettlement
                      : member.totalUnpaid || 0
                    ).toFixed(2)}</strong> ريال</td>
                    <td>${member.lastUpdate || "غير محدد"}</td>
                    <td class="action-buttons-cell">
                        <a href="#" class="action-btn view" onclick="viewMemberDetails('${
                          member.id
                        }')">
                            <i class="fas fa-eye"></i> عرض
                        </a>
                        <a href="#" class="action-btn edit" onclick="openEditMemberModal('${
                          member.id
                        }')">
                            <i class="fas fa-edit"></i> تعديل
                        </a>
                        <a href="#" class="action-btn delete" onclick="deleteMember('${
                          member.id
                        }', '${member.name || "هذا العضو"}')">
                            <i class="fas fa-trash"></i> حذف
                        </a>
                    </td>
                </tr>
            `;

    tableBody.append(row);
  });

  // تهيئة DataTable
  dataTable = $("#membersTable").DataTable({
    language: {
      url: "//cdn.datatables.net/plug-ins/1.13.4/i18n/ar.json",
    },
    pageLength: 10,
    responsive: true,
    order: [[0, "asc"]],
    dom: '<"top"lf>rt<"bottom"ip><"clear">',
    initComplete: function () {
      // إظهار الجدول بعد التهيئة
      $("#membersTable").show();
    },
  });
}

// =============================================
// 9. البحث والفلترة
// =============================================
function searchMembers() {
  const nameSearch = $("#searchName").val().toLowerCase();
  const phoneSearch = $("#searchPhone").val().toLowerCase();
  const statusFilter = $("#filterStatus").val();

  if (dataTable) {
    dataTable.search("").draw();

    // تطبيق الفلاتر يدوياً
    $.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
      const member = membersData[dataIndex];
      if (!member) return true;

      let match = true;

      if (nameSearch) {
        match =
          match &&
          member.name &&
          member.name.toLowerCase().includes(nameSearch);
      }

      if (phoneSearch) {
        match = match && member.phone && member.phone.includes(phoneSearch);
      }

      if (statusFilter) {
        match = match && member.status === statusFilter;
      }

      return match;
    });

    dataTable.draw();

    // إزالة دالة البحث المضافة
    $.fn.dataTable.ext.search.pop();
  }
}

// =============================================
// 10. إعادة تعيين الفلاتر
// =============================================
function resetFilters() {
  $("#searchName").val("");
  $("#searchPhone").val("");
  $("#filterStatus").val("");

  if (dataTable) {
    dataTable.search("").draw();
  }

  showMessage("تم إعادة تعيين الفلاتر", "success");
}

// =============================================
// 11. عرض تفاصيل العضو
// =============================================

async function viewMemberDetails(memberId) {
  try {
    if (!window.supabaseInitialized || !window.supabaseDB) {
      showMessage("❌ قاعدة البيانات غير متاحة. يرجى تهيئة Supabase.", "error");
      return;
    }

    // جلب بيانات العضو والاشتراكات من Supabase
    const { member: memberData, subscriptions } =
      await window.supabaseDB.getMemberById(memberId);

    if (!memberData) {
      showMessage("لم يتم العثور على العضو", "error");
      return;
    }

    let totalPaid = 0;
    let totalDue = 0;
    let totalRemaining = 0;
    let subscriptionYears = [];

    // حساب الإحصائيات من الاشتراكات
    if (subscriptions && Array.isArray(subscriptions)) {
      subscriptions.forEach((sub) => {
        const year = sub.year;
        const amount = sub.amount_due || (year === 2026 ? 300 : 200);
        const paidAmount = sub.amount_paid || 0;
        const remaining = Math.max(0, amount - paidAmount);

        totalDue += amount;
        totalPaid += paidAmount;
        totalRemaining += remaining;

        subscriptionYears.push({
          year: year,
          amount: amount,
          paid: paidAmount >= amount,
          paidAmount: paidAmount,
          settlement: sub.settlement || false,
          subscriptionType:
            sub.subscription_type === "inside" ? "ساكن في الدار" : "خارج الدار",
          paymentDate: sub.updated_at
            ? new Date(sub.updated_at).toLocaleDateString("ar-SA")
            : null,
          status: sub.status || "unpaid",
        });
      });
    }

    // حساب حالة العضو
    let status = "غير مسدد";
    if (totalRemaining === 0 && totalPaid > 0) {
      status = "تم السداد";
    } else if (totalPaid > 0 && totalRemaining > 0) {
      status = "تم السداد جزئياً";
    }
    const statusClass = getStatusClass(status);

    // إنشاء محتوى المودال
    let modalContent = `
      <div class="member-details">
        <div class="details-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px;">
          <div>
            <h4><i class="fas fa-user"></i> المعلومات الشخصية</h4>
            <p><strong>الاسم:</strong> ${memberData.name || "غير محدد"}</p>
            <p><strong>رقم الجوال:</strong> ${
              memberData.phone || "غير محدد"
            }</p>
            <p><strong>رقم العضوية:</strong> ${
              memberData.membership_number || "غير محدد"
            }</p>
            <p><strong>سنة الانضمام:</strong> ${
              memberData.join_year || "غير محدد"
            }</p>
            <p><strong>تاريخ التسجيل:</strong> ${
              memberData.created_at
                ? new Date(memberData.created_at).toLocaleDateString("ar-SA")
                : "غير محدد"
            }</p>
          </div>
          
          <div>
            <h4><i class="fas fa-chart-bar"></i> الإحصائيات</h4>
            <p><strong>حالة الاشتراك:</strong> <span class="status-badge ${statusClass}">${status}</span></p>
            <p><strong>عدد سنوات العضوية:</strong> ${
              subscriptionYears.length
            } سنة</p>
            <p><strong>إجمالي المدفوع:</strong> ${totalPaid.toFixed(2)} ريال</p>
            <p><strong>إجمالي المبالغ غير مسددة:</strong> ${totalRemaining.toFixed(
              2
            )} ريال</p>
            <p><strong>المبلغ الإجمالي:</strong> ${totalDue.toFixed(2)} ريال</p>
            <p><strong>الدين الأصلي:</strong> ${
              memberData.original_debt
                ? memberData.original_debt.toLocaleString()
                : "0"
            } ريال</p>
            <p><strong>المبلغ المخصوم:</strong> ${
              memberData.saved_amount
                ? memberData.saved_amount.toLocaleString()
                : "0"
            } ريال</p>
            <p><strong>ملاحظات عامة:</strong> ${
              memberData.notes || "لا توجد ملاحظات"
            }</p>
          </div>
        </div>
        
        <h4><i class="fas fa-calendar-alt"></i> الاشتراكات السنوية</h4>
    `;

    if (subscriptionYears.length > 0) {
      modalContent += `
        <div style="max-height: 300px; overflow-y: auto; margin-top: 15px;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #0b559eff;">
                <th style="padding: 10px; text-align: right;">السنة</th>
                <th style="padding: 10px; text-align: center;">نوع الاشتراك</th>
                <th style="padding: 10px; text-align: center;">المبلغ</th>
                <th style="padding: 10px; text-align: center;">المسدد</th>
                <th style="padding: 10px; text-align: center;">الحالة</th>
                <th style="padding: 10px; text-align: center;">تاريخ السداد</th>
              </tr>
            </thead>
            <tbody>
      `;

      subscriptionYears
        .sort((a, b) => b.year - a.year)
        .forEach((sub) => {
          const yearStatusClass = sub.paid
            ? "status-paid"
            : sub.paidAmount > 0
            ? "status-partial"
            : "status-unpaid";
          const yearStatus = sub.paid
            ? "مسدد"
            : sub.paidAmount > 0
            ? "جزئي"
            : "غير مسدد";

          modalContent += `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${
              sub.year
            }</td>
            <td style="padding: 8px; text-align: center; border-bottom: 1px solid #eee;">${
              sub.subscriptionType
            }</td>
            <td style="padding: 8px; text-align: center; border-bottom: 1px solid #eee;">${
              sub.amount
            } ريال</td>
            <td style="padding: 8px; text-align: center; border-bottom: 1px solid #eee;">${
              sub.paidAmount
            } ريال</td>
            <td style="padding: 8px; text-align: center; border-bottom: 1px solid #eee;">
              <span class="status-badge ${yearStatusClass}">${yearStatus}</span>
              ${
                sub.settlement
                  ? '<span class="status-badge status-settled" style="background-color: #6c757d; margin-right: 5px;">تسوية</span>'
                  : ""
              }
            </td>
            <td style="padding: 8px; text-align: center; border-bottom: 1px solid #eee;">
              ${sub.paymentDate || "---"}
            </td>
          </tr>
        `;
        });

      modalContent += `
            </tbody>
          </table>
        </div>
      `;
    } else {
      modalContent += `
        <div style="text-align: center; padding: 20px; color: #666;">
          <i class="fas fa-calendar-times" style="font-size: 3rem; margin-bottom: 15px;"></i>
          <p>لا توجد اشتراكات مسجلة لهذا العضو</p>
        </div>
      `;
    }

    modalContent += `
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p><strong>آخر تحديث:</strong> ${
            memberData.updated_at
              ? new Date(memberData.updated_at).toLocaleDateString("ar-SA")
              : "غير محدد"
          }</p>
        </div>
      </div>
    `;

    // عرض المودال
    $("#modalBody").html(modalContent);
    $("#memberModal").show();
  } catch (error) {
    console.error("❌ خطأ في جلب تفاصيل العضو:", error);
    showMessage(`حدث خطأ في جلب التفاصيل: ${error.message || error}`, "error");
  }
}

// =============================================
// 11.5 تعديل بيانات العضو (مودال)
async function openEditMemberModal(memberId) {
  try {
    if (!window.supabaseInitialized || !window.supabaseDB) {
      showMessage("❌ قاعدة البيانات غير متاحة. يرجى تهيئة Supabase.", "error");
      return;
    }

    // جلب بيانات العضو من Supabase
    const { member: memberData } = await window.supabaseDB.getMemberById(
      memberId
    );

    if (!memberData) {
      showMessage("لم يتم العثور على العضو", "error");
      return;
    }

    currentEditMemberId = memberId;
    $("#editMemberName").val(memberData.name || "");
    $("#editMemberPhone").val(memberData.phone || "");
    $("#editMemberModal").show();
  } catch (error) {
    console.error("❌ خطأ أثناء فتح مودال التعديل:", error);
    showMessage(`حدث خطأ: ${error.message || error}`, "error");
  }
}

async function saveMemberEdit() {
  if (!currentEditMemberId) {
    showMessage("لا يوجد عضو محدد للتعديل", "error");
    return;
  }

  const name = $("#editMemberName").val().trim();
  const phone = $("#editMemberPhone").val().trim();

  // تحقق بسيط
  if (!name) {
    showMessage("الاسم مطلوب", "error");
    return;
  }
  if (!/^[0-9]{10}$/.test(phone)) {
    showMessage("يرجى إدخال رقم جوال صحيح (10 أرقام)", "error");
    return;
  }

  try {
    if (!window.supabaseInitialized || !window.supabaseDB) {
      showMessage("❌ قاعدة البيانات غير متاحة. يرجى تهيئة Supabase.", "error");
      return;
    }

    $("#saveMemberEditBtn").prop("disabled", true).text("جاري الحفظ...");

    // تحديث العضو في Supabase
    const updateData = {
      name: name,
      phone: phone,
      updated_at: new Date().toISOString(),
    };

    const updated = await window.supabaseDB.updateMember(
      currentEditMemberId,
      updateData
    );

    // تحديث الذاكرة المحلية فقط في حال نجاح العملية
    if (updated) {
      const idx = membersData.findIndex((m) => m.id === currentEditMemberId);
      if (idx !== -1) {
        membersData[idx].name = updated.name || name;
        membersData[idx].phone = updated.phone || phone;
        membersData[idx].lastUpdate = new Date().toLocaleDateString("ar-SA");
      }

      renderMembersTable();
      $("#editMemberModal").hide();
      showMessage("تم حفظ التعديلات بنجاح", "success");
    } else {
      throw new Error("فشل التحديث في قاعدة البيانات");
    }
  } catch (error) {
    console.error("❌ خطأ أثناء حفظ التعديلات:", error);
    showMessage(`حدث خطأ أثناء الحفظ: ${error.message || error}`, "error");
  } finally {
    $("#saveMemberEditBtn")
      .prop("disabled", false)
      .html('<i class="fas fa-save"></i> حفظ التعديلات');
  }
}

// =============================================
// 12. حذف العضو
// =============================================
// =============================================
// 12. حذف العضو
// =============================================
async function deleteMember(memberId, memberName) {
  currentDeleteMemberId = memberId;
  $("#deleteMemberNameDisplay").text(memberName);
  $("#deleteMemberModal").show();
}

async function executeDeleteMember() {
  if (!currentDeleteMemberId) return;

  if (!window.supabaseInitialized || !window.supabaseDB) {
    showMessage("❌ قاعدة البيانات غير متاحة", "error");
    return;
  }

  try {
    $("#confirmDeleteBtn")
      .prop("disabled", true)
      .html('<i class="fas fa-spinner fa-spin"></i> جاري الحذف...');

    showMessage("جاري حذف العضو...", "info");

    // حذف الاشتراكات أولاً
    await window.supabaseDB.deleteSubscriptionsByMemberId(
      currentDeleteMemberId
    );

    // حذف العضو
    await window.supabaseDB.deleteMember(currentDeleteMemberId);

    // إزالة العضو من البيانات المحلية
    membersData = membersData.filter((m) => m.id !== currentDeleteMemberId);

    // إغلاق المودال
    $("#deleteMemberModal").hide();

    // إعادة عرض الجدول
    renderMembersTable();
    calculateSummary();

    showMessage("تم حذف العضو بنجاح", "success");
  } catch (error) {
    console.error("❌ خطأ في حذف العضو:", error);
    showMessage(`حدث خطأ في الحذف: ${error.message || error}`, "error");
  } finally {
    $("#confirmDeleteBtn")
      .prop("disabled", false)
      .html('<i class="fas fa-trash"></i> نعم، حذف نهائي');
    currentDeleteMemberId = null;
  }
}

// =============================================
// 13. تصدير إلى Excel
// =============================================
function exportToExcel() {
  try {
    if (membersData.length === 0) {
      showMessage("لا توجد بيانات للتصدير", "error");
      return;
    }

    // تحضير البيانات للتصدير
    const exportData = membersData.map((member) => ({
      "اسم العضو": member.name || "",
      "رقم الجوال": member.phone || "",
      "رقم العضوية": member.membershipNumber || "",
      "سنة الانضمام": member.joinYear || "",
      "إجمالي المدفوع":
        member.totalPaid !== undefined
          ? member.totalPaid
          : member.totalPaidAfterSettlement || 0,
      "إجمالي المتأخر (بعد التسوية)":
        member.totalUnpaidAfterSettlement !== undefined
          ? member.totalUnpaidAfterSettlement
          : member.totalUnpaid || 0,
      "المبلغ الإجمالي":
        (member.totalPaid !== undefined
          ? member.totalPaid
          : member.totalPaidAfterSettlement || 0) +
        (member.totalUnpaidAfterSettlement !== undefined
          ? member.totalUnpaidAfterSettlement
          : member.totalUnpaid || 0),
      "تاريخ التسجيل":
        member.createdAt && member.createdAt.toDate
          ? member.createdAt.toDate().toLocaleDateString("ar-SA")
          : "",
      "آخر تحديث":
        member.updatedAt && member.updatedAt.toDate
          ? member.updatedAt.toDate().toLocaleDateString("ar-SA")
          : "",
    }));

    // إنشاء ورقة عمل
    const ws = XLSX.utils.json_to_sheet(exportData);

    // تنسيق الأعمدة
    const wscols = [
      { wch: 25 }, // اسم العضو
      { wch: 15 }, // رقم الجوال
      { wch: 15 }, // رقم العضوية
      { wch: 12 }, // سنة الانضمام
      { wch: 18 }, // إجمالي المدفوع
      { wch: 18 }, // إجمالي المتأخر
      { wch: 18 }, // المبلغ الإجمالي
      { wch: 15 }, // تاريخ التسجيل
      { wch: 15 }, // آخر تحديث
    ];
    ws["!cols"] = wscols;

    // إنشاء مصنف
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "أعضاء الدار");

    // تنزيل الملف
    const fileName = `أعضاء_الدار_${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    showMessage(
      `تم تصدير ${membersData.length} سجل إلى ملف ${fileName}`,
      "success"
    );
  } catch (error) {
    console.error("❌ خطأ في التصدير:", error);
    showMessage("حدث خطأ أثناء التصدير", "error");
  }
}

// =============================================
// 14. طباعة القائمة
// =============================================
function printList() {
  if (membersData.length === 0) {
    showMessage("لا توجد بيانات للطباعة", "error");
    return;
  }

  // إنشاء نافذة طباعة
  const printWindow = window.open("", "_blank");

  // محتوى HTML للطباعة
  printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <title>قائمة أعضاء الدار - ${new Date().toLocaleDateString(
              "ar-SA"
            )}</title>
            <style>
                body { font-family: 'Arial', Tahoma, sans-serif; padding: 20px; }
                h1 { color: #2c5aa0; text-align: center; margin-bottom: 30px; }
                .header-info { text-align: center; margin-bottom: 30px; color: #666; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
                th { background-color: #f8f9fa; color: #2c5aa0; padding: 12px; text-align: right; border-bottom: 2px solid #ddd; }
                td { padding: 10px; border-bottom: 1px solid #eee; }
                .status-paid { color: #4CAF50; }
                .status-partial { color: #ff9800; }
                .status-unpaid { color: #f44336; }
                .summary { margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 10px; }
                .summary h3 { text-align: center; color: #2c5aa0; margin-bottom: 15px; }
                .summary-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                .summary-table td { padding: 8px 12px; border: 1px solid #ddd; background-color: white; }
                .summary-table td:first-child { font-weight: bold; width: 60%; }
                .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
                @media print {
                    body { padding: 10px; }
                    table { font-size: 12px; }
                    .summary { break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            <h1>قائمة أعضاء جمعية أبناء سلنارتي بالرياض</h1>
            <div class="header-info">
                <p>تاريخ الطباعة: ${new Date().toLocaleDateString(
                  "ar-SA"
                )} - الوقت: ${new Date().toLocaleTimeString("ar-SA")}</p>
                <p>إجمالي عدد الأعضاء: ${membersData.length} عضو</p>
            </div>
            <table >
                <thead>
                    <tr>
                        <th  >#</th>
                        <th>اسم العضو</th>
                        <th>رقم الجوال</th>
                        <th>رقم العضوية</th>
                        <th>سنة الانضمام</th>
                        <th>المدفوع</th>
                        <th>المتأخر</th>
                        <th>الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
    `);

  // إضافة صفوف البيانات
  const summary = calculateSummaryStats();
  membersData.forEach((member, index) => {
    const paid = member.totalPaidAfterSettlement || member.totalPaid || 0;
    const unpaid =
      member.totalUnpaidAfterSettlement !== undefined
        ? member.totalUnpaidAfterSettlement
        : member.totalUnpaid || 0;
    const totalAmount = paid + unpaid;

    printWindow.document.write(`
            <tr > 
                <td>${index + 1}</td>
                <td>${member.name || ""}</td>
                <td>${member.phone || ""}</td>
                <td>${member.membershipNumber || ""}</td>
                <td>${member.joinYear || ""}</td>
                <td>${paid.toFixed(2)} ريال</td>
                <td>${unpaid.toFixed(2)} ريال</td>
                <td>${totalAmount.toFixed(2)} ريال</td>
            </tr>
        `);
  });

  // إضافة الإحصائيات كجدول
  printWindow.document.write(`
                </tbody>
            </table>
            
            <div class="summary">
                <h3>ملخص الإحصائيات</h3>
                <table class="summary-table">
                    <tr>
                        <td>عدد الأعضاء:</td>
                        <td><strong>${summary.totalMembers}</strong></td>
                    </tr>
                    <tr>
                        <td>إجمالي المدفوع:</td>
                        <td><strong>${summary.totalPaid.toFixed(
                          2
                        )} ريال</strong></td>
                    </tr>
                    <tr>
                        <td>إجمالي المتأخرات (بعد التسوية):</td>
                        <td><strong>${summary.totalUnpaid.toFixed(
                          2
                        )} ريال</strong></td>
                    </tr>
                    
                </table>
            </div>
            
            <div class="footer">
                <p>جميع الحقوق محفوظة © دار أبناء سلنارتي بالرياض 2024</p>
                <p>تم إنشاء هذا التقرير آلياً بتاريخ: ${new Date().toLocaleString(
                  "ar-SA"
                )}</p>
            </div>
        </body>
        </html>
    `);

  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 500);
}

// =============================================
// 15. فتح نافذة سداد للعضو

// =============================================
// 16. معالجة سداد السنوات المتأخرة
// =============================================

// =============================================
// 17. حساب الإحصائيات
// =============================================
function calculateSummary(data = membersData) {
  const summary = calculateSummaryStats(data);

  $("#summaryCards").html(`
            <div class="summary-card">
                <div class="summary-value">${summary.totalMembers}</div>
                <div class="summary-label">إجمالي الأعضاء</div>
            </div>
            
            <div class="summary-card paid">
                <div class="summary-value">${summary.paidMembers}</div>
                <div class="summary-label">أعضاء مسددين</div>
            </div>
            
            <div class="summary-card partial">
                <div class="summary-value">${summary.partialMembers}</div>
                <div class="summary-label">أعضاء مسددين جزئياً</div>
            </div>
            
            <div class="summary-card unpaid">
                <div class="summary-value">${summary.unpaidMembers}</div>
                <div class="summary-label">أعضاء غير مسددين</div>
            </div>
            
            <div class="summary-card paid">
                <div class="summary-value">${summary.totalPaid.toFixed(2)}</div>
                <div class="summary-label">إجمالي المدفوع</div>
            </div>
            
            <div class="summary-card unpaid">
                <div class="summary-value">${summary.totalUnpaid.toFixed(
                  2
                )}</div>
                <div class="summary-label">إجمالي المبالغ غير مسددة</div>
            </div>
        `);
}

// =============================================
// 18. دالة مساعدة لحساب الإحصائيات
// =============================================
function calculateSummaryStats(data = membersData) {
  let totalMembers = data.length;
  let paidMembers = 0;
  let partialMembers = 0;
  let unpaidMembers = 0;
  let totalPaid = 0;
  let totalUnpaid = 0;

  data.forEach((member) => {
    // اجمالي المبالغ المسددة
    totalPaid +=
      member.totalPaid !== undefined
        ? member.totalPaid
        : member.totalPaidAfterSettlement || 0;
    // المتأخرات بعد تطبيق التسوية
    totalUnpaid +=
      member.totalUnpaidAfterSettlement !== undefined
        ? member.totalUnpaidAfterSettlement
        : member.totalUnpaid || 0;

    switch (member.status) {
      case "تم السداد":
        paidMembers++;
        break;
      case "تم السداد جزئياً":
        partialMembers++;
        break;
      case "غير مسدد":
        unpaidMembers++;
        break;
      default:
        unpaidMembers++;
    }
  });

  return {
    totalMembers,
    paidMembers,
    partialMembers,
    unpaidMembers,
    totalPaid,
    totalUnpaid,
  };
}

// =============================================
// 19. دوال مساعدة
// =============================================
function getStatusClass(status) {
  switch (status) {
    case "تم السداد":
      return "status-paid";
    case "تم السداد جزئياً":
      return "status-partial";
    case "غير مسدد":
      return "status-unpaid";
    default:
      return "status-unpaid";
  }
}

function showMessage(text, type) {
  $("#message").html(text);
  $("#message").removeClass("success error info");
  $("#message").addClass(`${type} show`);

  // التمرير إلى الرسالة
  $("#message")[0].scrollIntoView({ behavior: "smooth", block: "nearest" });

  // إخفاء الرسالة بعد 5 ثواني
  setTimeout(() => {
    $("#message").removeClass("show");
  }, 5000);
}
