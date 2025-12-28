// البيانات الرئيسية للعضو
let memberData = {
    name: '',
    phone: '',
    membershipNumber: '',
    joinYear: '',
    subscriptions: {},
    notes: '',
    finalStatus: 'تمت التسوية',
    totalRemaining: 0,
    originalDebt: 0,
    savedAmount: 0,
    isSettlementEnabled: false
};

// متغيرات Supabase
let supabaseClient = null;
let supabaseInitialized = false;

// ==================== دوال تهيئة ====================

/**
 * تهيئة Supabase
 */
async function initializeSupabase() {
    try {
        // إظهار مؤشر التحميل
        document.getElementById('supabaseLoading').classList.add('show');
        
        // استخدام مكتبة Supabase إذا كانت متاحة
        if (typeof supabase === 'undefined') {
            throw new Error('مكتبة Supabase لم يتم تحميلها');
        }
        
        // استخدام الإعدادات من ملف التكوين
        const SUPABASE_URL = window.SUPABASE_CONFIG?.url || 'https://lapvweglftxkxrbmrodf.supabase.co';
        const SUPABASE_ANON_KEY = window.SUPABASE_CONFIG?.anonKey || 'sb_publishable_QAJmdHvArHh0xTJgVx2WTQ_r-PtYDrr';
        
        // إنشاء عميل Supabase
        supabaseClient = window.supabaseClient || supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // اختبار الاتصال
        const { error } = await supabaseClient.from('members').select('count', { count: 'exact', head: true });
        
        if (error) throw error;
        
        supabaseInitialized = true;
        console.log('✅ تم تهيئة Supabase بنجاح');
        
        // إخفاء مؤشر التحميل
        document.getElementById('supabaseLoading').classList.remove('show');
        
        return true;
        
    } catch (error) {
        console.error('❌ خطأ في تهيئة Supabase:', error);
        showMessage(`خطأ في الاتصال بقاعدة البيانات: ${error.message}`, 'error');
        
        // إخفاء مؤشر التحميل
        document.getElementById('supabaseLoading').classList.remove('show');
        
        return false;
    }
}

/**
 * تهيئة الصفحة عند التحميل
 */
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 بدء تهيئة صفحة إضافة العضو مع نظام التسوية...');
    
    // تعبئة سنوات الانضمام
    populateJoinYears();
    
    // إعداد مستمعي الأحداث
    setupEventListeners();
    
    // محاولة تهيئة Supabase
    await initializeSupabase();
    
    // تعبئة رقم العضوية التالي بعد تهيئة Supabase
    if (supabaseInitialized) {
        await prefillMembershipNumber();
    }
    
    console.log('✅ تم تهيئة الصفحة بنجاح');
});

/**
 * تعبئة سنوات الانضمام في القائمة المنسدلة
 */
function populateJoinYears() {
    const joinYearSelect = document.getElementById('joinYear');
    joinYearSelect.innerHTML = '<option value="">اختر سنة الانضمام</option>';
    
    for (let year = 2015; year <= 2026; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        joinYearSelect.appendChild(option);
    }
}

/**
 * توليد رقم عضوية متسلسل تلقائياً
 */
async function generateSequentialMembershipNumber() {
    try {
        if (!supabaseInitialized || !supabaseClient) {
            return "DSA-RI-0001"; // قيمة افتراضية إذا لم يكن Supabase مهيئاً
        }
        
        // استعلام لجلب آخر رقم عضوية من قاعدة البيانات
        const { data: members, error } = await supabaseClient
            .from('members')
            .select('membership_number')
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (error) {
            console.error('خطأ في جلب آخر رقم عضوية:', error);
            return "DSA-RI-0001"; // قيمة افتراضية في حالة الخطأ
        }
        
        let nextNumber = 1; // البدء من 1 إذا لم توجد بيانات
        
        if (members && members.length > 0 && members[0].membership_number) {
            const lastNumber = members[0].membership_number;
            
            // البحث عن الرقم التسلسلي في التنسيق DSA-RI-XXXX
            const match = lastNumber.match(/DSA-RI-(\d+)/);
            if (match && match[1]) {
                // زيادة الرقم بمقدار 1
                nextNumber = parseInt(match[1]) + 1;
            } else {
                // البحث عن أي أرقام في النص
                const numberMatch = lastNumber.match(/(\d+)/);
                if (numberMatch && numberMatch[1]) {
                    nextNumber = parseInt(numberMatch[1]) + 1;
                }
            }
        }
        
        // تنسيق الرقم إلى 4 أرقام
        const formatted = `DSA-RI-${String(nextNumber).padStart(4, '0')}`;
        return formatted;
        
    } catch (error) {
        console.error('خطأ في توليد رقم عضوية متسلسل:', error);
        return "DSA-RI-0001"; // قيمة افتراضية في حالة الخطأ
    }
}

/**
 * تعبئة رقم العضوية التالي تلقائياً
 */
async function prefillMembershipNumber() {
    try {
        // توليد الرقم المتسلسل التالي
        const nextMembershipNumber = await generateSequentialMembershipNumber();
        const membershipInput = document.getElementById('membershipNumber');
        
        if (membershipInput) {
            membershipInput.value = nextMembershipNumber;
            membershipInput.readOnly = true; // جعله للقراءة فقط
            membershipInput.style.backgroundColor = '#f8f9fa';
            membershipInput.style.fontWeight = 'bold';
            
            // إضافة مؤشر أن الرقم تم توليده تلقائياً
            const formGroup = membershipInput.closest('.form-group');
            if (formGroup) {
                // إزالة أي ملاحظات سابقة
                const existingNote = formGroup.querySelector('.generated-note');
                if (existingNote) existingNote.remove();
                
                // إضافة ملاحظة جديدة
                const note = document.createElement('div');
                note.className = 'form-note generated-note';
                note.style.color = '#2c5aa0';
                note.style.fontWeight = '600';
                note.innerHTML = `<i class="fas fa-cogs"></i> تم توليد رقم العضوية تلقائياً من قاعدة البيانات`;
                formGroup.appendChild(note);
            }
        }
        
        memberData.membershipNumber = nextMembershipNumber;
        console.log('📝 رقم العضوية التالي:', nextMembershipNumber);
        
    } catch (error) {
        console.error('خطأ في تعبئة رقم العضوية:', error);
        
        // استخدام قيمة افتراضية في حالة الخطأ
        const membershipInput = document.getElementById('membershipNumber');
        if (membershipInput) {
            membershipInput.value = "DSA-RI-0001";
            memberData.membershipNumber = "DSA-RI-0001";
        }
    }
}

