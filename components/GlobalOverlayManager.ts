import { ExtensionSettings, settingsStorage } from '@/utils/storage';
import ExternalLinkIcon from '~icons/lucide/external-link?raw';

export class GlobalOverlayManager {
    private overlays = new Map<HTMLElement, { container: HTMLElement, cleanup?: () => void }>();
    private settings: ExtensionSettings | null = null;
    private mutationObserver: MutationObserver | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private isEnabled = false;

    constructor() {
        this.mutationObserver = new MutationObserver((mutations) => this.handleMutations(mutations));
        this.resizeObserver = new ResizeObserver((entries) => this.handleResizes(entries));
    }

    public async init() {
        if (document.contentType.startsWith('image/') || document.contentType.startsWith('video/') || document.contentType.startsWith('audio/')) {
            return;
        }

        this.settings = await settingsStorage.getValue();
        this.updateEnabledState();

        settingsStorage.watch((newSettings) => {
            if (newSettings) {
                this.settings = newSettings;
                this.updateEnabledState();
                this.updateAll();
            }
        });

        this.scan();

        this.mutationObserver?.observe(document.body, { childList: true, subtree: true });

        window.addEventListener('scroll', () => this.repositionAll(), { passive: true, capture: true });
        window.addEventListener('resize', () => this.repositionAll(), { passive: true });
    }

    private repositionAll() {
        this.overlays.forEach((_, element) => this.repositionOverlay(element));
    }

    private updateEnabledState() {
        if (!this.settings) return;
        this.isEnabled = this.settings.showAlt !== 'never' || this.settings.showUrl !== 'never';
    }

    private scan() {
        if (!this.isEnabled) {
            this.cleanupAll();
            return;
        }

        const assets = document.querySelectorAll('img, video');
        assets.forEach((el) => {
            if (!this.overlays.has(el as HTMLElement)) {
                if (el.closest('.contexxt-global-overlay')) return;
                this.createOverlay(el as HTMLElement);
            }
        });
    }

    private handleMutations(mutations: MutationRecord[]) {
        if (!this.isEnabled) return;
        let shouldScan = false;
        for (const m of mutations) {
            if (m.addedNodes.length > 0) shouldScan = true;
            // Handle removals
            m.removedNodes.forEach(node => {
                if (node instanceof HTMLElement) {
                    // If the element itself is removed
                    if (this.overlays.has(node)) {
                        this.removeOverlay(node);
                    }

                    // Deep check for children removed
                    if (node.querySelectorAll) {
                        const removedAssets = node.querySelectorAll('img, video');
                        removedAssets.forEach(asset => this.removeOverlay(asset as HTMLElement));
                    }
                }
            });
        }
        if (shouldScan) this.scan();
    }

    private handleResizes(entries: ResizeObserverEntry[]) {
        for (const entry of entries) {
            const target = entry.target as HTMLElement;
            if (this.overlays.has(target)) {
                this.repositionOverlay(target);
            }
        }
    }

    private createOverlay(element: HTMLElement) {
        // Create Overlay Container
        const container = document.createElement('div');
        container.className = 'contexxt-global-overlay';

        // Shadow DOM for isolation
        const shadow = container.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = this.getStyles();
        shadow.appendChild(style);

        const wrapper = document.createElement('div');
        wrapper.className = 'overlay-wrapper';
        shadow.appendChild(wrapper);

        // --- Content ---
        this.renderContent(element, wrapper);

        document.body.appendChild(container); // Append to body for safe absolute positioning

        this.overlays.set(element, { container });
        this.resizeObserver?.observe(element);
        this.repositionOverlay(element);

        const handleEnter = () => {
            wrapper.classList.add('active');
        };

        const handleLeave = (e: MouseEvent) => {
            if (e.relatedTarget === container || (e.relatedTarget as Element)?.closest?.('.contexxt-global-overlay') === container) {
                return;
            }
            wrapper.classList.remove('active');
        };

        element.addEventListener('mouseenter', handleEnter);
        element.addEventListener('mouseleave', handleLeave);

        container.addEventListener('mouseenter', handleEnter);
        container.addEventListener('mouseleave', (e) => {
            if (e.relatedTarget === element) return;
            wrapper.classList.remove('active');
        });
    }

    private renderContent(element: HTMLElement, wrapper: HTMLElement) {
        if (!this.settings) return;

        const tagName = element.tagName.toLowerCase();
        let src = '';
        let alt = '';
        let displayTxt = '';

        if (tagName === 'img') {
            const img = element as HTMLImageElement;
            src = img.currentSrc || img.src;
            alt = img.alt;
            displayTxt = `${img.naturalWidth}x${img.naturalHeight}`;
        } else if (tagName === 'video') {
            const video = element as HTMLVideoElement;
            src = video.currentSrc || video.src;
            displayTxt = `${video.videoWidth}x${video.videoHeight}`;
        }

        const fileName = src.split('/').pop()?.split('?')[0] || 'Asset';

        if (tagName === 'video') {
            wrapper.classList.add('video-mode');
        } else {
            wrapper.classList.remove('video-mode');
        }

        // 1. Top Right Icon (Open in New Tab) - Controlled by URL Visibility (per user request)
        // "URL Visibility was intended to show a icon button..."
        // So if showUrl != never, we show the icon.
        const showIcon = this.settings.showUrl !== 'never';
        const iconBtn = document.createElement('button');
        if (showIcon) {
            iconBtn.className = 'icon-btn';
            iconBtn.title = 'Open in New Tab';
            iconBtn.innerHTML = ExternalLinkIcon;
            iconBtn.onclick = (e) => {
                e.stopPropagation();
                window.open(src, '_blank');
            };
        }

        // 2. Bauchbinde (Bottom Bar) - Controlled by URL setting logic
        // User said "the other one as bauchbinde". Assuming "URL Visibility" controls both.
        const bottomBar = document.createElement('div');
        // If Always: Visible. If Hover: Visible on .active.
        const urlClass = this.getVisibilityClass(this.settings.showUrl);
        bottomBar.className = `bottom-bar ${urlClass}`;
        bottomBar.innerHTML = `
        <span class="url" title="${src}">${fileName}</span>
        <span class="dims">${displayTxt}</span>
      `;

        // 3. Alt Badge
        let altBadge: HTMLElement | null = null;
        if (tagName === 'img') { // Only images have alt
            altBadge = document.createElement('div');
            altBadge.className = `alt-badge ${this.getVisibilityClass(this.settings.showAlt)}`;
            altBadge.textContent = alt ? `ALT: ${alt}` : 'NO ALT';
            if (!alt) altBadge.classList.add('missing');
        }

        // Assemble
        if (showIcon) wrapper.appendChild(iconBtn);
        wrapper.appendChild(bottomBar);
        if (altBadge) wrapper.appendChild(altBadge);
    }

