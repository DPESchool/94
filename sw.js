// ============ SERVICE WORKER (জেনারিক — যেকোনো স্কুলের জন্য ব্যবহারযোগ্য) ============
// নতুন আপডেট দিলে শুধু এই ভার্সন নম্বরটা বাড়িয়ে দিলেই পুরনো ক্যাশ বাদ দিয়ে নতুন করে
// সব ফাইল আবার ক্যাশ হবে। ভার্সন না বাড়ালে ইউজার পুরনো ক্যাশড কপি দেখতে পারে।
const CACHE_VERSION = "v1";
const CACHE_NAME = "school-app-cache-" + CACHE_VERSION;

// অ্যাপ-শেল (অফলাইনেও যেন অন্তত পেজটা খোলে, তার জন্য মিনিমাম ফাইলগুলো)
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => console.warn("SW install cache error:", err))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // শুধু GET রিকোয়েস্ট হ্যান্ডেল করবো
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // ভিন্ন origin-এর রিকোয়েস্ট (Firebase/Firestore, EmailJS, ImgBB API ইত্যাদি)
  // ক্যাশ করবো না — সরাসরি নেটওয়ার্কে যেতে দেব, নাহলে লাইভ ডাটা আপডেট আটকে যাবে।
  if (url.origin !== self.location.origin) return;

  // Same-origin ফাইলের জন্য: আগে ক্যাশ থেকে সাথে সাথে দেখাও, একই সাথে ব্যাকগ্রাউন্ডে
  // নেটওয়ার্ক থেকে নতুন ভার্সন এনে ক্যাশ আপডেট করে রাখো (stale-while-revalidate)।
  event.respondWith(
    caches.match(req).then((cachedRes) => {
      const networkFetch = fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(() => cachedRes); // অফলাইন হলে ক্যাশড কপি দেখাও

      return cachedRes || networkFetch;
    })
  );
});
