import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { useAuth } from '~/lib/hooks/useAuth';
import Popup from '../common/Popup';
import useNPSLogic from '~/lib/hooks/user-pooling/useNPSLogic';
import usePMFLogic from '~/lib/hooks/user-pooling/usePMFLogic';

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

export default function UserPooling() {
  const { connected } = useWallet();
  const { isAuthorized } = useAuth();

  const nps = useNPSLogic();
  const pmf = usePMFLogic();

  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    const cooldown = 3 * 60 * 60 * 1000;
    const last = parseInt(localStorage.getItem('lastUserVisit') || '0');
    const visits = parseInt(localStorage.getItem('userVisits') || '0');
    const isNew = last + cooldown < Date.now();

    if (isNew) {
      localStorage.setItem('userVisits', (visits + 1).toString());
      localStorage.setItem('lastUserVisit', Date.now().toString());
    }
  }, []);

  // Show intro form only once per user (first-time connection)
  useEffect(() => {
    if (connected && isAuthorized) {
      const hasSeenIntro = localStorage.getItem('introShown') === 'true';

      if (!hasSeenIntro) {
        setShowIntro(true);
        localStorage.setItem('introShown', 'true');
      }
    }
  }, [connected, isAuthorized]);

  useEffect(() => {
    if (connected && isAuthorized && (showIntro || nps.shouldShow || pmf.shouldShow)) {
      console.log('initting youform', showIntro, nps.shouldShow, pmf.shouldShow);
      // @ts-ignore
      window.YouformEmbed.init();
    }
  }, [connected, isAuthorized, showIntro, nps.shouldShow, pmf.shouldShow]);

  const handleIntroClose = () => {
    setShowIntro(false);
  };

  return (
    <>
      {/* Intro popup */}
      <Popup isShow={showIntro} handleToggle={handleIntroClose}>
        <FormWrapper dataForm="axqnjquv" />
      </Popup>

      {/* NPS popup */}
      <Popup isShow={nps.shouldShow && connected && isAuthorized} handleToggle={nps.markShown}>
        <FormWrapper dataForm="kethzhkx" />
      </Popup>

      {/* PMF popup */}
      <Popup isShow={pmf.shouldShow && connected && isAuthorized} handleToggle={pmf.markShown}>
        <FormWrapper dataForm="yd2oc3hx" />
      </Popup>
    </>
  );
}
