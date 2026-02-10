import { defineConfig } from 'wxt';
import Icons from 'unplugin-icons/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    permissions: ['contextMenus', 'storage', 'activeTab', 'scripting', 'downloads'],
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      96: 'icon/96.png',
      128: 'icon/128.png',
    },
  },
  vite: () => ({
    plugins: [
      Icons({
        compiler: 'raw',
        autoInstall: true,
      }),
    ],
  }),
});