    private getVisibilityClass(setting: string) {
        if (setting === 'always') return 'visible';
        if (setting === 'hover') return 'show-on-hover';
        if (setting === 'no-hover') return 'hide-on-hover';
        return 'hidden';
    }

    private repositionOverlay(element: HTMLElement) {
        const entry = this.overlays.get(element);
        if (!entry) return;

        const rect = element.getBoundingClientRect();
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        // Update styles
        const s = entry.container.style;
        s.left = `${rect.left + scrollX}px`;
        s.top = `${rect.top + scrollY}px`;
        s.width = `${rect.width}px`;
        s.height = `${rect.height}px`;

        // Hide if 0x0 (hidden element)
        s.display = (rect.width === 0 || rect.height === 0) ? 'none' : 'block';
    }

    private removeOverlay(element: HTMLElement) {
        const entry = this.overlays.get(element);
        if (entry) {
            entry.container.remove();
            this.resizeObserver?.unobserve(element);
            this.overlays.delete(element);
        }
    }

    private updateAll() {
        // Re-render content for all existing overlays
        this.scan(); // Add new ones
        this.overlays.forEach((entry, element) => {
            const overlayWrapper = entry.container.shadowRoot?.querySelector('.overlay-wrapper');
            if (overlayWrapper) {
                overlayWrapper.innerHTML = '';
                this.renderContent(element, overlayWrapper as HTMLElement);
            }
        });
    }

    private cleanupAll() {
        this.overlays.forEach((entry) => entry.container.remove());
        this.overlays.clear();
        this.resizeObserver?.disconnect();
    }

    private getStyles() {
        return `
      :host { pointer-events: none; position: absolute; z-index: 2147483646; }
      * { box-sizing: border-box; }
      .overlay-wrapper { position: relative; width: 100%; height: 100%; pointer-events: none; }
      
      /* Action Icon - Top Right */
      .icon-btn {
          position: absolute; top: 8px; right: 8px;
          pointer-events: auto;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          width: 24px; height: 24px;
          border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; opacity: 0; transition: opacity 0.2s, transform 0.1s;
      }
      .icon-btn:hover { background: rgba(0,0,0,0.8); transform: scale(1.1); }
      .wrapper.active .icon-btn { opacity: 1; } /* Connected to JS active state */
      .overlay-wrapper.active .icon-btn { opacity: 1; }
      
      .icon-btn svg { width: 14px; height: 14px; }

      /* Bauchbinde - Bottom Bar */
      .bottom-bar {
          position: absolute; bottom: 0; left: 0; width: 100%;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          padding: 6px 10px;
          display: flex; justify-content: space-between; align-items: center;
          color: white; font-family: 'Inter', sans-serif; font-size: 11px;
          border-bottom-left-radius: 0; border-bottom-right-radius: 0;
          transition: opacity 0.2s;
      }
      .url { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%; opacity: 0.9; }
      .dims { opacity: 0.6; font-family: 'Menlo', monospace; font-size: 10px; }

      /* Alt Badge - Top Left */
      .alt-badge {
          position: absolute; top: 8px; left: 8px;
          background: rgba(245, 215, 0, 0.9);
          color: black;
          padding: 4px 8px;
          border-radius: 4px;
          font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 600;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          max-width: 80%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          transition: opacity 0.2s;
      }
      .alt-badge.missing { background: rgba(255, 50, 50, 0.8); }

      /* Visibility Classes */
      .visible { opacity: 1; }
      .hidden { display: none; }
      
      /* Show on Hover: Hidden by default, Visible when .active */
      .show-on-hover { opacity: 0; transition: opacity 0.2s; }
      .overlay-wrapper.active .show-on-hover { opacity: 1; }
      
      /* Hide on Hover: Visible by default, Hidden when .active */
      .hide-on-hover { opacity: 1; transition: opacity 0.2s; }
      .overlay-wrapper.active .hide-on-hover { opacity: 0; }

      /* VIDEO SPECIFIC OVERRIDES */
      /* Bar on Top */
      .overlay-wrapper.video-mode .bottom-bar {
          bottom: auto; top: 0;
          border-bottom-left-radius: 0; border-bottom-right-radius: 0; /* Clear bottom radius */
      }
      
      /* Icon below the top bar */
      .overlay-wrapper.video-mode .icon-btn {
          top: 33px;
      }
      `;
    }
}
