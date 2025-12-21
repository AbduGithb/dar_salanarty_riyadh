// بيانات التطبيق مع نظام التسوية
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

// تهيئة الصفحة
// إعداد Firebase
let db;
let firebaseInitialized = false;

function initializeFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            showMessage('مكتبة Firebase لم يتم تحميلها. تحقق من اتصال الإنترنت.', 'error');
            return;
        }
        if (typeof firebaseConfig === 'undefined') {
            showMessage('لم يتم العثور على إعدادات Firebase (ملف firebase-config.js مفقود).', 'error');
            return;
        }

        if (firebaseConfig.apiKey && firebaseConfig.apiKey.includes('ABCDEFGHIJKLMNOPQRSTUVWXYZ')) {
            showMessage('⚠️ إعدادات Firebase غير صحيحة. يرجى تحديث معلومات المشروع.', 'error');
            return;
        }

        let app;
        if (!firebase.apps.length) {
            app = firebase.initializeApp(firebaseConfig);
            console.log('✅ تم تهيئة Firebase بنجاح');
        } else {
            app = firebase.app();
            console.log('✅ Firebase مثبت بالفعل');
        }

        db = firebase.firestore(app);
        firebaseInitialized = true;
        console.log('✅ تهيئة Firebase مكتملة');

    } catch (error) {
        console.error('❌ خطأ في تهيئة Firebase:', error);
        showMessage(`خطأ في قاعدة البيانات: ${error.message}`, 'error');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 بدء تهيئة صفحة إضافة العضو مع نظام التسوية...');
    
    // تهيئة Firebase (لن يؤثر إن كانت مهيأة مسبقاً)
    initializeFirebase();

    // تعبئة رقم العضوية التالي إن أمكن (عرضي)
    prefillMembershipNumber();

    // تعبئة سنوات الانضمام
    populateJoinYears();
    
    // إضافة الأحداث
    setupEventListeners();
    
    console.log('✅ تم تهيئة الصفحة بنجاح');
});

// تعبئة سنوات الانضمام
function populateJoinYears() {
    const joinYearSelect = document.getElementById('joinYear');
    joinYearSelect.innerHTML = '<option value="">اختر سنة الانضمام</option>';
    
    // من 2015 إلى 2026
    for (let year = 2015; year <= 2026; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        joinYearSelect.appendChild(option);
    }
}
// تعبئة رقم العضوية التالي تلقائياً (عرضي — الرقم الحقيقي يُخصص آناً عند الحفظ)
async function prefillMembershipNumber() {
    try {
        if (!firebaseInitialized || !db) {
            initializeFirebase();
            if (!firebaseInitialized) return;
        }
        const countersRef = db.collection('counters').doc('members');
        const countersDoc = await countersRef.get();
        const lastNumber = countersDoc.exists ? (countersDoc.data().lastNumber || 0) : 0;
        const next = lastNumber + 1;
        const formatted = `DSA-RI-${String(next).padStart(4, '0')}`;
        const membershipInput = document.getElementById('membershipNumber');
        if (membershipInput) {
            membershipInput.value = formatted;
            membershipInput.readOnly = true;
            membershipInput.classList.add('auto-generated');
            membershipInput.title = 'سيتم تعيين رقم العضوية تلقائياً عند الحفظ. هذا العرض تقديري.';
        }
        memberData.membershipNumber = formatted;
    } catch (err) {
        console.error('Error getting next membership number:', err);
    }
}

