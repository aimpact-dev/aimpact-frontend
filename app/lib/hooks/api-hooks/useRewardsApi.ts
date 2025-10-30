import { useFetch } from "../../hooks/useFetch";

const host = import.meta.env.PUBLIC_BACKEND_URL;

interface BuyMessagesForRewardsResponse {
    messagesLeft: number;
}

export interface WithdrawRewardsResponse {
    id: string;
    amount: number;
    transactionHash: string;
    createdAt: string;
}

interface ReferralsCountResponse {
    referralsCount: number;
}

export const useRewardsApi = () => {
    const { fetchDataAuthorized } = useFetch();

    const buyMessagesForRewards = async (): Promise<BuyMessagesForRewardsResponse> => {
        return fetchDataAuthorized(`${host}/billing/buy-for-rewards`, {
            method: "POST"
        }) as Promise<BuyMessagesForRewardsResponse>;
    }

    const withdrawRewards = async (): Promise<WithdrawRewardsResponse> => {
        return fetchDataAuthorized(`${host}/billing/withdraw-rewards`, {
            method: "POST"
        }) as Promise<WithdrawRewardsResponse>;
    }

    const getReferralsCount = async (): Promise<ReferralsCountResponse> => {
        return fetchDataAuthorized(`${host}/auth/referralsCount`) as Promise<ReferralsCountResponse>;
    }

    const getRewardsWithdrawalReceipts = async (): Promise<WithdrawRewardsResponse[]> => {
        return fetchDataAuthorized(`${host}/billing/rewards-withdrawal-receipts`) as Promise<WithdrawRewardsResponse[]>;
    }

    return {
        buyMessagesForRewards,
        withdrawRewards,
        getReferralsCount,
        getRewardsWithdrawalReceipts,
    }
}
