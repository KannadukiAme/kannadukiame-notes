// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import tailwindcss from '@tailwindcss/vite'
import starlightThemeRapide from 'starlight-theme-rapide'

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: "神無月雨's 魔導書",
      description:
        '神無月雨的个人技术笔记站点，收录网络代理、虚拟化、Linux 与个人家庭服务器的折腾实录与技术沉淀。',
      locales: {
        root: {
          label: '简体中文',
          lang: 'zh-CN',
        },
      },
      logo: {
        dark: './src/assets/logo-dark.svg',
        light: './src/assets/logo-light.svg',
        alt: "神無月雨's 魔導書",
      },
      customCss: ['./src/styles/custom.css'],
      lastUpdated: true,
      plugins: [starlightThemeRapide()],
      sidebar: [
        {
          label: '网络代理',
          items: [{ autogenerate: { directory: 'network-proxy' } }],
        },
      ],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
})
