import './style.css';
import { settingsStorage, /* defaultSettings,  */ExtensionSettings } from '@/utils/storage';

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <div class="settings-panel">
    <h1>Contexxt Settings</h1>
    
    <div class="card">
      <h2>Display Options</h2>
      
      <div class="setting-row">
        <label for="showAlt">Alt Text Visibility</label>
        <div class="select-wrapper">
          <select id="showAlt">
            <option value="always">Always Visible</option>
            <option value="hover">Visible on Hover</option>
            <option value="no-hover">Hidden on Hover</option>
            <option value="never">Always Hidden</option>
          </select>
        </div>
      </div>

      <div class="setting-row">
        <label for="showUrl">URL Visibility</label>
        <div class="select-wrapper">
          <select id="showUrl">
            <option value="always">Always Visible</option>
            <option value="hover">Visible on Hover</option>
            <option value="no-hover">Hidden on Hover</option>
            <option value="never">Always Hidden</option>
          </select>
        </div>
      </div>
      
      <div class="section-divider"></div>
      
      <div class="setting-row row-switch">
          <label for="enableCtrlClick">
              Control + Click to Open
              <span class="sub-label">Hold Ctrl/Cmd and click asset</span>
          </label>
          <label class="switch">
            <input type="checkbox" id="enableCtrlClick">
            <span class="slider round"></span>
          </label>
      </div>

    </div>

    <p class="hint">
      Right-click an element and select <strong>"Inspect Asset"</strong> to use the extension.
    </p>
  </div>
`;

async function initSettings() {
  const current = await settingsStorage.getValue();

  const bindSelect = (id: keyof ExtensionSettings) => {
    const el = document.getElementById(id) as HTMLSelectElement;
    if (el) {
      el.value = current[id] as string;
      el.addEventListener('change', async () => {
        const val = el.value as any;
        await settingsStorage.setValue({ ...(await settingsStorage.getValue()), [id]: val });
      });
    }
  };

  bindSelect('showAlt');
  bindSelect('showUrl');

  const switchEl = document.getElementById('enableCtrlClick') as HTMLInputElement;
  if (switchEl) {
    switchEl.checked = current.enableCtrlClick;
    switchEl.addEventListener('change', async () => {
      await settingsStorage.setValue({ ...(await settingsStorage.getValue()), enableCtrlClick: switchEl.checked });
    });
  }
}

initSettings();
