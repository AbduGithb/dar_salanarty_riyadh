

// =============================================
// 1. إعدادات Firebase
// =============================================
// تكوين Firebase - ضع معلومات مشروعك هنا
const firebaseConfig = {
    apiKey: "AIzaSyDsCQEqMlZjVB7v9gqhQoATRdygy6_kAlk",
    authDomain: "dar-salanarty-riyadh.firebaseapp.com",
    projectId: "dar-salanarty-riyadh",
    storageBucket: "dar-salanarty-riyadh.firebasestorage.app",
    messagingSenderId: "145377416218",
    appId: "1:145377416218:web:77eabfc9a0cc163d6a2da3",
    measurementId: "G-SSY6V6QVQZ"
};

// =============================================
// 2. المتغيرات العامة
// =============================================
let db = null;
let firebaseInitialized = false;
let membersData = [];
let dataTable = null;
let currentEditMemberId = null;
let isLoadingMembers = false; // guard to avoid concurrent loads causing duplicates
const currentYear = new Date().getFullYear();

// =============================================
// 3. تهيئة الصفحة
// =============================================
$(document).ready(function () {
    console.log('🚀 بدء تحميل صفحة الأعضاء...');

    // تهيئة Firebase أولاً
    initializeFirebase();

    // ثم تهيئة واجهة المستخدم
    initUI();
});

// =============================================
// 4. دالة تهيئة Firebase
// =============================================
function initializeFirebase() {
    try {
        console.log('🔄 محاولة تهيئة Firebase...');

        // التحقق من وجود Firebase SDK
        if (typeof firebase === 'undefined') {
            throw new Error('مكتبة Firebase لم يتم تحميلها. تحقق من اتصال الإنترنت.');
        }

        // التحقق من إعدادات Firebase
        if (firebaseConfig.apiKey.includes('ABCDEFGHIJKLMNOPQRSTUVWXYZ')) {
            showFirebaseStatus('⚠️ إعدادات Firebase غير صحيحة. يرجى تحديث معلومات المشروع.', 'error');
            return;
        }

        // تهيئة Firebase
        let app;
        if (!firebase.apps.length) {
            app = firebase.initializeApp(firebaseConfig);
            console.log('✅ تم تهيئة Firebase بنجاح');
        } else {
            app = firebase.app();
            console.log('✅ Firebase مثبت بالفعل');
        }

        // تهيئة Firestore
        db = firebase.firestore(app);
        firebaseInitialized = true;

        // إخفاء تحذير Firebase
        showFirebaseStatus('✅ تم الاتصال بقاعدة البيانات بنجاح', 'success');

        // تحميل بيانات الأعضاء من Firebase
        loadMembersData();

        // الاستماع لتغييرات الاشتراكات لتحديث قائمة الأعضاء تلقائياً
        db.collection('subscriptions').onSnapshot(snapshot => {
            console.log('🔔 تغييرات في الاشتراكات، سيتم تحديث قائمة الأعضاء');
            // تأخير قصير لتجنب تحديثات متكررة سريعة
            setTimeout(loadMembersData, 400);
        });

    } catch (error) {
        console.error('❌ خطأ في تهيئة Firebase:', error);
        showFirebaseStatus(`خطأ في قاعدة البيانات: ${error.message}`, 'error');
    }
}

