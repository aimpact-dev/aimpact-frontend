import { useStore } from '@nanostores/react';
import { useEffect, useRef, useState } from 'react';
import Navbar from '~/components/dashboard/navbar';
import ReferralsTab from '~/components/rewards/referralsTab';
import SharingTab from '~/components/rewards/sharingTab';
import GradientPage from '~/components/wrappers/GradientPage';
import { useRewardsApi, type WithdrawRewardsResponse } from '~/lib/hooks/api-hooks/useRewardsApi';
import { useAuth, userInfo } from '~/lib/hooks/useAuth';
import { classNames } from '~/utils/classNames';

const TABS = {
  Referral: 'Referral',
  Sharing: 'Sharing',
};

export default function Rewards() {
  const { getReferralsCount, getRewardsWithdrawalReceipts } = useRewardsApi();

  const [tab, setTab] = useState(TABS.Referral);
  const [referralsCount, setReferralsCount] = useState<number>(0);
  const [rewardsWithdrawalReceipts, setRewardsWithdrawalReceipts] = useState<WithdrawRewardsResponse[]>([]);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isBuyingMessages, setIsBuyingMessages] = useState(false);

  const { isAuthorized } = useAuth();
  const userInfoData = useStore(userInfo);

  useEffect(() => {
    const fetchData = async () => {
      const referralsCount = await getReferralsCount().catch(() => ({ referralsCount: 0 }));
      const rewardsWithdrawalReceipts = await getRewardsWithdrawalReceipts().catch(() => []);

      setReferralsCount(referralsCount.referralsCount);
      setRewardsWithdrawalReceipts([...rewardsWithdrawalReceipts]);
    };

    fetchData();
  }, [isAuthorized]);

  return (
    <GradientPage>
      <section id="rewards">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-white mb-2">Rewards</h1>
          <p className="text-sm text-gray-400 mb-8 font-normal">Invite friends to receive rewards in Aimpact way.</p>
          <div className={classNames('bg-gray-900 rounded-lg p-6 shadow-lg transition-all duration-200')}>
            {/* Tabs inside the block */}
            <div className="flex space-x-2 mb-8">
              {Object.values(TABS).map((t) => (
                <button
                  key={t}
                  className={`flex-1 py-2 rounded-t-lg font-semibold text-center transition-colors duration-150 ${
                    tab === t ? 'bg-gray-800 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
                  }`}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            {/* Tab Content */}
            {tab === TABS.Referral && (
              <ReferralsTab referralsCount={referralsCount || 0} refCode={userInfoData?.inviteCode || ''} />
            )}
            {tab === TABS.Sharing && (
              <SharingTab
                transactions={rewardsWithdrawalReceipts}
                setTransactions={setRewardsWithdrawalReceipts}
                availableRewards={userInfoData?.referralsRewards || 0}
                totalEarnedRewards={userInfoData?.totalEarnedRewards || 0}
                isWithdrawing={isWithdrawing}
                isBuyingMessages={isBuyingMessages}
                setIsWithdrawing={setIsWithdrawing}
                setIsBuyingMessages={setIsBuyingMessages}
              />
            )}
          </div>
        </div>
      </section>
    </GradientPage>
  );
}
