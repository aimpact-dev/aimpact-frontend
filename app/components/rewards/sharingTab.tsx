'use client';

import { toast } from 'react-toastify';
import { Button } from '../ui/Button';
import { classNames } from '~/utils/classNames';
import { useRewardsApi, type WithdrawRewardsResponse } from '~/lib/hooks/api-hooks/useRewardsApi';
import CustomWalletButton from '../common/CustomWalletButton';
import { useAuth } from '~/lib/hooks/useAuth';

interface SharingTabProps {
    availableRewards: number;
    totalEarnedRewards: number;
    transactions: WithdrawRewardsResponse[];
    setTransactions: (transactions: WithdrawRewardsResponse[]) => void;
    isWithdrawing: boolean;
    isBuyingMessages: boolean;
    setIsWithdrawing: (isWithdrawing: boolean) => void;
    setIsBuyingMessages: (isBuyingMessages: boolean) => void;
}

const MINIMUM_WITHDRAWAL_AMOUNT = Number(import.meta.env.VITE_PRICE_PER_MESSAGE_IN_SOL) * 10;

export default function SharingTab({
    transactions,
    setTransactions,
    availableRewards,
    totalEarnedRewards,
    isWithdrawing,
    isBuyingMessages,
    setIsWithdrawing,
    setIsBuyingMessages,
}: SharingTabProps) {
    const { withdrawRewards, buyMessagesForRewards } = useRewardsApi();
    const { isAuthorized } = useAuth();

    const handleWithdraw = async () => {
        setIsWithdrawing(true);
        try {
            const response = await withdrawRewards().catch(() => null);

            if (response) {
                setTransactions([response, ...transactions]);
            }

            (window as any).plausible('withdraw_rewards', { props: {
                amount: response?.amount,
                success: true,
                error: null,
            }});

            toast.success('Withdrawal successful!');
        } catch (error) {
            (window as any).plausible('withdraw_rewards', { props: {
                amount: availableRewards,
                success: false,
                error: `Failed due to server error: ${error}`,
            }});

            toast.error('Withdrawal failed. Please try again.');
            console.error('Withdrawal error:', error);
        } finally {
            setIsWithdrawing(false);
        }
    };

    const handleBuyMessages = async () => {
        setIsBuyingMessages(true);
        try {
            await buyMessagesForRewards();
            toast.success('Messages bought successfully!');
            (window as any).plausible('buy_messages_for_rewards', { props: {
                message_count: 20,
                success: true,
                error: null,
            }});
        } catch (error) {
            (window as any).plausible('buy_messages_for_rewards', { props: {
                message_count: 20,
                success: false,
                error: `Failed due to server error: ${error}`,
            }});

            toast.error('Failed to buy messages. Please try again.');
            console.error('Buy messages error:', error);
        } finally {
            setIsBuyingMessages(false);
        }
    };

    return (
        <div className="relative">
            <div className={classNames(
                "space-y-6 transition-all duration-200",
                ...(!isAuthorized ? ["blur-[10px] pointer-events-none select-none"] : [])
            )}>
                {/* Rewards Summary */}
                <div className="bg-gray-800 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Your rewards</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-700 rounded-lg p-4">
                            <p className="text-gray-400 text-sm">Available rewards</p>
                            <p className="text-2xl font-bold text-white">{availableRewards || 0} SOL</p>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-4">
                            <p className="text-gray-400 text-sm">Total earned</p>
                            <p className="text-2xl font-bold text-white">{totalEarnedRewards || 0} SOL</p>
                        </div>
                    </div>
                </div>

                {/* Info Text */}
                <p className="text-center text-gray-300">
                    You can purchase <span className="font-semibold text-white">20 messages (x2 bonus)</span> for <span className="font-semibold text-white">0.03 SOL</span> or withdraw your rewards to your wallet starting from <span className="font-semibold text-white">0.03 SOL</span>.
                </p>

                {/* Action Buttons */}
                <div className="flex gap-4">
                    <Button
                        onClick={handleWithdraw}
                        disabled={availableRewards < MINIMUM_WITHDRAWAL_AMOUNT || isWithdrawing || isBuyingMessages}
                        className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
                    >
                        {isWithdrawing ? 'Withdrawing...' : 'Withdraw rewards'}
                    </Button>
                    <Button
                        onClick={handleBuyMessages}
                        disabled={availableRewards < MINIMUM_WITHDRAWAL_AMOUNT || isWithdrawing || isBuyingMessages}
                        className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                    >
                        Buy messages
                    </Button>
                </div>

                {/* Transaction History */}
                <div className="bg-gray-800 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Withdrawal history</h2>
                    <div className="space-y-4">
                        {transactions.length ? transactions.map((tx) => (
                            <a
                                key={tx.id}
                                href={`https://solscan.io/tx/${tx.transactionHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
                                title="View on Solscan"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-500/20">
                                        <div className="w-4 h-4 i-ph:arrow-up-right" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">Withdrawal</p>
                                        <p className="text-sm text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-purple-400">-{tx.amount} SOL</p>
                                </div>
                            </a>
                        )) : (
                            <div className="text-gray-400 text-sm">There is no withdrawal yet</div>
                        )}
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