// =============================================
// 5. دالة تحميل بيانات الأعضاء من Firebase
// =============================================
async function loadMembersData() {
    if (isLoadingMembers) {
        console.log('⚠️ loadMembersData already running — skipping duplicate call');
        return;
    }
    isLoadingMembers = true;

    if (!firebaseInitialized || !db) {
        showFirebaseStatus('❌ قاعدة البيانات غير متاحة', 'error');
        isLoadingMembers = false;
        return;
    }

    // إظهار مؤشر التحميل
    $('#tableLoading').show();

    try {
        console.log('📥 جاري جلب بيانات الأعضاء من Firebase...');

        // جلب بيانات الأعضاء من Firestore
        const membersSnapshot = await db.collection('members').orderBy('createdAt', 'desc').get();
        membersData = [];

        if (membersSnapshot.empty) {
            console.log('📭 لا توجد بيانات أعضاء في قاعدة البيانات');
            showMessage('لا توجد بيانات أعضاء في قاعدة البيانات. يمكنك إضافة أعضاء جدد.', 'info');
            renderMembersTable();
            calculateSummary();
            $('#tableLoading').hide();
            return;
        }

        console.log(`📊 تم جلب ${membersSnapshot.size} عضو من قاعدة البيانات`);

        // تحويل المستندات إلى مصفوفة بيانات
        for (const doc of membersSnapshot.docs) {
            const member = doc.data();
            member.id = doc.id;

            // جلب اشتراكات هذا العضو
            const subscriptionsSnapshot = await db.collection('subscriptions')
                .where('memberId', '==', doc.id)
                .get();

            let totalPaid = 0; // المبالغ المدفوعة فعلياً
            let totalUnpaid = 0; // المتأخرات الأصلية
            let totalSavedBySettlement = 0; // المبالغ التي تم خصمها بالتسوية (مغفورة)
            let years = {};

            subscriptionsSnapshot.forEach(subDoc => {
                const subData = subDoc.data();
                const amount = subData.amount || (subData.year === 2026 ? 300 : 200);
                // Determine paid amount (support numeric paid, boolean full-paid, paidAmount, lastPayment)
                let paidAmount = 0;
                if (typeof subData.paid === 'number') {
                    paidAmount = subData.paid;
                } else if (subData.paid === true) {
                    paidAmount = amount; // fully paid flag
                } else {
                    paidAmount = subData.paidAmount || (subData.lastPayment && subData.lastPayment.amount) || 0;
                }
                const isSettled = !!subData.settlement;

                // حساب المبلغ الذي تم توفيره بواسطة التسوية في هذه السنة
                const savedAmount = isSettled ? Math.max(0, amount - paidAmount) : 0;

                years[subData.year] = {
                    amount: amount,
                    paid: paidAmount > 0,
                    paidAmount: paidAmount,
                    settlement: isSettled,
                    savedAmount: savedAmount
                };

                totalPaid += paidAmount;
                totalSavedBySettlement += savedAmount;

                const unpaidForYear = Math.max(0, amount - paidAmount);
                totalUnpaid += unpaidForYear;
            });

            // إجماليات بعد التسوية
            const totalPaidAfterSettlement = totalPaid + totalSavedBySettlement;
            const totalUnpaidAfterSettlement = Math.max(0, totalUnpaid - totalSavedBySettlement);

            // حساب حالة العضو بناءً على الاشتراكات (مع دعم الجزئي)
            let status = "غير مسدد";
            const hasPaid = totalPaidAfterSettlement > 0;
            if (totalUnpaidAfterSettlement === 0 && hasPaid) {
                status = "تم السداد";
            } else if (hasPaid && totalUnpaidAfterSettlement > 0) {
                status = "تم السداد جزئياً";
            }

            // تحديث بيانات العضو
            member.totalPaid = totalPaid; // المبلغ المدفوع فعلياً
            member.totalSavedBySettlement = totalSavedBySettlement; // المبلغ المغفور بالتسوية
            member.totalPaidAfterSettlement = totalPaidAfterSettlement; // المبلغ الفعال بعد التسوية
            member.totalUnpaid = totalUnpaid; // المتأخرات الأصلية
            member.totalUnpaidAfterSettlement = totalUnpaidAfterSettlement; // المتأخرات بعد التسوية
            member.status = status;
            member.years = years;

            // تنسيق تاريخ الإنشاء
            if (member.createdAt && member.createdAt.toDate) {
                member.lastUpdate = member.createdAt.toDate().toLocaleDateString('ar-SA');
            } else {
                member.lastUpdate = 'غير محدد';
            }

            // Debug: طباعة إجماليات العضو المحسوبة
            console.log(`Member loaded: ${member.membershipNumber || member.name} — paid: ${member.totalPaid}, savedBySettlement: ${member.totalSavedBySettlement}, paidAfterSettlement: ${member.totalPaidAfterSettlement}, unpaidAfterSettlement: ${member.totalUnpaidAfterSettlement}`);

            membersData.push(member);
        }

        // Remove any accidental duplicates (by id) that may occur due to concurrent triggers
        const beforeCount = membersData.length;
        const byId = {};
        membersData.forEach(m => { byId[m.id] = m; });
        membersData = Object.values(byId);
        if (membersData.length !== beforeCount) console.log(`🔁 DEDUPED membersData: removed ${beforeCount - membersData.length} duplicates.`);

        console.log('✅ تم تحميل بيانات الأعضاء بنجاح');

        // عرض البيانات في الجدول
        renderMembersTable();

        // حساب الإحصائيات
        calculateSummary();

        // إخفاء مؤشر التحميل
        $('#tableLoading').hide();

        showMessage(`تم تحميل ${membersData.length} عضو من قاعدة البيانات`, 'success');

    } catch (error) {
        console.error('❌ خطأ في جلب البيانات من Firebase:', error);
        $('#tableLoading').hide();
        showMessage(`حدث خطأ في جلب البيانات: ${error.message}`, 'error');
    } finally {
        isLoadingMembers = false;
    }
}

