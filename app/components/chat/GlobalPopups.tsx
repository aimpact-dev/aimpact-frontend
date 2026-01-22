import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '~/lib/hooks/useAuth';
import Popup from '../common/Popup';
import { useStore } from '@nanostores/react';
import { chatStore } from '~/lib/stores/chat';
import WhatsNew, { type WhatsNewPost } from '../info/WhatsNew';
import { useQuery } from '@tanstack/react-query';
import { ky } from 'query';
import { useUserMetadata, useUpdateUserMetadata } from '~/lib/hooks/tanstack/useUserMetadata';
import { useAppKitAccount } from '~/lib/hooks/useAppKitAccount.client';

function trackDailyPopup(
  key: string,
  metadata: Record<string, any>,
  updateMetadata: (updated: Record<string, any>) => void,
) {
  const formattedKey = `${key}:lastShown`;

  const dbValue = metadata?.[formattedKey];
  const lsRaw = localStorage.getItem(formattedKey);
  const lsValue = lsRaw ? parseInt(lsRaw, 10) : undefined;

  // migrate from localStorage only if DB has no value yet
  if (typeof dbValue !== 'number' && typeof lsValue === 'number' && !Number.isNaN(lsValue)) {
    updateMetadata({ [formattedKey]: lsValue });
    localStorage.removeItem(formattedKey);
  }

  const lastShown = typeof dbValue === 'number' ? dbValue : typeof lsValue === 'number' ? lsValue : 0;

  function markShown() {
    updateMetadata({ [formattedKey]: Date.now() });
  }

  return { lastShown, markShown };
}

const FormWrapper = ({ dataForm }: { dataForm: string }) => (
  <div className="relative w-full h-[600px] flex items-center justify-center my-2">
    {/* Spinner that stays under the form */}
    <div className="absolute i-ph:circle-notch-duotone scale-98 animate-spin"></div>

    <div
      data-youform-embed
      data-form={dataForm}
      data-width="100%"
      data-height="600"
      className="relative z-10 w-full h-full"
    ></div>
  </div>
);

type GlobalPopupsContextType = {
  showWhatsNewPopup: () => void;
};

const GlobalPopupsContext = createContext<GlobalPopupsContextType | undefined>(undefined);

type PopupState =
  | { state: 'intro'; markShown: () => void }
  | { state: 'whatsnew'; markShown: () => void }
  | { state: 'nps'; markShown: () => void }
  | { state: 'pmf'; markShown: () => void }
  | { state: 'none' };

