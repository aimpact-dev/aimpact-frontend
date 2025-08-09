import { useQuery } from "@tanstack/react-query"
import { ky } from "query"

export type LeaderboardTopResponse = {
  positions: Array<{
    points: number
    user: { id: string; wallet: string }
  }>
  meta: { pointsInTop: number; totalCount: number }
}

export function useGetLeaderboardTopQuery(jwtToken: string) {
  return useQuery<LeaderboardTopResponse, Error>({
      queryKey: ["leaderboardTop", jwtToken],
      queryFn: async () => {
        const res = await ky.get(`leaderboard/get-leaderboard-top`, {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
        })
        if (!res.ok) throw new Error(await res.text())
        return res.json()
      }
    }
  )
}

export type LeaderboardPositionResponse = {
  points: number
  position: number
}

export function useGetLeaderboardPositionQuery(jwtToken: string) {
  return useQuery<LeaderboardPositionResponse, Error>({
      queryKey: ["leaderboardPosition", jwtToken],
      queryFn: async () => {
        const res = await ky.get(`leaderboard`, {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
        })
        if (!res.ok) throw new Error(await res.text())
        return res.json()
      },
      enabled: true,
    }
  )
}