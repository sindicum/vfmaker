import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import App from './App.vue'
import router from './router'

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