export default function GlobalPopupsProvider({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAppKitAccount();
  const { isAuthorized } = useAuth();
  const { started: chatStarted } = useStore(chatStore);

  const { data: metadata } = useUserMetadata(isAuthorized);
  const { mutate: updateMetadata } = useUpdateUserMetadata();

  const [popupState, setPopupState] = useState<PopupState>({ state: 'none' });

  const {
    data: whatsNewPosts,
    error: whatsNewPostsError,
    isPending: whatsNewPostsPending,
    isLoading: whatsNewPostsLoading,
  } = useQuery<WhatsNewPost[]>({
    queryKey: ['whats-new'],
    queryFn: async () => {
      const res = await ky.get('whats-new');

      if (!res.ok) {
        throw new Error(`Not found news articles: ${whatsNewPostsError}`);
      }

      const json = await res.json<WhatsNewPost[]>();
      return json.map((a) => ({ ...a, date: new Date(a.date) }));
    },
  });

  // Start timer for the NPS popup when chat starts and popup can be shown
  useEffect(() => {
    if (metadata) {
      // NPS popup
      const trackNPS = trackDailyPopup('popupNPS', metadata, updateMetadata);
      const showNPS = trackNPS.lastShown === 0;

      if (showNPS && chatStarted) {
        const timer = setTimeout(
          () => {
            if (popupState.state === 'none') {
              setPopupState({ state: 'nps', markShown: trackNPS.markShown });
            }
          },
          10 * 60 * 1000,
        );

        return () => {
          clearTimeout(timer);
        };
      }
    }
  }, [chatStarted, metadata, popupState]);

  useEffect(() => {
    if (!isConnected || !isAuthorized || !metadata || popupState.state !== 'none') return;

    const timer = setTimeout(() => {
      // Re-check conditions after 1 second
      if (!isConnected || !isAuthorized || !metadata || popupState.state !== 'none') return;

      // Intro popup
      const trackIntro = trackDailyPopup('popupIntro', metadata, updateMetadata);
      const showIntro = trackIntro.lastShown === 0;

      if (showIntro) {
        setPopupState({ state: 'intro', markShown: trackIntro.markShown });
        return;
      }

      // NPS popup
      const trackNPS = trackDailyPopup('popupNPS', metadata, updateMetadata);
      const daysSinceLastNPS = (Date.now() - trackNPS.lastShown) / (10 * 24 * 60 * 60 * 1000);
      const showNPS = trackNPS.lastShown !== 0 && daysSinceLastNPS >= 14;

      if (showNPS) {
        setPopupState({ state: 'nps', markShown: trackNPS.markShown });
        return;
      }

      // PMF popup
      const trackPMF = trackDailyPopup('popupPMF', metadata, updateMetadata);
      const daysSinceLastPMF = (Date.now() - trackPMF.lastShown) / (10 * 24 * 60 * 60 * 1000);
      const daysSinceIntro = (Date.now() - trackIntro.lastShown) / (10 * 24 * 60 * 60 * 1000);
      const showPMF = daysSinceIntro >= 3 && daysSinceLastPMF >= 28;

      if (showPMF) {
        setPopupState({ state: 'pmf', markShown: trackPMF.markShown });
        return;
      }

      // What's new popup
      const trackWhatsNew = trackDailyPopup('popupWhatsNew', metadata, updateMetadata);
      const showWhatsNew =
        whatsNewPosts && trackWhatsNew.lastShown < Math.max(...whatsNewPosts.map(({ date }) => date.getTime()));

      if (showWhatsNew) {
        setPopupState({ state: 'whatsnew', markShown: trackWhatsNew.markShown });
        return;
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [isConnected, isAuthorized, metadata, popupState]);

  // Reinitialize Youform when a popup should be shown
  useEffect(() => {
    if (popupState.state === 'pmf' || popupState.state === 'nps' || popupState.state === 'intro') {
      // use setTimeout to ensure init happens after DOM updates
      setTimeout(() => {
        // @ts-ignore
        window.YouformEmbed.init();
      }, 0);

      const handleSubmit = (event: MessageEvent<any>) => {
        if (event.data && event.data == 'youformComplete') {
          popupState.markShown();
          setPopupState({ state: 'none' });
        }
      };

      window.addEventListener('message', handleSubmit);

      return () => {
        window.removeEventListener('message', handleSubmit);
      };
    }
  }, [popupState]);

  const WhatsNewPopup = () => {
    return (
      <>
        {popupState.state === 'whatsnew' && (
          <Popup
            isShow
            handleToggle={() => {
              popupState.markShown();
              setPopupState({ state: 'none' });
            }}
            title={
              <div className="flex items-center gap-2">
                <div className="inline-block i-ph:sparkle-bold text-lg text-accent-500"></div>
                <h1 className="text-2xl font-bold ">What's new</h1>
              </div>
            }
            description="Check our latest updates"
          >
            {whatsNewPostsLoading || whatsNewPostsPending ? (
              <div className="inline-block i-ph:spinner-gap animate-spin mr-1"></div>
            ) : whatsNewPostsError ? (
              <span>Couldn't load news. Try to reload the page.</span>
            ) : (
              <WhatsNew posts={whatsNewPosts} />
            )}
          </Popup>
        )}
      </>
    );
  };

  const UserPollingPopups = () => {
    if (!isConnected || !isAuthorized) return null;

    return (
      <>
        {popupState.state === 'intro' && (
          <Popup
            isShow
            handleToggle={() => {
              popupState.markShown();
              setPopupState({ state: 'none' });
            }}
          >
            <FormWrapper dataForm="axqnjquv" />
          </Popup>
        )}

        {popupState.state === 'nps' && (
          <Popup
            isShow
            handleToggle={() => {
              popupState.markShown();
              setPopupState({ state: 'none' });
            }}
          >
            <FormWrapper dataForm="kethzhkx" />
          </Popup>
        )}

        {popupState.state === 'pmf' && (
          <Popup
            isShow
            handleToggle={() => {
              popupState.markShown();
              setPopupState({ state: 'none' });
            }}
          >
            <FormWrapper dataForm="yd2oc3hx" />
          </Popup>
        )}
      </>
    );
  };

  const showWhatsNewPopup = () => {
    setPopupState((prev) => (prev.state === 'none' ? { state: 'whatsnew', markShown: () => {} } : prev));
  };

  return (
    <GlobalPopupsContext.Provider value={{ showWhatsNewPopup }}>
      {children}
      <WhatsNewPopup />
      <UserPollingPopups />
    </GlobalPopupsContext.Provider>
  );
}

export function useGlobalPopups() {
  const context = useContext(GlobalPopupsContext);

  if (context === undefined) {
    throw new Error('useGlobalPopups must be used within an GlobalPopupsProvider');
  }

  return context;
}
