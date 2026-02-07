import { settingsStorage, defaultSettings, ExtensionSettings } from '@/utils/storage';
import CopyIcon from '~icons/lucide/copy?raw';
import CheckIcon from '~icons/lucide/check?raw';

export type AssetData =
  | { type: 'Image'; src: string; fileName: string; naturalDimensions: string; displayDimensions: string; alt: string | null; fileSize?: string; mimeType?: string }
  | { type: 'Video'; src: string; duration: string; resolution: string; fileSize?: string; mimeType?: string }
  | { type: 'Element'; tagName: string; font: string; size: string; color: string; hex: string; className: string | null };

export class InspectorOverlay {
  private host: HTMLDivElement;
  private shadow: ShadowRoot;
  private container: HTMLDivElement;
  private currentData: AssetData | null = null;
  private settings: ExtensionSettings = defaultSettings;

  constructor() {
    this.host = document.createElement('div');
    this.host.id = 'contexxt-host';
    this.host.style.all = 'initial';
    this.host.style.position = 'fixed';
    this.host.style.zIndex = '2147483647';
    this.host.style.top = '0';
    this.host.style.left = '0';
    this.host.style.width = '0';
    this.host.style.height = '0';

    this.shadow = this.host.attachShadow({ mode: 'open' });
    this.container = document.createElement('div');
    this.container.className = 'overlay-container';

    const style = document.createElement('style');
    style.textContent = this.getStyles();
    this.shadow.appendChild(style);
    this.shadow.appendChild(this.container);

    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const copyBtn = target.closest('.copy-btn') as HTMLElement;
      if (copyBtn && copyBtn.dataset.copy) {
        e.stopPropagation();
        navigator.clipboard.writeText(copyBtn.dataset.copy).then(() => {
          const originalContent = copyBtn.innerHTML;
          copyBtn.innerHTML = CheckIcon;
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.innerHTML = originalContent;
            copyBtn.classList.remove('copied');
          }, 1000);
        });
        return;
      }
    });
  }

  public async mount(x: number, y: number, data: AssetData) {
    this.settings = await settingsStorage.getValue();

    if (!document.body.contains(this.host)) {
      document.body.appendChild(this.host);
    }

    this.currentData = data;
    this.updateRender();
    this.setPosition(x, y);

    requestAnimationFrame(() => {
      this.container.classList.add('visible');
    });

    const closeHandler = (e: MouseEvent) => {
      const path = e.composedPath();
      if (!path.includes(this.container) && !path.includes(this.host)) {
        this.unmount();
        window.removeEventListener('pointerdown', closeHandler);
      }
    };
    window.addEventListener('pointerdown', closeHandler, { capture: true });
  }

  public update(data: AssetData) {
    this.currentData = data;
    this.updateRender();
  }

  private updateRender() {
    if (!this.currentData) return;
    this.container.innerHTML = this.generateHtml(this.currentData);

    if (this.storedHandlers) {
      this.bindButtons(this.storedHandlers);
    }
  }

  private storedHandlers: { onDownload?: () => void; onOpenTab?: () => void } | null = null;

  public setHandlers(handlers: { onDownload?: () => void; onOpenTab?: () => void }) {
    this.storedHandlers = handlers;
    this.bindButtons(handlers);
  }

  private bindButtons(handlers: { onDownload?: () => void; onOpenTab?: () => void }) {
    const btnDownload = this.shadow.getElementById('btn-download');
    const btnOpenTab = this.shadow.getElementById('btn-open-tab');

    if (btnDownload && handlers.onDownload) {
      btnDownload.onclick = (e) => {
        console.log('Overlay: Download clicked');
        e.stopPropagation();
        handlers.onDownload?.();
      };
    } else {
      console.log('Overlay: Download button or handler missing', !!btnDownload, !!handlers.onDownload);
    }

    if (btnOpenTab && handlers.onOpenTab) {
      btnOpenTab.onclick = (e) => {
        console.log('Overlay: Open Tab clicked');
        e.stopPropagation();
        handlers.onOpenTab?.();
      };
    }
  }

  private generateHtml(data: AssetData): string {
    let type: string = data.type;
    let previewHtml = '';
    let detailRows = '';

    const getVisibilityClass = (setting: 'always' | 'hover' | 'no-hover' | 'never') => {
      if (setting === 'hover') return 'show-on-hover';
      if (setting === 'no-hover') return 'hide-on-hover';
      if (setting === 'never') return 'hidden-always';
      return '';
    };

    const createRow = (label: string, value: string, visibilityClass = '', copyValue: string | null = null) => {
      const copyBtn = copyValue ? `<button class="copy-btn" title="Copy" data-copy="${copyValue}">${CopyIcon}</button>` : '';
      const rowClass = `row ${visibilityClass}`;
      return `
      <div class="${rowClass}">
        <span class="label">${label}</span>
        <div style="display:flex;align-items:center;gap:6px;justify-content:flex-end;width:100%;min-width:0;">
            <span class="value">${value}</span>
            ${copyBtn}
        </div>
      </div>
    `;
    };

    let overlayIcons = '';

    const generateOverlayIcons = (hasDownload: boolean) => {
      return `
        <div class="preview-actions">
             <button class="icon-btn" id="btn-open-tab" title="Open in New Tab">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
             </button>
             ${hasDownload ? `
             <button class="icon-btn" id="btn-download" title="Download">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
             </button>` : ''}
        </div>
        `;
    };

    if (data.type === 'Image') {
      overlayIcons = generateOverlayIcons(true);
      previewHtml = `
            <div class="preview-wrapper">
                <img src="${data.src}" class="preview-image" />
                ${overlayIcons}
            </div>
        `;

      detailRows += createRow('Source', `<a href="${data.src}" target="_blank" class="link-val">${data.fileName.slice(0, 25)}${data.fileName.length > 25 ? '...' : ''}</a>`, getVisibilityClass(this.settings.showUrl), data.src);
      detailRows += createRow('Dimensions', data.naturalDimensions, '', data.naturalDimensions);
      detailRows += createRow('Display', data.displayDimensions, '', data.displayDimensions);
      detailRows += createRow('Alt Text', data.alt || '<em class="dim">None</em>', getVisibilityClass(this.settings.showAlt), data.alt);

      if (data.fileSize) detailRows += createRow('File Size', data.fileSize);
      if (data.mimeType) detailRows += createRow('Type', data.mimeType);

    } else if (data.type === 'Video') {
      overlayIcons = generateOverlayIcons(true);
      previewHtml = `
            <div class="preview-wrapper">
                <video src="${data.src}" class="preview-video" autoplay muted loop playsinline></video>
                ${overlayIcons}
            </div>
        `;

      detailRows += createRow('Source', `...${data.src.slice(-30)}`, getVisibilityClass(this.settings.showUrl), data.src);
      detailRows += createRow('Duration', data.duration, '', data.duration);
      detailRows += createRow('Resolution', data.resolution, '', data.resolution);
      if (data.fileSize) detailRows += createRow('File Size', data.fileSize);
      if (data.mimeType) detailRows += createRow('Type', data.mimeType);
    } else {
      type = 'HTML Element';
      detailRows += createRow('Tag', `<code class="tag-badge">&lt;${data.tagName}&gt;</code>`, '', `<${data.tagName}>`);
      detailRows += createRow('Font', data.font, '', data.font);
      detailRows += createRow('Size', data.size, '', data.size);
      detailRows += createRow('Color', `<span class="color-dot" style="background:${data.color}"></span>${data.hex}`, '', data.hex);
      if (data.className) detailRows += createRow('Class', `.${data.className.split(' ').join('.')}`, '', data.className);
    }

    return `
      <div class="header">
         <div class="title">Contexxt</div>
         <div class="type-badge">${type}</div>
      </div>
      <div class="content">
        ${previewHtml}
        ${detailRows}
      </div>
    `;
  }

  public unmount() {
    this.container.classList.remove('visible');
    setTimeout(() => {
      if (this.host.parentNode) this.host.parentNode.removeChild(this.host);
    }, 200);
  }

  private setPosition(x: number, y: number) {
    const padding = 12;
    requestAnimationFrame(() => {
      const rect = this.container.getBoundingClientRect();
      let left = x + padding;
      let top = y + padding;
      if (left + rect.width > window.innerWidth) left = x - rect.width - padding;
      if (top + rect.height > window.innerHeight) top = y - rect.height - padding;
      left = Math.max(padding, left);
      top = Math.max(padding, top);
      this.container.style.left = `${left}px`;
      this.container.style.top = `${top}px`;
    });
  }

  private getStyles() {
    return `
      :host {
        --bg-color: rgba(20, 20, 23, 0.95);
        --border-color: rgba(255, 255, 255, 0.1);
        --text-primary: #ededed;
        --text-secondary: #a1a1aa;
        --accent-color: #f5d700;
        --font-family: 'Inter', sans-serif;
        --glass-blur: 24px;
      }
      * { box-sizing: border-box; }
      .overlay-container {
        position: fixed; width: 320px;
        background: var(--bg-color);
        backdrop-filter: blur(var(--glass-blur));
        border: 1px solid var(--border-color);
        border-radius: 12px;
        box-shadow: 0 16px 40px rgba(0,0,0,0.5);
        font-family: var(--font-family); color: var(--text-primary);
        font-size: 13px; opacity: 0; transform: scale(0.96);
        transition: opacity 0.2s, transform 0.2s;
        overflow: hidden;
      }
      .overlay-container.visible { opacity: 1; transform: scale(1); }
      .header {
        padding: 12px 16px; border-bottom: 1px solid var(--border-color);
        display: flex; justify-content: space-between; align-items: center;
        background: rgba(255,255,255,0.03);
      }
      .title { font-weight: 600; font-size: 14px; }
      .type-badge { font-size: 10px; background: rgba(245, 215, 0, 0.2); color: #f5d700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; font-weight: 600; }
      .content { padding: 16px; }
      
      .preview-wrapper { position: relative; margin-bottom: 16px; border-radius: 6px; overflow: hidden; border: 1px solid var(--border-color); }
      .preview-image, .preview-video { width: 100%; height: auto; max-height: 200px; object-fit: contain; background: rgba(0,0,0,0.2); display: block; }
      .video-placeholder { padding: 40px; text-align: center; background: rgba(0,0,0,0.3); color: var(--text-secondary); font-size: 11px; font-weight: 600; letter-spacing: 1px; }

      .preview-actions {
          position: absolute; top: 8px; right: 8px;
          display: flex; gap: 6px;
      }
      .icon-btn {
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          width: 28px; height: 28px;
          border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
      }
      .icon-btn:hover { background: rgba(0,0,0,0.8); transform: scale(1.05); border-color: white; }
      .icon-btn:active { transform: scale(0.95); }

      .row { display: flex; justify-content: space-between; margin-bottom: 8px; align-items: center; min-height: 20px; }
      .row:last-child { margin-bottom: 0; }
      .label { color: var(--text-secondary); font-size: 12px; flex-shrink: 0; margin-right: 12px; }
      .value { text-align: right; font-family: 'Menlo', monospace; font-size: 11px; word-break: break-all; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; }
      .link-val { color: inherit; text-decoration: none; border-bottom: 1px dotted #666; }
      .dim { opacity: 0.5; }
      .tag-badge { background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 4px; }
      .color-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; border: 1px solid rgba(255,255,255,0.2); vertical-align: middle; }
      
      .copy-btn {
          background: transparent; border: none; cursor: pointer;
          font-size: 0; /* Hide text if any, show svg */
          opacity: 0.3; transition: opacity 0.2s;
          padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center;
          width: 20px; height: 20px;
          color: var(--text-secondary);
      }
      .copy-btn svg { width: 14px; height: 14px; }
      .copy-btn:hover { opacity: 1; background: rgba(255,255,255,0.1); color: var(--text-primary); }
      .copy-btn.copied { color: var(--accent-color); opacity: 1; }
      
      .show-on-hover { opacity: 0; transition: opacity 0.2s; }
      .overlay-container:hover .show-on-hover { opacity: 1; }
      
      .hide-on-hover { opacity: 1; transition: opacity 0.2s; }
      .overlay-container:hover .hide-on-hover { opacity: 0; }
      
      .hidden-always { display: none !important; }
    `;
  }
}
