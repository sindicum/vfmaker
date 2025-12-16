import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import App from './App.vue'
import router from './router'

// GA4 初期化
function initGA4() {
  const GA4_ID = import.meta.env.VITE_GA4_ID
  if (!GA4_ID) return

  // gtag.js スクリプトを動的に追加
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`
  document.head.appendChild(script)

  // dataLayer と gtag 関数を初期化
  window.dataLayer = window.dataLayer || []
  window.gtag = function (...args: unknown[]) {
    window.dataLayer.push(args)
  }
  window.gtag('js', new Date())
  window.gtag('config', GA4_ID, {
    send_page_view: false, // ルーター経由で送信するため無効化
  })
}

initGA4()

// 起動処理を関数にまとめてテスト実行可能とした
export function createVfmApp() {
  const app = createApp(App)
  const pinia = createPinia()

  pinia.use(piniaPluginPersistedstate)

  app.use(pinia)
  app.use(router)

  return { app, pinia, router }
}

const { app } = createVfmApp()
app.mount('#app')
