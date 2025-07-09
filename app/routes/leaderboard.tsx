import { Badge, Card, CardContent, CardHeader, CardTitle } from "~/components/ui";
import Background from "./background";
import { Header } from "~/components/header/Header";
import BackgroundRays from "~/components/ui/BackgroundRays";

const leaderboardData = [
  { rating: 1, address: "7xKhFw...9aB2pQ", points: 15420 },
  { rating: 2, address: "9mNvCx...3dE7rS", points: 14850 },
  { rating: 3, address: "5qWtAl...8hJ4mP", points: 13920 },
  { rating: 4, address: "3kRuOp...6fG8nM", points: 12680 },
  { rating: 5, address: "8bYxNh...4cV9wL", points: 11940 },
  { rating: 6, address: "6pTgMj...2dH7qK", points: 10850 },
  { rating: 7, address: "4vSrBn...5eI3xJ", points: 9760 },
  { rating: 8, address: "2jFqWt...7gK6mH", points: 8920 },
  { rating: 9, address: "9lPcXm...1aZ4vG", points: 8140 },
  { rating: 10, address: "7nDhKp...3bY8uF", points: 7680 },
  { rating: 11, address: "5kWmBx...2cX9tR", points: 7320 },
  { rating: 12, address: "8pQrNj...4eH6mS", points: 6980 },
  { rating: 13, address: "3vTlMh...7fG3nL", points: 6640 },
  { rating: 14, address: "6jYuKp...9dI2wK", points: 6290 },
  { rating: 15, address: "4mCsWt...1bV5xJ", points: 5950 },
  { rating: 16, address: "9nFrAl...8gZ4uH", points: 5610 },
  { rating: 17, address: "2qBpXm...6jK7vG", points: 5270 },
  { rating: 18, address: "7tDhOp...3cY1mF", points: 4930 },
  { rating: 19, address: "5lGsNh...9eI8qE", points: 4590 },
  { rating: 20, address: "8wVxBj...2aH4rD", points: 4250 },
];

export default function Leaderboard() {
  console.log("12313");
  const getRatingBadgeVariant = (rating: number) => {
    if (rating <= 3) return "default";
    if (rating <= 6) return "secondary";
    return "outline";
  };

  return (
    <>
      <BackgroundRays />
      <Header />
      
      <div className="container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Leaderboard
          </h1>
        </div>

        <Card className="bg-gray-900/50 border-gray-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Top Contributors</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Table Header */}
            <div className="grid grid-cols-3 gap-4 mb-6 pb-4 border-b border-gray-700">
              <div className="text-gray-400 font-semibold">Rating</div>
              <div className="text-gray-400 font-semibold">Solana Address</div>
              <div className="text-gray-400 font-semibold text-right">Points</div>
            </div>

            {/* Leaderboard Entries - Fixed height with scroll */}
            <div className="h-96 overflow-y-auto space-y-4 px-2 scrollbar-  ">
              {leaderboardData.map((entry) => (
                <div
                  key={entry.address}
                  className="grid grid-cols-3 gap-4 py-4 hover:bg-gray-800/30 rounded-lg transition-colors"
                >
                  <div className="flex items-center">
                    <Badge 
                      variant={getRatingBadgeVariant(entry.rating)}
                      className="w-8 h-8 flex items-center justify-center text-sm font-bold"
                    >
                      {entry.rating}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center">
                    <code className="text-purple-300 bg-gray-800/50 px-2 py-1 rounded font-mono text-sm">
                      {entry.address}
                    </code>
                  </div>
                  
                  <div className="flex items-center justify-end">
                    <span className="text-white font-semibold text-lg">
                      {entry.points.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};
