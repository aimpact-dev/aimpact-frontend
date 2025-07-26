'use client';

import { useState } from "react";
import CustomWalletButton from '../common/CustomWalletButton';
import { useAuth } from '~/lib/hooks/useAuth';
import { classNames } from '~/utils/classNames';

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
            <div className={classNames(
                "space-y-6 transition-all duration-200",
                ...(!isAuthorized ? ["blur-[10px] pointer-events-none select-none"] : [])
            )}>
                {/* Referral Link Section */}
                <div className="bg-gray-800 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">My referral link</h2>
                    <div className="flex items-center space-x-2">
                        <span className="text-l font-mono bg-gray-700 px-4 py-2 rounded-lg">{refCode ? refLink : "—"}</span>
                        <button
                            onClick={handleCopy}
                            className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                            title="Copy"
                        >
                            {copied ? <div className="i-ph:check w-5 h-5 text-green-400" /> : <div className="i-ph:clipboard w-5 h-5 text-white" />}
                        </button>
                    </div>
                </div>

                {/* Stats Section */}
                <div className="bg-gray-800 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Referral stats</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-700 rounded-lg p-4">
                            <p className="text-gray-400 text-sm">My referrals</p>
                            <p className="text-2xl font-bold text-white">{referralsCount}</p>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-4">
                            <p className="text-gray-400 text-sm">Sharing percent</p>
                            <p className="text-2xl font-bold text-white">{import.meta.env.VITE_REWARDS_SHARING_PERCENT}%</p>
                        </div>
                    </div>
                </div>
            </div>
            {!isAuthorized && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                    <CustomWalletButton />
                </div>
            )}
        </div>
    );
}