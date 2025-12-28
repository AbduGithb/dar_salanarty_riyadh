// ==================== تهيئة المتغيرات ====================
const phoneInput = document.getElementById("phone");
const searchBtn = document.getElementById("searchBtn");
const loading = document.getElementById("loading");
const memberSection = document.getElementById("memberSection");
const subscriptionsSection = document.getElementById("subscriptionsSection");
const noResult = document.getElementById("noResult");
const memberInfo = document.getElementById("memberInfo");
const subscriptionsBody = document.getElementById("subscriptionsBody");
const summary = document.getElementById("summary");
const tryAgainBtn = document.getElementById("tryAgainBtn");
const debugOutput = document.getElementById("debugOutput");
const debugMessages = document.getElementById("debugMessages");

// عناصر نظام التسوية
let settlementControlsContainer = null;
let globalSettlementToggle = null;
let autoSettleBtn = null;
let applySettlementBtn = null;
let saveSettlementBtn = null;
let settlementSummary = null;

// متغيرات النظام
let currentMember = null;
let isSettlementEnabled = false;
let originalMemberData = null;
let settlementChanges = {};

// ==================== دوال المساعدة ====================

function debug(msg, isError = false) {
  if (isError) console.error("DEBUG:", msg);
  else console.log("DEBUG:", msg);

  if (!debugMessages) return;
  debugOutput.style.display = "block";
  const p = document.createElement("div");
  p.textContent = (isError ? "❌ خطأ: " : "ℹ️ ") + String(msg);
  p.style.whiteSpace = "pre-wrap";
  p.style.marginBottom = "6px";
  if (isError) p.style.color = "#c0392b";
  debugMessages.appendChild(p);
}

function calculateFee(type, year) {
  if (type === "none") return 0;
  if (type === "inside") return 1500;
  if (type === "outside") {
    return year <= 2025 ? 200 : 300;
  }
  return 0;
}

function getTypeText(type) {
  switch (type) {
    case "inside":
      return "ساكن في الدار";
    case "outside":
      return "خارج الدار";
    case "none":
      return "غير مشترك";
    default:
      return "غير محدد";
  }
}

function getStatusText(subscription) {
  if (subscription.type === "none") return "غير مشترك";
  if (subscription.paid >= subscription.fee) return "مسدد بالكامل";
  if (subscription.paid > 0) return "مسدد جزئياً";
  return "غير مسدد";
}

function getStatusClass(subscription) {
  if (subscription.type === "none") return "status-none";
  if (subscription.paid >= subscription.fee) return "status-paid";
  if (subscription.paid > 0) return "status-partial";
  return "status-unpaid";
}

function getStatusIcon(subscription) {
  if (subscription.type === "none") return "—";
  if (subscription.paid >= subscription.fee) return "✅";
  if (subscription.paid > 0) return "⚠️";
  return "❌";
}

// ==================== نظام التسوية ====================

