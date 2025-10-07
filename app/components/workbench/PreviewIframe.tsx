import { FC, useEffect, useRef, useState } from 'react';
import { ClipLoader } from 'react-spinners';

interface PreviewIframeProps {
  isPreviewLoading: boolean;
  setIsPreviewLoading: (loading: boolean) => void;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  iframeUrl?: string;
  onLoad: () => void;
}

const RELOAD_TIMEOUT = 1000; // 1 second

export const PreviewIframe: FC<PreviewIframeProps> = ({
  isPreviewLoading,
  setIsPreviewLoading,
  iframeRef,
  iframeUrl,
  onLoad,
}) => {
  const loadedSuccessfullyRef = useRef(false);
  const loadCheckRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleLoadCheck = () => {
    if (loadCheckRef.current) {
      clearTimeout(loadCheckRef.current);
    }
    loadCheckRef.current = setTimeout(() => {
      if (!loadedSuccessfullyRef.current) {
        console.log('Iframe did not load successfully within timeout, reloading iframe.');
        if (iframeRef.current && iframeUrl) {
          iframeRef.current.src = iframeUrl;
          setIsPreviewLoading(true);
        }
      }
    }, RELOAD_TIMEOUT);
  };

  const cancelLoadCheck = () => {
    if (loadCheckRef.current) {
      clearTimeout(loadCheckRef.current);
      loadCheckRef.current = null;
    }
  };

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data && event.data.type === 'AIMPACT_PREVIEW_LOADED') {
        console.log('Preview loaded message received.');
        loadedSuccessfullyRef.current = true;
      }
    }
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    if (isPreviewLoading) {
      console.log('Iframe reloading, resetting loadedSuccessfully.');
      loadedSuccessfullyRef.current = false;
      cancelLoadCheck();
    }
  }, [isPreviewLoading]);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 1.25;
    }
  }, []);

  const handleOnLoad = async () => {
    onLoad();
    console.log('Setting reload timeout for iframe.');
    //Check if the iframe content was loaded successfully after timeout
    //We check if the iframe was loaded by listening to postMessage with type AIMPACT_PREVIEW_LOADED from its content
    scheduleLoadCheck();
  };

  return (
    <div className="relative w-full h-full text-center">
      {isPreviewLoading && (
        <>
          <video ref={videoRef} autoPlay loop muted playsInline className="absolute w-full h-full object-cover inset-0">
            <source src="/assets/loaders/loading_preview.webm" type="video/webm" />
            <source src="/assets/loaders/loading_preview.mp4" type="video/mp4" />
          </video>
          <span className="text-lg absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1]">
            Loading preview... <br />
            <span className="text-sm">It may take some time</span>
          </span>
        </>
      )}
      <iframe
        ref={iframeRef}
        title="preview"
        className="border-none w-full h-full bg-bolt-elements-background-depth-1"
        src={iframeUrl}
        sandbox="allow-scripts allow-forms allow-popups allow-modals allow-storage-access-by-user-activation allow-same-origin"
        allow="geolocation; ch-ua-full-version-list; cross-origin-isolated; screen-wake-lock; publickey-credentials-get; shared-storage-select-url; ch-ua-arch; bluetooth; compute-pressure; ch-prefers-reduced-transparency; deferred-fetch; usb; ch-save-data; publickey-credentials-create; shared-storage; deferred-fetch-minimal; run-ad-auction; ch-ua-form-factors; ch-downlink; otp-credentials; payment; ch-ua; ch-ua-model; ch-ect; autoplay; camera; private-state-token-issuance; accelerometer; ch-ua-platform-version; idle-detection; private-aggregation; interest-cohort; ch-viewport-height; local-fonts; ch-ua-platform; midi; ch-ua-full-version; xr-spatial-tracking; clipboard-read; gamepad; display-capture; keyboard-map; join-ad-interest-group; ch-width; ch-prefers-reduced-motion; browsing-topics; encrypted-media; gyroscope; serial; ch-rtt; ch-ua-mobile; window-management; unload; ch-dpr; ch-prefers-color-scheme; ch-ua-wow64; attribution-reporting; fullscreen; identity-credentials-get; private-state-token-redemption; hid; ch-ua-bitness; storage-access; sync-xhr; ch-device-memory; ch-viewport-width; picture-in-picture; magnetometer; clipboard-write; microphone"
        onLoad={handleOnLoad}
        onError={(e) => {
          console.log('Preview error.');
          console.log(e);
        }}
      />
    </div>
  );
};
