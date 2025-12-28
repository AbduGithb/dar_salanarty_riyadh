// Firebase removed — Supabase is used instead
// =============================================
// 2. المتغيرات العامة
// =============================================
let currentMember = null;
let unpaidSubscriptions = [];
let selectedPayments = {}; 

// =============================================
// 3. تهيئة الصفحة
// =============================================
$(document).ready(function () {
    console.log('🚀 بدء تحميل صفحة سداد المتأخرات...');
    // تهيئة Supabase (إن وُجد)
    if (typeof supabaseInit === 'function') supabaseInit();
    initUI();
});

// =============================================
// 4. Firebase initialization removed (Supabase-only)
// =============================================
// The project no longer uses Firebase for payments. Ensure `supabaseInit()` is called and `window.supabaseDB` is available.



// =============================================
// 5. تهيئة واجهة المستخدم
// =============================================
function initUI() {
    // إعداد أحداث البحث
    $('#searchMemberBtn').click(searchMember);
    $('#searchMember').on('keypress', function (e) {
        if (e.which === 13) searchMember();
    });

    // إعداد حدث تأكيد السداد
    $('#confirmPaymentBtn').click(confirmPayment);
    
    // إعداد حدث إلغاء السداد
    $('#cancelPaymentBtn').click(function () {
        resetPaymentSection();
    });

    // إعداد تاريخ اليوم كتاريخ افتراضي للسداد
    const today = new Date().toISOString().split('T')[0];
    $('#paymentDate').val(today);

    console.log('✅ تم تهيئة واجهة المستخدم');
}

// =============================================
// 6. البحث عن العضو
// =============================================
async function searchMember() {
    const searchTerm = $('#searchMember').val().trim();
    
    if (!searchTerm) {
        showMessage('يرجى إدخال اسم العضو أو رقم الجوال للبحث', 'error');
        return;
    }

    // Ensure Supabase is available
    if (!window.supabaseInitialized || !window.supabaseDB) {
        showMessage('❌ قاعدة البيانات غير متاحة. يرجى تهيئة Supabase.', 'error');
        return;
    }

    showMessage('جاري البحث عن العضو...', 'info');

    try {
        const members = await window.supabaseDB.searchMembersByNameOrPhone(searchTerm);
        if (!members || members.length === 0) {
            showMessage('لم يتم العثور على أي عضو بهذا الاسم أو رقم الجوال', 'error');
            $('#searchResults').hide();
            return;
        }
        displaySearchResults(members);
        return;
    } catch (err) {
        console.error('⚠️ خطأ في جلب الأعضاء من Supabase:', err);
        showMessage('حدث خطأ في البحث عبر قاعدة البيانات الجديدة', 'error');
        return;
    }
}

// =============================================
// 7. عرض نتائج البحث
// =============================================
function displaySearchResults(membersSnapshotOrArray) {
    const resultsDiv = $('#searchResults');
    resultsDiv.empty();

    if (Array.isArray(membersSnapshotOrArray)) {
        membersSnapshotOrArray.forEach((m, index) => {
            const id = m.id || m.__firestore_id || '';
            const member = {
                name: m.name || m.full_name || '',
                phone: m.phone || '',
                membershipNumber: m.membership_number || m.membershipNumber || '',
                joinYear: m.join_year || m.joinYear || ''
            };

            const resultItem = `
                <div class="search-result-item" data-member-id="${id}">
                    <div class="result-info">
                        <h4>${member.name || 'غير محدد'}</h4>
                        <p><strong>رقم الجوال:</strong> ${member.phone || 'غير محدد'}</p>
                        <p><strong>رقم العضوية:</strong> ${member.membershipNumber || 'غير محدد'}</p>
                        <p><strong>سنة الانضمام:</strong> ${member.joinYear || 'غير محدد'}</p>
                    </div>
                    <button type="button" class="btn-primary select-member-btn" data-member-id="${id}">
                        <i class="fas fa-check"></i> اختيار
                    </button>
                </div>
            `;
            resultsDiv.append(resultItem);
        });
    } else {
        membersSnapshotOrArray.forEach((doc, index) => {
            const member = doc.data();
            const resultItem = `
                <div class="search-result-item" data-member-id="${doc.id}">
                    <div class="result-info">
                        <h4>${member.name || 'غير محدد'}</h4>
                        <p><strong>رقم الجوال:</strong> ${member.phone || 'غير محدد'}</p>
                        <p><strong>رقم العضوية:</strong> ${member.membershipNumber || 'غير محدد'}</p>
                        <p><strong>سنة الانضمام:</strong> ${member.joinYear || 'غير محدد'}</p>
                    </div>
                    <button type="button" class="btn-primary select-member-btn" data-member-id="${doc.id}">
                        <i class="fas fa-check"></i> اختيار
                    </button>
                </div>
            `;
            resultsDiv.append(resultItem);
        });
    }

    resultsDiv.show();
    
    // إعداد أحداث اختيار العضو
    $('.select-member-btn').click(function () {
        const memberId = $(this).data('member-id');
        loadMemberForPayment(memberId);
    });
}

