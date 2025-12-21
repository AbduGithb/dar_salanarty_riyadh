

// الحصول على عناصر DOM
const phoneInput = document.getElementById('phone');
const searchBtn = document.getElementById('searchBtn');
const loading = document.getElementById('loading');
const memberSection = document.getElementById('memberSection');
const subscriptionsSection = document.getElementById('subscriptionsSection');
const noResult = document.getElementById('noResult');
const memberInfo = document.getElementById('memberInfo');
const subscriptionsBody = document.getElementById('subscriptionsBody');
const summary = document.getElementById('summary');
const tryAgainBtn = document.getElementById('tryAgainBtn');

// دالة لحساب الرسوم بناءً على نوع الاشتراك والسنة
function calculateFee(type, year) {
    if (type === "none") return 0;
    if (type === "inside") return 1500;
    if (type === "outside") {
        return year <= 2025 ? 200 : 300;
    }
    return 0;
}

// دالة للحصول على نص نوع الاشتراك
function getTypeText(type) {
    switch(type) {
        case "inside": return "ساكن في الدار";
        case "outside": return "خارج الدار";
        case "none": return "غير مشترك";
        default: return "غير محدد";
    }
}

// دالة للحصول على حالة السداد
function getStatusText(subscription) {
    if (subscription.type === "none") return "غير مشترك";
    
    if (subscription.paid === 0) return "غير مسدد";
    if (subscription.paid >= subscription.fee) return "مسدد بالكامل";
    return "مسدد جزئياً";
}

// دالة للحصول على فئة الحالة
function getStatusClass(subscription) {
    if (subscription.type === "none") return "status-none";
    
    if (subscription.paid === 0) return "status-unpaid";
    if (subscription.paid >= subscription.fee) return "status-paid";
    return "status-partial";
}

// دالة للحصول على أيقونة الحالة
function getStatusIcon(subscription) {
    if (subscription.type === "none") return "—";
    
    if (subscription.paid === 0) return "❌";
    if (subscription.paid >= subscription.fee) return "✅";
    return "⚠️";
}

// دالة للبحث عن العضو
async function searchMember(phone) {
    // إخفاء جميع الأقسام
    memberSection.style.display = 'none';
    subscriptionsSection.style.display = 'none';
    noResult.style.display = 'none';

    // إظهار التحميل
    loading.style.display = 'block';

    // إذا كانت Firestore مهيأة، حاول البحث في DB
    if (firebaseInitialized && db) {
        try {
            const membersQuery = await db.collection('members').where('phone', '==', phone).limit(1).get();
            loading.style.display = 'none';

            if (!membersQuery.empty) {
                const doc = membersQuery.docs[0];
                const memberData = doc.data();
                const member = {
                    id: doc.id,
                    name: memberData.name || 'غير محدد',
                    phone: memberData.phone || phone,
                    membershipNumber: memberData.membershipNumber || '',
                    joinYear: memberData.joinYear || new Date().getFullYear(),
                    status: memberData.finalStatus || 'غير محدد',
                    totalPaid: memberData.totalPaid || 0,
                    totalDue: memberData.totalDue || 0,
                    totalRemaining: memberData.totalRemaining || 0,
                    subscriptions: {}
                };

                // جلب الاشتراكات من المجموعة subscriptions
                const subsSnapshot = await db.collection('subscriptions')
                    .where('memberId', '==', doc.id).get();

                subsSnapshot.forEach(sdoc => {
                    const s = sdoc.data();
                    member.subscriptions[s.year] = {
                        type: s.type || 'none',
                        fee: s.amount || calculateFee(s.type, s.year),
                        paid: s.paid || 0,
                        notes: s.notes || '',
                        settlement: !!s.settlement
                    };
                });

                displayMemberInfo(member);
                displaySubscriptions(member);

                // إظهار الأقسام
                memberSection.style.display = 'block';
                subscriptionsSection.style.display = 'block';
                return;
            }

            // إذا لم يتم العثور على عضو في DB، عرض لا توجد نتيجة
            noResult.style.display = 'block';
            return;

        } catch (err) {
            console.error('Error querying Firestore:', err);
            // فشل البحث في DB → استخدام mock كنسخة احتياطية
        }
    }

    // إن لم تكن Firestore مهيأة أو حدث خطأ، استخدم بيانات وهمية مع محاكاة تأخير الشبكة
    setTimeout(() => {
        const member = mockMembers.find(m => m.phone === phone);

        // إخفاء التحميل
        loading.style.display = 'none';

        if (member) {
            displayMemberInfo(member);
            displaySubscriptions(member);

            // إظهار الأقسام
            memberSection.style.display = 'block';
            subscriptionsSection.style.display = 'block';
        } else {
            noResult.style.display = 'block';
        }
    }, 500);
}