function createSettlementControls() {
  if (settlementControlsContainer) {
    settlementControlsContainer.remove();
  }

  settlementControlsContainer = document.createElement("div");
  settlementControlsContainer.id = "settlementControls";
  settlementControlsContainer.style.cssText = `
        display: none;
        margin: 20px 0;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #ddd;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;

  settlementControlsContainer.innerHTML = `
        <h3 style="margin-top: 0; color: #2c5aa0; border-bottom: 2px solid #2c5aa0; padding-bottom: 10px;">
            <i class="fas fa-handshake"></i> نظام التسوية
        </h3>
        
        <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap; margin-bottom: 15px;">
            <div style="flex: 1; min-width: 200px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">
                    <i class="fas fa-toggle-on"></i> تفعيل نظام التسوية
                </label>
                <label class="switch">
                    <input type="checkbox" id="globalSettlementToggle">
                    <span class="slider round"></span>
                </label>
                <small style="display: block; margin-top: 5px; color: #666;">
                    تفعيل التسوية على جميع سنوات "داخل الدار"
                </small>
            </div>
            
            <button id="autoSettleBtn" class="btn-secondary" style="flex: none;">
                <i class="fas fa-magic"></i> تسوية تلقائية
            </button>
            
            <button id="applySettlementBtn" class="btn-primary" style="flex: none;">
                <i class="fas fa-check-circle"></i> تطبيق التسوية
            </button>
            
            <button id="saveSettlementBtn" class="btn-success" style="flex: none; display: none;">
                <i class="fas fa-save"></i> حفظ التغييرات
            </button>
        </div>
        
        <div id="settlementSummary" style="display: none; margin-top: 15px; padding: 15px; background: white; border-radius: 8px; border: 1px solid #2c5aa0;">
            <h4 style="margin-top: 0; color: #2c5aa0;">
                <i class="fas fa-calculator"></i> ملخص التسوية
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div class="settlement-summary-card">
                    <div class="settlement-value" id="settledYearsCount">0</div>
                    <div class="settlement-label">سنوات تمت تسويتها</div>
                </div>
                <div class="settlement-summary-card">
                    <div class="settlement-value" id="originalDebtAmount">0 ريال</div>
                    <div class="settlement-label">المتأخرات الأصلية</div>
                </div>
                <div class="settlement-summary-card">
                    <div class="settlement-value" id="savedAmount">0 ريال</div>
                    <div class="settlement-label">المستقطع بالتسوية</div>
                </div>
                <div class="settlement-summary-card">
                    <div class="settlement-value" id="finalDebtAmount">0 ريال</div>
                    <div class="settlement-label">المتأخرات النهائية</div>
                </div>
            </div>
        </div>
    `;

  document
    .querySelector("main.container")
    .appendChild(settlementControlsContainer);

  // تهيئة العناصر
  globalSettlementToggle = document.getElementById("globalSettlementToggle");
  autoSettleBtn = document.getElementById("autoSettleBtn");
  applySettlementBtn = document.getElementById("applySettlementBtn");
  saveSettlementBtn = document.getElementById("saveSettlementBtn");
  settlementSummary = document.getElementById("settlementSummary");

  // إضافة مستمعي الأحداث
  setupSettlementEventListeners();
}

function setupSettlementEventListeners() {
  if (!globalSettlementToggle) return;

  globalSettlementToggle.addEventListener("change", toggleSettlementSystem);
  autoSettleBtn.addEventListener("click", autoSettle);
  applySettlementBtn.addEventListener("click", applySettlement);
  saveSettlementBtn.addEventListener("click", saveSettlementChanges);
}

function toggleSettlementSystem() {
  isSettlementEnabled = globalSettlementToggle.checked;

  if (isSettlementEnabled) {
    // تفعيل خيار التسوية في السنوات المناسبة
    document.querySelectorAll(".settlement-checkbox").forEach((checkbox) => {
      const year = checkbox.dataset.year;
      const subscription = currentMember?.subscriptions[year];

      if (
        subscription &&
        subscription.type === "inside" &&
        subscription.paid < subscription.fee
      ) {
        checkbox.disabled = false;
        checkbox.checked = true;

        // تحديث البيانات المحلية
        if (currentMember.subscriptions[year]) {
          currentMember.subscriptions[year].settlement = true;
          settlementChanges[year] = true;
        }
      }
    });

    settlementSummary.style.display = "block";
    calculateSettlementSummary();
  } else {
    // تعطيل خيار التسوية
    document.querySelectorAll(".settlement-checkbox").forEach((checkbox) => {
      checkbox.disabled = true;
      checkbox.checked = false;

      // تحديث البيانات المحلية
      const year = checkbox.dataset.year;
      if (currentMember?.subscriptions[year]) {
        currentMember.subscriptions[year].settlement = false;
        delete settlementChanges[year];
      }
    });

    settlementSummary.style.display = "none";

    // إعادة حساب الإحصائيات بدون تسوية
    if (currentMember) {
      displaySubscriptions(currentMember);
    }
  }
}

function autoSettle() {
  if (!currentMember) {
    alert("لا توجد بيانات للعضو");
    return;
  }

  // تفعيل نظام التسوية
  globalSettlementToggle.checked = true;
  toggleSettlementSystem();

  // حساب إجمالي المتأخرات الأصلية
  let totalOriginalDebt = 0;
  let totalSettledYears = 0;

  for (const year in currentMember.subscriptions) {
    const subscription = currentMember.subscriptions[year];
    if (
      subscription.type === "inside" &&
      subscription.paid < subscription.fee
    ) {
      totalOriginalDebt += subscription.fee - subscription.paid;
      totalSettledYears++;
    }
  }

  alert(
    `تم تفعيل نظام التسوية تلقائياً.\nعدد السنوات المؤهلة: ${totalSettledYears}\nإجمالي المتأخرات الأصلية: ${totalOriginalDebt.toLocaleString()} ريال`
  );
}

function calculateSettlementSummary() {
  if (!currentMember) return;

  let settledYears = 0;
  let originalDebt = 0;
  let savedAmount = 0;
  let finalDebt = 0;

  for (const year in currentMember.subscriptions) {
    const subscription = currentMember.subscriptions[year];
    if (subscription.type !== "none" && subscription.paid < subscription.fee) {
      const remaining = subscription.fee - subscription.paid;
      originalDebt += remaining;

      if (subscription.settlement) {
        settledYears++;
        savedAmount += remaining;
      } else {
        finalDebt += remaining;
      }
    }
  }

  // تحديث واجهة ملخص التسوية
  document.getElementById("settledYearsCount").textContent = settledYears;
  document.getElementById("originalDebtAmount").textContent =
    originalDebt.toLocaleString() + " ريال";
  document.getElementById("savedAmount").textContent =
    savedAmount.toLocaleString() + " ريال";
  document.getElementById("finalDebtAmount").textContent =
    finalDebt.toLocaleString() + " ريال";

  // تحديث الحالة النهائية للعضو
  updateMemberFinalStatus(settledYears, finalDebt);
}

function updateMemberFinalStatus(settledYears, finalDebt) {
  if (!currentMember) return;

  let finalStatus = "غير مسدد";

  if (settledYears > 0) {
    finalStatus = "تمت التسوية";
  } else if (finalDebt === 0) {
    finalStatus = "مسدد";
  } else if (finalDebt > 0) {
    let hasPartialPayments = false;
    for (const year in currentMember.subscriptions) {
      const subscription = currentMember.subscriptions[year];
      if (
        subscription.type !== "none" &&
        subscription.paid > 0 &&
        subscription.paid < subscription.fee
      ) {
        hasPartialPayments = true;
        break;
      }
    }

    finalStatus = hasPartialPayments ? "مسدد جزئياً" : "متأخر";
  }

  currentMember.final_status = finalStatus;
  currentMember.total_remaining = finalDebt;
  displayMemberInfo(currentMember);
}

function applySettlement() {
  if (!currentMember) {
    alert("لا توجد بيانات للعضو");
    return;
  }

  if (Object.keys(settlementChanges).length === 0 && !isSettlementEnabled) {
    alert("لم يتم إجراء أي تغييرات في نظام التسوية");
    return;
  }

  if (
    !confirm(
      "هل تريد تطبيق نظام التسوية على السنوات المحددة؟\nسيتم حفظ التغييرات في قاعدة البيانات."
    )
  ) {
    return;
  }

  saveSettlementBtn.style.display = "inline-block";
  applySettlementBtn.style.display = "none";

  calculateSettlementSummary();
  alert("تم تطبيق نظام التسوية. يرجى حفظ التغييرات في قاعدة البيانات.");
}

async function saveSettlementChanges() {
  if (!currentMember) {
    alert("لا توجد بيانات للعضو");
    return;
  }

  if (!window.supabaseInitialized || !window.supabaseDB) {
    alert("قاعدة البيانات غير متاحة. لا يمكن حفظ التغييرات.");
    return;
  }

  if (!confirm("هل تريد حفظ تغييرات التسوية في قاعدة البيانات؟")) {
    return;
  }

  try {
    // حساب الإحصائيات النهائية
    const totalRemaining = calculateTotalRemaining();
    const totalPaid = calculateTotalPaid();
    const totalDue = calculateTotalDue();

    // حساب السنوات المختلفة
    const yearsStats = calculateYearsStatistics();

    // تحديث بيانات العضو
    const memberUpdateData = {
      final_status: currentMember.final_status || "غير محدد",
      total_remaining: totalRemaining,
      total_paid: totalPaid,
      total_due: totalDue,
      original_debt: calculateOriginalDebt(),
      saved_amount: calculateSavedAmount(),
      is_settlement_enabled: isSettlementEnabled,
      years_count: yearsStats.yearsCount,
      paid_years: yearsStats.paidYears,
      unpaid_years: yearsStats.unpaidYears,
      settled_years: yearsStats.settledYears,
      inside_years: yearsStats.insideYears,
      outside_years: yearsStats.outsideYears,
      updated_at: new Date().toISOString(),
    };

    debug("بيانات تحديث العضو: " + JSON.stringify(memberUpdateData));
    debug(`محاولة تحديث العضو ID: ${currentMember.id}`);

    // تحديث العضو في قاعدة البيانات
    const memberResult = await window.supabaseDB.updateMember(
      currentMember.id,
      memberUpdateData
    );

    if (!memberResult) {
      debug(
        "⚠️ تحذير: فشل تحديث ملخص العضو، ولكن سيتم متابعة تحديث الاشتراكات.",
        true
      );
    }

    // تحديث الاشتراكات
    const subscriptionUpdates = [];
    for (const year in settlementChanges) {
      const subscription = currentMember.subscriptions[year];
      if (subscription) {
        const updateData = {
          settlement: subscription.settlement,
          status: subscription.settlement
            ? "settled"
            : subscription.paid >= subscription.fee
            ? "paid"
            : subscription.paid > 0
            ? "partial"
            : "unpaid",
          amount_paid: subscription.paid,
          amount_remaining: subscription.settlement
            ? 0
            : Math.max(0, subscription.fee - subscription.paid),
        };

        if (subscription.id) {
          const result = await window.supabaseDB.updateSubscription(
            subscription.id,
            updateData
          );
          subscriptionUpdates.push({ year, success: !!result });
        }
      }
    }

    // إعادة تحميل بيانات العضو
    await reloadMemberData(currentMember.phone);

    saveSettlementBtn.style.display = "none";
    applySettlementBtn.style.display = "inline-block";
    settlementChanges = {};

    alert("✅ تم حفظ تغييرات التسوية بنجاح في قاعدة البيانات.");
  } catch (error) {
    console.error("خطأ في حفظ تغييرات التسوية:", error);
    alert(
      `❌ حدث خطأ أثناء حفظ التغييرات: ${
        error.message || "يرجى المحاولة مرة أخرى"
      }`
    );
    debug("تفاصيل الخطأ: " + error.stack, true);
  }
}

// ==================== دوال الحساب ====================

function calculateTotalRemaining() {
  if (!currentMember) return 0;

  let total = 0;
  for (const year in currentMember.subscriptions) {
    const subscription = currentMember.subscriptions[year];
    if (subscription.type !== "none" && !subscription.settlement) {
      total += Math.max(0, subscription.fee - subscription.paid);
    }
  }
  return total;
}

function calculateTotalPaid() {
  if (!currentMember) return 0;

  let total = 0;
  for (const year in currentMember.subscriptions) {
    const subscription = currentMember.subscriptions[year];
    if (subscription.type !== "none") {
      total += subscription.paid;
    }
  }
  return total;
}

function calculateTotalDue() {
  if (!currentMember) return 0;

  let total = 0;
  for (const year in currentMember.subscriptions) {
    const subscription = currentMember.subscriptions[year];
    if (subscription.type !== "none") {
      total += subscription.fee;
    }
  }
  return total;
}

function calculateOriginalDebt() {
  if (!currentMember) return 0;

  let total = 0;
  for (const year in currentMember.subscriptions) {
    const subscription = currentMember.subscriptions[year];
    if (subscription.type !== "none" && subscription.paid < subscription.fee) {
      total += subscription.fee - subscription.paid;
    }
  }
  return total;
}

function calculateSavedAmount() {
  if (!currentMember) return 0;

  let total = 0;
  for (const year in currentMember.subscriptions) {
    const subscription = currentMember.subscriptions[year];
    if (subscription.type !== "none" && subscription.settlement) {
      total += subscription.fee - subscription.paid;
    }
  }
  return total;
}

function calculateYearsStatistics() {
  const stats = {
    yearsCount: 0,
    paidYears: 0,
    unpaidYears: 0,
    settledYears: 0,
    insideYears: 0,
    outsideYears: 0,
    partialYears: 0,
  };

  if (!currentMember) return stats;

  for (const year in currentMember.subscriptions) {
    const subscription = currentMember.subscriptions[year];

    if (subscription.type === "none") continue;

    if (subscription.type === "inside") stats.insideYears++;
    if (subscription.type === "outside") stats.outsideYears++;

    if (subscription.settlement) {
      stats.settledYears++;
    } else {
      stats.yearsCount++;

      if (subscription.paid >= subscription.fee) {
        stats.paidYears++;
      } else if (subscription.paid > 0) {
        stats.partialYears++;
      } else {
        stats.unpaidYears++;
      }
    }
  }

  return stats;
}

// أضف هذه الدالة بعد دالة calculateYearsStatistics
async function updateMemberStatistics(memberId) {
  if (!window.supabaseInitialized || !window.supabaseDB) {
    return;
  }

  try {
    // جلب الاشتراكات الحالية
    const subs = await window.supabaseDB.getSubscriptionsByMemberId(memberId);

    if (!subs || subs.length === 0) {
      return;
    }

    // حساب الإحصائيات
    let totalDue = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let originalDebt = 0;
    let savedAmount = 0;
    let settledYears = 0;
    let insideYears = 0;
    let outsideYears = 0;
    let paidYears = 0;
    let unpaidYears = 0;
    let partialYears = 0;

    subs.forEach((sub) => {
      if (sub.subscription_type !== "none") {
        totalDue += sub.amount_due || 0;
        totalPaid += sub.amount_paid || 0;
        totalRemaining += sub.amount_remaining || 0;

        if (sub.subscription_type === "inside") insideYears++;
        if (sub.subscription_type === "outside") outsideYears++;

        if (sub.settlement) {
          settledYears++;
          savedAmount += sub.amount_remaining || 0;
        } else {
          if (sub.status === "paid") {
            paidYears++;
          } else if (sub.status === "partial") {
            partialYears++;
            originalDebt += sub.amount_remaining || 0;
          } else if (sub.status === "unpaid") {
            unpaidYears++;
            originalDebt += sub.amount_remaining || 0;
          }
        }
      }
    });

    // تحديث حالة العضو النهائية
    let finalStatus = "غير مسدد";
    if (settledYears > 0) {
      finalStatus = "تمت التسوية";
    } else if (totalRemaining === 0) {
      finalStatus = "مسدد";
    } else if (partialYears > 0) {
      finalStatus = "مسدد جزئياً";
    } else if (unpaidYears > 0) {
      finalStatus = "متأخر";
    }

    // تحديث بيانات العضو في قاعدة البيانات
    const memberUpdateData = {
      final_status: finalStatus,
      total_remaining: totalRemaining,
      total_paid: totalPaid,
      total_due: totalDue,
      original_debt: originalDebt,
      saved_amount: savedAmount,
      years_count: insideYears + outsideYears,
      paid_years: paidYears,
      unpaid_years: unpaidYears,
      settled_years: settledYears,
      inside_years: insideYears,
      outside_years: outsideYears,
      updated_at: new Date().toISOString(),
    };

    await window.supabaseDB.updateMember(memberId, memberUpdateData);
    debug(`تم تحديث إحصائيات العضو ${memberId}`);
  } catch (error) {
    console.error("خطأ في تحديث إحصائيات العضو:", error);
    debug("تفاصيل الخطأ: " + error.stack, true);
  }
}
// ==================== دوال العرض ====================

function displayMemberInfo(member) {
  memberInfo.innerHTML = `
        <div class="info-card">
            <div class="info-label">اسم العضو</div>
            <div class="info-value">${member.name}</div>
        </div>
        <div class="info-card">
            <div class="info-label">رقم الجوال</div>
            <div class="info-value">${member.phone}</div>
        </div>
        <div class="info-card">
            <div class="info-label">رقم العضوية</div>
            <div class="info-value">${member.membership_number}</div>
        </div>
        <div class="info-card">
            <div class="info-label">سنة الانضمام</div>
            <div class="info-value">${member.join_year}</div>
        </div>
        <div class="info-card">
            <div class="info-label">الحالة العامة</div>
            <div class="info-value status-cell ${
              member.final_status === "مسدد" ||
              member.final_status === "تمت التسوية"
                ? "status-paid"
                : member.final_status === "مسدد جزئياً"
                ? "status-partial"
                : "status-unpaid"
            }">
                ${member.final_status}
            </div>
        </div>
        <div class="info-card">
            <div class="info-label">المتأخرات النهائية</div>
            <div class="info-value" style="color: ${
              member.total_remaining > 0 ? "#f44336" : "#4CAF50"
            }; font-weight: 600;">
                ${
                  member.total_remaining
                    ? member.total_remaining.toLocaleString()
                    : "0"
                } ريال
            </div>
        </div>
        <div class="info-card">
            <div class="info-label">الدين الأصلي</div>
            <div class="info-value">${
              member.original_debt ? member.original_debt.toLocaleString() : "0"
            } ريال</div>
        </div>
        <div class="info-card">
            <div class="info-label">المبلغ المخصوم</div>
            <div class="info-value">${
              member.saved_amount ? member.saved_amount.toLocaleString() : "0"
            } ريال</div>
        </div>
        <div class="info-card" style="grid-column: span 1;">
            <div class="info-label">ملاحظات عامة</div>
            <div class="info-value">${member.notes || "لا توجد ملاحظات"}</div>
        </div>
    `;
}
function displaySubscriptions(member) {
  let tableHTML = "";
  const startYear = member.join_year ? parseInt(member.join_year) : 2015;
  const endYear = 2026;

  for (let year = startYear; year <= endYear; year++) {
    const subscription = member.subscriptions[year] || {
      type: "none",
      fee: 0,
      paid: 0,
      settlement: false,
      notes: "",
    };

    const remaining = Math.max(0, subscription.fee - subscription.paid);
    const isSettled = subscription.settlement;
    const statusText = getStatusText(subscription);
    const statusClass = getStatusClass(subscription);
    const statusIcon = getStatusIcon(subscription);
    const typeText = getTypeText(subscription.type);

    // خلية التسوية
    let settlementCell = "";
    if (subscription.type !== "none" && subscription.paid < subscription.fee) {
      const isChecked = subscription.settlement ? "checked" : "";
      const isDisabled = !isSettlementEnabled ? "disabled" : "";
      settlementCell = `
                <div class="settlement-toggle">
                    <input type="checkbox" class="settlement-checkbox" data-year="${year}" 
                           id="settlement-${year}" ${isChecked} ${isDisabled}>
                    <label for="settlement-${year}">تمت التسوية</label>
                </div>
            `;
    } else {
      settlementCell = "—";
    }

    // خلية الإجراءات (زر واحد في كل الحالات)
    let actionCell = "";
    if (subscription.type === "none") {
      actionCell = `
                <button class="btn-small add-btn" data-year="${year}" title="إضافة اشتراك">
                    <i class="fas fa-plus"></i> إضافة
                </button>
            `;
    } else {
      // زر واحد لجميع الحالات: سداد/تعديل
      actionCell = `
                <button class="btn-small pay-edit-btn" data-year="${year}" 
                        title="سداد/تعديل">
                    <i class="fas fa-edit"></i> تعديل
                </button>
            `;
    }

    tableHTML += `
            <tr ${isSettled ? 'class="settled-row"' : ""} data-year="${year}">
                <td>${year}</td>
                <td class="type-cell">${typeText}</td>
                <td  class="fee-cell">${subscription.fee.toLocaleString()}</td>
                <td style="text-align: center; color: #1b1818ff;" class="paid-cell">${subscription.paid.toLocaleString()}</td>
                <td style="text-align: center; color: var(--danger-color);" class="remaining-cell">${remaining.toLocaleString()}${
      isSettled ? ' <small class="muted">(مُخصم بالتسوية)</small>' : ""
    }</td>
                <td>
                    <span class="status-cell ${statusClass}">
                        ${statusIcon} ${statusText}
                    </span>
                </td>
                <td class="settlement-cell">${settlementCell}</td>
                <td class="action-cell">${actionCell}</td>
            </tr>
        `;
  }

  subscriptionsBody.innerHTML =
    tableHTML ||
    `<tr><td colspan="8">لا توجد اشتراكات مسجلة لهذا العضو</td></tr>`;

  // إضافة أحداث لخانات التسوية
  subscriptionsBody
    .querySelectorAll(".settlement-checkbox")
    .forEach((checkbox) => {
      checkbox.addEventListener("change", function () {
        const year = this.dataset.year;
        if (currentMember && currentMember.subscriptions[year]) {
          currentMember.subscriptions[year].settlement = this.checked;
          settlementChanges[year] = this.checked;
          updateSubscriptionRow(year);
          calculateSettlementSummary();
        }
      });
    });

  // تحديث الملخص
  updateSummary(member);
}

function updateSubscriptionRow(year) {
  const row = subscriptionsBody.querySelector(`tr[data-year="${year}"]`);
  if (!row || !currentMember || !currentMember.subscriptions[year]) return;

  const subscription = currentMember.subscriptions[year];
  const remaining = Math.max(0, subscription.fee - subscription.paid);
  const isSettled = subscription.settlement;

  // تحديث الخلايا
  row.querySelector(".type-cell").textContent = getTypeText(subscription.type);
  row.querySelector(".fee-cell").textContent =
    subscription.fee.toLocaleString();
  row.querySelector(".paid-cell").textContent =
    subscription.paid.toLocaleString();
  row.querySelector(".remaining-cell").innerHTML =
    remaining.toLocaleString() +
    (isSettled ? ' <small class="muted">(مُخصم بالتسوية)</small>' : "");

  const statusText = getStatusText(subscription);
  const statusClass = getStatusClass(subscription);
  const statusIcon = getStatusIcon(subscription);

  row.querySelector(".status-cell").className = `status-cell ${statusClass}`;
  row.querySelector(".status-cell").innerHTML = `${statusIcon} ${statusText}`;

  // تحديث خلية التسوية
  if (subscription.type !== "none" && subscription.paid < subscription.fee) {
    const isChecked = subscription.settlement ? "checked" : "";
    const isDisabled = !isSettlementEnabled ? "disabled" : "";
    row.querySelector(".settlement-cell").innerHTML = `
            <div class="settlement-toggle">
                <input type="checkbox" class="settlement-checkbox" data-year="${year}" 
                       id="settlement-${year}" ${isChecked} ${isDisabled}>
                <label for="settlement-${year}">تمت التسوية</label>
            </div>
        `;
  } else {
    row.querySelector(".settlement-cell").innerHTML = "—";
  }

  // تحديث خلية الإجراءات (زر واحد لجميع الحالات)
  let actionCell = "";
  if (subscription.type === "none") {
    actionCell = `
            <button class="btn-small add-btn" data-year="${year}" title="إضافة اشتراك">
                <i class="fas fa-plus"></i> إضافة
            </button>
        `;
  } else {
    actionCell = `
            <button class="btn-small pay-edit-btn" data-year="${year}" 
                    title="سداد/تعديل">
                <i class="fas fa-edit"></i> تعديل
            </button>
        `;
  }

  row.querySelector(".action-cell").innerHTML = actionCell;
}

// دالة للتعامل مع الضغط على زر التعديل
async function handleEditClick(year) {
  if (!currentMember) return;

  const row = subscriptionsBody.querySelector(`tr[data-year="${year}"]`);
  if (!row) return;

  const subscription = currentMember.subscriptions[year];
  if (!subscription) return;

  // إذا كانت السنة مسوية، نعرض تنبيه
  if (subscription.settlement) {
    const proceed = confirm(
      `⚠️ هذه السنة (${year}) تمت تسويتها.\n\n` +
        `المبلغ المتبقي: ${
          subscription.fee - subscription.paid
        } ريال (مُخصم بالتسوية)\n` +
        `هل تريد تعديل هذه السنة؟\n\n` +
        `ملاحظة: إذا قمت بتعديل المبلغ المدفوع، سيتم إلغاء التسوية تلقائياً.`
    );

    if (!proceed) {
      return;
    }
  }

  // التحويل إلى وضع التعديل
  convertRowToEditMode(row, year, subscription);
}
function updateSummary(member) {
  const stats = calculateYearsStatistics();
  const totalRemaining = calculateTotalRemaining();
  const totalPaid = calculateTotalPaid();
  // تعديل حسب طلب العضو: إجمالي المستحقات = إجمالي المستحقات بعد تسويتها + إجمالي المدفوع
  const totalDue = totalRemaining + totalPaid;

  summary.innerHTML = `
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-value">${stats.yearsCount}</div>
                <div class="summary-label">عدد سنوات الاشتراك</div>
            </div>
            <div class="summary-item paid">
                <div class="summary-value" style="color: #4CAF50;">${
                  stats.paidYears
                }</div>
                <div class="summary-label">سنوات مسددة بالكامل</div>
            </div>
            <div class="summary-item partial">
                <div class="summary-value">${stats.settledYears}</div>
                <div class="summary-label">سنوات تمت تسويتها</div>
            </div>
            <div class="summary-item unpaid">
                <div class="summary-value" style="color: #f44336;">${
                  stats.unpaidYears
                }</div>
                <div class="summary-label">سنوات غير مسددة</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${
                  member.join_year || 2015
                }-2026</div>
                <div class="summary-label">فترة الاشتراك</div>
            </div>
        </div>
        
        <div class="summary-total">
            <h3><i class="fas fa-calculator"></i> ملخص مالي</h3>
            <div class="amount">${totalRemaining.toLocaleString()} ريال</div>
            <p>إجمالي المستحقات بعد تسويتها</p>
            <div style="display: flex; justify-content: center; gap: 30px; margin-top: 15px;">
                <div>
                    <div style="font-size: 2.5rem; font-weight: 700; ">
                        ${totalDue.toLocaleString()} ريال
                    </div>
                    <div style="font-size: 0.9rem;">إجمالي المستحقات</div>
                </div>
                <div>
                    <div style="font-size: 2.5rem; font-weight: 700; color: var(--secondary-color); ">${totalPaid.toLocaleString()} ريال</div>
                    <div style="font-size: 0.9rem;">إجمالي المدفوع</div>
                </div>
            </div>
        </div>
    `;
}
function convertRowToEditMode(row, year, subscription) {
  // حفظ القيم الأصلية
  row.dataset.originalType = subscription.type;
  row.dataset.originalFee = subscription.fee;
  row.dataset.originalPaid = subscription.paid;
  row.dataset.originalRemaining = Math.max(
    0,
    subscription.fee - subscription.paid
  );
  row.dataset.originalSettlement = subscription.settlement;

  // تحويل الخلايا إلى حقول إدخال
  row.querySelector(".type-cell").innerHTML = `
        <select class="edit-type" style="width: 100%; padding: 5px; border-radius: 4px; border: 1px solid #ddd;">
            <option value="inside" ${
              subscription.type === "inside" ? "selected" : ""
            }>ساكن في الدار</option>
            <option value="outside" ${
              subscription.type === "outside" ? "selected" : ""
            }>خارج الدار</option>
            <option value="none" ${
              subscription.type === "none" ? "selected" : ""
            }>غير مشترك</option>
        </select>
    `;

  row.querySelector(
    ".fee-cell"
  ).innerHTML = `<input type="number" class="edit-fee" value="${subscription.fee}" min="0" style="width: 100%; padding: 5px; border-radius: 4px; border: 1px solid #ddd;">`;

  row.querySelector(
    ".paid-cell"
  ).innerHTML = `<input type="number" class="edit-paid" value="${subscription.paid}" min="0" max="${subscription.fee}" style="width: 100%; padding: 5px; border-radius: 4px; border: 1px solid #ddd;">`;

  const remaining = Math.max(0, subscription.fee - subscription.paid);
  row.querySelector(
    ".remaining-cell"
  ).innerHTML = `<input type="number" class="edit-remaining" value="${remaining}" min="0" style="width: 100%; padding: 5px; border-radius: 4px; border: 1px solid #ddd;">`;

  row.querySelector(".status-cell").innerHTML =
    '<span class="status-cell status-partial">⚠️ تحت التحرير</span>';

  // إذا كانت السنة مسوية، نعرض ملاحظة
  let settlementNote = "";
  if (subscription.settlement) {
    settlementNote = `
            <div class="settlement-notice" style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 8px; margin: 5px 0; border-radius: 4px; color: #856404;">
                <i class="fas fa-exclamation-triangle"></i>
                <small>ملاحظة: هذه السنة تمت تسويتها. أي تعديل سيلغي التسوية.</small>
            </div>
        `;
  }

  row.querySelector(".settlement-cell").innerHTML = settlementNote || "—";

  row.querySelector(".action-cell").innerHTML = `
        <div class="edit-action-buttons">
            <button class="btn-small btn-success save-btn" data-year="${year}" title="حفظ التغييرات">
                <i class="fas fa-check"></i> حفظ
            </button>
            <button class="btn-small btn-danger cancel-btn" data-year="${year}" title="إلغاء التغييرات">
                <i class="fas fa-times"></i> إلغاء
            </button>
        </div>
    `;

  row.classList.add("editing-row");

  // إضافة أحداث التحديث التلقائي
  const feeInput = row.querySelector(".edit-fee");
  const paidInput = row.querySelector(".edit-paid");
  const remainingInput = row.querySelector(".edit-remaining");
  const typeSelect = row.querySelector(".edit-type");

  const updateRemaining = () => {
    const fee = parseFloat(feeInput.value) || 0;
    const paid = parseFloat(paidInput.value) || 0;
    remainingInput.value = Math.max(0, fee - paid);
  };

  feeInput.addEventListener("input", updateRemaining);
  paidInput.addEventListener("input", updateRemaining);

  typeSelect.addEventListener("change", function () {
    const selectedType = this.value;
    const yearNum = parseInt(year);

    if (selectedType === "none") {
      feeInput.value = 0;
      paidInput.value = 0;
      remainingInput.value = 0;
      feeInput.disabled = true;
      paidInput.disabled = true;
    } else {
      feeInput.disabled = false;
      paidInput.disabled = false;
      feeInput.value = calculateFee(selectedType, yearNum);
      updateRemaining();
    }
  });
}
async function openPaymentEditOptions(year, subscription) {
  if (!currentMember) return;

  const row = subscriptionsBody.querySelector(`tr[data-year="${year}"]`);
  if (!row) return;

  // إنشاء نافذة اختيار
  const choice = prompt(
    `اختر العملية المطلوبة للعام ${year}:\n\n` +
      `1. أدخل "1" لإضافة مبلغ مدفوع\n` +
      `2. أدخل "2" للدخول إلى وضع التعديل الكامل\n` +
      `3. أدخل "3" للإلغاء`,
    "1"
  );

  if (choice === null) return; // تم الإلغاء

  if (choice === "1") {
    // فتح نافذة إدخال المبلغ المدفوع
    const amount = prompt(
      `أدخل المبلغ المدفوع للعام ${year} (المتبقي: ${
        subscription.fee - subscription.paid
      } ريال)`,
      subscription.fee - subscription.paid
    );

    if (amount !== null) {
      const paidAmount = parseFloat(amount);
      if (!isNaN(paidAmount) && paidAmount >= 0) {
        // تحديث المبلغ المدفوع
        subscription.paid = Math.min(
          subscription.paid + paidAmount,
          subscription.fee
        );

        // حفظ التغييرات
        const success = await saveSubscriptionChanges(year, subscription);
        if (success) {
          showNotification("✅ تم إضافة المبلغ المدفوع بنجاح", "success");
        }
      } else {
        alert("يرجى إدخال مبلغ صحيح");
      }
    }
  } else if (choice === "2") {
    // فتح وضع التعديل الكامل
    convertRowToEditMode(row, year, subscription);
  }
  // إذا كان "3" أو أي شيء آخر، لا نفعل شيئاً
}

// دالة لحفظ تغييرات الاشتراك
async function saveSubscriptionChanges(year, subscription) {
  if (!currentMember || !window.supabaseInitialized || !window.supabaseDB) {
    return false;
  }

  try {
    const updateData = {
      subscription_type: subscription.type,
      amount_due: subscription.fee,
      amount_paid: subscription.paid,
      amount_remaining: Math.max(0, subscription.fee - subscription.paid),
      status:
        subscription.type === "none"
          ? "none"
          : subscription.paid >= subscription.fee
          ? "paid"
          : subscription.paid > 0
          ? "partial"
          : "unpaid",
      settlement: subscription.settlement || false,
    };

    let result;
    if (subscription.id) {
      result = await window.supabaseDB.updateSubscription(
        subscription.id,
        updateData
      );
    } else {
      updateData.member_id = currentMember.id;
      updateData.year = parseInt(year);
      updateData.created_at = new Date().toISOString();
      result = await window.supabaseDB.addSubscription(updateData);

      if (result && result.id) {
        subscription.id = result.id;
      }
    }

    // تحديث إحصائيات العضو
    await updateMemberStatistics(currentMember.id);

    // تحديث واجهة المستخدم
    updateSubscriptionRow(year);
    updateSummary(currentMember);

    return true;
  } catch (error) {
    console.error("خطأ في حفظ التغييرات:", error);
    showNotification("❌ خطأ في حفظ التغييرات", "error");
    return false;
  }
}
async function saveRowChanges(row, year) {
  const typeSelect = row.querySelector(".edit-type");
  const feeInput = row.querySelector(".edit-fee");
  const paidInput = row.querySelector(".edit-paid");

  if (!typeSelect || !feeInput || !paidInput) {
    alert("خطأ في استخراج البيانات");
    return false;
  }

  const newType = typeSelect.value;
  const newFee = parseFloat(feeInput.value) || 0;
  const newPaid = parseFloat(paidInput.value) || 0;

  // التحقق من صحة البيانات
  if (newType !== "none" && newFee <= 0) {
    alert("الرسوم المستحقة يجب أن تكون أكبر من صفر");
    return false;
  }

  if (newPaid < 0) {
    alert("المبلغ المدفوع لا يمكن أن يكون سالباً");
    return false;
  }

  if (newPaid > newFee) {
    alert("المبلغ المدفوع لا يمكن أن يكون أكبر من الرسوم المستحقة");
    return false;
  }

  if (!currentMember) {
    alert("لا توجد بيانات للعضو");
    return false;
  }

  const subscription = currentMember.subscriptions[year];
  if (!subscription) {
    alert(`لا يوجد اشتراك للسنة ${year}`);
    return false;
  }

  // تحديث البيانات المحلية
  const wasSettled = subscription.settlement;
  subscription.type = newType;
  subscription.fee = newFee;
  subscription.paid = newPaid;
  subscription.status =
    newType === "none"
      ? "none"
      : newPaid >= newFee
      ? "paid"
      : newPaid > 0
      ? "partial"
      : "unpaid";

  // إذا كانت السنة كانت مسوية وتم التعديل، نلغي التسوية
  if (
    wasSettled &&
    (subscription.type !== newType ||
      subscription.fee !== newFee ||
      subscription.paid !== newPaid)
  ) {
    subscription.settlement = false;
    delete settlementChanges[year];

    // تحديث واجهة نظام التسوية إذا كان مفعلاً
    if (isSettlementEnabled) {
      const checkbox = subscriptionsBody.querySelector(
        `.settlement-checkbox[data-year="${year}"]`
      );
      if (checkbox) {
        checkbox.checked = false;
      }
    }
  }

  // حفظ التغييرات في قاعدة البيانات
  const success = await saveSubscriptionChanges(year, subscription);

  if (success) {
    // تنظيف البيانات المؤقتة
    delete row.dataset.originalType;
    delete row.dataset.originalFee;
    delete row.dataset.originalPaid;
    delete row.dataset.originalRemaining;
    delete row.dataset.originalSettlement;

    // إذا كانت هناك تسوية وتم إلغاؤها، نقوم بحساب ملخص التسوية من جديد
    if (wasSettled && isSettlementEnabled) {
      calculateSettlementSummary();
    }
  }

  return success;
}
// async function saveRowChanges(row, year) {
//   const typeSelect = row.querySelector(".edit-type");
//   const feeInput = row.querySelector(".edit-fee");
//   const paidInput = row.querySelector(".edit-paid");

//   if (!typeSelect || !feeInput || !paidInput) {
//     alert("خطأ في استخراج البيانات");
//     return false;
//   }

//   const newType = typeSelect.value;
//   const newFee = parseFloat(feeInput.value) || 0;
//   const newPaid = parseFloat(paidInput.value) || 0;

//   // التحقق من صحة البيانات
//   if (newType !== "none" && newFee <= 0) {
//     alert("الرسوم المستحقة يجب أن تكون أكبر من صفر");
//     return false;
//   }

//   if (newPaid < 0) {
//     alert("المبلغ المدفوع لا يمكن أن يكون سالباً");
//     return false;
//   }

//   if (newPaid > newFee) {
//     alert("المبلغ المدفوع لا يمكن أن يكون أكبر من الرسوم المستحقة");
//     return false;
//   }

//   if (!currentMember) {
//     alert("لا توجد بيانات للعضو");
//     return false;
//   }

//   const subscription = currentMember.subscriptions[year];
//   if (!subscription) {
//     alert(`لا يوجد اشتراك للسنة ${year}`);
//     return false;
//   }

//   // تحديث البيانات المحلية
//   subscription.type = newType;
//   subscription.fee = newFee;
//   subscription.paid = newPaid;
//   subscription.status =
//     newType === "none"
//       ? "none"
//       : newPaid >= newFee
//       ? "paid"
//       : newPaid > 0
//       ? "partial"
//       : "unpaid";

//   // حفظ التغييرات
//   const success = await saveSubscriptionChanges(year, subscription);

//   if (success) {
//     // تنظيف البيانات المؤقتة
//     delete row.dataset.originalType;
//     delete row.dataset.originalFee;
//     delete row.dataset.originalPaid;
//     delete row.dataset.originalRemaining;
//   }

//   return success;
// }

function showNotification(message, type = "info", duration = 3000) {
  // إزالة أي إشعارات سابقة
  const existingNotifications = document.querySelectorAll(".notification");
  existingNotifications.forEach((notification) => {
    notification.remove();
  });

  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas fa-${
        type === "success"
          ? "check-circle"
          : type === "error"
          ? "times-circle"
          : type === "warning"
          ? "exclamation-triangle"
          : "info-circle"
      }"></i>
      <span>${message}</span>
    </div>
  `;

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${
      type === "success"
        ? "#4CAF50"
        : type === "error"
        ? "#f44336"
        : type === "warning"
        ? "#ff9800"
        : "#2196F3"
    };
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    animation: slideIn 0.3s ease-out;
    max-width: 400px;
    display: flex;
    align-items: center;
    gap: 10px;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease-out";
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

