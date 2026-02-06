import { defineConfig } from 'wxt';
// @ts-expect-error: false positive
import Icons from 'unplugin-icons/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    permissions: ['contextMenus', 'storage', 'activeTab', 'scripting', 'downloads'],
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
