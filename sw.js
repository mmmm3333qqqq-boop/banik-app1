// اسم نسخة الكاش الخاصة بتطبيق رسالة
const CACHE_NAME = 'risala-pwa-v1';

// الملفات والمكتبات الأساسية للتشغيل أوفلاين
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.development.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap'
];

// مرحلة التثبيت: حفظ الملفات في ذاكرة التخزين المؤقت
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('تحذير أثناء تخزين الكاش المبدئي:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// مرحلة التنشيط: حذف الكاش القديم إن وجد
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// اعتراض الطلبات وتقديم البيانات المخزنة كاش أو من الشبكة
self.addEventListener('fetch', (event) => {
  // تجاهل طلبات قواعد البيانات الحية (Realtime DB & APIs) للسماح بتحديثها المباشر
  if (event.request.url.includes('firebaseio.com') || event.request.url.includes('api.ipify.org')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // إذا كان الطلب ناجحاً نقوم بحفظ نسخة إضافية بالكاش
        if (event.request.method === 'GET' && networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // في حال انقطاع النت تماماً
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
