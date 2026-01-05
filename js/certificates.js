let logoDataURL = '';
let chairmanSignatureDataURL = '';
let treasurerSignatureDataURL = '';
// تهيئة التاريخ الحالي
window.onload = function () {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('certificateDate').value = today;
};

document.addEventListener('DOMContentLoaded', function () {
  // زر التحديث
  document.getElementById('generateBtn').addEventListener('click', generateCertificate);

  // رفع الشعار (إن وُجد مستقبلاً)
  const logoUpload = document.getElementById('logo-upload');
  if (logoUpload) {
    logoUpload.addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => logoDataURL = reader.result;
        reader.readAsDataURL(file);
      } else {
        logoDataURL = '';
      }
    });
  }

  // اختيار الخلفية
  const thumbnails = document.querySelectorAll('#background-thumbnails img');
  thumbnails.forEach(img => {
    img.addEventListener('click', function () {
      thumbnails.forEach(i => i.classList.remove('selected'));
      this.classList.add('selected');
      document.getElementById('selected-bg-image').value = this.dataset.bg;
    });
  });

  if (thumbnails.length > 0 && !document.getElementById('selected-bg-image').value) {
    thumbnails[0].click();
  }
  // رفع توقيع الرئيس
document.getElementById('chairmanSignatureUpload').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => chairmanSignatureDataURL = reader.result;
    reader.readAsDataURL(file);
  } else {
    chairmanSignatureDataURL = '';
  }
});

// رفع توقيع أمين الصندوق
document.getElementById('treasurerSignatureUpload').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => treasurerSignatureDataURL = reader.result;
    reader.readAsDataURL(file);
  } else {
    treasurerSignatureDataURL = '';
  }
});
});

function generateCertificate() {
  const title = document.getElementById('certificateTitle').value.trim();
  const name = document.getElementById('name').value.trim();
  const subtitle = document.getElementById('certificateSubtitle').value.trim();
  const body = document.getElementById('certificateText').value.trim();
  const date = document.getElementById('certificateDate').value;
  const stampText = document.getElementById('stampText').value.trim();
  const chairmanName = document.getElementById('chairmanName').value.trim();
  const chairmanTitle = document.getElementById('chairmanTitle').value.trim();
  const treasurerName = document.getElementById('treasurerName').value.trim();
  const treasurerTitle = document.getElementById('treasurerTitle').value.trim();

  const imageBg = document.getElementById('selected-bg-image').value;
  const orientation = document.querySelector('input[name="orientation"]:checked')?.value || 'portrait';

  if (!name || !title || !body || !date) {
    alert('يرجى ملء العنوان، النص، والتاريخ!');
    return;
  }
  if (!imageBg) {
    alert('يرجى اختيار خلفية!');
    return;
  }

  // تعيين الأبعاد
  const certDiv = document.getElementById('certificate');
  if (orientation === 'portrait') {
    certDiv.style.width = '794px';
    certDiv.style.height = '1123px';
  } else {
    certDiv.style.width = '1123px';
    certDiv.style.height = '794px';
  }

  // تطبيق الخلفية
  document.getElementById('cert-bg').src = `backgrounds/${imageBg}`;

  // بناء محتوى الشهادة
  let html = `
    <div class="cert-header">
      <h1>${title}</h1>
    </div>
    ${subtitle ? `<div class="cert-subtitle">${subtitle}</div>` : ''}
     <p class="certificate-text" style="font-size: 20px; margin-bottom: 10px;">
                    تمنح هذه الشهادة التقديرية إلى
                </p>
      <div class="cert-name">العضو / ${name}</div>
    <div class="cert-body">${body.replace(/\n/g, '<br>')}</div>
    
    <div class="cert-signatures">
      <div class="signature">
      <div class="title">${chairmanTitle}</div>
        <div class="name">${chairmanName}</div>
         ${chairmanSignatureDataURL ? `<div class="signature-image"><img src="${chairmanSignatureDataURL}" alt="توقيع الرئيس"></div>` : ''}
        
      </div>
<div class="cert-date"> ${formatDate(date)} - بتوقيت سلنارتي</div>
      <div class="signature">
        <div class="title">${treasurerTitle}</div>
        <div class="name">${treasurerName}</div>
         ${treasurerSignatureDataURL ? `<div class="signature-image"><img src="${treasurerSignatureDataURL}" alt="توقيع أمين الصندوق"></div>` : ''}
    
      </div>
    </div>
  `;

  // إضافة الختم إذا وُجد
  if (stampText) {
    html += `<div class="cert-stamp">${stampText}</div>`;
  }

  document.getElementById('certContent').innerHTML = html;

  // إظهار الشهادة والأزرار
  certDiv.style.display = 'block';
  document.getElementById('downloadBtn').style.display = 'inline-block';

  // ربط الأزرار
  document.getElementById('downloadBtn').onclick = downloadCertificate;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function downloadCertificate() {
  const cert = document.getElementById('certificate');
  html2canvas(cert, {
    scale: 2,
    useCORS: true,
    allowTaint: true
  }).then(canvas => {
    const link = document.createElement('a');
    link.download = 'شهادة-تقدير.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
}