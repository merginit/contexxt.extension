export default defineBackground(() => {
  console.log('Background script loaded');

  browser.contextMenus.removeAll().then(() => {
    browser.contextMenus.create({
      id: 'inspect-asset',
      title: 'Inspect with Contexxt',
      contexts: ['all'],
    });
    console.log('Context menu created');
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    console.log('Menu clicked:', info.menuItemId);
    if (info.menuItemId === 'inspect-asset' && tab?.id) {
      browser.tabs.sendMessage(tab.id, { type: 'INSPECT_ELEMENT' })
        .catch(err => console.error('Failed to send message:', err));
    }
  });

  browser.runtime.onMessage.addListener((message) => {
    console.log('Background: Message received', message);
    if (message.type === 'DOWNLOAD_ASSET') {
      console.log('Background: Attempting download', message.url);
      browser.downloads.download({ url: message.url }).then((id) => {
        console.log('Background: Download started, ID:', id);
      }).catch((err) => {
        console.error('Background: Download failed:', err);
      });
    }
  });
});
