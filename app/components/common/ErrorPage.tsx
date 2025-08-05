import BackgroundRays from "~/components/ui/BackgroundRays";

export default function ErrorPage(
  { showBackground, errorCode, errorText, details }: { showBackground?: boolean, errorCode: string, errorText: string, details?: string }
) {
  if (typeof showBackground === "undefined") showBackground = true;
  return (
    <>
      {showBackground && <BackgroundRays />}
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1
            className="bg-gradient-to-r from-[#9987EE] to-white bg-clip-text text-9xl font-extrabold tracking-widest text-transparent"
          >
            {errorCode}
          </h1>
          <p className="mt-4 text-2xl font-medium text-white">{errorText}</p>
          {details && <p className="mt-2 text-xl text-white opacity-80">{details}</p>}
          <a
            href="/"
            className="mt-8 inline-block rounded-lg bg-[#9987EE] px-8 py-3 text-lg font-semibold text-white transition duration-300 hover:bg-[#7a6fd8]"
          >
            Go Home
          </a>
        </div>
      </div>
    </>
  )
}