// ==================== دوال الجدول ====================

/**
 * توليد جدول السنوات
 */
function generateYearsTable() {
    const joinYear = parseInt(document.getElementById('joinYear').value);
    
    if (!joinYear) {
        showMessage('يرجى اختيار سنة الانضمام أولاً', 'error');
        return;
    }
    
    // التحقق من صحة البيانات الأساسية
    if (!validateBasicInfo()) return;
    
    // التحقق من رقم العضوية
    const membershipNumber = document.getElementById('membershipNumber').value.trim();
    if (!membershipNumber) {
        showMessage('يرجى إدخال رقم العضوية أولاً', 'error');
        return;
    }
    
    // إعادة تعيين البيانات
    memberData.subscriptions = {};
    
    const yearsBody = document.getElementById('yearsBody');
    const yearsFooter = document.getElementById('yearsFooter');
    const currentYear = new Date().getFullYear();
    
    yearsBody.innerHTML = '';
    
    for (let year = joinYear; year <= 2026; year++) {
        const isFutureYear = year > currentYear;
        const isCurrentYear = year === currentYear;
        const defaultType = 'outside';
        const defaultDue = calculateDueAmount(defaultType, year);
        let defaultPaid = 0;
        let defaultStatus = 'unpaid';
        
        // تحديد المدفوع الافتراضي
        if (year === 2026) {
            defaultPaid = 0;
            defaultStatus = 'unpaid';
        } else if (year < currentYear) {
            defaultPaid = defaultDue;
            defaultStatus = 'paid';
        } else if (isCurrentYear) {
            defaultPaid = 0;
            defaultStatus = 'unpaid';
        }
        
        // إنشاء صف السنة
        const row = document.createElement('tr');
        row.className = 'year-row';
        row.dataset.year = year;
        
        row.innerHTML = `
            <td class="year-cell">${year}${year === 2026 ? ' (يمكن الدفع)' : ''}</td>
            <td>
                <select class="type-select subscription-type" data-year="${year}">
                    <option value="none">غير مشترك</option>
                    <option value="outside" selected>خارج الدار</option>
                    <option value="inside">داخل الدار</option>
                </select>
            </td>
            <td>
                <input type="number" class="payment-input due-amount" data-year="${year}" 
                       value="${defaultDue}" readonly style="background-color: #f8f9fa;">
            </td>
            <td>
                <input type="number" class="payment-input paid-amount" data-year="${year}" 
                       value="${defaultPaid}" min="0" step="50" placeholder="0">
            </td>
            <td>
                <input type="number" class="payment-input remaining-amount" data-year="${year}" 
                       value="${defaultDue - defaultPaid}" readonly style="background-color: #f8f9fa;">
            </td>
            <td>
                <span class="status-badge ${getStatusClass(defaultStatus, defaultPaid, defaultDue)}" 
                      id="status-${year}">
                    ${getStatusText(defaultStatus, defaultPaid, defaultDue)}
                </span>
            </td>
            <td class="settlement-cell">
                <div class="settlement-toggle">
                    <input type="checkbox" class="settlement-checkbox" data-year="${year}" 
                           id="settlement-${year}" disabled>
                    <label for="settlement-${year}">تمت التسوية</label>
                </div>
            </td>
            <td>
                <input type="text" class="notes-input year-notes" data-year="${year}" 
                       placeholder="ملاحظات السنة...">
            </td>
        `;
        
        yearsBody.appendChild(row);
        
        // حفظ البيانات
        memberData.subscriptions[year] = {
            type: defaultType,
            due: defaultDue,
            paid: defaultPaid,
            remaining: defaultDue - defaultPaid,
            originalRemaining: defaultDue - defaultPaid,
            status: defaultStatus,
            notes: '',
            isFutureYear: isFutureYear,
            settlement: false
        };
    }
    
    // تذييل الجدول
    yearsFooter.innerHTML = `
        <tr class="calculated-row">
            <td colspan="2" style="text-align: left;"><strong>المجاميع:</strong></td>
            <td class="calculated-value" id="totalDue">0</td>
            <td class="calculated-value" id="totalPaid">0</td>
            <td class="calculated-value" id="totalRemainingTable">0</td>
            <td colspan="3"></td>
        </tr>
        <tr class="calculated-row" id="settlementRow" style="display: none;">
            <td colspan="2" style="text-align: left;"><strong>بعد التسوية:</strong></td>
            <td></td>
            <td></td>
            <td class="calculated-value settlement-color" id="totalAfterSettlement">0</td>
            <td colspan="3" class="settlement-color">
                <span class="settlement-badge" id="settlementSaved">تم توفير 0 ريال</span>
            </td>
        </tr>
    `;
    
    // إظهار الأقسام
    document.getElementById('subscriptionsSection').style.display = 'block';
    document.getElementById('summarySection').style.display = 'block';
    document.getElementById('settlementSection').style.display = 'block';
    
    // إضافة الأحداث
    addYearInputEvents();
    
    // حساب الإحصائيات
    calculateStatistics();
    
    showMessage(`تم إنشاء جدول الاشتراكات للسنوات من ${joinYear} إلى 2026`, 'success');
}

