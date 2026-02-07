import { InspectorOverlay } from '@/components/InspectorOverlay';
import { settingsStorage } from '@/utils/storage';
import { GlobalOverlayManager } from '@/components/GlobalOverlayManager';

export default defineContentScript({
    matches: ['<all_urls>'],
    main() {
        let lastRightClickedElement: HTMLElement | null = null;
        let clickPosition = { x: 0, y: 0 };
        const overlay = new InspectorOverlay();
        const globalOverlay = new GlobalOverlayManager();
        globalOverlay.init();

        console.log('Content script initialized');

        document.addEventListener('contextmenu', (e) => {
            lastRightClickedElement = e.target as HTMLElement;
            clickPosition = { x: e.clientX, y: e.clientY };
        }, true);

        let enableCtrlClick = false;

        settingsStorage.getValue().then(settings => {
            enableCtrlClick = settings.enableCtrlClick;
        });

        settingsStorage.watch((newSettings) => {
            if (newSettings) enableCtrlClick = newSettings.enableCtrlClick;
        });

        document.addEventListener('click', (e) => {
            if ((e.ctrlKey || e.metaKey) && enableCtrlClick) {
                const target = e.target as HTMLElement;
                if (target.closest('#contexxt-host')) return;

                const tagName = target.tagName.toLowerCase();
                let url = '';
                if (tagName === 'img') url = (target as HTMLImageElement).src || (target as HTMLImageElement).currentSrc;
                else if (tagName === 'video') url = (target as HTMLVideoElement).src || (target as HTMLVideoElement).currentSrc;

                if (url) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    e.stopPropagation();

                    console.log('Ctrl+Click detected, opening:', url);
                    window.open(url, '_blank');
                }
            }
        }, true);

        browser.runtime.onMessage.addListener(async (message) => {
            console.log('Message received:', message);
            if (message.type === 'INSPECT_ELEMENT' && lastRightClickedElement) {
                const el = lastRightClickedElement;
                const tagName = el.tagName.toLowerCase();
                let assetData: any = {};
                const assetUrl = (tagName === 'img' || tagName === 'video') ? (el as any).src || (el as any).currentSrc : null;

                if (tagName === 'img') {
                    const img = el as HTMLImageElement;
                    const src = img.currentSrc || img.src;
                    const fileName = src.split('/').pop()?.split('?')[0] || 'unknown';
                    const natural = `${img.naturalWidth} x ${img.naturalHeight}`;
                    const displayed = `${img.width} x ${img.height}`;

                    assetData = {
                        type: 'Image',
                        src: src,
                        fileName: fileName,
                        naturalDimensions: natural !== '0 x 0' ? natural : 'Unknown',
                        displayDimensions: displayed,
                        alt: img.alt
                    };
                } else if (tagName === 'video') {
                    const video = el as HTMLVideoElement;
                    assetData = {
                        type: 'Video',
                        src: video.currentSrc || video.src,
                        duration: formatDuration(video.duration),
                        resolution: `${video.videoWidth} x ${video.videoHeight}`
                    };
                } else {
                    const computed = window.getComputedStyle(el);
                    const font = computed.fontFamily.split(',')[0].replace(/['"]/g, '');
                    const size = computed.fontSize;
                    const weight = computed.fontWeight;

                    assetData = {
                        type: 'Element',
                        tagName: tagName,
                        font: `${font} (${weight})`,
                        size: size,
                        color: computed.color,
                        hex: rgbToHex(computed.color),
                        className: el.className || null
                    };
                }

                overlay.mount(clickPosition.x, clickPosition.y, assetData);

                if (assetUrl && !assetUrl.startsWith('file://')) {
                    fetch(assetUrl, { method: 'HEAD' }).then(res => {
                        const size = res.headers.get('content-length');
                        const type = res.headers.get('content-type');
                        if (size || type) {
                            const formattedSize = size ? formatBytes(parseInt(size, 10)) : undefined;
                            overlay.update({ ...assetData, fileSize: formattedSize, mimeType: type || undefined });
                        }
                    }).catch(() => { /* Ignore fetch errors (CORS etc) */ });
                }

                overlay.setHandlers({
                    onDownload: () => {
                        console.log('Content: Sending DOWNLOAD_ASSET', assetUrl);
                        if (assetUrl) {
                            browser.runtime.sendMessage({ type: 'DOWNLOAD_ASSET', url: assetUrl });
                        }
                    },
                    onOpenTab: () => {
                        if (assetUrl) {
                            window.open(assetUrl, '_blank');
                        }
                    }
                });
            }
        });
    },
});

function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    const numberStr = new Intl.NumberFormat('en-US', {
        maximumFractionDigits: dm,
        minimumFractionDigits: 0
    }).format(parseFloat((bytes / Math.pow(k, i)).toFixed(dm)));

    return `${numberStr} ${sizes[i]}`;
}

function formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds)) return 'Unknown';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function rgbToHex(rgb: string): string {
    if (!rgb) return '';
    const result = rgb.match(/\d+/g);
    if (!result || result.length < 3) return rgb;
    return '#' + ((1 << 24) + (parseInt(result[0]) << 16) + (parseInt(result[1]) << 8) + parseInt(result[2])).toString(16).slice(1).toUpperCase();
}
