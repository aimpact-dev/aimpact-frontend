import { useWallet } from '@solana/wallet-adapter-react';
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '~/lib/hooks/useAuth';
import Popup from '../common/Popup';
import { useStore } from '@nanostores/react';
import { chatStore } from '~/lib/stores/chat';
import { Badge, Card } from '../ui';

function trackDailyPopup(key: string) {
  const lastShown = parseInt(localStorage.getItem(`${key}:lastShown`) ?? '0');

  function markShown() {
    localStorage.setItem(`${key}:lastShown`, String(Date.now()));
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

const WhatsNew = ({
  newsArticles,
}: {
  newsArticles: {
    heading: string;
    text: string;
    date: Date;
  }[];
}) => (
  <>
    <div>
      {newsArticles.map((article) => {
        return (
          <Card variant="accented" withHoverEffect key={article.date.getTime()}>
            <div className="flex flex-col gap-2 border-b border-border-light p-4">
              <div className="flex justify-between items-center">
                <Badge variant="primary">Integration</Badge>
                <span className="text-sm text-bolt-elements-textSecondary">
                  {article.date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center  gap-2">
                <div className="inline-block i-ph:plug-bold text-accent-500"></div>
                <h2 className="text-xl font-bold">{article.heading}</h2>
              </div>
            </div>

            <p className="text-left p-4">{article.text}</p>
          </Card>
        );
      })}
    </div>
  </>
);

type PopupState =
  | { state: 'intro'; markShown: () => void }
  | { state: 'whatsnew'; markShown: () => void }
  | { state: 'nps'; markShown: () => void }
  | { state: 'pmf'; markShown: () => void }
  | { state: 'none' };

export default function GlobalPopupsProvider({ children }: { children: React.ReactNode }) {
  const { connected } = useWallet();
  const { isAuthorized } = useAuth();
  const { started: chatStarted } = useStore(chatStore);

  const [popupState, setPopupState] = useState<PopupState>({ state: 'none' });

  const newsArticles = [
    {
      heading: 'Vibecoding meets x402 !',
      text: 'We’ve integrated x402 standard directly into AImpact — now you can vibecode apps with built-in payments and seamless interoperability. This update unlocks a new layer of flexibility for Solana-based Web3 products, where every transaction and access request becomes part of a unified, intuitive ecosystem.',
      date: new Date(2025, 10, 11), // use monthIndex (10 is November)
    },
  ];

  // Start timer for the NPS popup when chat starts and popup can be shown
  useEffect(() => {
    // NPS popup
    const trackNPS = trackDailyPopup('popupNPS');
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
  }, [chatStarted, popupState]);

  useEffect(() => {
    if (!connected || !isAuthorized || popupState.state !== 'none') return;

    const timer = setTimeout(() => {
      // Re-check conditions after 5 seconds
      if (!connected || !isAuthorized || popupState.state !== 'none') return;

      // Intro popup
      const trackIntro = trackDailyPopup('popupIntro');
      const showIntro = trackIntro.lastShown === 0;

      if (showIntro) {
        setPopupState({ state: 'intro', markShown: trackIntro.markShown });
        return;
      }

      // NPS popup
      const trackNPS = trackDailyPopup('popupNPS');
      const daysSinceLastNPS = (Date.now() - trackNPS.lastShown) / (10 * 24 * 60 * 60 * 1000);
      const showNPS = trackNPS.lastShown !== 0 && daysSinceLastNPS >= 14;

      if (showNPS) {
        setPopupState({ state: 'nps', markShown: trackNPS.markShown });
        return;
      }

      // PMF popup
      const trackPMF = trackDailyPopup('popupPMF');
      const daysSinceLastPMF = (Date.now() - trackPMF.lastShown) / (10 * 24 * 60 * 60 * 1000);
      const daysSinceIntro = (Date.now() - trackIntro.lastShown) / (10 * 24 * 60 * 60 * 1000);
      const showPMF = daysSinceIntro >= 3 && daysSinceLastPMF >= 28;

      if (showPMF) {
        setPopupState({ state: 'pmf', markShown: trackPMF.markShown });
        return;
      }

      // What's new popup
      const trackWhatsNew = trackDailyPopup('popupWhatsNew');
      const showWhatsNew = trackWhatsNew.lastShown < Math.max(...newsArticles.map(({ date }) => date.getTime()));

      if (showWhatsNew) {
        setPopupState({ state: 'whatsnew', markShown: trackWhatsNew.markShown });
        return;
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [connected, isAuthorized, popupState, newsArticles]);

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
            <WhatsNew newsArticles={newsArticles} />
          </Popup>
        )}
      </>
    );
  };

  const UserPollingPopups = () => {
    if (!connected || !isAuthorized) return null;

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