/**
 * التحقق من رقم العضوية قبل الحفظ
 */
async function checkMembershipNumberUnique(membershipNumber) {
    try {
        if (!supabaseInitialized || !supabaseClient) return true; // إذا لم يكن Supabase مهيئاً، نعتبر الرقم فريداً
        
        const { data: existingMembers, error } = await supabaseClient
            .from('members')
            .select('id, membership_number')
            .eq('membership_number', membershipNumber);
        
        if (error) {
            console.error('خطأ في التحقق من رقم العضوية:', error);
            return true; // في حالة الخطأ، نعتبر الرقم فريداً
        }
        
        return existingMembers.length === 0; // إذا كان الطول = 0 فالرقم فريد
        
    } catch (error) {
        console.error('خطأ في التحقق من رقم العضوية:', error);
        return true;
    }
}

/**
 * إضافة أحداث لحقول الجدول
 */
function addYearInputEvents() {
    // حدث تغيير نوع الاشتراك
    document.querySelectorAll('.subscription-type').forEach(select => {
        select.addEventListener('change', function() {
            const year = parseInt(this.dataset.year);
            const type = this.value;
            const dueInput = document.querySelector(`.due-amount[data-year="${year}"]`);
            const settlementCheckbox = document.querySelector(`.settlement-checkbox[data-year="${year}"]`);
            
            // تحديث المبلغ المستحق
            const newDue = calculateDueAmount(type, year);
            dueInput.value = newDue;
            
            // تحديث حالة خيار التسوية
            if (type === 'inside') {
                settlementCheckbox.disabled = false;
                if (memberData.isSettlementEnabled) {
                    settlementCheckbox.checked = true;
                }
            } else {
                settlementCheckbox.disabled = true;
                settlementCheckbox.checked = false;
            }
            
            // تحديث المبلغ المتبقي
            updateRemainingAmount(year);
            
            // تحديث البيانات
            updateYearData(year);
            
            // تحديث الإحصائيات
            calculateStatistics();
        });
    });
    
    // حدث تغيير المبلغ المدفوع
    document.querySelectorAll('.paid-amount').forEach(input => {
        input.addEventListener('input', function() {
            const year = parseInt(this.dataset.year);
            updateRemainingAmount(year);
            updateYearData(year);
            calculateStatistics();
        });
    });
    
    // حدث تغيير حالة التسوية
    document.querySelectorAll('.settlement-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const year = parseInt(this.dataset.year);
            updateYearData(year);
            calculateStatistics();
        });
    });
    
    // حدث تغيير الملاحظات
    document.querySelectorAll('.year-notes').forEach(input => {
        input.addEventListener('input', function() {
            const year = parseInt(this.dataset.year);
            if (memberData.subscriptions[year]) {
                memberData.subscriptions[year].notes = this.value;
            }
        });
    });
}

/**
 * تحديث المبلغ المتبقي للسنة
 */
function updateRemainingAmount(year) {
    const dueInput = document.querySelector(`.due-amount[data-year="${year}"]`);
    const paidInput = document.querySelector(`.paid-amount[data-year="${year}"]`);
    const remainingInput = document.querySelector(`.remaining-amount[data-year="${year}"]`);
    
    const due = parseFloat(dueInput.value) || 0;
    const paid = parseFloat(paidInput.value) || 0;
    const remaining = Math.max(0, due - paid);
    
    remainingInput.value = remaining;
    
    // تحديث الحالة
    updateYearStatus(year, due, paid, remaining);
}

/**
 * تحديث حالة السنة
 */
function updateYearStatus(year, due, paid, remaining) {
    const statusBadge = document.getElementById(`status-${year}`);
    const settlementCheckbox = document.querySelector(`.settlement-checkbox[data-year="${year}"]`);
    const isSettled = settlementCheckbox?.checked || false;
    
    if (due === 0) {
        statusBadge.className = 'status-badge status-none';
        statusBadge.textContent = 'غير مشترك';
        memberData.subscriptions[year].status = 'none';
    } else if (isSettled) {
        statusBadge.className = 'status-badge status-paid';
        statusBadge.textContent = 'تمت التسوية';
        memberData.subscriptions[year].status = 'settled';
    } else if (paid === 0) {
        statusBadge.className = 'status-badge status-unpaid';
        statusBadge.textContent = 'غير مسدد';
        memberData.subscriptions[year].status = 'unpaid';
    } else if (paid >= due) {
        statusBadge.className = 'status-badge status-paid';
        statusBadge.textContent = 'مسدد';
        memberData.subscriptions[year].status = 'paid';
    } else {
        const percentage = Math.round((paid / due) * 100);
        statusBadge.className = 'status-badge status-partial';
        statusBadge.textContent = `مسدد ${percentage}%`;
        memberData.subscriptions[year].status = 'partial';
    }
}

/**
 * تحديث بيانات السنة
 */
function updateYearData(year) {
    const typeSelect = document.querySelector(`.subscription-type[data-year="${year}"]`);
    const dueInput = document.querySelector(`.due-amount[data-year="${year}"]`);
    const paidInput = document.querySelector(`.paid-amount[data-year="${year}"]`);
    const remainingInput = document.querySelector(`.remaining-amount[data-year="${year}"]`);
    const settlementCheckbox = document.querySelector(`.settlement-checkbox[data-year="${year}"]`);
    const notesInput = document.querySelector(`.year-notes[data-year="${year}"]`);
    
    if (!memberData.subscriptions[year]) return;
    
    const type = typeSelect.value;
    const due = parseFloat(dueInput.value) || 0;
    const paid = parseFloat(paidInput.value) || 0;
    const remaining = parseFloat(remainingInput.value) || 0;
    const settlement = settlementCheckbox?.checked || false;
    const notes = notesInput?.value || '';
    
    memberData.subscriptions[year] = {
        type: type,
        due: due,
        paid: paid,
        remaining: remaining,
        originalRemaining: remaining,
        status: memberData.subscriptions[year].status || 'unpaid',
        notes: notes,
        isFutureYear: memberData.subscriptions[year].isFutureYear || false,
        settlement: settlement
    };
}