// دالة لعرض معلومات العضو
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
            <div class="info-value">${member.membershipNumber}</div>
        </div>
        <div class="info-card">
            <div class="info-label">سنة الانضمام</div>
            <div class="info-value">${member.joinYear}</div>
        </div>
        <div class="info-card">
            <div class="info-label">الحالة العامة</div>
            <div class="info-value status-cell ${member.status === 'مسدد' ? 'status-paid' : 
                                                member.status === 'مسدد جزئياً' ? 'status-partial' : 
                                                'status-unpaid'}">
                ${member.status}
            </div>
        </div>
    `;
}

// دالة لعرض الاشتراكات السنوية
function displaySubscriptions(member) {
    let tableHTML = '';
    let totalDue = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let yearsCount = 0;
    let paidYears = 0;
    let unpaidYears = 0;
    
    // ابدأ من سنة الانضمام الفعلية للعضو إن كانت متاحة، وإلا من 2015
    const startYear = member.joinYear ? parseInt(member.joinYear) : 2015;
    const endYear = 2026;
    
    let settledYears = 0;
    for (let year = startYear; year <= endYear; year++) {
        const subscription = member.subscriptions[year] || { 
            type: "none", 
            fee: calculateFee("none", year), 
            paid: 0, 
            notes: "لا توجد بيانات",
            settlement: false
        };
        
        // حساب الرسوم إذا لم تكن موجودة
        if (!subscription.fee && subscription.type !== "none") {
            subscription.fee = calculateFee(subscription.type, year);
        }
        
        const remainingOriginal = Math.max(0, subscription.fee - subscription.paid);
        const isSettled = !!subscription.settlement;
        // إذا كانت السنة تمت تسويتها، لا تُحسب المتأخرات لها
        const remainingForSummary = isSettled ? 0 : remainingOriginal;

        const statusText = getStatusText(subscription);
        const statusClass = getStatusClass(subscription);
        const statusIcon = getStatusIcon(subscription);
        const typeText = getTypeText(subscription.type);
        
        // عرض ملاحظة واضحة إن كانت السنة تمّت تسويتها
        const notesDisplay = subscription.notes || (isSettled ? 'تمت التسوية' : '—');
        const remainingDisplay = remainingOriginal.toLocaleString();
        
        tableHTML += `
            <tr ${isSettled ? 'class="settled-row"' : ''}>
                <td>${year}</td>
                <td>${typeText}</td>
                <td>${subscription.fee.toLocaleString()}</td>
                <td>${subscription.paid.toLocaleString()}</td>
                <td>${remainingDisplay}${isSettled ? ' <small class="muted">(مُخصم بالتسوية)</small>' : ''}</td>
                <td>
                    <span class="status-cell ${statusClass}">
                        ${statusIcon} ${statusText}
                    </span>
                </td>
                <td>${notesDisplay}</td>
            </tr>
        `;
        
        // تحديث الإحصائيات
        if (subscription.type !== "none") {
            yearsCount++;
            totalDue += subscription.fee;
            totalPaid += subscription.paid;
            // استخدم القيمة التي تستبعد المبلغ الذي عليه تسوية
            totalRemaining += remainingForSummary;
            
            if (isSettled) {
                settledYears++;
            } else if (subscription.paid >= subscription.fee) {
                paidYears++;
            } else if (subscription.paid > 0) {
                // مسدد جزئياً
            } else {
                unpaidYears++;
            }
        }
    }
    
    subscriptionsBody.innerHTML = tableHTML;

    // تحديث عنوان القسم ليعرض نطاق السنوات الفعلي
    const titleEl = document.querySelector('#subscriptionsSection .section-title');
    if (titleEl) {
        titleEl.innerHTML = `<i class="fas fa-calendar-alt"></i> حالة الاشتراكات السنوية (${startYear}-${endYear})`;
    }
    
    // عرض الملخص (تمت إضافة عدد سنوات التسوية)
    displaySummary(member, totalDue, totalPaid, totalRemaining, yearsCount, paidYears, unpaidYears, settledYears);
}

// دالة لعرض الملخص
function displaySummary(member, totalDue, totalPaid, totalRemaining, yearsCount, paidYears, unpaidYears, settledYears = 0) {
    const currentYear = new Date().getFullYear();
    const subscriptionYears = Object.keys(member.subscriptions)
        .map(year => parseInt(year))
        .filter(year => member.subscriptions[year].type !== "none");
    
    const startYear = Math.min(...subscriptionYears);
    const endYear = Math.max(...subscriptionYears);
    
    summary.innerHTML = `
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-value">${yearsCount}</div>
                <div class="summary-label">عدد سنوات الاشتراك</div>
            </div>
            <div class="summary-item paid">
                <div class="summary-value" style="color: #4CAF50;">${paidYears}</div>
                <div class="summary-label">سنوات مسددة بالكامل</div>
            </div>
            <div class="summary-item partial">
                <div class="summary-value">${settledYears}</div>
                <div class="summary-label">سنوات تمت تسويتها</div>
            </div>
            <div class="summary-item unpaid">
                <div class="summary-value" style="color: #f44336;">${unpaidYears}</div>
                <div class="summary-label">سنوات غير مسددة</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${startYear}-${endYear}</div>
                <div class="summary-label">فترة الاشتراك</div>
            </div>
        </div>
        
        <div class="summary-total">
            <h3><i class="fas fa-calculator"></i> ملخص مالي</h3>
            <div class="amount">${totalRemaining.toLocaleString()} ريال</div>
            <p>المبلغ الإجمالي المتأخر (بدون مبالغ التسوية)</p>
            <div style="display: flex; justify-content: center; gap: 30px; margin-top: 15px;">
                
                <div>
                    <div style="font-size: 3rem; font-weight: 600; color: #4CAF50;">${totalPaid.toLocaleString()}</div>
                    <div style="font-size: 0.9rem;">إجمالي المدفوع</div>
                </div>
            </div>
        </div>
    `;
}

// إضافة Event Listeners
searchBtn.addEventListener('click', () => {
    const phone = phoneInput.value.trim();
    
    if (!phone || !/^05\d{8}$/.test(phone)) {
        alert('يرجى إدخال رقم جوال صحيح (10 أرقام تبدأ بـ 05)');
        phoneInput.focus();
        return;
    }
    
    searchMember(phone);
});

phoneInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchBtn.click();
    }
});

tryAgainBtn.addEventListener('click', () => {
    noResult.style.display = 'none';
    phoneInput.value = '';
    phoneInput.focus();
});

// تعيين رقم افتراضي للعرض التوضيحي
window.onload = async () => {
    phoneInput.value = "0502191635";

    // تهيئة Firebase مبكراً لتمكين البحث من قاعدة البيانات
    try {
        await initializeFirebase();
    } catch (e) {
        console.warn('Firebase initialization failed or skipped:', e);
    }
};

// تهيئة Firebase
let db;
let firebaseInitialized = false;
async function initializeFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            console.warn('Firebase library not loaded. Skipping DB initialization.');
            return;
        }
        if (typeof firebaseConfig === 'undefined') {
            console.warn('firebase-config.js not found. Skipping DB initialization.');
            return;
        }

        if (firebaseConfig.apiKey && firebaseConfig.apiKey.includes('ABCDEFGHIJKLMNOPQRSTUVWXYZ')) {
            console.warn('Firebase config appears to be a placeholder. Skipping DB initialization.');
            return;
        }

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('✅ Firebase initialized');
        } else {
            console.log('✅ Firebase already initialized');
        }

        db = firebase.firestore();
        firebaseInitialized = true;

        return;
    } catch (err) {
        console.error('Error initializing Firebase:', err);
        throw err;
    }
} 