// =============================================
// 6. دالة إعادة تحميل البيانات
// =============================================
async function refreshMembersData() {
    console.log('🔄 إعادة تحميل بيانات الأعضاء...');
    showMessage('جاري تحديث البيانات...', 'info');
    await loadMembersData();
}

// =============================================
// 7. تهيئة واجهة المستخدم
// =============================================
function initUI() {
    // إضافة زر تحديث البيانات
    $('.action-buttons').prepend(`
            <button type="button" id="refreshBtn" class="btn-primary">
                <i class="fas fa-sync-alt"></i> تحديث البيانات
            </button>
        `);

    // إعداد أحداث الأزرار
    $('#searchBtn').click(searchMembers);
    $('#resetFiltersBtn').click(resetFilters);
    $('#exportBtn').click(exportToExcel);
    $('#printBtn').click(printList);
    $('#refreshBtn').click(refreshMembersData);

    // إعداد أحداث البحث أثناء الكتابة
    $('#searchName').on('input', searchMembers);
    $('#searchPhone').on('input', searchMembers);
    $('#filterStatus').change(searchMembers);

    // إعداد حدث إغلاق المودال (عام لجميع المودالات)
    $('.close-modal').click(function () {
        $(this).closest('.modal').hide();
    });

    // إغلاق المودال عند النقر خارج المحتوى (عام)
    $(window).click(function (event) {
        if ($(event.target).is('.modal')) {
            $(event.target).hide();
        }
    });

    // حفظ التعديلات من مودال التعديل
    $('#saveMemberEditBtn').click(saveMemberEdit);

    console.log('✅ تم تهيئة واجهة المستخدم');
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
    const tableBody = $('#membersTableBody');
    tableBody.empty();

    if (membersData.length === 0) {
        $('#membersTable').hide();
        $('#noDataMessage').remove();
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

    $('#noDataMessage').remove();

    membersData.forEach((member, index) => {
        const statusClass = getStatusClass(member.status);

        const row = `
                <tr>
                    <td>${index + 1}</td>
                    <td>${member.name || 'غير محدد'}</td>
                    <td>${member.phone || 'غير محدد'}</td>
                    <td>${member.membershipNumber || 'غير محدد'}</td>
                    <td>${member.joinYear || 'غير محدد'}</td>
                    
                    <td><strong>${(member.totalPaid !== undefined ? member.totalPaid : (member.totalPaidAfterSettlement || 0)).toFixed(2)}</strong> ريال</td>
                    <td><strong>${(member.totalUnpaidAfterSettlement !== undefined ? member.totalUnpaidAfterSettlement : member.totalUnpaid || 0).toFixed(2)}</strong> ريال</td>
                    <td>${member.lastUpdate || 'غير محدد'}</td>
                    <td class="action-buttons-cell">
                        <a href="#" class="action-btn view" onclick="viewMemberDetails('${member.id}')">
                            <i class="fas fa-eye"></i> عرض
                        </a>
                        <a href="#" class="action-btn edit" onclick="openEditMemberModal('${member.id}')">
                            <i class="fas fa-edit"></i> تعديل
                        </a>
                        <a href="#" class="action-btn delete" onclick="deleteMember('${member.id}', '${member.name || "هذا العضو"}')">
                            <i class="fas fa-trash"></i> حذف
                        </a>
                    </td>
                </tr>
            `;

        tableBody.append(row);
    });

    // تهيئة DataTable
    dataTable = $('#membersTable').DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/ar.json'
        },
        pageLength: 10,
        responsive: true,
        order: [[0, 'asc']],
        dom: '<"top"lf>rt<"bottom"ip><"clear">',
        initComplete: function () {
            // إظهار الجدول بعد التهيئة
            $('#membersTable').show();
        }
    });
}

// =============================================
// 9. البحث والفلترة
// =============================================
function searchMembers() {
    const nameSearch = $('#searchName').val().toLowerCase();
    const phoneSearch = $('#searchPhone').val().toLowerCase();
    const statusFilter = $('#filterStatus').val();

    if (dataTable) {
        dataTable.search('').draw();

        // تطبيق الفلاتر يدوياً
        $.fn.dataTable.ext.search.push(
            function (settings, data, dataIndex) {
                const member = membersData[dataIndex];
                if (!member) return true;

                let match = true;

                if (nameSearch) {
                    match = match && member.name && member.name.toLowerCase().includes(nameSearch);
                }

                if (phoneSearch) {
                    match = match && member.phone && member.phone.includes(phoneSearch);
                }

                if (statusFilter) {
                    match = match && member.status === statusFilter;
                }

                return match;
            }
        );

        dataTable.draw();

        // إزالة دالة البحث المضافة
        $.fn.dataTable.ext.search.pop();
    }
}

