import GradientPage from '~/components/wrappers/GradientPage';
import { motion } from 'framer-motion';
import { Card } from '~/components/ui';
import { Button } from '~/components/ui/Button';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '~/lib/hooks/useAuth';
import CustomWalletButton from '~/components/common/CustomWalletButton';
import DepositButton from '~/components/chat/DepositButton';

export default function Pricing() {
  const { connected } = useWallet();
  const { isAuthorized } = useAuth();

  const pricingOptions = [
    {
      title: 'Buy Messages',
      price: '5',
      currency: '$',
      per: '',
      description: 'Get 10 messages instantly to start using the app.',
      buttonText: 'Buy Now',
    },
    // {
    //   title: 'Monthly Subscription',
    //   price: '10',
    //   currency: '$',
    //   per: 'month',
    //   description: 'Unlimited access for one month. Cancel anytime.',
    //   buttonText: 'Subscribe',
    // },
    // {
    //   title: 'Annual Subscription',
    //   price: '100',
    //   currency: '$',
    //   per: 'year',
    //   description: 'Unlimited access for one year. Save 20% compared to monthly.',
    //   buttonText: 'Subscribe',
    // },
  ];

  return (
    <GradientPage withBackButton>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.25 }}
      >
        <div className="flex flex-col gap-8 items-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl text-center">Pricing</h2>
          {/* <h3 className="text-white/80">Just testing things out? Grab some messages. Building big? Go unlimited.</h3> */}
          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl"> */}
          {pricingOptions.map((option) => (
            <Card
              key={option.title}
              variant="accented"
              withHoverEffect
              className="p-6 flex flex-col justify-between items-center w-xs"
            >
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">{option.title}</h3>
                <p className="text-gray-300 mb-4">{option.description}</p>
                <p className="text-center text-4xl text-white m-10">
                  <span className="text-xl align-text-top">{option.currency}</span>
                  <b>{option.price}</b>
                  {option.per !== '' && <span className="text-sm">/{option.per}</span>}
                </p>
              </div>
              <div>{isAuthorized && connected ? <DepositButton /> : <CustomWalletButton />}</div>
            </Card>
          ))}
          {/* </div> */}
        </div>
      </motion.div>
    </GradientPage>
  );
}
