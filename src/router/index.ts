import { createRouter, createWebHistory } from "vue-router"

import OpenGptChatView from "@/views/OpenGptChatView.vue"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "chat",
      component: OpenGptChatView
    },
    {
      path: "/c/:conversationId",
      name: "conversation",
      component: OpenGptChatView
    },
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/LoginView.vue")
    },
    {
      path: "/register",
      name: "register",
      component: () => import("@/views/RegisterView.vue")
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/"
    }
  ],
  scrollBehavior: () => ({ top: 0 })
})

export default router
