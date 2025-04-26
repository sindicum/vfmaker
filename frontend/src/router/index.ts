import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/home/HomeView.vue'
import ManageFieldInfo from '../views/manage-fieldinfo/ManageFieldinfoView.vue'
import CreateVariableFertilizationMap from '@/views/create-variable-fertilization/CreateVariableFertilizationView.vue'
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
      path: '/manage-fieldinfo',
      name: 'ManageFieldInfo',
      component: ManageFieldInfo,
    },
    {
      path: '/create-vfm',
      name: 'CreateVfm',
      component: CreateVariableFertilizationMap,
    },
    {
      path: '/about',
      name: 'About',
      component: AboutView,
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: () => {
        return '/'
      },
    },
  ],
})

export default router
