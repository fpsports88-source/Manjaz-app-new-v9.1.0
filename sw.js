/* © YS — جميع الحقوق محفوظة */
const CACHE = 'munjiz-ultra-v9.2';
const PRECACHE = ['./', './index.html', './manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(PRECACHE.map(u => c.add(u).catch(() => null))))   // فشل ملف لا يُفشل التثبيت
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('munjiz-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // مكتبات Firebase (ثابتة بالإصدار): الكاش أولًا ليعمل التطبيق أوفلاين
  if (url.hostname === 'www.gstatic.com' && url.pathname.includes('/firebasejs/')) {
    event.respondWith(caches.match(req).then(c => c || fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(x => x.put(req, copy)); }
      return res;
    })));
    return;
  }

  // أي نطاق آخر (Firestore / Auth / جوجل): لا نتدخل أبدًا
  if (url.origin !== self.location.origin) return;
  // صفحة المطور لا تمر عبر الكاش
  if (url.pathname.endsWith('/admin.html')) return;

  // ملفات التطبيق: الكاش أولًا (فتح فوري) مع تحديث صامت في الخلفية
  const key = req.mode === 'navigate' ? './index.html' : req;
  event.respondWith(caches.match(key).then(cached => {
    const net = fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
      return res;
    }).catch(() => cached);
    return cached || net;
  }));
});

self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
