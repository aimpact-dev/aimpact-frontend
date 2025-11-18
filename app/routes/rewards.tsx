import { useStore } from '@nanostores/react';
import { useEffect, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/Tabs';
import ReferralsTab from '~/components/rewards/referralsTab';
import SharingTab from '~/components/rewards/sharingTab';
import GradientPage from '~/components/wrappers/GradientPage';
import { useRewardsApi, type WithdrawRewardsResponse } from '~/lib/hooks/api-hooks/useRewardsApi';
import { useAuth, userInfo } from '~/lib/hooks/useAuth';
import { Card } from '~/components/ui';
import { motion } from 'framer-motion';

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
    <GradientPage withBackButton>
      <section id="rewards">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.25 }}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold text-white mb-2">Rewards</h1>
            <p className="text-sm text-gray-400 mb-8 font-normal">Invite friends to receive rewards in Aimpact way.</p>
            <Card variant="accented">
              <div className="m-5">
                <Tabs defaultValue="referral" className="items-center">
                  <TabsList className="bg-black/25 h-9 w-full box-content mb-5">
                    <TabsTrigger value="referral">Referral</TabsTrigger>
                    <TabsTrigger value="sharing">Sharing</TabsTrigger>
                  </TabsList>
                  <TabsContent value="referral">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.25 }}
                    >
                      <ReferralsTab referralsCount={referralsCount || 0} refCode={userInfoData?.inviteCode || ''} />
                    </motion.div>
                  </TabsContent>
                  <TabsContent value="sharing">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.25 }}
                    >
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
                    </motion.div>
                  </TabsContent>
                </Tabs>
              </div>
            </Card>
          </div>
        </motion.div>
      </section>
    </GradientPage>
  );
}