// =============================================
// 8. تحميل العضو للسداد
// =============================================
async function loadMemberForPayment(memberId) {
    if (!window.supabaseInitialized || !window.supabaseDB) {
        showMessage('❌ قاعدة البيانات غير متاحة', 'error');
        return;
    }

    showMessage('جاري تحميل بيانات العضو...', 'info');
    
    try {
        // جلب بيانات العضو عبر Supabase
        const { member } = await window.supabaseDB.getMemberById(memberId);
        if (!member) {
            showMessage('لم يتم العثور على العضو', 'error');
            return;
        }

        currentMember = {
            id: member.id,
            name: member.name || member.full_name || '',
            phone: member.phone || '',
            membershipNumber: member.membership_number || member.membershipNumber || '',
            joinYear: member.join_year || member.joinYear || ''
        };

        // عرض معلومات العضو
        displayMemberInfo();
        
        // جلب الاشتراكات المتأخرة
        await loadUnpaidSubscriptions();

        // إخفاء نتائج البحث
        $('#searchResults').hide();
        $('#searchMember').val('');

    } catch (error) {
        console.error('❌ خطأ في تحميل بيانات العضو:', error);
        showMessage(`حدث خطأ في تحميل البيانات: ${error.message}`, 'error');
    }
}

// =============================================
// 9. عرض معلومات العضو
// =============================================
function displayMemberInfo() {
    if (!currentMember) return;

    $('#paymentMemberName').text(currentMember.name || 'غير محدد');
    $('#paymentMemberPhone').text(currentMember.phone || 'غير محدد');
    $('#paymentMemberNumber').text(currentMember.membershipNumber || 'غير محدد');
    $('#paymentMemberJoinYear').text(currentMember.joinYear || 'غير محدد');
    
    $('#paymentSection').show();
}

// =============================================
// 10. جلب الاشتراكات المتأخرة
// =============================================
async function loadUnpaidSubscriptions() {
    if (!currentMember) return;
    if (!window.supabaseInitialized || !window.supabaseDB) return;

    try {
        // جلب جميع اشتراكات العضو من Supabase
        const subs = await window.supabaseDB.getSubscriptionsByMemberId(currentMember.id);

        unpaidSubscriptions = [];
        selectedPayments = {};

        (subs || []).forEach(subData => {
            const amount = subData.amount_due || subData.amount || (subData.year === 2026 ? 300 : 200);
            const paidAmount = subData.amount_paid || subData.paidAmount || 0;
            const remaining = Math.max(0, amount - paidAmount);

            if (remaining > 0) {
                unpaidSubscriptions.push({
                    id: subData.id || subData.subscription_id || '',
                    year: subData.year,
                    amount: amount,
                    paidAmount: paidAmount,
                    remaining: remaining,
                    subscriptionType: subData.year === 2026 ? 'جديد (300 ريال)' : 'عادي (200 ريال)',
                    isSettled: !!subData.settlement
                });
            }
        });

        // عرض الاشتراكات المتأخرة
        displayUnpaidSubscriptions();

    } catch (error) {
        console.error('❌ خطأ في جلب الاشتراكات:', error);
        showMessage(`حدث خطأ في جلب الاشتراكات: ${error.message}`, 'error');
    }
}

// =============================================
// 11. عرض الاشتراكات المتأخرة
// =============================================
function displayUnpaidSubscriptions() {
    const subscriptionsList = $('#subscriptionsList');
    subscriptionsList.empty();

    if (unpaidSubscriptions.length === 0) {
        subscriptionsList.html(`
            <div class="no-subscriptions">
                <i class="fas fa-check-circle"></i>
                <p>لا توجد متأخرات لهذا العضو</p>
            </div>
        `);
        return;
    }

    unpaidSubscriptions.forEach((sub, index) => {
        const subscriptionItem = `
            <div class="subscription-item">
                <div class="subscription-header">
                    <h4>سنة ${sub.year}</h4>
                    <span class="subscription-type ${sub.subscriptionType.includes('جديد') ? 'new' : 'normal'}">
                        ${sub.subscriptionType}
                    </span>
                </div>
                
                <div class="subscription-details">
                    <div class="detail-row">
                        <span class="detail-label">المبلغ الكلي:</span>
                        <span class="detail-value">${sub.amount} ريال</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">المسدد:</span>
                        <span class="detail-value">${sub.paidAmount} ريال</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">المتبقي:</span>
                        <span class="detail-value remaining">${sub.remaining} ريال</span>
                    </div>
                </div>
                
                <div class="payment-input">
                    <label for="payment_${index}">مبلغ السداد:</label>
                    <div class="input-with-suffix">
                        <input type="number" 
                               id="payment_${index}" 
                               min="0" 
                               max="${sub.remaining}" 
                               value="0" 
                               step="1"
                               data-index="${index}"
                               data-remaining="${sub.remaining}"
                               class="payment-amount-input">
                        <span class="input-suffix">ريال</span>
                    </div>
                </div>
            </div>
        `;
        subscriptionsList.append(subscriptionItem);
    });

    // إعداد أحداث حقل الإدخال
    $('.payment-amount-input').on('input', updatePaymentSummary);
}

