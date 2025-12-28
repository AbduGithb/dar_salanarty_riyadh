// إعدادات النظام
const SYSTEM_CONFIG = {
  appName: "نظام إدارة دار أبناء سلنارتي",
  version: "2.1",
  author: "سلنارتي",
  contactEmail: "salanarty@gmail.com",
  contactPhone: "+966502191635",
  security: {
    minPasswordLength: 6,
    maxLoginAttempts: 5,
    lockoutDuration: 15, // دقائق
    sessionDuration: 8, // ساعات
  },
};

// تصدير الإعدادات
if (typeof module !== "undefined" && module.exports) {
  module.exports = SYSTEM_CONFIG;
}
