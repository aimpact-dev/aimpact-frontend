'use client';

import { useState } from 'react';
import CustomWalletButton from '../common/CustomWalletButton';
import { useAuth } from '~/lib/hooks/useAuth';
import { classNames } from '~/utils/classNames';
import { Card, Input } from '../ui';
import { toast } from 'react-toastify';

interface ReferralsTabProps {
  referralsCount: number;
  refCode: string;
}

export default function ReferralsTab({ referralsCount, refCode }: ReferralsTabProps) {
  const [copied, setCopied] = useState(false);

  const refLink = `${window.location.origin}?refCode=${refCode}`;

  const handleCopy = () => {
    if (refCode) {
      navigator.clipboard.writeText(refLink);
      setCopied(true);

      (window as any).plausible('copy_referral_link');

      setTimeout(() => setCopied(false), 1500);
    }
  };

  const { isAuthorized } = useAuth();

  return (
    <div className="relative">
      <div
        className={classNames(
          'space-y-6 transition-all duration-200',
          ...(!isAuthorized ? ['blur-[10px] pointer-events-none select-none'] : []),
        )}
      >
        <Card variant="accented" className="border-none p-5">
          <div className="flex flex-col gap-7">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1">
                {<div className="i-ph:share-network color-accent-300"></div>} My referral link
              </div>
              <div
                className="flex justify-center items-center"
                onClick={() => {
                  navigator.clipboard.writeText(refLink);
                  toast.success('Link copied!');
                }}
              >
                <div className="i-ph:copy absolute left-8 text-gray-300 pointer-events-none"></div>
                <Input
                  readOnly
                  className="pl-8 cursor-pointer !dark:bg-accent-500/10 border-border-light"
                  value={refCode ? refLink : '—'}
                />
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <h2 className="flex items-center justify-center gap-2 text-lg text-center font-semibold text-white">
                <div className="i-ph:user-plus text-2xl color-accent-300"></div> Referral stats
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-accent-500/10 rounded-lg p-4 border-1 border-border-light">
                  <p className=" text-sm">My referrals</p>
                  <p className="text-xl md:text-2xl font-bold text-white">{referralsCount}</p>
                </div>
                <div className="bg-accent-500/10 rounded-lg p-4 border-1 border-border-light">
                  <p className=" text-sm">Sharing percent</p>
                  <p className="text-xl md:text-2xl font-bold text-white">
                    {import.meta.env.VITE_REWARDS_SHARING_PERCENT}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
      {!isAuthorized && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <CustomWalletButton />
        </div>
      )}
    </div>
  );
}
