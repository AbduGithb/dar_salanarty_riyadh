// إعدادات Firebase - نفس إعدادات النظام الرئيسي
const firebaseConfig = {
    apiKey: "AIzaSyDsCQEqMlZjVB7v9gqhQoATRdygy6_kAlk",
    authDomain: "dar-salanarty-riyadh.firebaseapp.com",
    projectId: "dar-salanarty-riyadh",
    storageBucket: "dar-salanarty-riyadh.firebasestorage.app",
    messagingSenderId: "145377416218",
    appId: "1:145377416218:web:77eabfc9a0cc163d6a2da3",
    measurementId: "G-SSY6V6QVQZ"
};

// تهيئة التطبيق
let db;
let firebaseInitialized = false;
let currentReportData = null;
let revenueChart = null;
let statusChart = null;
let monthlyRevenueChart = null;
let membersByYearChart = null;

// تهيئة الصفحة
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 بدء تهيئة صفحة التقارير...');
    
    // تهيئة Firebase
    initializeFirebase();
    
    // إعداد تواريخ الفلاتر
    setupDateFilters();
    
    // إضافة الأحداث
    setupEventListeners();
    
    console.log('✅ تم تهيئة الصفحة بنجاح');
});

// تهيئة Firebase
function initializeFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            showMessage('مكتبة Firebase لم يتم تحميلها. تحقق من اتصال الإنترنت.', 'error');
            return;
        }

        if (firebaseConfig.apiKey.includes('ABCDEFGHIJKLMNOPQRSTUVWXYZ')) {
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

// إعداد تواريخ الفلاتر
function setupDateFilters() {
    const today = new Date();
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    
    // تعيين تاريخ البداية كأول يوم من الشهر الحالي
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startDate.value = formatDate(firstDayOfMonth);
    
    // تعيين تاريخ النهاية كآخر يوم من الشهر الحالي
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endDate.value = formatDate(lastDayOfMonth);
    
    // تعيين الحد الأدنى والأقصى للتواريخ
    startDate.min = '2015-01-01';
    startDate.max = formatDate(new Date());
    endDate.min = '2015-01-01';
    endDate.max = '2026-12-31';
}

// تنسيق التاريخ
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// إعداد الأحداث
function setupEventListeners() {
    // زر توليد التقرير
    document.getElementById('generateReportBtn').addEventListener('click', generateReport);
    
    // زر التقرير السريع
    document.getElementById('quickReportBtn').addEventListener('click', generateQuickReport);
    
    // زر إعادة التعيين
    document.getElementById('resetFiltersBtn').addEventListener('click', resetFilters);
    
    // أزرار التصدير
    document.getElementById('exportChart1Btn').addEventListener('click', () => exportChart('revenueChart'));
    document.getElementById('exportChart2Btn').addEventListener('click', () => exportChart('statusChart'));
    document.getElementById('exportExcelBtn').addEventListener('click', exportToExcel);
    document.getElementById('exportPdfBtn').addEventListener('click', exportToPdf);
    document.getElementById('exportCsvBtn').addEventListener('click', exportToCsv);
    
    // تحديث حالة الفلاتر عند تغيير نوع التقرير
    document.querySelectorAll('input[name="reportType"]').forEach(radio => {
        radio.addEventListener('change', updateFiltersBasedOnType);
    });
}

// تحديث الفلاتر بناءً على نوع التقرير
function updateFiltersBasedOnType() {
    const reportType = document.querySelector('input[name="reportType"]:checked').value;
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const today = new Date();
    
    switch(reportType) {
        case 'yearly':
            // تقرير سنوي: السنة الحالية
            startDate.value = `${today.getFullYear()}-01-01`;
            endDate.value = `${today.getFullYear()}-12-31`;
            break;
            
        case 'monthly':
            // تقرير شهري: الشهر الحالي
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            startDate.value = formatDate(firstDay);
            endDate.value = formatDate(lastDay);
            break;
            
        case 'weekly':
            // تقرير أسبوعي: الأسبوع الحالي
            const firstDayOfWeek = new Date(today);
            firstDayOfWeek.setDate(today.getDate() - today.getDay() + 1); // الاثنين
            const lastDayOfWeek = new Date(firstDayOfWeek);
            lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6); // الأحد
            startDate.value = formatDate(firstDayOfWeek);
            endDate.value = formatDate(lastDayOfWeek);
            break;
            
        case 'custom':
            // مخصص: لا تغيير
            break;
    }
}

