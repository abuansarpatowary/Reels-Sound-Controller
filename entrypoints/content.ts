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
      // Get current volume from storage
      const currentVolume = await volumeStorage.getValue();
      
      const container = document.createElement('div');
      container.className = 'reels-volume-control';
      container.style.cssText = `
        position: fixed;
        right: 20px;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(0, 0, 0, 0.5);
        padding: 24px 12px;
        border-radius: 50px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        align-items: center;
      `;

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '100';
      slider.value = currentVolume.toString();
      slider.style.cssText = `
        width: 300px;
        height: 8px;
        -webkit-appearance: none;
        appearance: none;
        background: linear-gradient(
          to right,
          #1a98ff ${currentVolume}%,
          rgba(255, 255, 255, 0.2) ${currentVolume}%
        );
        border-radius: 50px;
        outline: none;
        cursor: pointer;
        transform: rotate(-90deg);
        transform-origin: center;
        margin: 120px 0;
      `;

      // Add styles for the slider
      const styleSheet = document.createElement('style');
      styleSheet.textContent = `
        .reels-volume-control input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 32px;
          height: 32px;
          background: #1a98ff;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          border: 3px solid white;
        }
        .reels-volume-control input[type="range"]::-moz-range-thumb {
          width: 32px;
          height: 32px;
          background: #1a98ff;
          border-radius: 50%;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .reels-volume-control input[type="range"]::-webkit-slider-runnable-track,
        .reels-volume-control input[type="range"]::-moz-range-track {
          height: 8px;
          border-radius: 50px;
        }
      `;
      document.head.appendChild(styleSheet);

      const updateSliderUI = (slider: HTMLInputElement, value: number) => {
        slider.value = value.toString();
        slider.style.background = `linear-gradient(
          to right,
          #1a98ff ${value}%,
          rgba(255, 255, 255, 0.2) ${value}%
        )`;
        videoElement.volume = value / 100;
      };

      // Apply volume immediately
      updateSliderUI(slider, currentVolume);
      videoElement.volume = currentVolume / 100;

      // Watch for volume changes from storage
      const unwatchVolume = volumeStorage.watch((newVolume) => {
        if (newVolume !== null) {
          updateSliderUI(slider, newVolume);
        }
      });

      // Handle volume change with debounce
      let timeoutId: number;
      slider.addEventListener('input', (e) => {
        const value = Number((e.target as HTMLInputElement).value);
        updateSliderUI(slider, value);
        
        // Debounce storage updates
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
          volumeStorage.setValue(value);
        }, 100);
      });

      const cleanup = () => {
        unwatchVolume();
        clearTimeout(timeoutId);
      };

      (container as any)._cleanup = cleanup;
      container.appendChild(slider);
      document.body.appendChild(container);
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
  },
});