// إضافة الأنيميشن للـ CSS
const notificationStyles = `
<style>
@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOut {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100%); opacity: 0; }
}

.notification-success { background-color: #4CAF50 !important; }
.notification-error { background-color: #f44336 !important; }
.notification-warning { background-color: #ff9800 !important; }
.notification-info { background-color: #2196F3 !important; }
</style>
`;
document.head.insertAdjacentHTML("beforeend", notificationStyles);
function cancelRowEdit(row, year) {
  // استعادة القيم الأصلية
  const originalType = row.dataset.originalType;
  const originalFee = parseFloat(row.dataset.originalFee) || 0;
  const originalPaid = parseFloat(row.dataset.originalPaid) || 0;

  if (currentMember && currentMember.subscriptions[year]) {
    const subscription = currentMember.subscriptions[year];
    subscription.type = originalType;
    subscription.fee = originalFee;
    subscription.paid = originalPaid;
  }

  updateSubscriptionRow(year);

  // تنظيف البيانات المؤقتة
  delete row.dataset.originalType;
  delete row.dataset.originalFee;
  delete row.dataset.originalPaid;
  delete row.dataset.originalRemaining;
}

// ==================== البحث والأحداث ====================

async function searchMember(phone) {
  memberSection.style.display = "none";
  subscriptionsSection.style.display = "none";
  noResult.style.display = "none";

  if (settlementControlsContainer) {
    settlementControlsContainer.style.display = "none";
  }

  loading.style.display = "block";

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
    debug("قاعدة البيانات غير متصلة", true);
    loading.style.display = "none";
    alert("⚠️ قاعدة البيانات غير متصلة. يرجى التحقق من الاتصال بالإنترنت.");
    return;
  }
  try {
    const members = await window.supabaseDB.searchMembersByNameOrPhone(phone);
    loading.style.display = "none";

    if (members && members.length > 0) {
      const memberData = members[0];
      const memberId = memberData.id;

      // جلب الاشتراكات
      const subs = await window.supabaseDB.getSubscriptionsByMemberId(memberId);

      // بناء كائن العضو
      const member = {
        id: memberId,
        name: memberData.name || "غير محدد",
        phone: memberData.phone || phone,
        membership_number: memberData.membership_number || "",
        join_year: memberData.join_year || new Date().getFullYear(),
        final_status: memberData.final_status || "غير محدد",
        total_remaining: memberData.total_remaining || 0,
        total_paid: memberData.total_paid || 0,
        total_due: memberData.total_due || 0,
        original_debt: memberData.original_debt || 0,
        saved_amount: memberData.saved_amount || 0,
        is_settlement_enabled: memberData.is_settlement_enabled || false,
        subscriptions: {},
      };

      // **تحسين بناء الاشتراكات**
      const startYear = member.join_year ? parseInt(member.join_year) : 2015;
      const endYear = 2026;

      for (let year = startYear; year <= endYear; year++) {
        // البحث عن اشتراك لهذه السنة
        const existingSub = subs?.find((sub) => sub.year === year);

        if (existingSub) {
          // استخدام الاشتراك الموجود
          member.subscriptions[year] = {
            id: existingSub.id,
            type: existingSub.subscription_type || "none",
            fee: existingSub.amount_due || 0,
            paid: existingSub.amount_paid || 0,
            settlement: existingSub.settlement || false,
            notes: existingSub.notes || "",
            status: existingSub.status || "unpaid",
            db_exists: true, // إضافة علامة للوجود في قاعدة البيانات
          };
        } else {
          // إنشاء اشتراك افتراضي غير موجود في قاعدة البيانات
          const fee = calculateFee("none", year);
          member.subscriptions[year] = {
            id: null, // لا يوجد سجل في قاعدة البيانات بعد
            type: "none",
            fee: fee,
            paid: 0,
            settlement: false,
            notes: "",
            status: "none",
            db_exists: false,
          };
        }
      }

      currentMember = member;
      originalMemberData = JSON.parse(JSON.stringify(member));

      // عرض البيانات
      displayMemberInfo(member);
      displaySubscriptions(member);

      // عرض عناصر التسوية
      if (settlementControlsContainer) {
        settlementControlsContainer.style.display = "block";
        globalSettlementToggle.checked = member.is_settlement_enabled || false;
        isSettlementEnabled = member.is_settlement_enabled || false;
        settlementChanges = {};
        settlementSummary.style.display = isSettlementEnabled
          ? "block"
          : "none";
        saveSettlementBtn.style.display = "none";
        applySettlementBtn.style.display = "inline-block";

        if (isSettlementEnabled) {
          calculateSettlementSummary();
        }
      }

      memberSection.style.display = "block";
      subscriptionsSection.style.display = "block";
      return;
    }

    noResult.style.display = "block";
  } catch (err) {
    console.error("خطأ في الاستعلام من قاعدة البيانات:", err);
    loading.style.display = "none";
    alert(`❌ حدث خطأ في البحث: ${err.message || "يرجى المحاولة مرة أخرى"}`);
    debug("تفاصيل الخطأ: " + err.stack, true);
  }
}

