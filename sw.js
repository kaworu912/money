self.addEventListener('install', (e) => {
    console.log('Service Worker Installed');
  });
  self.addEventListener('fetch', (e) => {
    // 基礎 PWA 設定，後續可加入離線快取邏輯
  });