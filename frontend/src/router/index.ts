import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/home/HomeView.vue'
import ManageFieldPolygon from '../views/manage-fieldpolygon/ManageFieldPolygonView.vue'
import CreateVariableFertilizationMap from '@/views/create-vfm/CreateVariableFertilizationView.vue'
import ManageVariableFertilizationMap from '@/views/manage-vfm/ManageVariableFertilzationMap.vue'
import AboutView from '@/views/about/AboutView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/manage-fieldpolygon',
      name: 'ManageFieldPolygon',
      component: ManageFieldPolygon,
    },
    {
      path: '/create-vfm',
      name: 'CreateVfm',
      component: CreateVariableFertilizationMap,
    },
    {
      path: '/manage-vfm',
      name: 'ManageVfm',
      component: ManageVariableFertilizationMap,
    },
    {
      path: '/about',
      name: 'About',
      component: AboutView,
    },
    {
      path: '/error-log',
      name: 'ErrorLog',
      component: () => import('@/views/common/error/ErrorLog.vue'),
      meta: { title: 'エラーログ' },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: () => {
        return '/'
      },
    },
  ],
})

// GA4 ページビュー計測
router.afterEach((to) => {
  if (typeof window.gtag === 'function' && import.meta.env.VITE_GA4_ID) {
    window.gtag('event', 'page_view', {
      page_path: to.fullPath,
      page_title: (to.meta.title as string) || (to.name as string) || document.title,
    })
  }
})

export default router
