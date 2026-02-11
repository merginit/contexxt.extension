import { defineConfig } from 'wxt';
import Icons from 'unplugin-icons/vite';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'Contexxt',
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
  runner: {
    startUrls: [pathToFileURL(path.resolve('test-page.html')).href],
  },
});
