import BackgroundRays from "../ui/BackgroundRays";

export default function LoadingScreen() {
  return (
    <>
      <BackgroundRays />
      <div className="flex items-center justify-center w-full h-full">
        <h1 className="text-5xl font-bold animate-pulse">Loading...</h1>
      </div>
    </>
  )
}