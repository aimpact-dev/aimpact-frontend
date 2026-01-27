import { useDeploymentQuery } from 'query/use-project-query';
import DeployButton, { DeployProviders, providerToIconSlug } from '../deploy/DeployButton.client';
import { TwitterShareButton } from '../ui/TwitterShareButton';
import { chatId } from '~/lib/persistence';
import { Card } from '../ui';

type DeployUrls = {
  name: string;
  url: string;
}[];

export default function PublishView() {
  const s3Url = useDeploymentQuery(chatId.get(), 's3').data;
  const icpUrl = useDeploymentQuery(chatId.get(), 'icp').data;
  const akashUrl = useDeploymentQuery(chatId.get(), 'akash').data;

  const deployUrls = [
    s3Url && { name: 'S3', url: s3Url },
    icpUrl && { name: 'ICP', url: icpUrl },
    akashUrl && { name: 'Akash', url: akashUrl },
  ].filter(Boolean) as DeployUrls;

  return (
    <div className="flex w-full h-full justify-center bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary">
      <div className="flex flex-col sm:flex-row *:flex-1 gap-5 w-full bg-bolt-elements-background-depth-2 px-6 py-8 overflow-auto [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-5 p-6 bg-bolt-elements-background-depth-3 rounded-lg">
          <div className="flex flex-col gap-3">
            <div>
              <h1 className="flex gap-2 items-center">
                <div className="i-ph:rocket-launch color-accent-500 text-lg"></div>
                Deployment
              </h1>
              <p className="text-sm text-bolt-elements-textSecondary">
                Ready to go viral? Launch your app to the world and start scaling.
              </p>
            </div>
            <DeployButton
              customVariant={'default'}
              customText="Choose provider"
              className="w-full justify-between bg-bolt-elements-background-depth-4"
            />
            <hr className="my-4"></hr>
            <h1 className="text-sm font-bold">Your deployments:</h1>
            <div>
              {deployUrls.length > 0 ? (
                <>
                  {deployUrls.map((url) => {
                    return (
                      <Card
                        key={url.url}
                        className="p-3 text-sm flex items-center justify-between !bg-bolt-elements-background-depth-4"
                      >
                        <div className="flex gap-2 items-center">
                          <div className="i-ph:circle-fill color-accent-500 w-2 h-2"></div>
                          <span>{url.name}</span>
                        </div>

                        <a
                          href={url.url}
                          target="_blank"
                          className="text-bolt-elements-textSecondary hover:text-bolt-elements-textTertiary"
                        >
                          View
                        </a>
                      </Card>
                    );
                  })}
                </>
              ) : (
                <span className="text-sm text-bolt-elements-textSecondary">No deployments yet</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex  gap-5 p-6 bg-bolt-elements-background-depth-3 rounded-lg">
          <div className="flex flex-col gap-3">
            <div>
              <h1 className="flex gap-2 items-center">
                <div className="i-ph:share-network color-accent-500 text-lg"></div>
                Share
              </h1>
              <p className="text-sm text-bolt-elements-textSecondary">
                Show the world what you built! Share your app on social media and let it spread.
              </p>
            </div>

            <TwitterShareButton deployUrls={deployUrls} withLabel />
          </div>
        </div>
      </div>
    </div>
  );
}
