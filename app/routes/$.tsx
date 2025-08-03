import ErrorPage from "~/components/common/ErrorPage";
import BackgroundRays from "~/components/ui/BackgroundRays";

export default function Page404({ showBackground }: { showBackground?: boolean }) {
  if (typeof showBackground === "undefined") showBackground = true;
  return (
   <ErrorPage errorCode="404" errorText="Not Found" />
  )
}