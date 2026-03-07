import { createRouter, createWebHashHistory } from 'vue-router'
import ToolGrid from '../views/ToolGrid.vue'
import ToolPage from '../views/ToolPage.vue'

const routes = [
  {
    path: '/',
    name: 'ToolGrid',
    component: ToolGrid
  },
  {
    path: '/tool/:id',
    name: 'ToolPage',
    component: ToolPage
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
