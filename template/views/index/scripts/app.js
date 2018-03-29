/* eslint no-unused-vars: ["error", { varsIgnorePattern: "app" }] */
/* global Vue VueRouter view */

import routes from './routes.js'

const router = new VueRouter({
  mode: 'history',
  base: `/${view}/`,
  routes: routes,
})

const app = new Vue({
  router,
}).$mount('#app')