// =============================================
// 12. تحديث ملخص المدفوعات
// =============================================
function updatePaymentSummary() {
    selectedPayments = {};
    let totalSelected = 0;

    // جمع المبالغ المدخلة
    $('.payment-amount-input').each(function () {
        const index = $(this).data('index');
        const amount = parseFloat($(this).val()) || 0;
        const remaining = $(this).data('remaining');
        
        if (amount > 0) {
            if (amount > remaining) {
                $(this).val(remaining);
                selectedPayments[index] = remaining;
                totalSelected += remaining;
            } else {
                selectedPayments[index] = amount;
                totalSelected += amount;
            }
        }
    });

    // تحديث إجمالي المبلغ المحدد
    $('#totalSelectedAmount').text(totalSelected.toFixed(2));
}

// =============================================
// 13. تأكيد السداد
// =============================================
async function confirmPayment() {
    const totalSelected = Object.values(selectedPayments).reduce((sum, amount) => sum + amount, 0);
    const paymentDate = $('#paymentDate').val();
    
    if (totalSelected === 0) {
        showMessage('لم يتم تحديد أي مبلغ للسداد', 'error');
        return;
    }

    if (!paymentDate) {
        showMessage('يرجى تحديد تاريخ السداد', 'error');
        return;
    }

    if (!confirm(`هل تريد تأكيد سداد مبلغ ${totalSelected.toFixed(2)} ريال للعضو ${currentMember.name}؟`)) {
        return;
    }

    try {
        $('#confirmPaymentBtn').prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> جاري المعالجة...');
        
        const timestamp = new Date().toISOString();
        const promisesToRun = [];

        // تحديث كل اشتراك تم سداده
        for (const [index, amount] of Object.entries(selectedPayments)) {
            const subIndex = parseInt(index);
            if (subIndex >= 0 && subIndex < unpaidSubscriptions.length) {
                const subscription = unpaidSubscriptions[subIndex];
                const newPaidAmount = subscription.paidAmount + amount;
                const isFullyPaid = newPaidAmount >= subscription.amount;

                promisesToRun.push(
                    window.supabaseDB.updateSubscription(subscription.id, {
                        paid_amount: newPaidAmount,
                        paid: isFullyPaid,
                        payment_date: timestamp,
                        updated_at: timestamp,
                        last_payment: JSON.stringify({ amount: amount, date: timestamp })
                    }).then(() => {
                        return window.supabaseDB.addPaymentRecord({
                            member_id: currentMember.id,
                            subscription_id: subscription.id,
                            amount: amount,
                            created_at: timestamp,
                            payment_date: paymentDate
                        }).catch(err => {
                            console.warn('⚠️ فشل إضافة سجل الدفع في Supabase:', err);
                            return null;
                        });
                    })
                );
            }
        }

        // تنفيذ جميع التحديثات
        await Promise.all(promisesToRun);

        // تحديث بيانات العضو
        await window.supabaseDB.updateMember(currentMember.id, { updated_at: timestamp });

        showMessage(`تم سداد ${totalSelected.toFixed(2)} ريال بنجاح للعضو ${currentMember.name}`, 'success');
        
        // إعادة تعيين القسم
        setTimeout(() => {
            resetPaymentSection();
        }, 2000);

    } catch (error) {
        console.error('❌ خطأ في معالجة السداد:', error);
        showMessage(`حدث خطأ في السداد: ${error.message}`, 'error');
    } finally {
        $('#confirmPaymentBtn').prop('disabled', false).html('<i class="fas fa-check-circle"></i> تأكيد السداد');
    }
}

// =============================================
// 14. إعادة تعيين قسم السداد
// =============================================
function resetPaymentSection() {
    currentMember = null;
    unpaidSubscriptions = [];
    selectedPayments = {};
    
    $('#paymentSection').hide();
    $('#searchResults').hide();
    $('#searchMember').val('');
    $('#paymentDate').val(new Date().toISOString().split('T')[0]);
    
    showMessage('تم إعادة تعيين نموذج السداد', 'info');
}

// =============================================
// 15. دوال مساعدة
// =============================================
function showMessage(text, type) {
    $('#message').html(text);
    $('#message').removeClass('success error info');
    $('#message').addClass(`${type} show`);

    setTimeout(() => {
        $('#message').removeClass('show');
    }, 5000);
}