async function reloadMemberData(phone) {
  return searchMember(phone);
}
window.onload = async () => {
  phoneInput.focus();
  createSettlementControls();

  try {
    if (typeof window.supabaseInit === "function") {
      await window.supabaseInit();
      debug("✅ تم تهيئة Supabase بنجاح");

      // اختبار اتصال قاعدة البيانات
      if (window.supabaseDB && window.supabaseDB.testConnection) {
        const isConnected = await window.supabaseDB.testConnection();
        if (isConnected) {
          debug("✅ الاتصال بقاعدة البيانات نشط");
        } else {
          debug("❌ فشل الاتصال بقاعدة البيانات", true);
        }
      }
    }
  } catch (e) {
    console.error("فشل تهيئة Supabase:", e);
    debug("❌ فشل تهيئة قاعدة البيانات", true);
  }

  // إضافة أحداث للجدول (مفوض)
  subscriptionsBody.addEventListener("click", async function (e) {
    const btn = e.target.closest("button");
    if (!btn) return;

    const row = btn.closest("tr");
    const year = row.dataset.year;

    if (btn.classList.contains("add-btn")) {
      if (!currentMember) return;
      // إنشاء اشتراك جديد
      const newSubscription = {
        type: "outside",
        fee: calculateFee("outside", parseInt(year)),
        paid: 0,
        settlement: false,
        notes: "",
      };
      currentMember.subscriptions[year] = newSubscription;
      convertRowToEditMode(row, year, newSubscription);
    } else if (btn.classList.contains("pay-edit-btn")) {
      // فتح وضع التعديل مباشرة
      await handleEditClick(year);
    } else if (btn.classList.contains("save-btn")) {
      const success = await saveRowChanges(row, year);
      if (success) {
        showNotification("✅ تم حفظ التعديلات بنجاح", "success");
      }
    } else if (btn.classList.contains("cancel-btn")) {
      cancelRowEdit(row, year);
    }
  });
};

