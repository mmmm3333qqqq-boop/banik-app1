// اسم نسخة الكاش المحدثة - تغيير الإصدار إلى v2 يجبر كافة الهواتف على تنزيل التحديث الجديد فوراً
const CACHE_NAME = 'risala-pwa-v2';

// الملفات والمكتبات الأساسية للتشغيل والتخزين
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

// مرحلة التثبيت: تحميل الكاش الجديد وتخطي الانتظار فوراً
self.addEventListener('install', (event) => {
  self.skipWaiting(); // إجبار السيرفيس ووركر على التفعيل الفوري دون انتظار إغلاق المتصفح
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('تحذير أثناء تخزين الكاش المبدئي:', err);
      });
    })
  );
});

// مرحلة التنشيط: حذف كافة النسخ والكاشات القديمة (v1 وغيرها) لضمان عدم التعليق على التحديث القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('جارٍ إزالة الكاش القديم:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()) // السيطرة الفورية على جميع الصفحات المفتوحة
  );
});

// استقبال رسائل من التطبيق لعرض إشعار نظام حقيقي على شاشة الهاتف والاهتزاز
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const payload = event.data.payload || {};
    const title = payload.title || 'رسالة جديدة';
    const options = {
      body: payload.body || 'لديك إشعار جديد في تطبيق رسالة',
      icon: payload.icon || "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='120' fill='%232E1A47'/%3E%3Cpath d='M440 80L230 290M440 80l-140 380-70-170-170-80 380-130z' fill='none' stroke='%23F59E0B' stroke-width='38' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E",
      badge: "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='120' fill='%232E1A47'/%3E%3Cpath d='M440 80L230 290M440 80l-140 380-70-170-170-80 380-130z' fill='none' stroke='%23F59E0B' stroke-width='38' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E",
      vibrate: [250, 100, 250, 100, 250],
      tag: payload.tag || 'risala-notification',
      renotify: true,
      data: { url: './' }
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

// عند النقر على الإشعار من شريط الهاتف: فتح التطبيق والتركيز عليه فوراً
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('./');
      }
    })
  );
});

// اعتراض الطلبات: استخدام إستراتيجية الشبكة أولاً Network-First لملفات التطبيق الرئيسية
self.addEventListener('fetch', (event) => {
  // تجاهل طلبات قواعد البيانات الحية (Realtime DB & APIs) للسماح بتحديثها المباشر
  if (event.request.url.includes('firebaseio.com') || event.request.url.includes('api.ipify.org')) {
    return;
  }

  // بالنسبة لصفحة HTML الرئيسية: محاولة جلبها من الشبكة أولاً لضمان وصول التحديثات
  if (event.request.mode === 'navigate' || event.request.url.endsWith('index.html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request)) // في حال انقطاع الإنترنت يتم استخدام النسخة المخزنة
    );
    return;
  }

  // باقي الملفات والمكتبات: جلبها من الكاش إن وجدت لتسريع التصفح
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (event.request.method === 'GET' && networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});