// ==================== دوال المساعدة ====================

/**
 * حساب المبلغ المستحق
 */
function calculateDueAmount(type, year) {
    switch(type) {
        case 'none': return 0;
        case 'outside': return year <= 2025 ? 200 : 300;
        case 'inside': return 1500;
        default: return 0;
    }
}

/**
 * الحصول على نص الحالة
 */
function getStatusText(status, paid, due) {
    if (due === 0) return 'غير مشترك';
    
    switch(status) {
        case 'paid': return 'مسدد';
        case 'partial':
            const percentage = Math.round((paid / due) * 100);
            return `مسدد ${percentage}%`;
        case 'unpaid': return 'غير مسدد';
        case 'settled': return 'تمت التسوية';
        case 'none': return 'غير مشترك';
        default: return 'غير محدد';
    }
}

/**
 * الحصول على فئة الحالة
 */
function getStatusClass(status, paid, due) {
    if (due === 0) return 'status-none';
    
    switch(status) {
        case 'paid':
        case 'settled': return 'status-paid';
        case 'partial': return 'status-partial';
        case 'unpaid': return 'status-unpaid';
        case 'none': return 'status-none';
        default: return 'status-unpaid';
    }
}

/**
 * إظهار رسالة
 */
function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.innerHTML = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    messageDiv.style.opacity = '1';
    
    // إخفاء الرسالة بعد 5 ثواني
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 300);
    }, 5000);
}

// ==================== دوال التسوية ====================

/**
 * تفعيل/تعطيل نظام التسوية
 */
function toggleGlobalSettlement() {
    const isEnabled = document.getElementById('globalSettlementToggle').checked;
    memberData.isSettlementEnabled = isEnabled;
    
    // تطبيق على جميع السنوات داخل الدار
    for (const year in memberData.subscriptions) {
        const sub = memberData.subscriptions[year];
        if (sub.type === 'inside') {
            const settlementCheckbox = document.querySelector(`.settlement-checkbox[data-year="${year}"]`);
            if (settlementCheckbox) {
                settlementCheckbox.checked = isEnabled;
                updateYearData(year);
            }
        }
    }
    
    calculateStatistics();
    showMessage(isEnabled ? 'تم تفعيل نظام التسوية' : 'تم تعطيل نظام التسوية', 'info');
}

/**
 * تسوية تلقائية
 */
function autoSettle() {
    const currentYear = new Date().getFullYear();
    let settledCount = 0;
    
    for (const year in memberData.subscriptions) {
        const sub = memberData.subscriptions[year];
        if (sub.type === 'inside' && parseInt(year) <= currentYear && sub.paid > 0 && sub.paid < sub.due) {
            const settlementCheckbox = document.querySelector(`.settlement-checkbox[data-year="${year}"]`);
            if (settlementCheckbox && !settlementCheckbox.checked) {
                settlementCheckbox.checked = true;
                settledCount++;
            }
        }
    }
    
    if (settledCount > 0) {
        calculateStatistics();
        showMessage(`تم تطبيق التسوية على ${settledCount} سنة`, 'success');
    } else {
        showMessage('لا توجد سنوات مؤهلة للتسوية التلقائية', 'info');
    }
}

// ==================== دوال الإحصائيات ====================

/**
 * حساب الإحصائيات
 */
function calculateStatistics() {
    let totalDue = 0;
    let totalPaid = 0;
    let totalRemainingOriginal = 0;
    let totalRemainingAfterSettlement = 0;
    let yearsCount = 0;
    let paidYears = 0;
    let partialYears = 0;
    let unpaidYears = 0;
    let settledYears = 0;
    let insideYears = 0;
    let outsideYears = 0;
    let noneYears = 0;
    let totalSavedBySettlement = 0;
    
    for (const year in memberData.subscriptions) {
        const sub = memberData.subscriptions[year];
        
        if (sub.type !== 'none') {
            yearsCount++;
            totalDue += sub.due;
            totalPaid += sub.paid;
            totalRemainingOriginal += sub.originalRemaining;
            
            if (sub.settlement && sub.type === 'inside') {
                totalRemainingAfterSettlement += 0;
                totalSavedBySettlement += sub.originalRemaining;
                settledYears++;
            } else {
                totalRemainingAfterSettlement += sub.originalRemaining;
            }
            
            if (sub.type === 'inside') insideYears++;
            if (sub.type === 'outside') outsideYears++;
            
            if (sub.status === 'paid' || sub.status === 'settled') paidYears++;
            else if (sub.status === 'partial') partialYears++;
            else if (sub.status === 'unpaid') unpaidYears++;
        } else {
            noneYears++;
        }
    }
    
    // تحديث الجدول
    document.getElementById('totalDue').textContent = totalDue.toLocaleString();
    document.getElementById('totalPaid').textContent = totalPaid.toLocaleString();
    document.getElementById('totalRemainingTable').textContent = totalRemainingOriginal.toLocaleString();
    
    // تحديث صف التسوية
    const settlementRow = document.getElementById('settlementRow');
    if (settledYears > 0) {
        settlementRow.style.display = 'table-row';
        document.getElementById('totalAfterSettlement').textContent = totalRemainingAfterSettlement.toLocaleString();
        document.getElementById('settlementSaved').textContent = `تم توفير ${totalSavedBySettlement.toLocaleString()} ريال`;
        document.getElementById('settlementDetails').style.display = 'block';
    } else {
        settlementRow.style.display = 'none';
        document.getElementById('settlementDetails').style.display = 'none';
    }
    
    // تحديث إحصائيات التسوية
    document.getElementById('settledYearsCount').textContent = settledYears;
    document.getElementById('settledAmount').textContent = totalSavedBySettlement.toLocaleString() + ' ريال';
    document.getElementById('savedFromDebt').textContent = totalSavedBySettlement.toLocaleString() + ' ريال';
    
    // تحديث الحقول
    document.getElementById('totalRemaining').value = totalRemainingAfterSettlement;
    document.getElementById('originalDebt').value = totalRemainingOriginal;
    document.getElementById('savedAmount').value = totalSavedBySettlement;
    
    // تحديث بطاقات الملخص
    updateSummaryCards(yearsCount, paidYears, partialYears, unpaidYears, settledYears,
                      totalDue, totalPaid, totalRemainingOriginal, totalRemainingAfterSettlement,
                      insideYears, outsideYears, totalSavedBySettlement);
    
    // تحديث الحالة النهائية
    updateFinalStatus(totalRemainingAfterSettlement, unpaidYears, partialYears, settledYears);
}