async function saveRowChangesDirect(row, year) {
  if (!currentMember) return false;

  const subscription = currentMember.subscriptions[year];
  if (!subscription) return false;

  const newRemaining = Math.max(0, subscription.fee - subscription.paid);

  // تحديث قاعدة البيانات
  if (window.supabaseInitialized && window.supabaseDB) {
    try {
      const updateData = {
        subscription_type: subscription.type,
        amount_due: subscription.fee,
        amount_paid: subscription.paid,
        amount_remaining: newRemaining,
        status:
          subscription.type === "none"
            ? "none"
            : subscription.paid >= subscription.fee
            ? "paid"
            : subscription.paid > 0
            ? "partial"
            : "unpaid",
      };

      let result;
      if (subscription.id) {
        // تحديث اشتراك موجود
        result = await window.supabaseDB.updateSubscription(
          subscription.id,
          updateData
        );
      } else {
        // إنشاء اشتراك جديد
        updateData.member_id = currentMember.id;
        updateData.year = parseInt(year);
        updateData.created_at = new Date().toISOString();
        result = await window.supabaseDB.addSubscription(updateData);

        if (result && result.id) {
          subscription.id = result.id;
        }
      }

      // تحديث إحصائيات العضو
      await updateMemberStatistics(currentMember.id);

      // تحديث واجهة المستخدم
      updateSubscriptionRow(year);
      updateSummary(currentMember);

      showNotification("✅ تم حفظ السداد بنجاح", "success");
      return true;
    } catch (err) {
      console.error("خطأ في حفظ السداد:", err);
      debug("تفاصيل الخطأ: " + err.stack, true);
      showNotification(`❌ خطأ في الحفظ: ${err.message}`, "error");
      return false;
    }
  } else {
    // قاعدة البيانات غير متصلة
    updateSubscriptionRow(year);
    updateSummary(currentMember);
    showNotification(
      "⚠️ قاعدة البيانات غير متصلة. تم حفظ التغييرات محلياً فقط.",
      "warning"
    );
    return true;
  }
}
// ==================== مستمعي الأحداث ====================