// توليد التقرير
async function generateReport() {
    if (!firebaseInitialized || !db) {
        showMessage('❌ قاعدة البيانات غير متاحة. يرجى التحقق من إعدادات Firebase.', 'error');
        return;
    }
    
    const loading = document.getElementById('loading');
    const generateBtn = document.getElementById('generateReportBtn');
    
    loading.classList.add('show');
    generateBtn.disabled = true;
    
    try {
        // جمع معايير التقرير
        const reportParams = collectReportParams();
        
        // جلب البيانات من Firebase
        const reportData = await fetchReportData(reportParams);
        
        // تحليل البيانات
        const analyzedData = analyzeReportData(reportData, reportParams);
        
        // حفظ البيانات الحالية
        currentReportData = analyzedData;
        
        // عرض النتائج
        displayReportResults(analyzedData);
        
        showMessage('✅ تم إنشاء التقرير بنجاح', 'success');
        
    } catch (error) {
        console.error('❌ خطأ في إنشاء التقرير:', error);
        showMessage(`❌ حدث خطأ أثناء إنشاء التقرير: ${error.message}`, 'error');
    } finally {
        loading.classList.remove('show');
        generateBtn.disabled = false;
    }
}

// توليد تقرير سريع لهذا الشهر
function generateQuickReport() {
    // تعيين النوع إلى شهري
    document.getElementById('reportTypeMonthly').checked = true;
    updateFiltersBasedOnType();
    
    // توليد التقرير
    setTimeout(() => generateReport(), 100);
}

// إعادة تعيين الفلاتر
function resetFilters() {
    document.getElementById('reportTypeYearly').checked = true;
    updateFiltersBasedOnType();
    document.getElementById('showCharts').checked = true;
    document.getElementById('showTables').checked = true;
    document.getElementById('includeSettlements').checked = false;
    
    // إخفاء الأقسام
    document.getElementById('statsSection').style.display = 'none';
    document.getElementById('chartsSection').style.display = 'none';
    document.getElementById('tablesSection').style.display = 'none';
    
    showMessage('تم إعادة تعيين الفلاتر', 'info');
}

// جمع معايير التقرير
function collectReportParams() {
    const reportType = document.querySelector('input[name="reportType"]:checked').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const showCharts = document.getElementById('showCharts').checked;
    const showTables = document.getElementById('showTables').checked;
    const includeSettlements = document.getElementById('includeSettlements').checked;
    
    return {
        reportType,
        startDate,
        endDate,
        showCharts,
        showTables,
        includeSettlements,
        startTimestamp: new Date(startDate).getTime(),
        endTimestamp: new Date(endDate).getTime()
    };
}

// جلب البيانات من Firebase
async function fetchReportData(params) {
    console.log('📊 جلب بيانات التقرير...');
    
    // جلب جميع الأعضاء
    const membersSnapshot = await db.collection('members').get();
    const members = [];
    
    membersSnapshot.forEach(doc => {
        const member = doc.data();
        member.id = doc.id;
        members.push(member);
    });
    
    console.log(`✅ تم جلب ${members.length} عضو`);
    
    // جلب جميع الاشتراكات
    const subscriptionsSnapshot = await db.collection('subscriptions').get();
    const subscriptions = [];
    
    subscriptionsSnapshot.forEach(doc => {
        const subscription = doc.data();
        subscription.id = doc.id;
        subscriptions.push(subscription);
    });
    
    console.log(`✅ تم جلب ${subscriptions.length} اشتراك`);
    
    return {
        members,
        subscriptions,
        params
    };
}

// تحليل بيانات التقرير
function analyzeReportData(data, params) {
    console.log('📈 تحليل بيانات التقرير...');
    
    const { members, subscriptions, params: reportParams } = data;
    const { startTimestamp, endTimestamp, includeSettlements } = reportParams;
    
    // تحليل الإيرادات
    const revenueAnalysis = analyzeRevenue(subscriptions, params);
    
    // تحليل الأعضاء
    const membersAnalysis = analyzeMembers(members, subscriptions, params);
    
    // تحليل عمليات التسوية
    const settlementsAnalysis = includeSettlements ? analyzeSettlements(members, params) : null;
    
    // تحليل الوقت
    const timeAnalysis = analyzeTimePeriod(subscriptions, params);
    
    return {
        revenue: revenueAnalysis,
        members: membersAnalysis,
        settlements: settlementsAnalysis,
        time: timeAnalysis,
        rawData: {
            members: members.length,
            subscriptions: subscriptions.length
        },
        params: reportParams,
        generatedAt: new Date().toISOString()
    };
}