// توليد جدول السنوات بناءً على سنة الانضمام
function generateYearsTable() {
    const joinYear = parseInt(document.getElementById('joinYear').value);
    
    if (!joinYear) {
        showMessage('يرجى اختيار سنة الانضمام أولاً', 'error');
        return;
    }
    
    const yearsBody = document.getElementById('yearsBody');
    const yearsFooter = document.getElementById('yearsFooter');
    const currentYear = new Date().getFullYear();
    
    // مسح الجدول السابق
    yearsBody.innerHTML = '';
    yearsFooter.innerHTML = '';
    memberData.subscriptions = {};
    
    // إنشاء صف لكل سنة من سنة الانضمام حتى 2026
    for (let year = joinYear; year <= 2026; year++) {
        const row = document.createElement('tr');
        row.className = 'year-row';
        row.dataset.year = year;
        
        // تحديد إذا كانت سنة مستقبلية (بعد السنة الحالية)
        const isFutureYear = year > currentYear;
        const isCurrentYear = year === currentYear;
        
        // حساب المبلغ المستحق الافتراضي (خارج الدار)
        const defaultDue = calculateDueAmount('outside', year);
        
        // حالة افتراضية: السنوات السابقة مسددة، الحالية والحالية+1 غير مسددة
        let defaultPaid = 0;
        let defaultStatus = 'unpaid';
        
        // تمكين الدفع لجميع السنوات بما فيها 2026
        let isDisabled = false;
        
        // إذا كانت سنة 2026، نمكنها للدفع حتى لو كانت مستقبلية
        if (year === 2026) {
            isDisabled = false; // تمكين سنة 2026 للدفع
            // يمكن تعيين مدفوعات افتراضية لسنة 2026 إذا أردت
            // defaultPaid = 0; // أو أي قيمة تريدها
            defaultStatus = 'unpaid';
        } else if (year < currentYear) {
            // السنوات السابقة - مسددة افتراضياً
            defaultPaid = defaultDue;
            defaultStatus = 'paid';
        } else if (isFutureYear) {
            // السنوات المستقبلية الأخرى - غير مسددة ولكن يمكن الدفع
            defaultPaid = 0;
            defaultStatus = 'unpaid';
            isDisabled = false; // تمكين الدفع للسنوات المستقبلية
        } else if (isCurrentYear) {
            // السنة الحالية
            defaultPaid = 0;
            defaultStatus = 'unpaid';
        }
        
        row.innerHTML = `
            <td class="year-cell">${year}${year === 2026 ? ' (يمكن الدفع)' : isFutureYear ? ' (يمكن الدفع)' : ''}</td>
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
                       value="${defaultPaid}" min="0" step="50" placeholder="0"
                       ${isDisabled ? 'disabled' : ''}>
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
                       placeholder="ملاحظات السنة..." 
                       value="${year === 2026 ? 'سنة 2026 - يمكن الدفع' : isFutureYear ? 'سنة مستقبلية - يمكن الدفع' : ''}">
            </td>
        `;
        
        yearsBody.appendChild(row);
        
        // حفظ البيانات الأولية
        memberData.subscriptions[year] = {
            type: 'outside',
            due: defaultDue,
            paid: defaultPaid,
            remaining: defaultDue - defaultPaid,
            status: defaultStatus,
            notes: year === 2026 ? 'سنة 2026 - يمكن الدفع' : isFutureYear ? 'سنة مستقبلية - يمكن الدفع' : '',
            isFutureYear: isFutureYear,
            settlement: false,
            originalRemaining: defaultDue - defaultPaid,
            canPay: true // إضافة خاصية جديدة لتحديد إمكانية الدفع
        };
    }
    
    // إضافة صف التجميع في نهاية الجدول
    yearsFooter.innerHTML = `
        <tr class="calculated-row">
            <td colspan="2" style="text-align: left;"><strong>المجاميع:</strong></td>
            <td class="calculated-value" id="totalDue">0</td>
            <td class="calculated-value" id="totalPaid">0</td>
            <td class="calculated-value" id="totalRemaining">0</td>
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
    
    // إضافة أحداث للمدخلات
    addYearInputEvents();
    
    // إظهار الأقسام
    document.getElementById('subscriptionsSection').style.display = 'block';
    document.getElementById('summarySection').style.display = 'block';
    document.getElementById('settlementSection').style.display = 'block';
    
    // تمكين أزرار خاصة بسنة 2026
    enable2026Features();
    
    // حساب الإحصائيات
    calculateStatistics();
    
    showMessage(`تم إنشاء جدول الاشتراكات للسنوات من ${joinYear} إلى 2026 - سنة 2026 مفعلة للدفع`, 'success');
}

// تمكين ميزات خاصة بسنة 2026
function enable2026Features() {
    const year2026 = 2026;
    const currentYear = new Date().getFullYear();
    
    // إذا كانت سنة 2026 في الجدول
    if (memberData.subscriptions[year2026]) {
        const paidInput = document.querySelector(`.paid-amount[data-year="${year2026}"]`);
        const statusBadge = document.getElementById(`status-${year2026}`);
        const notesInput = document.querySelector(`.year-notes[data-year="${year2026}"]`);
        
        if (paidInput) {
            paidInput.disabled = false; // تأكيد تمكين الدفع
            paidInput.placeholder = "أدخل المبلغ المدفوع لسنة 2026";
            
            // إضافة حدث خاص عند التركيز
            paidInput.addEventListener('focus', function() {
                showMessage('يمكنك إدخال المبلغ المدفوع لسنة 2026. الحد الأدنى 0 والحد الأقصى 300 ريال (خارج الدار) أو 1500 ريال (داخل الدار)', 'info');
            });
        }
        
        if (statusBadge) {
            statusBadge.innerHTML += ' <i class="fas fa-unlock-alt" style="font-size: 0.8em;"></i>';
        }
        
        if (notesInput && !notesInput.value) {
            notesInput.value = 'سنة 2026 - مفعلة للدفع';
            memberData.subscriptions[year2026].notes = 'سنة 2026 - مفعلة للدفع';
        }
        
        // تحديث الحالة لتظهر أن الدفع ممكن
        updateYearStatus(year2026, memberData.subscriptions[year2026].paid, 
                        memberData.subscriptions[year2026].due, 
                        memberData.subscriptions[year2026].isFutureYear, 
                        false);
    }
}

// دالة مساعدة لتمكين/تعطيل حقل الدفع
function updatePaymentFieldStatus(year) {
    const paidInput = document.querySelector(`.paid-amount[data-year="${year}"]`);
    const typeSelect = document.querySelector(`.subscription-type[data-year="${year}"]`);
    const subData = memberData.subscriptions[year];
    
    if (paidInput && typeSelect && subData) {
        // تمكين الدفع لسنة 2026 دائماً
        if (year === 2026) {
            paidInput.disabled = false;
            return;
        }
        
        const type = typeSelect.value;
        const currentYear = new Date().getFullYear();
        
        // تمكين الدفع إذا:
        // 1. السنة أقل من أو تساوي السنة الحالية
        // 2. أو إذا كانت سنة مستقبلية ولكننا نريد تمكين الدفع المسبق
        if (year <= currentYear) {
            paidInput.disabled = (type === 'none');
        } else {
            // السنوات المستقبلية (بما فيها 2026) - تمكين للدفع المسبق
            paidInput.disabled = (type === 'none');
        }
    }
}

// تعديل دالة addYearInputEvents لتشمل التحكم في حالة الدفع
function addYearInputEvents() {
    // عند تغيير نوع الاشتراك
    document.querySelectorAll('.subscription-type').forEach(select => {
        select.addEventListener('change', function() {
            const year = parseInt(this.dataset.year);
            const type = this.value;
            const dueInput = document.querySelector(`.due-amount[data-year="${year}"]`);
            const subData = memberData.subscriptions[year];
            
            // تحديث حالة حقل الدفع
            updatePaymentFieldStatus(year);
            
            // تحديث حالة التسوية
            const settlementCheckbox = document.querySelector(`.settlement-checkbox[data-year="${year}"]`);
            if (type === 'inside') {
                // تمكين خيار التسوية فقط للأعضاء داخل الدار
                settlementCheckbox.disabled = false;
                // إذا كان نظام التسوية مفعلاً بشكل عام، نختار التسوية افتراضياً
                if (memberData.isSettlementEnabled) {
                    settlementCheckbox.checked = true;
                }
            } else {
                settlementCheckbox.disabled = true;
                settlementCheckbox.checked = false;
            }
            
            // حساب المبلغ المستحق الجديد
            const newDue = calculateDueAmount(type, year);
            dueInput.value = newDue;
            
            // تحديث المبلغ المتبقي
            const paidInput = document.querySelector(`.paid-amount[data-year="${year}"]`);
            const paid = parseFloat(paidInput.value) || 0;
            const remaining = Math.max(0, newDue - paid);
            
            const remainingInput = document.querySelector(`.remaining-amount[data-year="${year}"]`);
            remainingInput.value = remaining;
            
            // تحديث الحالة
            updateYearStatus(year, paid, newDue, subData.isFutureYear, settlementCheckbox.checked);
            
            // تحديث البيانات
            updateYearData(year, type, newDue, paid, remaining, subData.isFutureYear, settlementCheckbox.checked);
            
            // تحديث مظهر الصف
            updateRowAppearance(year, type, settlementCheckbox.checked);
            
            // حساب الإحصائيات
            calculateStatistics();
        });
    });
    
    // عند تغيير المبلغ المدفوع
    document.querySelectorAll('.paid-amount').forEach(input => {
        input.addEventListener('input', function() {
            const year = parseInt(this.dataset.year);
            const paid = parseFloat(this.value) || 0;
            const dueInput = document.querySelector(`.due-amount[data-year="${year}"]`);
            const due = parseFloat(dueInput.value) || 0;
            
            // التحقق من الحد الأقصى للدفع
            let adjustedPaid = paid;
            const typeSelect = document.querySelector(`.subscription-type[data-year="${year}"]`);
            const type = typeSelect ? typeSelect.value : 'outside';
            
            if (type === 'inside' && paid > 1500) {
                adjustedPaid = 1500;
                this.value = 1500;
                showMessage(`الحد الأقصى للدفع للأعضاء داخل الدار هو 1500 ريال لسنة ${year}`, 'warning');
            } else if (type === 'outside') {
                const maxDue = calculateDueAmount('outside', year);
                if (paid > maxDue) {
                    adjustedPaid = maxDue;
                    this.value = maxDue;
                    showMessage(`الحد الأقصى للدفع للأعضاء خارج الدار هو ${maxDue} ريال لسنة ${year}`, 'warning');
                }
            }
            
            const remaining = Math.max(0, due - adjustedPaid);
            const subData = memberData.subscriptions[year];
            
            // تحديث المبلغ المتبقي
            const remainingInput = document.querySelector(`.remaining-amount[data-year="${year}"]`);
            remainingInput.value = remaining;
            
            // تحديث الحالة
            const settlementCheckbox = document.querySelector(`.settlement-checkbox[data-year="${year}"]`);
            updateYearStatus(year, adjustedPaid, due, subData.isFutureYear, settlementCheckbox ? settlementCheckbox.checked : false);
            
            // تحديث البيانات
            updateYearData(year, type, due, adjustedPaid, remaining, subData.isFutureYear, settlementCheckbox ? settlementCheckbox.checked : false);
            
            // حساب الإحصائيات
            calculateStatistics();
            
            // إذا كانت سنة 2026، إظهار رسالة خاصة
            if (year === 2026 && adjustedPaid > 0) {
                const statusBadge = document.getElementById(`status-${year}`);
                if (statusBadge) {
                    statusBadge.innerHTML += ' <i class="fas fa-check-circle" style="color: #4CAF50;"></i>';
                }
            }
        });
        
        // إضافة حدث عند التركيز على حقل الدفع لسنة 2026
        input.addEventListener('focus', function() {
            const year = parseInt(this.dataset.year);
            if (year === 2026) {
                const typeSelect = document.querySelector(`.subscription-type[data-year="${year}"]`);
                const type = typeSelect ? typeSelect.value : 'outside';
                const maxAmount = type === 'inside' ? 1500 : calculateDueAmount('outside', year);
                this.title = `أدخل المبلغ المدفوع لسنة 2026. الحد الأقصى: ${maxAmount} ريال`;
            }
        });
    });
    
    // بقية الأحداث تبقى كما هي...
    // ... [الكود السابق للأحداث الأخرى]
}


// إضافة أحداث لمدخلات السنوات
function addYearInputEvents() {
    // عند تغيير نوع الاشتراك
    document.querySelectorAll('.subscription-type').forEach(select => {
        select.addEventListener('change', function() {
            const year = parseInt(this.dataset.year);
            const type = this.value;
            const dueInput = document.querySelector(`.due-amount[data-year="${year}"]`);
            const subData = memberData.subscriptions[year];
            
            // تحديث حالة التسوية
            const settlementCheckbox = document.querySelector(`.settlement-checkbox[data-year="${year}"]`);
            if (type === 'inside') {
                // تمكين خيار التسوية فقط للأعضاء داخل الدار
                settlementCheckbox.disabled = false;
                // إذا كان نظام التسوية مفعلاً بشكل عام، نختار التسوية افتراضياً
                if (memberData.isSettlementEnabled) {
                    settlementCheckbox.checked = true;
                }
            } else {
                settlementCheckbox.disabled = true;
                settlementCheckbox.checked = false;
            }
            
            // حساب المبلغ المستحق الجديد
            const newDue = calculateDueAmount(type, year);
            dueInput.value = newDue;
            
            // تحديث المبلغ المتبقي
            const paidInput = document.querySelector(`.paid-amount[data-year="${year}"]`);
            const paid = parseFloat(paidInput.value) || 0;
            const remaining = Math.max(0, newDue - paid);
            
            const remainingInput = document.querySelector(`.remaining-amount[data-year="${year}"]`);
            remainingInput.value = remaining;
            
            // تحديث الحالة
            updateYearStatus(year, paid, newDue, subData.isFutureYear, settlementCheckbox.checked);
            
            // تحديث البيانات
            updateYearData(year, type, newDue, paid, remaining, subData.isFutureYear, settlementCheckbox.checked);
            
            // تحديث مظهر الصف
            updateRowAppearance(year, type, settlementCheckbox.checked);
            
            // حساب الإحصائيات
            calculateStatistics();
        });
    });
    
    // عند تغيير المبلغ المدفوع
    document.querySelectorAll('.paid-amount').forEach(input => {
        input.addEventListener('input', function() {
            const year = parseInt(this.dataset.year);
            const paid = parseFloat(this.value) || 0;
            const dueInput = document.querySelector(`.due-amount[data-year="${year}"]`);
            const due = parseFloat(dueInput.value) || 0;
            const remaining = Math.max(0, due - paid);
            const subData = memberData.subscriptions[year];
            
            // تحديث المبلغ المتبقي
            const remainingInput = document.querySelector(`.remaining-amount[data-year="${year}"]`);
            remainingInput.value = remaining;
            
            // تحديث الحالة
            const settlementCheckbox = document.querySelector(`.settlement-checkbox[data-year="${year}"]`);
            updateYearStatus(year, paid, due, subData.isFutureYear, settlementCheckbox.checked);
            
            // تحديث البيانات
            const typeSelect = document.querySelector(`.subscription-type[data-year="${year}"]`);
            const type = typeSelect.value;
            updateYearData(year, type, due, paid, remaining, subData.isFutureYear, settlementCheckbox.checked);
            
            // حساب الإحصائيات
            calculateStatistics();
        });
    });
    
    // عند تغيير حالة التسوية
    document.querySelectorAll('.settlement-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const year = parseInt(this.dataset.year);
            const isSettled = this.checked;
            const subData = memberData.subscriptions[year];
            
            // تحديث الحالة والمظهر
            const paidInput = document.querySelector(`.paid-amount[data-year="${year}"]`);
            const paid = parseFloat(paidInput.value) || 0;
            const due = subData.due;
            
            updateYearStatus(year, paid, due, subData.isFutureYear, isSettled);
            updateRowAppearance(year, subData.type, isSettled);
            
            // تحديث البيانات
            subData.settlement = isSettled;
            
            // حساب الإحصائيات
            calculateStatistics();
        });
    });
    
    // عند تغيير الملاحظات
    document.querySelectorAll('.year-notes').forEach(input => {
        input.addEventListener('input', function() {
            const year = parseInt(this.dataset.year);
            memberData.subscriptions[year].notes = this.value;
        });
    });
}

// تحديث حالة السنة مع مراعاة التسوية
function updateYearStatus(year, paid, due, isFutureYear = false, isSettled = false) {
    const statusBadge = document.getElementById(`status-${year}`);
    
    if (due === 0) {
        // غير مشترك
        statusBadge.className = 'status-badge status-none';
        statusBadge.textContent = 'غير مشترك';
        memberData.subscriptions[year].status = 'none';
    } else if (isFutureYear) {
        // سنة مستقبلية
        if (paid >= due) {
            statusBadge.className = 'status-badge status-paid';
            statusBadge.textContent = 'مدفوع مسبقاً';
            memberData.subscriptions[year].status = 'paid';
        } else if (paid > 0) {
            statusBadge.className = 'status-badge status-partial';
            const percentage = Math.round((paid / due) * 100);
            statusBadge.textContent = `مدفوع جزئياً (${percentage}%)`;
            memberData.subscriptions[year].status = 'partial';
        } else {
            statusBadge.className = 'status-badge status-unpaid';
            statusBadge.textContent = 'مستقبلية';
            memberData.subscriptions[year].status = 'unpaid';
        }
    } else if (isSettled) {
        // تمت التسوية
        statusBadge.className = 'status-badge status-paid';
        statusBadge.textContent = 'تمت التسوية';
        memberData.subscriptions[year].status = 'settled';
    } else if (paid === 0) {
        // غير مسدد
        statusBadge.className = 'status-badge status-unpaid';
        statusBadge.textContent = 'غير مسدد';
        memberData.subscriptions[year].status = 'unpaid';
    } else if (paid >= due) {
        // مسدد بالكامل
        statusBadge.className = 'status-badge status-paid';
        statusBadge.textContent = 'مسدد';
        memberData.subscriptions[year].status = 'paid';
    } else {
        // مسدد جزئياً
        statusBadge.className = 'status-badge status-partial';
        const percentage = Math.round((paid / due) * 100);
        statusBadge.textContent = `مسدد ${percentage}%`;
        memberData.subscriptions[year].status = 'partial';
    }
}

// تحديث مظهر الصف بناءً على نوع الاشتراك والتسوية
function updateRowAppearance(year, type, isSettled) {
    const row = document.querySelector(`.year-row[data-year="${year}"]`);
    
    if (isSettled && type === 'inside') {
        row.classList.add('settled');
    } else {
        row.classList.remove('settled');
    }
}

// الحصول على نص الحالة
function getStatusText(status, paid, due) {
    if (due === 0) return 'غير مشترك';
    
    switch(status) {
        case 'paid':
            return 'مسدد';
        case 'partial':
            const percentage = Math.round((paid / due) * 100);
            return `مسدد ${percentage}%`;
        case 'unpaid':
            return 'غير مسدد';
        case 'settled':
            return 'تمت التسوية';
        case 'none':
            return 'غير مشترك';
        default:
            return 'غير محدد';
    }
}

// الحصول على فئة الحالة
function getStatusClass(status, paid, due) {
    if (due === 0) return 'status-none';
    
    switch(status) {
        case 'paid':
        case 'settled':
            return 'status-paid';
        case 'partial':
            return 'status-partial';
        case 'unpaid':
            return 'status-unpaid';
        case 'none':
            return 'status-none';
        default:
            return 'status-unpaid';
    }
}

// حساب المبلغ المستحق بناءً على النوع والسنة
function calculateDueAmount(type, year) {
    switch(type) {
        case 'none':
            return 0;
        case 'outside':
            // 200 ريال حتى 2025، 300 ريال لسنة 2026
            return year <= 2025 ? 200 : 300;
        case 'inside':
            return 1500;
        default:
            return 0;
    }
}

// تحديث بيانات السنة
function updateYearData(year, type, due, paid, remaining, isFutureYear = false, isSettled = false) {
    memberData.subscriptions[year] = {
        type: type,
        due: due,
        paid: paid,
        remaining: remaining,
        originalRemaining: remaining, // حفظ القيمة الأصلية
        status: memberData.subscriptions[year]?.status || 'unpaid',
        notes: memberData.subscriptions[year]?.notes || '',
        isFutureYear: isFutureYear,
        settlement: isSettled
    };
}

// حساب الإحصائيات مع نظام التسوية
function calculateStatistics() {
    let totalYears = 0;
    let subscribedYears = 0;
    let paidYears = 0;
    let partialYears = 0;
    let unpaidYears = 0;
    let settledYears = 0;
    let noneYears = 0;
    let totalDue = 0;
    let totalPaid = 0;
    let totalRemainingOriginal = 0; // المتأخرات الأصلية
    let totalRemainingAfterSettlement = 0; // المتأخرات بعد التسوية
    let insideYears = 0;
    let outsideYears = 0;
    let futureYears = 0;
    let totalSavedBySettlement = 0; // المبلغ المستقطع بالتسوية
    
    // حساب الإحصائيات من البيانات
    for (const year in memberData.subscriptions) {
        totalYears++;
        const sub = memberData.subscriptions[year];
        
        if (sub.type !== 'none') {
            subscribedYears++;
            totalDue += sub.due;
            totalPaid += sub.paid;
            totalRemainingOriginal += sub.originalRemaining;
            
            // حساب المتأخرات بعد التسوية
            if (sub.settlement && sub.type === 'inside') {
                // إذا تمت التسوية، لا نحسب الباقي في المتأخرات
                totalRemainingAfterSettlement += 0;
                totalSavedBySettlement += sub.originalRemaining;
                settledYears++;
            } else {
                totalRemainingAfterSettlement += sub.originalRemaining;
            }
            
            if (sub.type === 'inside') insideYears++;
            if (sub.type === 'outside') outsideYears++;
            
            if (sub.status === 'paid') paidYears++;
            else if (sub.status === 'partial') partialYears++;
            else if (sub.status === 'unpaid') unpaidYears++;
            else if (sub.status === 'settled') settledYears++;
            else if (sub.status === 'none') noneYears++;
            
            if (sub.isFutureYear) futureYears++;
        } else {
            noneYears++;
        }
    }
    
    // تحديث الإجماليات في تذييل الجدول
    document.getElementById('totalDue').textContent = totalDue.toLocaleString();
    document.getElementById('totalPaid').textContent = totalPaid.toLocaleString();
    document.getElementById('totalRemaining').textContent = totalRemainingOriginal.toLocaleString();
    
    // عرض صف التسوية إذا كان هناك سنوات تمت تسويتها
    const settlementRow = document.getElementById('settlementRow');
    if (settledYears > 0) {
        settlementRow.style.display = 'table-row';
        document.getElementById('totalAfterSettlement').textContent = totalRemainingAfterSettlement.toLocaleString();
        document.getElementById('settlementSaved').textContent = `تم توفير ${totalSavedBySettlement.toLocaleString()} ريال`;
    } else {
        settlementRow.style.display = 'none';
    }
    
    // تحديث بطاقات الملخص
    updateSummaryCards(totalYears, subscribedYears, paidYears, partialYears, unpaidYears, settledYears,
                      totalDue, totalPaid, totalRemainingOriginal, totalRemainingAfterSettlement,
                      insideYears, outsideYears, futureYears, totalSavedBySettlement);
    
    // تحديث إجمالي المتأخرات
    document.getElementById('totalRemaining').value = totalRemainingAfterSettlement;
    document.getElementById('originalDebt').value = totalRemainingOriginal;
    document.getElementById('savedAmount').value = totalSavedBySettlement;
    
    memberData.totalRemaining = totalRemainingAfterSettlement;
    memberData.originalDebt = totalRemainingOriginal;
    memberData.savedAmount = totalSavedBySettlement;
    
    // تحديث الحالة النهائية
    updateFinalStatus(totalRemainingAfterSettlement, unpaidYears, partialYears, settledYears, futureYears);
    
    // تحديث إحصائيات التسوية
    updateSettlementStats(settledYears, totalSavedBySettlement);
}

// تحديث بطاقات الملخص
function updateSummaryCards(totalYears, subscribedYears, paidYears, partialYears, unpaidYears, settledYears,
                           totalDue, totalPaid, totalRemainingOriginal, totalRemainingAfterSettlement,
                           insideYears, outsideYears, futureYears, totalSavedBySettlement) {
    const summaryCards = document.getElementById('summaryCards');
    
    summaryCards.innerHTML = `
        <div class="summary-card">
            <div class="summary-value">${subscribedYears}</div>
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
        
        <div class="summary-card paid">
            <div class="summary-value">${settledYears}</div>
            <div class="summary-label">سنوات تمت تسويتها</div>
        </div>
    `;
    
    // بطاقات التسوية
    const settlementCards = document.getElementById('settlementSummaryCards');
    const data = collectFormData();
    settlementCards.innerHTML = `
        <div class="summary-card">
            <div class="summary-value">${insideYears}</div>
            <div class="summary-label">سنوات داخل الدار</div>
        </div>
        
        <div class="summary-card">
            <div class="summary-value">${outsideYears}</div>
            <div class="summary-label">سنوات خارج الدار</div>
        </div>
        
        <div class="summary-card">
            <div class="summary-value">${futureYears}</div>
            <div class="summary-label">سنوات مستقبلية</div>
        </div>
        
        <div class="summary-card">
            <div class="summary-value">${totalDue.toLocaleString()}</div>
            <div class="summary-label">إجمالي المستحق</div>
        </div>
        
        <div class="summary-card paid">
            <div class="summary-value">${data.totalPaid.toLocaleString()}</div>
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

// تحديث إحصائيات التسوية
function updateSettlementStats(settledYears, totalSaved) {
    document.getElementById('settledYearsCount').textContent = settledYears;
    document.getElementById('settledAmount').textContent = totalSaved.toLocaleString() + ' ريال';
    document.getElementById('savedFromDebt').textContent = totalSaved.toLocaleString() + ' ريال';
    
    // إظهار تفاصيل التسوية إذا كان هناك سنوات تمت تسويتها
    const settlementDetails = document.getElementById('settlementDetails');
    if (settledYears > 0) {
        settlementDetails.classList.add('show');
    } else {
        settlementDetails.classList.remove('show');
    }
}

// تحديث الحالة النهائية
function updateFinalStatus(totalRemaining, unpaidYears, partialYears, settledYears, futureYears) {
    const finalStatus = document.getElementById('finalStatus');
    const currentYear = new Date().getFullYear();
    
    // حساب السنوات غير المستقبلية غير المسددة
    let actualUnpaidYears = 0;
    for (const year in memberData.subscriptions) {
        const sub = memberData.subscriptions[year];
        if (parseInt(year) <= currentYear && sub.type !== 'none' && 
            sub.status === 'unpaid' && sub.paid === 0) {
            actualUnpaidYears++;
        }
    }
    
    if (settledYears > 0) {
        finalStatus.value = 'تمت التسوية';
    } else if (totalRemaining === 0 && actualUnpaidYears === 0) {
        finalStatus.value = 'مسدد';
    } else if (partialYears > 0 || (totalRemaining > 0 && actualUnpaidYears > 0)) {
        finalStatus.value = 'مسدد جزئياً';
    } else if (actualUnpaidYears > 0) {
        finalStatus.value = 'متأخر';
    } else if (futureYears > 0) {
        finalStatus.value = 'غير مسدد';
    } else {
        finalStatus.value = 'غير مسدد';
    }
    
    memberData.finalStatus = finalStatus.value;
}

// تعبئة بمثال مع التسوية
function fillSettlementExample() {
    const joinYear = parseInt(document.getElementById('joinYear').value);
    if (!joinYear) {
        showMessage('يرجى توليد جدول السنوات أولاً', 'error');
        return;
    }
    
    // تفعيل نظام التسوية
    document.getElementById('globalSettlementToggle').checked = true;
    memberData.isSettlementEnabled = true;
    
    // مثال: 2018 خارج الدار، 2019 داخل الدار مع تسوية، 2020 داخل الدار مع تسوية جزئية
    
    // 1. سنة الانضمام: خارج الدار - سدد 200
    setYearData(joinYear, 'outside', 200, 'انضمام - خارج الدار - سدد كامل المبلغ', false);
    
    // 2. السنة التالية: داخل الدار - سدد 1000 (تمت التسوية على 500 ريال)
    if (joinYear + 1 <= 2026) {
        setYearData(joinYear + 1, 'inside', 1000, 'داخل الدار - سدد 1000 ريال، تمت التسوية على 500 ريال المتبقية', true);
    }
    
    // 3. السنة الثانية: داخل الدار - سدد 750 (تمت التسوية على 750 ريال)
    if (joinYear + 2 <= 2026) {
        setYearData(joinYear + 2, 'inside', 750, 'داخل الدار - سدد 750 ريال، تمت التسوية على 750 ريال المتبقية', true);
    }
    
    // 4. السنة الثالثة: داخل الدار - سدد 1500 (كامل - لا تحتاج تسوية)
    if (joinYear + 3 <= 2026) {
        setYearData(joinYear + 3, 'inside', 1500, 'داخل الدار - سدد كامل المبلغ', false);
    }
    
    // 5. السنة الرابعة: خارج الدار - سدد 150 (جزئي)
    if (joinYear + 4 <= 2026) {
        setYearData(joinYear + 4, 'outside', 150, 'خارج الدار - سدد جزئي 150 ريال', false);
    }
    
    // 6. السنة الخامسة: داخل الدار - سدد 500 (تمت التسوية على 1000 ريال)
    if (joinYear + 5 <= 2026) {
        setYearData(joinYear + 5, 'inside', 500, 'داخل الدار - سدد 500 ريال، تمت التسوية على 1000 ريال المتبقية', true);
    }
    
    // تعبئة بيانات العضو
    document.getElementById('memberName').value = 'عبد الله الزبير محمد';
    document.getElementById('memberPhone').value = '0502191635';
    document.getElementById('membershipNumber').value = `DSA-RI-${joinYear.toString().slice(-2)}0001`;
    document.getElementById('notes').value = `عضو لديه اتفاقية تسوية. انضم سنة ${joinYear}. تمت تسوية بعض السنوات بناءً على اتفاق مع الإدارة.`;
    
    showMessage('تم تعبئة البيانات بمثال يحتوي على سنوات تمت تسويتها', 'success');
    calculateStatistics();
}

// تعيين بيانات سنة معينة
function setYearData(year, type, paid, notes = '', settlement = false) {
    const typeSelect = document.querySelector(`.subscription-type[data-year="${year}"]`);
    const paidInput = document.querySelector(`.paid-amount[data-year="${year}"]`);
    const notesInput = document.querySelector(`.year-notes[data-year="${year}"]`);
    const settlementCheckbox = document.querySelector(`.settlement-checkbox[data-year="${year}"]`);
    
    if (typeSelect && paidInput) {
        typeSelect.value = type;
        
        // تحديث المبلغ المستحق
        const due = calculateDueAmount(type, year);
        const dueInput = document.querySelector(`.due-amount[data-year="${year}"]`);
        dueInput.value = due;
        
        // تعيين المبلغ المدفوع
        paidInput.value = paid;
         // تحديث حالة حقل الدفع
        updatePaymentFieldStatus(year);
        // تحديث المتبقي
        const remaining = Math.max(0, due - paid);
        const remainingInput = document.querySelector(`.remaining-amount[data-year="${year}"]`);
        remainingInput.value = remaining;
        
        // تحديث حالة التسوية
        if (settlementCheckbox) {
            if (type === 'inside') {
                settlementCheckbox.disabled = false;
                settlementCheckbox.checked = settlement;
            } else {
                settlementCheckbox.disabled = true;
                settlementCheckbox.checked = false;
            }
        }
        
        // تحديث الحالة
        const subData = memberData.subscriptions[year];
        updateYearStatus(year, paid, due, subData?.isFutureYear || false, settlement);
        
        // تحديث البيانات
        updateYearData(year, type, due, paid, remaining, subData?.isFutureYear || false, settlement);
        
        // تحديث المظهر
        updateRowAppearance(year, type, settlement);
        
        // إضافة الملاحظات
        if (notesInput) {
            if (year === 2026 && !notes.includes('2026')) {
                notes = `${notes} - سنة 2026 مفعلة للدفع`.trim();
            }
            notesInput.value = notes;
            memberData.subscriptions[year].notes = notes;
        }
    }
}

// تفعيل/تعطيل نظام التسوية على مستوى العضو
function toggleGlobalSettlement() {
    const isEnabled = document.getElementById('globalSettlementToggle').checked;
    memberData.isSettlementEnabled = isEnabled;
    
    // تطبيق على جميع السنوات داخل الدار
    for (const year in memberData.subscriptions) {
        const sub = memberData.subscriptions[year];
        if (sub.type === 'inside') {
            const settlementCheckbox = document.querySelector(`.settlement-checkbox[data-year="${year}"]`);
            if (settlementCheckbox) {
                if (isEnabled && sub.paid < sub.due) {
                    // إذا تم تفعيل النظام وكان المدفوع أقل من المستحق، نفعّل التسوية
                    settlementCheckbox.checked = true;
                    sub.settlement = true;
                } else if (!isEnabled) {
                    settlementCheckbox.checked = false;
                    sub.settlement = false;
                }
                
                // تحديث الحالة والمظهر
                updateYearStatus(year, sub.paid, sub.due, sub.isFutureYear, settlementCheckbox.checked);
                updateRowAppearance(year, sub.type, settlementCheckbox.checked);
            }
        }
    }
    
    // حساب الإحصائيات
    calculateStatistics();
    
    showMessage(isEnabled ? 'تم تفعيل نظام التسوية' : 'تم تعطيل نظام التسوية', 'info');
}

// تسوية تلقائية للأعضاء داخل الدار
function autoSettle() {
    let settledCount = 0;
    const currentYear = new Date().getFullYear();
    
    for (const year in memberData.subscriptions) {
        const sub = memberData.subscriptions[year];
        // تطبيق فقط على السنوات داخل الدار غير المستقبلية
        if (sub.type === 'inside' && parseInt(year) <= currentYear && sub.paid > 0 && sub.paid < sub.due) {
            const settlementCheckbox = document.querySelector(`.settlement-checkbox[data-year="${year}"]`);
            if (settlementCheckbox && !settlementCheckbox.checked) {
                settlementCheckbox.checked = true;
                sub.settlement = true;
                settledCount++;
                
                // تحديث الحالة والمظهر
                updateYearStatus(year, sub.paid, sub.due, sub.isFutureYear, true);
                updateRowAppearance(year, sub.type, true);
                
                // إضافة ملاحظة
                const notesInput = document.querySelector(`.year-notes[data-year="${year}"]`);
                if (notesInput && !notesInput.value.includes('تسوية')) {
                    notesInput.value = `${notesInput.value} | تمت التسوية تلقائياً`.trim();
                    sub.notes = notesInput.value;
                }
            }
        }
    }
    
    if (settledCount > 0) {
        calculateStatistics();
        showMessage(`تم تطبيق التسوية تلقائياً على ${settledCount} سنة`, 'success');
    } else {
        showMessage('لا توجد سنوات داخل الدار مؤهلة للتسوية التلقائية', 'info');
    }
}

// مسح بيانات الجدول
function clearTableData() {
    if (confirm('هل أنت متأكد من مسح جميع بيانات جدول السنوات؟')) {
        const joinYear = parseInt(document.getElementById('joinYear').value);
        if (!joinYear) return;
        
        // إعادة تعيين جميع الحقول
        for (let year = joinYear; year <= 2026; year++) {
            const typeSelect = document.querySelector(`.subscription-type[data-year="${year}"]`);
            const paidInput = document.querySelector(`.paid-amount[data-year="${year}"]`);
            const settlementCheckbox = document.querySelector(`.settlement-checkbox[data-year="${year}"]`);
            const notesInput = document.querySelector(`.year-notes[data-year="${year}"]`);
            
            if (typeSelect && paidInput) {
                typeSelect.value = 'outside';
                
                const due = calculateDueAmount('outside', year);
                const dueInput = document.querySelector(`.due-amount[data-year="${year}"]`);
                dueInput.value = due;
                
                paidInput.value = 0;
                paidInput.disabled = false;
                
                const remainingInput = document.querySelector(`.remaining-amount[data-year="${year}"]`);
                remainingInput.value = due;
                
                if (settlementCheckbox) {
                    settlementCheckbox.disabled = true;
                    settlementCheckbox.checked = false;
                }
                
                if (notesInput) {
                    notesInput.value = '';
                }
                
                // تحديث البيانات
                const subData = memberData.subscriptions[year];
                updateYearData(year, 'outside', due, 0, due, subData?.isFutureYear || false, false);
                updateYearStatus(year, 0, due, subData?.isFutureYear || false, false);
                updateRowAppearance(year, 'outside', false);
            }
        }
        
        // إعادة تعيين نظام التسوية
        document.getElementById('globalSettlementToggle').checked = false;
        memberData.isSettlementEnabled = false;
        
        // إعادة حساب الإحصائيات
        calculateStatistics();
        
        showMessage('تم مسح جميع بيانات جدول السنوات', 'info');
    }
}

// التحقق من صحة النموذج
function validateForm() {
    const name = document.getElementById('memberName').value.trim();
    const phone = document.getElementById('memberPhone').value.trim();
    const membershipNumber = document.getElementById('membershipNumber').value.trim();
    const joinYear = document.getElementById('joinYear').value;
    
    if (!name) {
        showMessage('يرجى إدخال اسم العضو', 'error');
        return false;
    }
    
    if (!phone || !/^05\d{8}$/.test(phone)) {
        showMessage('يرجى إدخال رقم جوال صحيح (10 أرقام تبدأ بـ 05)', 'error');
        return false;
    }
    
    if (!membershipNumber) {
        showMessage('يرجى إدخال رقم العضوية', 'error');
        return false;
    }
    
    if (!joinYear) {
        showMessage('يرجى اختيار سنة الانضمام', 'error');
        return false;
    }
    
    // التحقق من وجود جدول السنوات
    if (Object.keys(memberData.subscriptions).length === 0) {
        showMessage('يرجى توليد جدول الاشتراكات أولاً', 'error');
        return false;
    }
    
    return true;
}

// جمع بيانات النموذج
function collectFormData() {
    const data = {
        name: document.getElementById('memberName').value.trim(),
        phone: document.getElementById('memberPhone').value.trim(),
        membershipNumber: document.getElementById('membershipNumber').value.trim(),
        joinYear: document.getElementById('joinYear').value,
        finalStatus: document.getElementById('finalStatus').value,
        totalRemaining: parseFloat(document.getElementById('totalRemaining').value) || 0,
        originalDebt: parseFloat(document.getElementById('originalDebt').value) || 0,
        savedAmount: parseFloat(document.getElementById('savedAmount').value) || 0,
        isSettlementEnabled: memberData.isSettlementEnabled,
        notes: document.getElementById('notes').value.trim(),
        subscriptions: memberData.subscriptions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // حساب الإجماليات النهائية
    let totalDue = 0;
    let totalPaid = 0;
    let yearsCount = 0;
    let paidYears = 0;
    let partialYears = 0;
    let unpaidYears = 0;
    let settledYears = 0;
    let insideYears = 0;
    let outsideYears = 0;
    let noneYears = 0;
    let futureYears = 0;
    const currentYear = new Date().getFullYear();
    
    for (const year in data.subscriptions) {
        const sub = data.subscriptions[year];
        if (sub.type !== 'none') {
            yearsCount++;
            totalDue += sub.due;
            totalPaid += sub.paid;
            
            if (sub.type === 'inside') insideYears++;
            if (sub.type === 'outside') outsideYears++;
            
            if (sub.status === 'paid') paidYears++;
            else if (sub.status === 'partial') partialYears++;
            else if (sub.status === 'unpaid') unpaidYears++;
            else if (sub.status === 'settled') settledYears++;
            
            if (parseInt(year) > currentYear) futureYears++;
        } else {
            noneYears++;
        }
    }
    
    data.totalDue = totalDue;
    data.totalPaid = totalPaid;
    data.yearsCount = yearsCount;
    data.paidYears = paidYears;
    data.partialYears = partialYears;
    data.unpaidYears = unpaidYears;
    data.settledYears = settledYears;
    data.insideYears = insideYears;
    data.outsideYears = outsideYears;
    data.noneYears = noneYears;
    data.futureYears = futureYears;
    
    return data;
}

// معاينة البيانات
function previewData() {
    if (!validateForm()) return;
    
    const data = collectFormData();
    
    let previewHTML = `
        <h3><i class="fas fa-eye"></i> معاينة بيانات العضو مع نظام التسوية</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin: 20px 0;">
            <div><strong>اسم العضو:</strong> ${data.name}</div>
            <div><strong>رقم الجوال:</strong> ${data.phone}</div>
            <div><strong>رقم العضوية:</strong> ${data.membershipNumber}</div>
            <div><strong>سنة الانضمام:</strong> ${data.joinYear}</div>
            <div><strong>الحالة النهائية:</strong> ${data.finalStatus}</div>
            <div><strong>نظام التسوية:</strong> ${data.isSettlementEnabled ? 'مفعل' : 'غير مفعل'}</div>
            <div><strong>المتأخرات الأصلية:</strong> ${data.originalDebt.toLocaleString()} ريال</div>
            <div><strong>المتأخرات النهائية:</strong> ${data.totalRemaining.toLocaleString()} ريال</div>
            <div><strong>المستقطع بالتسوية:</strong> ${data.savedAmount.toLocaleString()} ريال</div>
        </div>
        
        <h4 style="margin: 20px 0 10px 0;">ملخص الاشتراكات:</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
            <div>سنوات مشتركة: <strong>${data.yearsCount}</strong></div>
            <div>سنوات مسددة: <strong>${data.paidYears}</strong></div>
            <div>سنوات جزئية: <strong>${data.partialYears}</strong></div>
            <div>سنوات غير مسددة: <strong>${data.unpaidYears}</strong></div>
            <div>سنوات تمت تسويتها: <strong>${data.settledYears}</strong></div>
            <div>سنوات داخل الدار: <strong>${data.insideYears}</strong></div>
            <div>سنوات خارج الدار: <strong>${data.outsideYears}</strong></div>
            <div>إجمالي المستحق: <strong>${data.totalDue.toLocaleString()} ريال</strong></div>
            <div>إجمالي المدفوع: <strong>${data.totalPaid.toLocaleString()} ريال</strong></div>
        </div>
        
        <h4 style="margin: 20px 0 10px 0;">السنوات التي تمت تسويتها:</h4>
        <ul style="margin-right: 20px;">
    `;
    
    // إضافة السنوات التي تمت تسويتها
    let settledYearsList = 0;
    for (const year in data.subscriptions) {
        const sub = data.subscriptions[year];
        if (sub.settlement && sub.type === 'inside') {
            const saved = sub.due - sub.paid;
            previewHTML += `<li><strong>${year}:</strong> داخل الدار - 
                           دفع ${sub.paid} ريال من ${sub.due} ريال - 
                           تم توفير ${saved.toLocaleString()} ريال
                           ${sub.notes ? ` (${sub.notes})` : ''}</li>`;
            settledYearsList++;
        }
    }
    
    if (settledYearsList === 0) {
        previewHTML += '<li>لا توجد سنوات تمت تسويتها</li>';
    }
    
    previewHTML += `
        </ul>
        <p style="margin-top: 20px; font-style: italic;">انقر على "حفظ العضو" لإضافة البيانات إلى النظام</p>
    `;
    
    showMessage(previewHTML, 'info');
}

// حفظ البيانات
async function saveData() {
    if (!validateForm()) return;

    const loading = document.getElementById('loading');
    const saveBtn = document.getElementById('saveBtn');

    loading.classList.add('show');
    saveBtn.disabled = true;

    try {
        // تأكد من تهيئة Firebase
        if (!firebaseInitialized || !db) {
            initializeFirebase();
            if (!firebaseInitialized) {
                loading.classList.remove('show');
                saveBtn.disabled = false;
                showMessage('❌ Firebase غير مهيأ. لا يمكن حفظ البيانات الآن.', 'error');
                return;
            }
        }

        const data = collectFormData();

        // تنظيف رقم الجوال والتحقق من عدم تكراره
        const phoneToCheck = (data.phone || '').trim();
        try {
            const existingQuery = await db.collection('members').where('phone', '==', phoneToCheck).get();
            if (!existingQuery.empty) {
                loading.classList.remove('show');
                saveBtn.disabled = false;
                showMessage('⚠️ رقم الجوال موجود بالفعل في النظام. لا يمكن إضافة رقم مكرر.', 'warning');
                return;
            }
        } catch (err) {
            console.error('Error checking duplicate phone:', err);
            loading.classList.remove('show');
            saveBtn.disabled = false;
            showMessage('❌ حدث خطأ أثناء التحقق من رقم الجوال. حاول مرة أخرى.', 'error');
            return;
        }

        // تهيئة بيانات العضو التي سيتم حفظها في مجموعة members
        const memberToSave = {
            name: data.name,
            phone: phoneToCheck,
            membershipNumber: data.membershipNumber,
            joinYear: data.joinYear,
            finalStatus: data.finalStatus,
            totalRemaining: data.totalRemaining,
            originalDebt: data.originalDebt,
            savedAmount: data.savedAmount,
            isSettlementEnabled: data.isSettlementEnabled,
            notes: data.notes,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // استخدام معاملة لضمان أن رقم العضوية يُحدَّث ويُنشأ بشكل آمن في Firestore
        let generatedMembershipNumber = null;
        try {
            await db.runTransaction(async (t) => {
                const countersRef = db.collection('counters').doc('members');
                const countersDoc = await t.get(countersRef);
                const lastNumber = countersDoc.exists ? (countersDoc.data().lastNumber || 0) : 0;
                const newNumber = lastNumber + 1;
                t.set(countersRef, { lastNumber: newNumber }, { merge: true });

                const memberDocRef = db.collection('members').doc();
                // صيغة رقم العضوية: DSA-RI-0001, DSA-RI-0002, ...
                const formattedNumber = `DSA-RI-${String(newNumber).padStart(4, '0')}`;
                memberToSave.membershipNumber = formattedNumber;
                t.set(memberDocRef, memberToSave);

                // حفظ كل اشتراك في مجموعة subscriptions وربطه بمعرف العضو
                for (const year in data.subscriptions) {
                    const sub = data.subscriptions[year];
                    const subDocRef = db.collection('subscriptions').doc();
                    const subData = {
                        memberId: memberDocRef.id,
                        year: parseInt(year),
                        type: sub.type,
                        amount: sub.due,
                        paid: sub.paid,
                        remaining: sub.remaining,
                        status: sub.status,
                        settlement: !!sub.settlement,
                        notes: sub.notes || '',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        paymentDate: sub.paid && sub.paid > 0 ? firebase.firestore.FieldValue.serverTimestamp() : null
                    };
                    t.set(subDocRef, subData);
                }

                generatedMembershipNumber = formattedNumber;
            });
        } catch (err) {
            console.error('Transaction error:', err);
            loading.classList.remove('show');
            saveBtn.disabled = false;
            showMessage('❌ حدث خطأ أثناء إنشاء رقم العضوية أو حفظ البيانات. حاول مرة أخرى.', 'error');
            return;
        }

        // تحديث قيمة حقل رقم العضوية في الواجهة (حتى يراها المستخدم)
        if (generatedMembershipNumber) {
            const membershipInput = document.getElementById('membershipNumber');
            if (membershipInput) membershipInput.value = generatedMembershipNumber;
        }

        loading.classList.remove('show');
        saveBtn.disabled = false;

        // عرض رسالة النجاح (نفس المظهر السابق)
        const savedAmountText = data.savedAmount > 0 ? 
            `<p>المبلغ المستقطع بالتسوية: <strong>${data.savedAmount.toLocaleString()} ريال</strong></p>` : '';

        showMessage(`
            <h3><i class="fas fa-check-circle"></i> تم حفظ العضو بنجاح!</h3>
            <p>تم إضافة العضو <strong>${data.name}</strong> إلى النظام.</p>
            <p>رقم العضوية: <strong>${generatedMembershipNumber || data.membershipNumber || ''}</strong></p>
            <p>الحالة النهائية: <strong>${data.finalStatus}</strong></p>
            <p>المتأخرات النهائية: <strong>${data.totalRemaining.toLocaleString()} ريال</strong></p>
            ${savedAmountText}
            <p>سنوات الاشتراك: <strong>${data.yearsCount}</strong> سنة</p>
            <p>سنوات تمت تسويتها: <strong>${data.settledYears}</strong> سنة</p>
            <p><a href="index.html" style="color: #2c5aa0; text-decoration: underline; font-weight: bold;">
                اضغط هنا للذهاب إلى صفحة البحث والتحقق
            </a></p>
        `, 'success');

        // إعادة تعيين النموذج بعد 5 ثواني
        setTimeout(resetForm, 5000);

    } catch (error) {
        console.error('❌ خطأ أثناء حفظ البيانات:', error);
        showMessage(`❌ حدث خطأ أثناء حفظ البيانات: ${error.message}`, 'error');
        loading.classList.remove('show');
        saveBtn.disabled = false;
    }
}

// مسح النموذج
function resetForm() {
    if (confirm('هل تريد مسح جميع البيانات وإعادة البدء؟')) {
        // مسح حقول العضو
        document.getElementById('memberName').value = '';
        document.getElementById('memberPhone').value = '';
        document.getElementById('membershipNumber').value = '';
        document.getElementById('joinYear').value = '';
        document.getElementById('notes').value = '';
        
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
        
        // إعادة تعيين التحكم في التسوية
        document.getElementById('globalSettlementToggle').checked = false;
        
        // تمكين زر توليد الجدول
        document.getElementById('generateTableBtn').disabled = true;
        
        showMessage('تم مسح النموذج بنجاح. يمكنك الآن إدخال بيانات عضو جديد.', 'info');
    }
}

// إعداد الأحداث
function setupEventListeners() {
    // تحديث حالة زر توليد الجدول عند اختيار سنة الانضمام
    document.getElementById('joinYear').addEventListener('change', function() {
        const generateBtn = document.getElementById('generateTableBtn');
        generateBtn.disabled = !this.value;
    });
    
    // زر توليد جدول الاشتراكات
    document.getElementById('generateTableBtn').addEventListener('click', generateYearsTable);
    
    // تفعيل/تعطيل نظام التسوية
    document.getElementById('globalSettlementToggle').addEventListener('change', toggleGlobalSettlement);
    
    // زر التسوية التلقائية
    document.getElementById('autoSettleBtn').addEventListener('click', autoSettle);
    
    // زر تعبئة المثال مع التسوية
    document.getElementById('fillExampleBtn').addEventListener('click', fillSettlementExample);
    
    // زر مسح الجدول
    document.getElementById('clearTableBtn').addEventListener('click', clearTableData);
    
    // زر المعاينة
    document.getElementById('previewBtn').addEventListener('click', previewData);
    
    // زر الحفظ
    document.getElementById('saveBtn').addEventListener('click', saveData);
    
    // زر المسح
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

// عرض الرسائل
function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.innerHTML = text;
    messageDiv.className = `message ${type} show`;
    
    // إخفاء الرسالة بعد 10 ثواني
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 10000);
}