/**
 * تحديث بطاقات الملخص
 */
function updateSummaryCards(yearsCount, paidYears, partialYears, unpaidYears, settledYears,
                           totalDue, totalPaid, totalRemainingOriginal, totalRemainingAfterSettlement,
                           insideYears, outsideYears, totalSavedBySettlement) {
    // بطاقات الملخص الرئيسي
    document.getElementById('summaryCards').innerHTML = `
        <div class="summary-card">
            <div class="summary-value">${yearsCount}</div>
            <div class="summary-label">سنوات مشتركة</div>
        </div>
        
        <div class="summary-card paid">
            <div class="summary-value">${paidYears}</div>
            <div class="summary-label">سنوات مسددة</div>
        </div>
        
        <div class="summary-card partial">
            <div class="summary-value">${partialYears}</div>
            <div class="summary-label">سنوات جزئية</div>
        </div>
        
        <div class="summary-card unpaid">
            <div class="summary-value">${unpaidYears}</div>
            <div class="summary-label">سنوات غير مسددة</div>
        </div>
        
        <div class="summary-card settled">
            <div class="summary-value">${settledYears}</div>
            <div class="summary-label">سنوات تمت تسويتها</div>
        </div>
    `;
    
    // بطاقات التسوية
    document.getElementById('settlementSummaryCards').innerHTML = `
        <div class="summary-card">
            <div class="summary-value">${insideYears}</div>
            <div class="summary-label">داخل الدار</div>
        </div>
        
        <div class="summary-card">
            <div class="summary-value">${outsideYears}</div>
            <div class="summary-label">خارج الدار</div>
        </div>
        
        <div class="summary-card">
            <div class="summary-value">${totalDue.toLocaleString()}</div>
            <div class="summary-label">إجمالي المستحق</div>
        </div>
        
        <div class="summary-card paid">
            <div class="summary-value">${totalPaid.toLocaleString()}</div>
            <div class="summary-label">إجمالي المدفوع</div>
        </div>
        
        <div class="summary-card unpaid">
            <div class="summary-value">${totalRemainingOriginal.toLocaleString()}</div>
            <div class="summary-label">المتأخرات الأصلية</div>
        </div>
        
        <div class="summary-card settled">
            <div class="summary-value">${totalSavedBySettlement.toLocaleString()}</div>
            <div class="summary-label">المستقطع بالتسوية</div>
        </div>
        
        <div class="summary-card paid">
            <div class="summary-value">${totalRemainingAfterSettlement.toLocaleString()}</div>
            <div class="summary-label">المتأخرات النهائية</div>
        </div>
    `;
}

/**
 * تحديث الحالة النهائية
 */
function updateFinalStatus(totalRemaining, unpaidYears, partialYears, settledYears) {
    const finalStatus = document.getElementById('finalStatus');
    
    if (settledYears > 0) {
        finalStatus.value = 'تمت التسوية';
    } else if (totalRemaining === 0) {
        finalStatus.value = 'مسدد';
    } else if (partialYears > 0 || (totalRemaining > 0 && unpaidYears > 0)) {
        finalStatus.value = 'مسدد جزئياً';
    } else if (unpaidYears > 0) {
        finalStatus.value = 'متأخر';
    } else {
        finalStatus.value = 'غير مسدد';
    }
    
    memberData.finalStatus = finalStatus.value;
}

// ==================== دوال الأمثلة والمسح ====================

/**
 * تعبئة بمثال مع التسوية
 */
function fillSettlementExample() {
    const joinYear = parseInt(document.getElementById('joinYear').value);
    if (!joinYear) {
        showMessage('يرجى توليد جدول السنوات أولاً', 'error');
        return;
    }
    
    // تفعيل التسوية
    document.getElementById('globalSettlementToggle').checked = true;
    memberData.isSettlementEnabled = true;
    
    // تعبئة البيانات
    document.getElementById('memberName').value = 'عبد الله الزبير محمد';
    document.getElementById('memberPhone').value = '0502191635';
    
    // تعبئة بعض السنوات كمثال
    const currentYear = new Date().getFullYear();
    
    for (let year = joinYear; year <= currentYear && year <= 2026; year++) {
        if (year === joinYear) {
            setYearData(year, 'outside', 200, 'انضمام - خارج الدار', false);
        } else if (year === joinYear + 1) {
            setYearData(year, 'inside', 1000, 'داخل الدار - تمت التسوية', true);
        } else if (year === joinYear + 2) {
            setYearData(year, 'inside', 1500, 'داخل الدار - مسدد بالكامل', false);
        } else if (year === joinYear + 3) {
            setYearData(year, 'outside', 200, 'خارج الدار - مسدد بالكامل', false);
        } else {
            setYearData(year, 'outside', 0, 'غير مسدد', false);
        }
    }
    
    // ملاحظات
    document.getElementById('notes').value = `عضو لديه اتفاقية تسوية. انضم سنة ${joinYear}. تمت تسوية بعض السنوات بناءً على اتفاق مع الإدارة.`;
    
    showMessage('تم تعبئة البيانات بمثال يحتوي على سنوات تمت تسويتها', 'success');
    calculateStatistics();
}