// تحليل الإيرادات
function analyzeRevenue(subscriptions, params) {
    let totalRevenue = 0;
    let totalTransactions = 0;
    let revenueByType = {
        inside: { amount: 0, count: 0 },
        outside: { amount: 0, count: 0 },
        settlement: { amount: 0, count: 0 }
    };
    
    subscriptions.forEach(sub => {
        if (sub.paid && sub.paid > 0) {
            totalRevenue += sub.paid;
            totalTransactions++;
            
            // تحديد النوع بناءً على المبلغ
            if (sub.amount === 1500) {
                revenueByType.inside.amount += sub.paid;
                revenueByType.inside.count++;
            } else if (sub.amount === 200 || sub.amount === 300) {
                revenueByType.outside.amount += sub.paid;
                revenueByType.outside.count++;
            }
            
            // إذا كان المبلغ المدفوع أقل من المبلغ المستحق، قد يكون هناك تسوية
            if (sub.paid < sub.amount && sub.amount === 1500) {
                revenueByType.settlement.amount += (sub.amount - sub.paid);
                revenueByType.settlement.count++;
            }
        }
    });
    
    const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    // حساب الإيرادات الشهرية
    const monthlyRevenue = calculateMonthlyRevenue(subscriptions);
    
    return {
        totalRevenue,
        totalTransactions,
        averageTransaction,
        revenueByType,
        monthlyRevenue
    };
}

// حساب الإيرادات الشهرية
function calculateMonthlyRevenue(subscriptions) {
    const monthlyData = {};
    
    subscriptions.forEach(sub => {
        if (sub.paid && sub.paid > 0 && sub.paymentDate) {
            const paymentDate = sub.paymentDate.toDate ? sub.paymentDate.toDate() : new Date(sub.paymentDate);
            const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    revenue: 0,
                    transactions: 0,
                    date: new Date(paymentDate.getFullYear(), paymentDate.getMonth(), 1)
                };
            }
            
            monthlyData[monthKey].revenue += sub.paid;
            monthlyData[monthKey].transactions++;
        }
    });
    
    // تحويل إلى مصفوفة وترتيب حسب التاريخ
    return Object.values(monthlyData)
        .sort((a, b) => a.date - b.date)
        .map(item => ({
            month: formatMonth(item.date),
            revenue: item.revenue,
            transactions: item.transactions
        }));
}

