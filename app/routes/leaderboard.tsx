import { Badge, Card, CardContent, CardHeader, CardTitle } from '~/components/ui';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { useEffect, useMemo } from 'react';
import { useGetLeaderboardTopQuery, useGetLeaderboardPositionQuery } from 'query/use-leaderboard-query';
import { useAuth } from '~/lib/hooks/useAuth';
import { toast } from 'react-toastify';
import { useWallet } from '@solana/wallet-adapter-react';
import Footer from '~/components/footer/Footer';

export default function Leaderboard() {
  const { jwtToken, isAuthorized } = useAuth();
  const { publicKey } = useWallet();
  const address = useMemo(() => publicKey?.toBase58(), [publicKey]);

  const { data: leaderboardData, error: leaderboardError } = useGetLeaderboardTopQuery(jwtToken);
  const { data: userPositionData, error: userPositionError } = useGetLeaderboardPositionQuery(jwtToken);

  useEffect(() => {
    if (leaderboardError) {
      toast.error('Failed to get leaderboard data.');
    }
  }, [leaderboardError]);

  useEffect(() => {
    if (userPositionError) {
      toast.error('Failed to get your position.');
    }
  }, [userPositionError]);

  const getRatingBadgeVariant = (rating: number) => {
    if (rating <= 3) return 'default';
    if (rating <= 6) return 'secondary';
    return 'outline';
  };

  const solscanUrl = (wallet: string) => `https://solscan.io/account/${wallet}`;

  const topCount = leaderboardData?.positions.length ?? 0;
  const isInTop = userPositionData && userPositionData.position <= topCount;

  return (
    <>
      <BackgroundRays />
      <Header />

      <div className="container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Leaderboard</h1>
        </div>

        <Card className="bg-gray-900/50 border-gray-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Top Contributors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6 pb-4 border-b border-gray-700">
              <div className="text-gray-400 font-semibold">Rating</div>
              <div className="text-gray-400 font-semibold">Solana Address</div>
              <div className="text-gray-400 font-semibold text-right">Points</div>
            </div>

            <div className="h-96 overflow-y-auto space-y-4 px-2">
              {leaderboardData ? (
                leaderboardData.positions.map((entry, index) => {
                  const isSelf = entry.user.wallet === address;
                  return (
                    <div
                      key={entry.user.wallet}
                      className={`grid grid-cols-3 gap-4 p-4 rounded-lg transition-colors ${
                        isSelf ? 'bg-[#9987ee1a] border border-[#9987ee]' : 'hover:bg-gray-800/30'
                      }`}
                    >
                      <div className="flex items-center">
                        <Badge
                          variant={getRatingBadgeVariant(entry.points)}
                          size="lg"
                          className="w-8 h-8 flex items-center justify-center font-bold"
                        >
                          {index + 1}
                        </Badge>
                      </div>

                      <div className="flex items-center">
                        <a
                          href={solscanUrl(entry.user.wallet)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-300 bg-gray-800/50 px-2 py-1 rounded
                          font-mono text-sm hover:underline transition-colors"
                        >
                          {`${entry.user.wallet}${isSelf ? ' (You)' : ''}`}
                        </a>
                      </div>

                      <div className="flex items-center justify-end">
                        <span className="text-white font-semibold text-lg">{entry.points.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })
              ) : isAuthorized ? (
                <p className="text-center">Plesase connect wallet</p>
              ) : (
                <p className="text-center">Loading...</p>
              )}
            </div>

            {/* show outside top */}
            {userPositionData && (
              <div
                className="grid grid-cols-3 gap-4 p-4 px-6 mt-6 rounded-lg
                bg-[#9987ee1a] border border-[#9987ee]"
              >
                <div className="flex items-center">
                  <Badge
                    variant={getRatingBadgeVariant(userPositionData.points)}
                    size="lg"
                    className="w-8 h-8 flex items-center justify-center font-bold"
                  >
                    {userPositionData.position}
                  </Badge>
                </div>
                <div className="flex items-center">
                  <a
                    href={address ? solscanUrl(address) : ''}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-300 bg-[#9987ee1a] px-2 py-1 rounded
                      font-mono text-sm hover:underline transition-colors"
                  >
                    {`${address} (You)`}
                  </a>
                </div>
                <div className="flex items-center justify-end">
                  <span className="text-white font-semibold text-lg">{userPositionData.points.toLocaleString()}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer withLabel />
    </>
  );
}