/**
 * تعيين بيانات سنة معينة
 */
function setYearData(year, type, paid, notes = '', settlement = false) {
    const typeSelect = document.querySelector(`.subscription-type[data-year="${year}"]`);
    const paidInput = document.querySelector(`.paid-amount[data-year="${year}"]`);
    const notesInput = document.querySelector(`.year-notes[data-year="${year}"]`);
    const settlementCheckbox = document.querySelector(`.settlement-checkbox[data-year="${year}"]`);
    
    if (typeSelect && paidInput) {
        typeSelect.value = type;
        
        const due = calculateDueAmount(type, year);
        const dueInput = document.querySelector(`.due-amount[data-year="${year}"]`);
        dueInput.value = due;
        
        paidInput.value = paid;
        
        const remaining = Math.max(0, due - paid);
        const remainingInput = document.querySelector(`.remaining-amount[data-year="${year}"]`);
        remainingInput.value = remaining;
        
        if (settlementCheckbox) {
            if (type === 'inside') {
                settlementCheckbox.disabled = false;
                settlementCheckbox.checked = settlement;
            } else {
                settlementCheckbox.disabled = true;
                settlementCheckbox.checked = false;
            }
        }
        
        if (notesInput) {
            notesInput.value = notes;
        }
        
        // تحديث البيانات
        if (memberData.subscriptions[year]) {
            memberData.subscriptions[year].type = type;
            memberData.subscriptions[year].due = due;
            memberData.subscriptions[year].paid = paid;
            memberData.subscriptions[year].remaining = remaining;
            memberData.subscriptions[year].originalRemaining = remaining;
            memberData.subscriptions[year].notes = notes;
            memberData.subscriptions[year].settlement = settlement;
        }
        
        // تحديث الحالة
        updateYearStatus(year, due, paid, remaining);
    }
}

/**
 * مسح بيانات الجدول
 */
function clearTableData() {
    if (!confirm('هل أنت متأكد من مسح جميع بيانات جدول السنوات؟')) return;
    
    for (const year in memberData.subscriptions) {
        const typeSelect = document.querySelector(`.subscription-type[data-year="${year}"]`);
        const paidInput = document.querySelector(`.paid-amount[data-year="${year}"]`);
        const settlementCheckbox = document.querySelector(`.settlement-checkbox[data-year="${year}"]`);
        const notesInput = document.querySelector(`.year-notes[data-year="${year}"]`);
        
        if (typeSelect && paidInput) {
            typeSelect.value = 'outside';
            paidInput.value = 0;
            
            if (settlementCheckbox) {
                settlementCheckbox.disabled = true;
                settlementCheckbox.checked = false;
            }
            
            if (notesInput) {
                notesInput.value = '';
            }
        }
    }
    
    // إعادة تعيين نظام التسوية
    document.getElementById('globalSettlementToggle').checked = false;
    memberData.isSettlementEnabled = false;
    
    calculateStatistics();
    showMessage('تم مسح جميع بيانات جدول السنوات', 'info');
}

// ==================== دوال التحقق والحفظ ====================

/**
 * التحقق من البيانات الأساسية
 */
function validateBasicInfo() {
    const name = document.getElementById('memberName').value.trim();
    const phone = document.getElementById('memberPhone').value.trim();
    
    if (!name) {
        showMessage('يرجى إدخال اسم العضو', 'error');
        return false;
    }
    
    if (!phone || !/^05\d{8}$/.test(phone)) {
        showMessage('يرجى إدخال رقم جوال صحيح (10 أرقام تبدأ بـ 05)', 'error');
        return false;
    }
    
    return true;
}

/**
 * التحقق من صحة النموذج الكامل
 */
async function validateForm() {
    if (!validateBasicInfo()) return false;
    
    const membershipNumber = document.getElementById('membershipNumber').value.trim();
    const joinYear = document.getElementById('joinYear').value;
    
    if (!membershipNumber) {
        showMessage('يرجى إدخال رقم العضوية', 'error');
        return false;
    }
    
    if (!joinYear) {
        showMessage('يرجى اختيار سنة الانضمام', 'error');
        return false;
    }
    
    if (Object.keys(memberData.subscriptions).length === 0) {
        showMessage('يرجى توليد جدول الاشتراكات أولاً', 'error');
        return false;
    }
    
    // التحقق من تكرار رقم العضوية (رغم أنه يتم توليده تلقائياً، لكن للتحقق الإضافي)
    const isUnique = await checkMembershipNumberUnique(membershipNumber);
    if (!isUnique) {
        // إذا كان الرقم مكرراً، نولد رقماً جديداً تلقائياً
        const newMembershipNumber = await generateSequentialMembershipNumber();
        document.getElementById('membershipNumber').value = newMembershipNumber;
        memberData.membershipNumber = newMembershipNumber;
        showMessage('تم اكتشاف تكرار رقم العضوية. تم توليد رقم جديد تلقائياً: ' + newMembershipNumber, 'warning');
    }
    
    return true;
}

/**
 * جمع بيانات النموذج
 */