searchBtn.addEventListener("click", () => {
  const phone = phoneInput.value.trim();

  if (!phone || !/^05\d{8}$/.test(phone)) {
    alert("يرجى إدخال رقم جوال صحيح (10 أرقام تبدأ بـ 05)");
    phoneInput.focus();
    return;
  }

  searchMember(phone);
});

phoneInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    searchBtn.click();
  }
});

tryAgainBtn.addEventListener("click", () => {
  noResult.style.display = "none";
  phoneInput.value = "";
  phoneInput.focus();
  if (settlementControlsContainer) {
    settlementControlsContainer.style.display = "none";
  }
});

// ==================== CSS إضافي ====================

const additionalStyles = `
<style>
/* عناصر التحكم في التسوية */
.switch {
    position: relative;
    display: inline-block;
    width: 60px;
    height: 34px;
}

.switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: .4s;
}

.slider:before {
    position: absolute;
    content: "";
    height: 26px;
    width: 26px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    transition: .4s;
}

input:checked + .slider {
    background-color: #2c5aa0;
}

input:checked + .slider:before {
    transform: translateX(26px);
}

.slider.round {
    border-radius: 34px;
}

.slider.round:before {
    border-radius: 50%;
}

/* بطاقات ملخص التسوية */
.settlement-summary-card {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
    text-align: center;
    border: 1px solid #ddd;
    transition: transform 0.3s;
}

.settlement-summary-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.settlement-value {
    font-size: 1.8rem;
    font-weight: 700;
    color: #2c5aa0;
    margin-bottom: 5px;
}

.settlement-label {
    font-size: 0.9rem;
    color: #666;
    font-weight: 600;
}

/* خلية التسوية في الجدول */
.settlement-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: center;
}

.settlement-toggle input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: #2c5aa0;
}

.settlement-toggle label {
    cursor: pointer;
    font-size: 0.9rem;
    color: #2c5aa0;
    font-weight: 600;
}

/* صفوف السنة المسوية */
.settled-row {
    background-color: #f0f9f0 !important;
    border-left: 4px solid #4CAF50 !important;
}

.settled-row td {
    background-color: transparent !important;
}

/* أزرار نظام التسوية */
#autoSettleBtn {
    background-color: #ff9800 !important;
    color: white !important;
    border: none !important;
}

#autoSettleBtn:hover {
    background-color: #f57c00 !important;
}

#applySettlementBtn {
    background-color: #2196F3 !important;
    color: white !important;
    border: none !important;
}

#applySettlementBtn:hover {
    background-color: #1976D2 !important;
}

#saveSettlementBtn {
    background-color: #4CAF50 !important;
    color: white !important;
    border: none !important;
}

#saveSettlementBtn:hover {
    background-color: #45a049 !important;
}

/* صفوف التحرير */
.editing-row {
    background-color: #fff8e1 !important;
    border: 2px solid #ffc107 !important;
}

.editing-row td {
    background-color: transparent !important;
}

/* رسائل التصحيح */
.debug-output {
    font-family: 'Courier New', monospace;
    background: #1e1e1e !important;
    color: #f8f8f8 !important;
    border: 1px solid #007acc !important;
    padding: 15px !important;
    margin: 15px 0 !important;
    border-radius: 5px;
    max-height: 300px;
    overflow-y: auto;
}

.debug-output strong {
    color: #569cd6;
}

.debug-output div {
    color: #ce9178;
    font-size: 0.9rem;
    line-height: 1.4;
}
</style>
`;
const buttonStyles = `
<style>
/* أزرار الإجراءات */
.add-btn {
    background-color: #2196F3 !important;
    color: white !important;
    border: none !important;
    padding: 6px 12px;
    font-size: 0.9rem;
}

.add-btn:hover {
    background-color: #1976D2 !important;
}

.edit-btn {
    background-color: #ff9800 !important;
    color: white !important;
    border: none !important;
    padding: 6px 12px;
    font-size: 0.9rem;
}

.edit-btn:hover {
    background-color: #f57c00 !important;
}

.pay-edit-btn {
    background-color: #4CAF50 !important;
    color: white !important;
    border: none !important;
    padding: 6px 12px;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 5px;
    justify-content: center;
}

.pay-edit-btn:hover {
    background-color: #45a049 !important;
}

.pay-edit-btn i {
    font-size: 0.9rem;
}

/* أزرار الحفظ والإلغاء */
.save-btn {
    background-color: #4CAF50 !important;
    color: white !important;
    border: none !important;
    padding: 4px 8px;
    font-size: 0.85rem;
}

.save-btn:hover {
    background-color: #45a049 !important;
}

.cancel-btn {
    background-color: #f44336 !important;
    color: white !important;
    border: none !important;
    padding: 4px 8px;
    font-size: 0.85rem;
}

.cancel-btn:hover {
    background-color: #d32f2f !important;
}

/* زر معطل */
.btn-disabled {
    background-color: #9e9e9e !important;
    color: white !important;
    border: none !important;
    cursor: not-allowed !important;
    opacity: 0.6;
}

/* تحسين عرض الأزرار في الجدول */
.action-cell {
    min-width: 120px;
}

/* تحسين عرض الأزرار على الهواتف */
@media (max-width: 768px) {
    .action-cell {
        min-width: 100px;
    }
    
    .add-btn, .edit-btn, .pay-edit-btn {
        padding: 4px 8px;
        font-size: 0.8rem;
    }
    
    .pay-edit-btn {
        flex-direction: column;
        gap: 2px;
    }
}
</style>
`;
// أضف هذا في نهاية الملف
const updatedButtonStyles = `
<style>
/* زر الإضافة */
.add-btn {
    background-color: #2196F3 !important;
    color: white !important;
    border: none !important;
    padding: 6px 12px;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 5px;
    justify-content: center;
}

.add-btn:hover {
    background-color: #1976D2 !important;
}

/* زر التعديل */
.pay-edit-btn {
    background-color: #4CAF50 !important;
    color: white !important;
    border: none !important;
    padding: 6px 12px;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 5px;
    justify-content: center;
}

.pay-edit-btn:hover {
    background-color: #45a049 !important;
}

/* زر التعديل للصف المسوي (يظهر عند التعديل) */
.pay-edit-btn.settled {
    background-color: #ff9800 !important;
}

.pay-edit-btn.settled:hover {
    background-color: #f57c00 !important;
}

/* أزرار الحفظ والإلغاء */
.save-btn {
    background-color: #4CAF50 !important;
    color: white !important;
    border: none !important;
    padding: 4px 8px;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 5px;
    justify-content: center;
}

.save-btn:hover {
    background-color: #45a049 !important;
}

.cancel-btn {
    background-color: #f44336 !important;
    color: white !important;
    border: none !important;
    padding: 4px 8px;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 5px;
    justify-content: center;
}

.cancel-btn:hover {
    background-color: #d32f2f !important;
}

/* ملاحظة التسوية */
.settlement-notice {
    background: #fff3cd !important;
    border: 1px solid #ffeaa7 !important;
    color: #856404 !important;
    padding: 8px !important;
    border-radius: 4px !important;
    font-size: 0.85rem !important;
}

.settlement-notice i {
    margin-left: 5px;
}

/* أزرار التحرير */
.edit-action-buttons {
    display: flex;
    gap: 8px;
    justify-content: center;
}

/* تحسين العرض على الهواتف */
@media (max-width: 768px) {
    .add-btn, .pay-edit-btn {
        padding: 4px 8px;
        font-size: 0.8rem;
        min-width: 70px;
    }
    
    .edit-action-buttons {
        flex-direction: column;
        gap: 5px;
    }
    
    .save-btn, .cancel-btn {
        width: 100%;
        justify-content: center;
    }
}

/* تلوين الصف المسوي */
.settled-row {
    background-color: #f0f9ff !important;
    border-left: 4px solid #2196F3 !important;
}

.settled-row:hover {
    background-color: #e1f5fe !important;
}

/* تنسيق الأعمدة أثناء التحرير */
.editing-row .edit-fee,
.editing-row .edit-paid,
.editing-row .edit-remaining {
    font-family: 'Cairo', sans-serif;
    font-size: 0.9rem;
    text-align: center;
}

.editing-row .edit-type {
    font-family: 'Cairo', sans-serif;
    font-size: 0.9rem;
}
</style>
`;

document.head.insertAdjacentHTML("beforeend", updatedButtonStyles);
document.head.insertAdjacentHTML("beforeend", buttonStyles);
document.head.insertAdjacentHTML("beforeend", additionalStyles);
