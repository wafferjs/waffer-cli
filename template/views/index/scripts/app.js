import routes from './routes.js'
/* global Vue VueRouter view */

const router = new VueRouter({
  mode: 'history',
  base: `/${view}/`,
  routes,
})

const app = new Vue({
  router,
}).$mount('#app')