function collectFormData() {
    const data = {
        name: document.getElementById('memberName').value.trim(),
        phone: document.getElementById('memberPhone').value.trim(),
        membershipNumber: document.getElementById('membershipNumber').value.trim(),
        joinYear: parseInt(document.getElementById('joinYear').value),
        finalStatus: document.getElementById('finalStatus').value,
        totalRemaining: parseFloat(document.getElementById('totalRemaining').value) || 0,
        originalDebt: parseFloat(document.getElementById('originalDebt').value) || 0,
        savedAmount: parseFloat(document.getElementById('savedAmount').value) || 0,
        isSettlementEnabled: memberData.isSettlementEnabled,
        notes: document.getElementById('notes').value.trim(),
        subscriptions: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // نسخ بيانات الاشتراكات
    for (const year in memberData.subscriptions) {
        data.subscriptions[year] = { ...memberData.subscriptions[year] };
    }
    
    return data;
}

/**
 * معاينة البيانات
 */
async function previewData() {
    const isValid = await validateForm();
    if (!isValid) return;
    
    const data = collectFormData();
    
    let previewHTML = `
        <h3><i class="fas fa-eye"></i> معاينة بيانات العضو مع نظام التسوية</h3>
        <div style="margin: 20px 0;">
            <p><strong>اسم العضو:</strong> ${data.name}</p>
            <p><strong>رقم الجوال:</strong> ${data.phone}</p>
            <p><strong>رقم العضوية:</strong> ${data.membershipNumber}</p>
            <p><strong>سنة الانضمام:</strong> ${data.joinYear}</p>
            <p><strong>الحالة النهائية:</strong> ${data.finalStatus}</p>
            <p><strong>نظام التسوية:</strong> ${data.isSettlementEnabled ? 'مفعل' : 'غير مفعل'}</p>
            <p><strong>المتأخرات النهائية:</strong> ${data.totalRemaining.toLocaleString()} ريال</p>
            <p><strong>المتأخرات الأصلية:</strong> ${data.originalDebt.toLocaleString()} ريال</p>
            <p><strong>المستقطع بالتسوية:</strong> ${data.savedAmount.toLocaleString()} ريال</p>
        </div>
        <p><em>انقر على "حفظ العضو" لإضافة البيانات إلى النظام</em></p>
    `;
    
    showMessage(previewHTML, 'info');
}

/**
 * حفظ البيانات في Supabase
 */
async function saveData() {
    // التحقق من صحة النموذج مع التحقق من رقم العضوية
    const isValid = await validateForm();
    if (!isValid) return;
    
    if (!supabaseInitialized || !supabaseClient) {
        const initialized = await initializeSupabase();
        if (!initialized) {
            showMessage('❌ قاعدة البيانات غير مهيأة. لا يمكن حفظ البيانات.', 'error');
            return;
        }
    }
    
    // إظهار مؤشر التحميل
    const loading = document.getElementById('loading');
    const saveBtn = document.getElementById('saveBtn');
    loading.style.display = 'block';
    saveBtn.disabled = true;
    
    try {
        const formData = collectFormData();
        const phoneToCheck = formData.phone;
        const membershipNumberToCheck = formData.membershipNumber;
        
        // التحقق من عدم تكرار رقم الجوال
        const { data: existingMembers, error: checkError } = await supabaseClient
            .from('members')
            .select('id')
            .eq('phone', phoneToCheck);
        
        if (checkError) throw checkError;
        
        if (existingMembers && existingMembers.length > 0) {
            showMessage('⚠️ رقم الجوال موجود بالفعل في النظام. لا يمكن إضافة رقم مكرر.', 'warning');
            loading.style.display = 'none';
            saveBtn.disabled = false;
            return;
        }
        
        // التحقق النهائي من رقم العضوية
        const isMembershipUnique = await checkMembershipNumberUnique(membershipNumberToCheck);
        if (!isMembershipUnique) {
            // إذا كان الرقم مكرراً، نولد رقماً جديداً تلقائياً
            const newMembershipNumber = await generateSequentialMembershipNumber();
            document.getElementById('membershipNumber').value = newMembershipNumber;
            memberData.membershipNumber = newMembershipNumber;
            
            showMessage('تم اكتشاف تكرار رقم العضوية. تم توليد رقم جديد تلقائياً: ' + newMembershipNumber + '. يرجى المحاولة مرة أخرى.', 'warning');
            loading.style.display = 'none';
            saveBtn.disabled = false;
            return;
        }
        
        // إنشاء العضو
        const memberToSave = {
            name: formData.name,
            phone: phoneToCheck,
            membership_number: membershipNumberToCheck,
            join_year: formData.joinYear,
            final_status: formData.finalStatus,
            total_remaining: formData.totalRemaining,
            original_debt: formData.originalDebt,
            saved_amount: formData.savedAmount,
            is_settlement_enabled: formData.isSettlementEnabled,
            notes: formData.notes,
            created_at: formData.createdAt,
            updated_at: formData.updatedAt
        };
        
        const { data: newMember, error: memberError } = await supabaseClient
            .from('members')
            .insert([memberToSave])
            .select()
            .single();
        
        if (memberError) {
            // معالجة خطأ المفتاح الفريد المكرر
            if (memberError.code === '23505') {
                if (memberError.message.includes('members_membership_number_key')) {
                    // إذا كان رقم العضوية مكرراً، نولد رقماً جديداً
                    const newMembershipNumber = await generateSequentialMembershipNumber();
                    document.getElementById('membershipNumber').value = newMembershipNumber;
                    memberData.membershipNumber = newMembershipNumber;
                    
                    showMessage('❌ رقم العضوية موجود بالفعل. تم توليد رقم جديد تلقائياً. يرجى المحاولة مرة أخرى.', 'error');
                    loading.style.display = 'none';
                    saveBtn.disabled = false;
                    return;
                } else if (memberError.message.includes('members_phone_key')) {
                    showMessage('❌ رقم الجوال موجود بالفعل في النظام.', 'error');
                    loading.style.display = 'none';
                    saveBtn.disabled = false;
                    return;
                }
            }
            throw memberError;
        }
        
        // إدخال الاشتراكات
        const subscriptionsToInsert = [];
        for (const year in formData.subscriptions) {
            const sub = formData.subscriptions[year];
            const subscriptionData = {
                member_id: newMember.id,
                year: parseInt(year),
                subscription_type: sub.type,
                amount_due: sub.due,
                amount_paid: sub.paid,
                amount_remaining: sub.remaining,
                status: sub.status,
                settlement: sub.settlement || false,
                notes: sub.notes || '',
                is_future_year: sub.isFutureYear || false
            };
            
            subscriptionsToInsert.push(subscriptionData);
        }
        
        if (subscriptionsToInsert.length > 0) {
            const { error: subscriptionsError } = await supabaseClient
                .from('subscriptions')
                .insert(subscriptionsToInsert);
            
            if (subscriptionsError) throw subscriptionsError;
        }
        
        // نجاح
        loading.style.display = 'none';
        saveBtn.disabled = false;
        
        showMessage(`
            <h3><i class="fas fa-check-circle"></i> تم حفظ العضو بنجاح في Supabase!</h3>
            <p>تم إضافة العضو <strong>${formData.name}</strong> إلى النظام.</p>
            <p>رقم العضوية: <strong>${newMember.membership_number}</strong></p>
            <p>رقم الجوال: <strong>${newMember.phone}</strong></p>
            <p>الحالة النهائية: <strong>${formData.finalStatus}</strong></p>
            <p>المتأخرات النهائية: <strong>${formData.totalRemaining.toLocaleString()} ريال</strong></p>
            <p>سنوات الاشتراك: <strong>${Object.keys(formData.subscriptions).length}</strong> سنة</p>
            <p><a href="index.html" style="color: #2c5aa0; text-decoration: underline; font-weight: bold;">
                اضغط هنا للذهاب إلى صفحة البحث والتحقق
            </a></p>
        `, 'success');
        
        // إعادة تعيين النموذج بعد 5 ثواني
        setTimeout(async () => {
            await resetForm();
        }, 5000);
        
    } catch (error) {
        console.error('❌ خطأ أثناء حفظ البيانات:', error);
        
        // معالجة أخطاء محددة
        if (error.code === '23505') {
            if (error.message.includes('members_membership_number_key')) {
                showMessage('❌ رقم العضوية موجود بالفعل. تم توليد رقم عضوية جديد تلقائياً.', 'error');
                
                // توليد رقم عضوية جديد
                const newMembershipNumber = await generateSequentialMembershipNumber();
                document.getElementById('membershipNumber').value = newMembershipNumber;
                memberData.membershipNumber = newMembershipNumber;
            } else if (error.message.includes('members_phone_key')) {
                showMessage('❌ رقم الجوال موجود بالفعل في النظام.', 'error');
            }
        } else {
            showMessage(`❌ حدث خطأ أثناء حفظ البيانات: ${error.message}`, 'error');
        }
        
        loading.style.display = 'none';
        saveBtn.disabled = false;
    }
}

/**
 * إعادة تعيين النموذج
 */
async function resetForm() {
    if (!confirm('هل تريد مسح جميع البيانات وإعادة البدء؟')) return;
    
    // إعادة تعيين الحقول
    document.getElementById('memberName').value = '';
    document.getElementById('memberPhone').value = '';
    document.getElementById('joinYear').value = '';
    document.getElementById('notes').value = '';
    document.getElementById('finalStatus').value = 'تمت التسوية';
    document.getElementById('totalRemaining').value = 0;
    document.getElementById('originalDebt').value = 0;
    document.getElementById('savedAmount').value = 0;
    
    // توليد رقم عضوية جديد (التسلسل التالي)
    if (supabaseInitialized) {
        await prefillMembershipNumber();
    }
    
    // إخفاء الأقسام
    document.getElementById('subscriptionsSection').style.display = 'none';
    document.getElementById('summarySection').style.display = 'none';
    document.getElementById('settlementSection').style.display = 'none';
    
    // إعادة تعيين البيانات
    memberData = {
        name: '',
        phone: '',
        membershipNumber: '',
        joinYear: '',
        subscriptions: {},
        notes: '',
        finalStatus: 'تمت التسوية',
        totalRemaining: 0,
        originalDebt: 0,
        savedAmount: 0,
        isSettlementEnabled: false
    };
    
    // إعادة تعيين عناصر التحكم
    document.getElementById('globalSettlementToggle').checked = false;
    document.getElementById('generateTableBtn').disabled = true;
    document.getElementById('settlementDetails').style.display = 'none';
    
    showMessage('تم مسح النموذج بنجاح. تم توليد رقم عضوية جديد من قاعدة البيانات.', 'info');
}

// ==================== إعداد مستمعي الأحداث ====================

/**
 * إعداد مستمعي الأحداث
 */
function setupEventListeners() {
    // تحديث حالة زر توليد الجدول
    document.getElementById('joinYear').addEventListener('change', function() {
        document.getElementById('generateTableBtn').disabled = !this.value;
    });
    
    // الأزرار الرئيسية
    document.getElementById('generateTableBtn').addEventListener('click', generateYearsTable);
    document.getElementById('globalSettlementToggle').addEventListener('change', toggleGlobalSettlement);
    document.getElementById('autoSettleBtn').addEventListener('click', autoSettle);
    document.getElementById('fillExampleBtn').addEventListener('click', fillSettlementExample);
    document.getElementById('clearTableBtn').addEventListener('click', clearTableData);
    document.getElementById('previewBtn').addEventListener('click', previewData);
    document.getElementById('saveBtn').addEventListener('click', saveData);
    document.getElementById('resetBtn').addEventListener('click', resetForm);
    
    // تحديث بيانات العضو عند التغيير
    document.getElementById('memberName').addEventListener('input', function() {
        memberData.name = this.value;
    });
    
    document.getElementById('memberPhone').addEventListener('input', function() {
        memberData.phone = this.value;
    });
    
    document.getElementById('membershipNumber').addEventListener('input', function() {
        memberData.membershipNumber = this.value;
    });
    
    document.getElementById('joinYear').addEventListener('change', function() {
        memberData.joinYear = this.value;
    });
    
    document.getElementById('notes').addEventListener('input', function() {
        memberData.notes = this.value;
    });
    
    document.getElementById('finalStatus').addEventListener('change', function() {
        memberData.finalStatus = this.value;
    });
}