// =============================================
// 10. إعادة تعيين الفلاتر
// =============================================
function resetFilters() {
    $('#searchName').val('');
    $('#searchPhone').val('');
    $('#filterStatus').val('');

    if (dataTable) {
        dataTable.search('').draw();
    }

    showMessage('تم إعادة تعيين الفلاتر', 'success');
}

// =============================================
// 11. عرض تفاصيل العضو
// =============================================
async function viewMemberDetails(memberId) {
    if (!firebaseInitialized || !db) {
        showMessage('❌ قاعدة البيانات غير متاحة', 'error');
        return;
    }

    try {
        // جلب بيانات العضو من Firebase
        const memberDoc = await db.collection('members').doc(memberId).get();

        if (!memberDoc.exists) {
            showMessage('لم يتم العثور على العضو', 'error');
            return;
        }

        const member = memberDoc.data();
        member.id = memberDoc.id;

        // جلب اشتراكات العضو
        const subscriptionsSnapshot = await db.collection('subscriptions')
            .where('memberId', '==', memberId)
            .orderBy('year')
            .get();

        let totalPaid = 0;
        let totalUnpaid = 0;
        let totalSavedBySettlement = 0;
        let years = {};
        let subscriptionYears = [];

        subscriptionsSnapshot.forEach(subDoc => {
            const subData = subDoc.data();
            const amount = subData.amount || (subData.year === 2026 ? 300 : 200);
            const paidAmt = subData.paid ? amount : (subData.paidAmount || (subData.lastPayment && subData.lastPayment.amount) || 0);
            const isSettled = !!subData.settlement;
            const saved = isSettled ? Math.max(0, amount - paidAmt) : 0;
            const unpaidForYear = Math.max(0, amount - paidAmt);

            years[subData.year] = {
                amount: amount,
                paid: !!subData.paid,
                paidAmount: paidAmt,
                settlement: isSettled,
                savedAmount: saved,
                paymentDate: subData.paymentDate || null
            };

            subscriptionYears.push({
                year: subData.year,
                amount: amount,
                paid: !!subData.paid,
                paidAmount: paidAmt,
                settlement: isSettled,
                savedAmount: saved,
                paymentDate: subData.paymentDate || null
            });

            totalPaid += paidAmt;
            totalSavedBySettlement += saved;
            totalUnpaid += unpaidForYear;
        });

        // إجماليات بعد التسوية
        const totalPaidAfterSettlement = totalPaid + totalSavedBySettlement;
        const totalUnpaidAfterSettlement = Math.max(0, totalUnpaid - totalSavedBySettlement);

        // عرض: إجمالي المدفوع هو المبلغ المدفوع فعلياً، والمتأخرات تُعرض بعد التسوية
        const displayedPaid = totalPaid; // المبلغ المدفوع فعلياً
        const displayedUnpaid = totalUnpaidAfterSettlement; // المتأخرات بعد التسوية

        // حساب حالة العضو
        let status = "غير مسدد";
        if (totalUnpaidAfterSettlement === 0 && totalPaidAfterSettlement > 0) {
            status = "تم السداد";
        } else if (totalPaidAfterSettlement > 0 && totalUnpaidAfterSettlement > 0) {
            status = "تم السداد جزئياً";
        }
        const statusClass = getStatusClass(status);
        const joinYear = member.joinYear || new Date().getFullYear();

        // إنشاء محتوى المودال
        let modalContent = `
                <div class="member-details">
                    <div class="details-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px;">
                        <div>
                            <h4><i class="fas fa-user"></i> المعلومات الشخصية</h4>
                            <p><strong>الاسم:</strong> ${member.name || 'غير محدد'}</p>
                            <p><strong>رقم الجوال:</strong> ${member.phone || 'غير محدد'}</p>
                            <p><strong>رقم العضوية:</strong> ${member.membershipNumber || 'غير محدد'}</p>
                            <p><strong>سنة الانضمام:</strong> ${member.joinYear || 'غير محدد'}</p>
                            <p><strong>تاريخ التسجيل:</strong> ${member.createdAt && member.createdAt.toDate ? member.createdAt.toDate().toLocaleDateString('ar-SA') : 'غير محدد'}</p>
                        </div>
                        
                        <div>
                            <h4><i class="fas fa-chart-bar"></i> الإحصائيات</h4>
                            <p><strong>حالة الاشتراك:</strong> <span class="status-badge ${statusClass}">${status}</span></p>
                            <p><strong>عدد سنوات العضوية:</strong> ${subscriptionYears.length} سنة</p>
                            <p><strong>إجمالي المدفوع:</strong> ${displayedPaid.toFixed(2)} ريال</p>
                            <p><strong>إجمالي المبالغ غير مسددة (بعد التسوية):</strong> ${displayedUnpaid.toFixed(2)} ريال</p>
                            <p><strong>المبلغ الإجمالي:</strong> ${(displayedPaid + displayedUnpaid).toFixed(2)} ريال</p>
                        </div>
                    </div>
                    
                    <h4><i class="fas fa-calendar-alt"></i> الاشتراكات السنوية</h4>
            `;

        if (subscriptionYears.length > 0) {
            modalContent += `
                    <div style="max-height: 300px; overflow-y: auto; margin-top: 15px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background-color: #f8f9fa;">
                                    <th style="padding: 10px; text-align: right;">السنة</th>
                                    <th style="padding: 10px; text-align: center;">المبلغ</th>
                                    <th style="padding: 10px; text-align: center;">الحالة</th>
                                    <th style="padding: 10px; text-align: center;">تاريخ السداد</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

            subscriptionYears.sort((a, b) => b.year - a.year).forEach(sub => {
                const yearStatusClass = sub.paid ? 'status-paid' : 'status-unpaid';
                const yearStatus = sub.paid ? 'مسدد' : 'غير مسدد';

                modalContent += `
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${sub.year}</td>
                            <td style="padding: 8px; text-align: center; border-bottom: 1px solid #eee;">${sub.amount} ريال</td>
                            <td style="padding: 8px; text-align: center; border-bottom: 1px solid #eee;">
                                <span class="status-badge ${yearStatusClass}">${yearStatus}</span>
                            </td>
                            <td style="padding: 8px; text-align: center; border-bottom: 1px solid #eee;">
                                ${sub.paid ? (sub.paymentDate ? new Date(sub.paymentDate.seconds * 1000).toLocaleDateString('ar-SA') : 'غير محدد') : '---'}
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
                        <p><strong>آخر تحديث:</strong> ${member.updatedAt && member.updatedAt.toDate ? member.updatedAt.toDate().toLocaleDateString('ar-SA') : 'غير محدد'}</p>
                        <p><strong>ملاحظات:</strong> ${member.notes || 'لا توجد ملاحظات'}</p>
                    </div>
                </div>
            `;

        // عرض المودال
        $('#modalBody').html(modalContent);
        $('#memberModal').show();

    } catch (error) {
        console.error('❌ خطأ في جلب تفاصيل العضو:', error);
        showMessage(`حدث خطأ في جلب التفاصيل: ${error.message}`, 'error');
    }
}

// =============================================
// 11.5 تعديل بيانات العضو (مودال)
async function openEditMemberModal(memberId) {
    if (!firebaseInitialized || !db) {
        showMessage('❌ قاعدة البيانات غير متاحة', 'error');
        return;
    }

    try {
        // حاول إيجاد العضو محليًا أولاً
        const member = membersData.find(m => m.id === memberId);
        if (member) {
            currentEditMemberId = memberId;
            $('#editMemberName').val(member.name || '');
            $('#editMemberPhone').val(member.phone || '');
            $('#editMemberModal').show();
            return;
        }

        // إذا لم يكن موجودًا محلياً، جلبه من Firebase
        const memberDoc = await db.collection('members').doc(memberId).get();
        if (!memberDoc.exists) {
            showMessage('لم يتم العثور على العضو', 'error');
            return;
        }

        const data = memberDoc.data();
        currentEditMemberId = memberId;
        $('#editMemberName').val(data.name || '');
        $('#editMemberPhone').val(data.phone || '');
        $('#editMemberModal').show();

    } catch (error) {
        console.error('❌ خطأ أثناء فتح مودال التعديل:', error);
        showMessage(`حدث خطأ: ${error.message}`, 'error');
    }
}

async function saveMemberEdit() {
    if (!currentEditMemberId) {
        showMessage('لا يوجد عضو محدد للتعديل', 'error');
        return;
    }

    const name = $('#editMemberName').val().trim();
    const phone = $('#editMemberPhone').val().trim();

    // تحقق بسيط
    if (!name) {
        showMessage('الاسم مطلوب', 'error');
        return;
    }
    if (!/^[0-9]{10}$/.test(phone)) {
        showMessage('يرجى إدخال رقم جوال صحيح (10 أرقام)', 'error');
        return;
    }

    try {
        $('#saveMemberEditBtn').prop('disabled', true).text('جاري الحفظ...');
        await db.collection('members').doc(currentEditMemberId).update({
            name: name,
            phone: phone,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // تحديث الذاكرة المحلية
        const idx = membersData.findIndex(m => m.id === currentEditMemberId);
        if (idx !== -1) {
            membersData[idx].name = name;
            membersData[idx].phone = phone;
        }

        renderMembersTable();
        $('#editMemberModal').hide();
        showMessage('تم حفظ التعديلات بنجاح', 'success');
    } catch (error) {
        console.error('❌ خطأ أثناء حفظ التعديلات:', error);
        showMessage(`حدث خطأ أثناء الحفظ: ${error.message}`, 'error');
    } finally {
        $('#saveMemberEditBtn').prop('disabled', false).html('<i class="fas fa-save"></i> حفظ التعديلات');
    }
}

// =============================================
// 12. حذف العضو
// =============================================
async function deleteMember(memberId, memberName) {
    if (!firebaseInitialized || !db) {
        showMessage('❌ قاعدة البيانات غير متاحة', 'error');
        return;
    }

    if (confirm(`هل أنت متأكد من حذف العضو "${memberName}"؟\n\n⚠️ تحذير: سيتم حذف جميع بيانات العضو واشتراكاته ولا يمكن التراجع عن هذا الإجراء.`)) {
        try {
            showMessage('جاري حذف العضو...', 'info');

            // حذف اشتراكات العضو أولاً
            const subscriptionsSnapshot = await db.collection('subscriptions')
                .where('memberId', '==', memberId)
                .get();

            const deletePromises = [];
            subscriptionsSnapshot.forEach(doc => {
                deletePromises.push(db.collection('subscriptions').doc(doc.id).delete());
            });

            await Promise.all(deletePromises);

            // حذف العضو
            await db.collection('members').doc(memberId).delete();

            console.log(`✅ تم حذف العضو ${memberId} بنجاح`);

            // إعادة تحميل البيانات
            await refreshMembersData();

            showMessage(`تم حذف العضو "${memberName}" بنجاح`, 'success');

        } catch (error) {
            console.error('❌ خطأ في حذف العضو:', error);
            showMessage(`حدث خطأ في الحذف: ${error.message}`, 'error');
        }
    }
}

// =============================================
// 13. تصدير إلى Excel
// =============================================
function exportToExcel() {
    try {
        if (membersData.length === 0) {
            showMessage('لا توجد بيانات للتصدير', 'error');
            return;
        }

        // تحضير البيانات للتصدير
        const exportData = membersData.map(member => ({
            'اسم العضو': member.name || '',
            'رقم الجوال': member.phone || '',
            'رقم العضوية': member.membershipNumber || '',
            'سنة الانضمام': member.joinYear || '',
            'إجمالي المدفوع': member.totalPaid !== undefined ? member.totalPaid : (member.totalPaidAfterSettlement || 0),
            'إجمالي المتأخر (بعد التسوية)': member.totalUnpaidAfterSettlement !== undefined ? member.totalUnpaidAfterSettlement : member.totalUnpaid || 0,
            'المبلغ الإجمالي': (member.totalPaid !== undefined ? member.totalPaid : (member.totalPaidAfterSettlement || 0)) + (member.totalUnpaidAfterSettlement !== undefined ? member.totalUnpaidAfterSettlement : (member.totalUnpaid || 0)),
            'تاريخ التسجيل': member.createdAt && member.createdAt.toDate ? member.createdAt.toDate().toLocaleDateString('ar-SA') : '',
            'آخر تحديث': member.updatedAt && member.updatedAt.toDate ? member.updatedAt.toDate().toLocaleDateString('ar-SA') : ''
        }));

        // إنشاء ورقة عمل
        const ws = XLSX.utils.json_to_sheet(exportData);

        // تنسيق الأعمدة (تمت إزالة عمود حالة الاشتراك)
        const wscols = [
            { wch: 25 }, // اسم العضو
            { wch: 15 }, // رقم الجوال
            { wch: 15 }, // رقم العضوية
            { wch: 12 }, // سنة الانضمام
            { wch: 18 }, // إجمالي المدفوع
            { wch: 18 }, // إجمالي المتأخر
            { wch: 18 }, // المبلغ الإجمالي
            { wch: 15 }, // تاريخ التسجيل
            { wch: 15 }  // آخر تحديث
        ];
        ws['!cols'] = wscols;

        // إنشاء مصنف
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "أعضاء الجمعية");

        // تنزيل الملف
        const fileName = `أعضاء_الجمعية_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);

        showMessage(`تم تصدير ${membersData.length} سجل إلى ملف ${fileName}`, 'success');
    } catch (error) {
        console.error('❌ خطأ في التصدير:', error);
        showMessage('حدث خطأ أثناء التصدير', 'error');
    }
}
// 14. طباعة القائمة
// =============================================
function printList() {
    if (membersData.length === 0) {
        showMessage('لا توجد بيانات للطباعة', 'error');
        return;
    }

    // إنشاء نافذة طباعة
    const printWindow = window.open('', '_blank');

    // محتوى HTML للطباعة
    printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <title>قائمة أعضاء الجمعية - ${new Date().toLocaleDateString('ar-SA')}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20px; }
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
                <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')} - الوقت: ${new Date().toLocaleTimeString('ar-SA')}</p>
                <p>إجمالي عدد الأعضاء: ${membersData.length} عضو</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
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
        const unpaid = member.totalUnpaidAfterSettlement !== undefined ? member.totalUnpaidAfterSettlement : member.totalUnpaid || 0;
        const totalAmount = summary.totalPaid   + unpaid;

        printWindow.document.write(`
            <tr>
                <td>${index + 1}</td>
                <td>${member.name || ''}</td>
                <td>${member.phone || ''}</td>
                <td>${member.membershipNumber || ''}</td>
                <td>${member.joinYear || ''}</td>
                <td>${summary.totalPaid.toFixed(2)} ريال</td>
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
                        <td><strong>${summary.totalPaid.toFixed(2)} ريال</strong></td>
                    </tr>
                    <tr>
                        <td>إجمالي المتأخرات (بعد التسوية):</td>
                        <td><strong>${summary.totalUnpaid.toFixed(2)} ريال</strong></td>
                    </tr>
                    <tr>
                        <td>الأعضاء المسددين:</td>
                        <td><strong>${summary.paidMembers}</strong></td>
                    </tr>
                    <tr>
                        <td>الأعضاء المتأخرين:</td>
                        <td><strong>${summary.unpaidMembers}</strong></td>
                    </tr>
                </table>
            </div>
            
            <div class="footer">
                <p>جميع الحقوق محفوظة © دار أبناء سلنارتي بالرياض 2024</p>
                <p>تم إنشاء هذا التقرير آلياً بتاريخ: ${new Date().toLocaleString('ar-SA')}</p>
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
// 14. طباعة القائمة
// =============================================
function printList22() {
    if (membersData.length === 0) {
        showMessage('لا توجد بيانات للطباعة', 'error');
        return;
    }

    // إنشاء نافذة طباعة
    const printWindow = window.open('', '_blank');

    // محتوى HTML للطباعة
    printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <title>قائمة أعضاء الجمعية - ${new Date().toLocaleDateString('ar-SA')}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20px; }
                    h1 { color: #2c5aa0; text-align: center; margin-bottom: 30px; }
                    .header-info { text-align: center; margin-bottom: 30px; color: #666; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
                    th { background-color: #f8f9fa; color: #2c5aa0; padding: 12px; text-align: right; border-bottom: 2px solid #ddd; }
                    td { padding: 10px; border-bottom: 1px solid #eee; }
                    .status-paid { color: #4CAF50; }
                    .status-partial { color: #ff9800; }
                    .status-unpaid { color: #f44336; }
                    .summary { margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 10px; }
                    .summary-item { display: inline-block; margin: 0 20px; }
                    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
                    @media print {
                        body { padding: 10px; }
                        table { font-size: 12px; }
                    }
                </style>
            </head>
            <body>
                <h1>قائمة أعضاء جمعية أبناء سلنارتي بالرياض</h1>
                <div class="header-info">
                    <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')} - الوقت: ${new Date().toLocaleTimeString('ar-SA')}</p>
                    <p>إجمالي عدد الأعضاء: ${membersData.length} عضو</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
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
        const unpaid = member.totalUnpaidAfterSettlement !== undefined ? member.totalUnpaidAfterSettlement : member.totalUnpaid || 0;
        const totalAmount = paid + unpaid;

        printWindow.document.write(`
                <tr>
                    <td>${index + 1}</td>
                    <td>${member.name || ''}</td>
                    <td>${member.phone || ''}</td>
                    <td>${member.membershipNumber || ''}</td>
                    <td>${member.joinYear || ''}</td>
                    <td>${summary.totalPaid.toFixed(2)} ريال</td>
                    <td>${unpaid.toFixed(2)} ريال</td>
                    <td>${totalAmount.toFixed(2)} ريال</td>
                </tr>
            `);
    });

    // إضافة الإحصائيات

    printWindow.document.write(`
                    </tbody>
                </table>
                
                <div class="summary">
                    <h3>ملخص الإحصائيات</h3>
                    <div class="summary-item">عدد الأعضاء: <strong>${summary.totalMembers}</strong></div>
                    <div class="summary-item">إجمالي المدفوع: <strong>${summary.totalPaid.toFixed(2)} ريال</strong></div>
                    <div class="summary-item">إجمالي المتأخرات (بعد التسوية): <strong>${summary.totalUnpaid.toFixed(2)} ريال</strong></div>
                    <div class="summary-item">الأعضاء المسددين: <strong>${summary.paidMembers}</strong></div>
                    <div class="summary-item">الأعضاء المتأخرين: <strong>${summary.unpaidMembers}</strong></div>
                </div>
                
                <div class="footer">
                    <p>جميع الحقوق محفوظة © دار أبناء سلنارتي بالرياض 2024</p>
                    <p>تم إنشاء هذا التقرير آلياً بتاريخ: ${new Date().toLocaleString('ar-SA')}</p>
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
// 15. حساب الإحصائيات
// =============================================
function calculateSummary(data = membersData) {
    const summary = calculateSummaryStats(data);

    $('#summaryCards').html(`
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
                <div class="summary-value">${summary.totalUnpaid.toFixed(2)}</div>
                <div class="summary-label">إجمالي المبالغ غير مسددة (بعد التسوية)</div>
            </div>
        `);
}

// =============================================
// 16. دالة مساعدة لحساب الإحصائيات
// =============================================
function calculateSummaryStats(data = membersData) {
    let totalMembers = data.length;
    let paidMembers = 0;
    let partialMembers = 0;
    let unpaidMembers = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;

    data.forEach(member => {
        // اجمالي المبالغ المسددة يجب أن يتوافق مع صفحة البحث (المبالغ المدفوعة فعلياً)
        totalPaid += member.totalPaid !== undefined ? member.totalPaid : (member.totalPaidAfterSettlement || 0);
        // المتأخرات تبقى محسوبة بعد تطبيق التسوية
        totalUnpaid += member.totalUnpaidAfterSettlement !== undefined ? member.totalUnpaidAfterSettlement : (member.totalUnpaid || 0);

        switch (member.status) {
            case 'تم السداد':
                paidMembers++;
                break;
            case 'تم السداد جزئياً':
                partialMembers++;
                break;
            case 'غير مسدد':
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
        totalUnpaid
    };
}

// =============================================
// 17. دوال مساعدة
// =============================================
function getStatusClass(status) {
    switch (status) {
        case 'تم السداد': return 'status-paid';
        case 'تم السداد جزئياً': return 'status-partial';
        case 'غير مسدد': return 'status-unpaid';
        default: return 'status-unpaid';
    }
}

function showMessage(text, type) {
    $('#message').html(text);
    $('#message').removeClass('success error info');
    $('#message').addClass(`${type} show`);

    // التمرير إلى الرسالة
    $('#message')[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // إخفاء الرسالة بعد 5 ثواني
    setTimeout(() => {
        $('#message').removeClass('show');
    }, 5000);
}

function showFirebaseStatus(text, type) {
    const statusDiv = $('#firebaseStatus');
    const statusText = $('#firebaseStatusText');

    statusText.text(text);
    statusDiv.removeClass('success error');
    statusDiv.addClass(`${type} show`);

    // إخفاء الرسالة بعد 5 ثواني للنوع success
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.removeClass('show');
        }, 5000);
    }
}

// =============================================
// 18. اختبار الاتصال بقاعدة البيانات
// =============================================
async function testFirebaseConnection() {
    if (!firebaseInitialized || !db) return false;

    try {
        await db.collection('members').limit(1).get();
        return true;
    } catch (error) {
        console.error('❌ فشل اختبار الاتصال:', error);
        return false;
    }
}

// اختبار الاتصال تلقائياً بعد 3 ثواني
setTimeout(async () => {
    if (firebaseInitialized) {
        const isConnected = await testFirebaseConnection();
        if (!isConnected) {
            showFirebaseStatus('⚠️ مشكلة في الاتصال بقاعدة البيانات', 'error');
        }
    }
}, 3000);