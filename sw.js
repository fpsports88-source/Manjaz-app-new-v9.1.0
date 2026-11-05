/* منجز — Service Worker v11: تحميل سريع + يعمل بدون إنترنت + تحديث فوري عند النشر */
const VERSION = 'munjiz-v11.0.0.0';
const CORE = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(CORE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return; // Firebase / CDN تذهب مباشرة للشبكة

  // صفحة التطبيق: الشبكة أولًا (يظهر أي تحديث فورًا) ثم النسخة المخزّنة عند انقطاع الإنترنت
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r)
        .then((res) => { const cp = res.clone(); caches.open(VERSION).then((c) => c.put('./index.html', cp)); return res; })
        .catch(() => caches.match('./index.html').then((x) => x || caches.match('./')))
    );
    return;
  }

  // باقي الملفات: من الكاش فورًا وتتحدّث في الخلفية
  e.respondWith(
    caches.match(r).then((hit) => {
      const net = fetch(r)
        .then((res) => { if (res && res.ok) { const cp = res.clone(); caches.open(VERSION).then((c) => c.put(r, cp)); } return res; })
        .catch(() => hit);
      return hit || net;
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window' }).then((l) => {
    for (const c of l) { if ('focus' in c) return c.focus(); }
    return clients.openWindow('./');
  }));
});
