import { storage } from '@wxt-dev/storage';

export default defineContentScript({
    // Add Instagram reels URL pattern
    matches: [
      '*://*.facebook.com/reel/*',
      '*://*.instagram.com/reels/*'
    ],
  async main() {
    // Define storage items for better type safety and consistency
    const volumeStorage = storage.defineItem<number>('local:reelsVolume', {
      fallback: 100,
    });

    const createVolumeControl = async (videoElement: HTMLVideoElement) => {
      const currentVolume = await volumeStorage.getValue();
      
      const container = document.createElement('div');
      container.className = 'reels-volume-control';
      container.style.cssText = `
        position: fixed;
        right: 20px;
        top: 50%;
        transform: translateY(-50%);
        background-color: #111;
        width: 70px;
        height: 320px;
        border-radius: 40px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        padding: 20px 0;
        z-index: 999999;
        box-shadow: 0 0 12px rgba(24, 119, 242, 0.3);
      `;

      const volumeIcon = document.createElement('div');
      volumeIcon.className = 'mute-icon';
      volumeIcon.innerHTML = '🔊';
      volumeIcon.style.cssText = `
        color: #fff;
        font-size: 24px;
        cursor: pointer;
        user-select: none;
      `;

      const volumeTrack = document.createElement('div');
      volumeTrack.className = 'volume-track';
      volumeTrack.style.cssText = `
        width: 30px;
        height: 200px;
        background-color: #333;
        border-radius: 15px;
        position: relative;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        margin: 10px 0;
      `;

      const volumeFill = document.createElement('div');
      volumeFill.className = 'volume-fill';
      const volumeValue = document.createElement('span');
      volumeValue.className = 'volume-value';
      volumeFill.appendChild(volumeValue);

      const moreDots = document.createElement('div');
      moreDots.className = 'more-dots';
      moreDots.textContent = '•••';
      moreDots.style.cssText = `
        color: #ccc;
        font-size: 18px;
        letter-spacing: 2px;
      `;

      // Add styles
      const styleSheet = document.createElement('style');
      styleSheet.textContent = `
        .volume-fill {
          width: 100%;
          background: linear-gradient(
            to top,
            #1877f2,
            #f56040,
            #f77737,
            #fcaf45,
            #ffdc80,
            #fd1d1d,
            #833ab4,
            #c13584
          );
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: absolute;
          bottom: 0;
          transition: height 0.2s ease;
          color: black;
          font-weight: bold;
          font-size: 12px;
          text-align: center;
          padding: 2px 0;
        }
      `;
      document.head.appendChild(styleSheet);

      const updateVolumeUI = (value: number) => {
        const percentage = value;
        volumeFill.style.height = `${percentage}%`;
        volumeValue.textContent = `${Math.round(percentage)}%`;
        videoElement.volume = percentage / 100;
      };

      const setVolumeFromClick = (event: MouseEvent) => {
        const rect = volumeTrack.getBoundingClientRect();
        const offsetY = event.clientY - rect.top;
        const newVolume = Math.round((1 - offsetY / rect.height) * 100);
        const clampedVolume = Math.max(0, Math.min(100, newVolume));
        
        updateVolumeUI(clampedVolume);
        volumeStorage.setValue(clampedVolume);
      };

      volumeTrack.addEventListener('mousedown', (event) => {
        setVolumeFromClick(event);

        const onMove = (moveEvent: MouseEvent) => setVolumeFromClick(moveEvent);
        const onUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      // Apply initial volume
      updateVolumeUI(currentVolume);

      // Watch for volume changes from storage
      const unwatchVolume = volumeStorage.watch((newVolume) => {
        if (newVolume !== null) {
          updateVolumeUI(newVolume);
        }
      });

      volumeTrack.appendChild(volumeFill);
      container.appendChild(volumeIcon);
      container.appendChild(volumeTrack);
      container.appendChild(moreDots);
      document.body.appendChild(container);

      const cleanup = () => {
        unwatchVolume();
        document.removeEventListener('mousemove', () => {});
        document.removeEventListener('mouseup', () => {});
      };

      (container as any)._cleanup = cleanup;
    };

    const handleNewVideo = () => {
      const videos = document.querySelectorAll('video');

      document.querySelectorAll('.reels-volume-control').forEach((control: any) => {
        if (control._cleanup) control._cleanup();
        control.remove();
      });

      videos.forEach(video => {
        createVolumeControl(video);
      });
    };

    setTimeout(handleNewVideo, 1000);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          const hasNewVideo = Array.from(mutation.addedNodes).some(
            node => node instanceof HTMLElement && (
              node.tagName === 'VIDEO' || node.querySelector?.('video')
            )
          );
          if (hasNewVideo) {
            console.log('[Reels Volume Controller] New video detected');
            setTimeout(handleNewVideo, 500);
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Improved observer implementation
    const observerConfig = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'href']
    };

    let debounceTimer: number;
    const debouncedHandleNewVideo = () => {
      clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(handleNewVideo, 250);
    };

    // URL change detection
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        debouncedHandleNewVideo();
      }
    });

    // Video element observer
    const videoObserver = new MutationObserver((mutations) => {
      const hasRelevantChange = mutations.some(mutation => {
        // Check for video elements
        if (mutation.type === 'childList') {
          return Array.from(mutation.addedNodes).some(
            node => node instanceof HTMLElement && (
              node.tagName === 'VIDEO' ||
              node.querySelector?.('video')
            )
          );
        }
        // Check for src changes
        if (mutation.type === 'attributes') {
          return mutation.target instanceof HTMLVideoElement ||
                 (mutation.target instanceof HTMLElement && mutation.target.querySelector('video'));
        }
        return false;
      });

      if (hasRelevantChange) {
        debouncedHandleNewVideo();
      }
    });

    // Start observers
    urlObserver.observe(document.body, { childList: true, subtree: true });
    videoObserver.observe(document.body, observerConfig);

    // Cleanup function enhancement
    const cleanup = () => {
      urlObserver.disconnect();
      videoObserver.disconnect();
      clearTimeout(debounceTimer);
    };

    return cleanup;
    
  },
});