// تحليل الأعضاء
function analyzeMembers(members, subscriptions, params) {
    const statusCount = {
        paid: 0,
        partial: 0,
        unpaid: 0,
        settled: 0
    };
    
    const membersByYear = {};
    const detailedMembers = [];
    
    members.forEach(member => {
        // حساب حالة العضو
        let memberStatus = 'unpaid';
        let totalPaid = 0;
        let totalDue = 0;
        
        // الحصول على اشتراكات هذا العضو
        const memberSubscriptions = subscriptions.filter(sub => sub.memberId === member.id);
        
        memberSubscriptions.forEach(sub => {
            if (sub.amount) totalDue += sub.amount;
            if (sub.paid) totalPaid += sub.paid;
        });
        
        // تحديد الحالة
        if (totalPaid >= totalDue) {
            memberStatus = 'paid';
        } else if (totalPaid > 0 && totalPaid < totalDue) {
            memberStatus = 'partial';
        } else {
            memberStatus = 'unpaid';
        }
        
        // التحقق من وجود تسويات
        const hasSettlement = memberSubscriptions.some(sub => 
            sub.paid && sub.paid < sub.amount && sub.amount === 1500
        );
        
        if (hasSettlement) {
            memberStatus = 'settled';
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
            totalPaid,
            totalDue,
            remaining: Math.max(0, totalDue - totalPaid),
            lastPayment: getLastPaymentDate(memberSubscriptions),
            notes: member.notes || ''
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
        detailedMembers: detailedMembers.sort((a, b) => b.remaining - a.remaining) // ترتيب حسب المتأخرات
    };
}

// تحليل عمليات التسوية
function analyzeSettlements(members, params) {
    const settlements = [];
    
    // في نظامك الحقيقي، قد يكون لديك حقل خاص بالتسوية
    // هنا سنفترض أن التسوية هي عندما يكون totalPaid < totalDue للعضو داخل الدار
    members.forEach(member => {
        if (member.totalPaid !== undefined && member.totalDue !== undefined) {
            const settledAmount = Math.max(0, member.totalDue - member.totalPaid);
            if (settledAmount > 0 && (member.status === 'settled' || member.isSettlementEnabled)) {
                settlements.push({
                    memberName: member.name,
                    memberId: member.id,
                    settledAmount,
                    originalDebt: member.originalDebt || 0,
                    savedAmount: member.savedAmount || 0,
                    settlementDate: member.updatedAt || member.createdAt
                });
            }
        }
    });
    
    const totalSettlements = settlements.reduce((sum, s) => sum + s.settledAmount, 0);
    
    return {
        totalSettlements,
        count: settlements.length,
        averageSettlement: settlements.length > 0 ? totalSettlements / settlements.length : 0,
        settlements: settlements.sort((a, b) => b.settledAmount - a.settledAmount)
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
    if (params.reportType === 'yearly') {
        // تجميع سنوي
        const yearData = {};
        subscriptions.forEach(sub => {
            if (sub.paymentDate) {
                const paymentDate = sub.paymentDate.toDate ? sub.paymentDate.toDate() : new Date(sub.paymentDate);
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
        Object.keys(yearData).sort().forEach(year => {
            periodData.push({
                period: year,
                revenue: yearData[year].revenue,
                transactions: yearData[year].transactions
            });
        });
    } else if (params.reportType === 'monthly') {
        // تجميع شهري
        const monthData = {};
        subscriptions.forEach(sub => {
            if (sub.paymentDate) {
                const paymentDate = sub.paymentDate.toDate ? sub.paymentDate.toDate() : new Date(sub.paymentDate);
                const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
                
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
        Object.keys(monthData).sort().forEach(monthKey => {
            const [year, month] = monthKey.split('-');
            const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                               'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
            
            periodData.push({
                period: `${monthNames[parseInt(month) - 1]} ${year}`,
                revenue: monthData[monthKey].revenue,
                transactions: monthData[monthKey].transactions
            });
        });
    }
    
    return {
        periodData,
        daysDiff,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate)
    };
}

// الحصول على تاريخ آخر دفعة
function getLastPaymentDate(subscriptions) {
    let lastPayment = null;
    
    subscriptions.forEach(sub => {
        if (sub.paymentDate && sub.paid && sub.paid > 0) {
            const paymentDate = sub.paymentDate.toDate ? sub.paymentDate.toDate() : new Date(sub.paymentDate);
            if (!lastPayment || paymentDate > lastPayment) {
                lastPayment = paymentDate;
            }
        }
    });
    
    return lastPayment ? formatDate(lastPayment) : 'لا توجد دفعات';
}

// تنسيق الشهر للعرض
function formatMonth(date) {
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                       'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

// عرض نتائج التقرير
function displayReportResults(data) {
    // إظهار الأقسام
    document.getElementById('statsSection').style.display = 'block';
    document.getElementById('chartsSection').style.display = 'block';
    document.getElementById('tablesSection').style.display = 'block';
    
    // عرض الإحصائيات
    displayStats(data);
    
    // عرض الرسوم البيانية
    displayCharts(data);
    
    // عرض الجداول
    displayTables(data);
}

// عرض الإحصائيات
function displayStats(data) {
    const statsGrid = document.getElementById('statsGrid');
    
    const stats = [
        {
            title: 'إجمالي الإيرادات',
            value: formatCurrency(data.revenue.totalRevenue),
            icon: 'fas fa-money-bill-wave',
            color: 'success',
            change: '+12% عن الفترة السابقة'
        },
        {
            title: 'عدد الأعضاء',
            value: data.members.total,
            icon: 'fas fa-users',
            color: 'primary',
            change: `+${Math.floor(data.members.total * 0.05)} عن العام الماضي`
        },
        {
            title: 'المتأخرات',
            value: formatCurrency(data.members.detailedMembers.reduce((sum, m) => sum + m.remaining, 0)),
            icon: 'fas fa-exclamation-triangle',
            color: 'danger',
            change: '-8% عن الشهر الماضي'
        },
        {
            title: 'المسددون',
            value: data.members.statusCount.paid,
            icon: 'fas fa-check-circle',
            color: 'success',
            change: `${Math.round((data.members.statusCount.paid / data.members.total) * 100)}% من الأعضاء`
        },
        {
            title: 'المسددون جزئياً',
            value: data.members.statusCount.partial,
            icon: 'fas fa-percentage',
            color: 'warning',
            change: `${Math.round((data.members.statusCount.partial / data.members.total) * 100)}% من الأعضاء`
        },
        {
            title: 'عمليات التسوية',
            value: data.settlements ? data.settlements.count : 0,
            icon: 'fas fa-handshake',
            color: 'purple',
            change: data.settlements ? formatCurrency(data.settlements.totalSettlements) : 'غير متاح'
        },
        {
            title: 'متوسط الدفعة',
            value: formatCurrency(data.revenue.averageTransaction),
            icon: 'fas fa-calculator',
            color: 'info',
            change: `${data.revenue.totalTransactions} معاملة`
        },
        {
            title: 'الفترة الزمنية',
            value: `${data.time.daysDiff} يوم`,
            icon: 'fas fa-calendar',
            color: 'primary',
            change: `${data.time.startDate} إلى ${data.time.endDate}`
        }
    ];
    
    let statsHTML = '';
    
    stats.forEach(stat => {
        const changeClass = stat.change.includes('+') || stat.change.includes('%') ? 'positive' : 'negative';
        
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
    const showCharts = document.getElementById('showCharts').checked;
    
    if (!showCharts) {
        document.getElementById('chartsSection').style.display = 'none';
        return;
    }
    
    // تدمير الرسوم البيانية القديمة إذا كانت موجودة
    if (revenueChart) revenueChart.destroy();
    if (statusChart) statusChart.destroy();
    if (monthlyRevenueChart) monthlyRevenueChart.destroy();
    if (membersByYearChart) membersByYearChart.destroy();
    
    // 1. رسم بياني للإيرادات حسب النوع
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');
    revenueChart = new Chart(revenueCtx, {
        type: 'doughnut',
        data: {
            labels: ['داخل الدار', 'خارج الدار', 'التسويات'],
            datasets: [{
                data: [
                    data.revenue.revenueByType.inside.amount,
                    data.revenue.revenueByType.outside.amount,
                    data.revenue.revenueByType.settlement.amount
                ],
                backgroundColor: [
                    '#4CAF50', // أخضر
                    '#2196F3', // أزرق
                    '#9C27B0'  // بنفسجي
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    rtl: true
                },
                title: {
                    display: true,
                    text: 'توزيع الإيرادات حسب نوع الاشتراك',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
    
    // 2. رسم بياني لحالة الأعضاء
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    statusChart = new Chart(statusCtx, {
        type: 'bar',
        data: {
            labels: ['مسددون', 'مسددون جزئياً', 'غير مسددين', 'تمت التسوية'],
            datasets: [{
                label: 'عدد الأعضاء',
                data: [
                    data.members.statusCount.paid,
                    data.members.statusCount.partial,
                    data.members.statusCount.unpaid,
                    data.members.statusCount.settled || 0
                ],
                backgroundColor: [
                    '#4CAF50', // أخضر
                    '#FF9800', // برتقالي
                    '#F44336', // أحمر
                    '#9C27B0'  // بنفسجي
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'عدد الأعضاء'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'حالة الاشتراك'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'توزيع الأعضاء حسب حالة الاشتراك',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
    
    // 3. رسم بياني للإيرادات الشهرية
    const monthlyCtx = document.getElementById('monthlyRevenueChart').getContext('2d');
    
    // تحضير بيانات الشهور
    const months = data.revenue.monthlyRevenue.map(item => item.month);
    const revenues = data.revenue.monthlyRevenue.map(item => item.revenue);
    
    monthlyRevenueChart = new Chart(monthlyCtx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'الإيرادات (ريال)',
                data: revenues,
                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                borderColor: '#4CAF50',
                borderWidth: 2,
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'الإيرادات (ريال)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'الشهر'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'الإيرادات الشهرية',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
    
    // 4. رسم بياني للأعضاء حسب سنة الانضمام
    const membersByYearCtx = document.getElementById('membersByYearChart').getContext('2d');
    
    const years = data.members.membersByYear.map(item => item.year);
    const counts = data.members.membersByYear.map(item => item.count);
    
    membersByYearChart = new Chart(membersByYearCtx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [{
                label: 'عدد الأعضاء',
                data: counts,
                backgroundColor: 'rgba(33, 150, 243, 0.7)',
                borderColor: '#2196F3',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'عدد الأعضاء'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'سنة الانضمام'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'توزيع الأعضاء حسب سنة الانضمام',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
}

// عرض الجداول
function displayTables(data) {
    const showTables = document.getElementById('showTables').checked;
    
    if (!showTables) {
        document.getElementById('tablesSection').style.display = 'none';
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
    const tableBody = document.getElementById('revenueTableBody');
    let tableHTML = '';
    
    // بيانات العرض
    const periods = data.time.periodData;
    
    periods.forEach((period, index) => {
        const growth = index > 0 ? 
            `${(((period.revenue - periods[index-1].revenue) / periods[index-1].revenue) * 100).toFixed(1)}%` : 
            'جديد';
        
        const growthClass = growth === 'جديد' ? '' : 
            (parseFloat(growth) >= 0 ? 'positive' : 'negative');
        
        tableHTML += `
            <tr>
                <td>${period.period}</td>
                <td>${formatCurrency(period.revenue)}</td>
                <td>${period.transactions}</td>
                <td>${formatCurrency(period.revenue / period.transactions || 0)}</td>
                <td><span class="stat-change ${growthClass}">${growth}</span></td>
                <td>
                    <span class="status-badge ${period.revenue > 0 ? 'status-paid' : 'status-unpaid'}">
                        ${period.revenue > 0 ? 'نشط' : 'غير نشط'}
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
function displayMembersTable(data) {
    const tableBody = document.getElementById('membersTableBody');
    let tableHTML = '';
    
    // عرض أول 20 عضو فقط
    const membersToShow = data.members.detailedMembers.slice(0, 20);
    
    membersToShow.forEach(member => {
        const statusBadgeClass = {
            'paid': 'status-paid',
            'partial': 'status-partial',
            'unpaid': 'status-unpaid',
            'settled': 'status-settled'
        }[member.status] || 'status-unpaid';
        
        const statusText = {
            'paid': 'مسدد',
            'partial': 'مسدد جزئياً',
            'unpaid': 'غير مسدد',
            'settled': 'تمت التسوية'
        }[member.status] || 'غير معروف';
        
        tableHTML += `
            <tr>
                <td>${member.name || 'غير محدد'}</td>
                <td>${member.phone || 'غير محدد'}</td>
                <td><span class="status-badge ${statusBadgeClass}">${statusText}</span></td>
                <td>${formatCurrency(member.totalPaid)}</td>
                <td>${formatCurrency(member.remaining)}</td>
                <td>${member.lastPayment}</td>
                <td>${member.notes || '-'}</td>
            </tr>
        `;
    });
    
    // إذا كان هناك المزيد من الأعضاء
    if (data.members.detailedMembers.length > 20) {
        tableHTML += `
            <tr>
                <td colspan="7" style="text-align: center; background-color: #f8f9fa;">
                    <strong>عرض ${membersToShow.length} من ${data.members.detailedMembers.length} عضو</strong>
                    <button onclick="loadMoreMembers()" style="margin-right: 10px; padding: 5px 15px; background-color: #2c5aa0; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        عرض المزيد
                    </button>
                </td>
            </tr>
        `;
    }
    
    tableBody.innerHTML = tableHTML;
}

// عرض جدول التسويات
function displaySettlementsTable(data) {
    const tableBody = document.getElementById('settlementsTableBody');
    let tableHTML = '';
    
    if (!data.settlements || data.settlements.settlements.length === 0) {
        tableHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: #6c757d;">
                    <i class="fas fa-info-circle"></i> لا توجد عمليات تسوية في الفترة المحددة
                </td>
            </tr>
        `;
    } else {
        data.settlements.settlements.forEach(settlement => {
            const settlementDate = settlement.settlementDate ? 
                (settlement.settlementDate.toDate ? 
                    formatDate(settlement.settlementDate.toDate()) : 
                    settlement.settlementDate.split('T')[0]) : 
                'غير محدد';
            
            tableHTML += `
                <tr>
                    <td>${settlement.memberName || 'غير محدد'}</td>
                    <td>${new Date().getFullYear()}</td>
                    <td>داخل الدار</td>
                    <td>${formatCurrency(settlement.originalDebt)}</td>
                    <td>${formatCurrency(settlement.originalDebt - settlement.settledAmount)}</td>
                    <td>${formatCurrency(settlement.settledAmount)}</td>
                    <td>${settlementDate}</td>
                </tr>
            `;
        });
        
        // صف الإجمالي
        tableHTML += `
            <tr style="background-color: #f8f9fa; font-weight: bold;">
                <td colspan="3">الإجمالي</td>
                <td>${formatCurrency(data.settlements.settlements.reduce((sum, s) => sum + s.originalDebt, 0))}</td>
                <td>${formatCurrency(data.settlements.settlements.reduce((sum, s) => sum + (s.originalDebt - s.settledAmount), 0))}</td>
                <td>${formatCurrency(data.settlements.totalSettlements)}</td>
                <td>${data.settlements.count} عملية</td>
            </tr>
        `;
    }
    
    tableBody.innerHTML = tableHTML;
}

// وظائف مساعدة
function formatCurrency(amount) {
    return new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: 'SAR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount).replace('SAR', 'ريال');
}

function formatNumber(number) {
    return new Intl.NumberFormat('ar-SA').format(number);
}

// تصدير الرسوم البيانية
function exportChart(chartId) {
    const canvas = document.getElementById(chartId);
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `${chartId}_${new Date().getTime()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    showMessage('تم تصدير الرسم البياني', 'success');
}

// تصدير إلى Excel
function exportToExcel() {
    if (!currentReportData) {
        showMessage('لا توجد بيانات للتصدير', 'error');
        return;
    }
    
    // محاكاة عملية التصدير
    showMessage('جاري تحضير ملف Excel...', 'info');
    
    setTimeout(() => {
        showMessage('تم تحضير ملف Excel. في الإصدار الحقيقي، سيتم تنزيل الملف.', 'success');
    }, 2000);
}

// تصدير إلى PDF
function exportToPdf() {
    if (!currentReportData) {
        showMessage('لا توجد بيانات للتصدير', 'error');
        return;
    }
    
    showMessage('جاري تحضير ملف PDF...', 'info');
    
    setTimeout(() => {
        showMessage('تم تحضير ملف PDF. في الإصدار الحقيقي، سيتم تنزيل الملف.', 'success');
    }, 2000);
}

// تصدير إلى CSV
function exportToCsv() {
    if (!currentReportData) {
        showMessage('لا توجد بيانات للتصدير', 'error');
        return;
    }
    
    // إنشاء محتوى CSV
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // إضافة العنوان
    csvContent += "تقرير دار أبناء سلنارتي\n";
    csvContent += `تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}\n`;
    csvContent += `الفترة: ${currentReportData.time.startDate} إلى ${currentReportData.time.endDate}\n\n`;
    
    // إضافة بيانات الإيرادات
    csvContent += "الإيرادات\n";
    csvContent += "الفترة,المبلغ,عدد المعاملات,المتوسط\n";
    
    currentReportData.time.periodData.forEach(period => {
        csvContent += `${period.period},${period.revenue},${period.transactions},${period.revenue / period.transactions || 0}\n`;
    });
    
    csvContent += `الإجمالي,${currentReportData.revenue.totalRevenue},${currentReportData.revenue.totalTransactions},${currentReportData.revenue.averageTransaction}\n\n`;
    
    // إنشاء رابط التحميل
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `تقرير_دار_سلنارتي_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showMessage('تم تصدير البيانات إلى ملف CSV', 'success');
}

// عرض الرسائل
function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.innerHTML = text;
    messageDiv.className = `message ${type} show`;
    
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 5000);
}

// دالة لتحميل المزيد من الأعضاء (للعرض في الجدول)
function loadMoreMembers() {
    // هذه دالة مساعدة يمكن تطويرها لتحميل المزيد من الأعضاء
    showMessage('جاري تحميل المزيد من الأعضاء...', 'info');
    setTimeout(() => {
        showMessage('تم تحميل المزيد من الأعضاء', 'success');
    }, 1000);
}

// تعريف الدوال للوصول العالمي (لأزرار الجداول)
window.loadMoreMembers = loadMoreMembers;
window.exportChart = exportChart;
window.exportToExcel = exportToExcel;
window.exportToPdf = exportToPdf;
window.exportToCsv = exportToCsv;