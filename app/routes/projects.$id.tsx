'use client';

import { useParams } from '@remix-run/react';
import { useDeploymentQuery, useProjectQuery } from 'query/use-project-query';
import { useAuth } from '~/lib/hooks/useAuth';
import { useWallet } from '@solana/wallet-adapter-react';
import { useMemo, useState } from 'react';
import { formatUrl } from '~/utils/urlUtils';
import LoadingScreen from '~/components/common/LoadingScreen';
import { useGetHeavenToken } from '~/lib/hooks/tanstack/useHeaven';
import { twMerge } from 'tailwind-merge';
import { formatNumber } from '~/lib/utils';
import TokenInfoForm from '~/components/chat/TokenInfoForm';
import Popup from '~/components/common/Popup';
import { Button, LoadingDots } from '~/components/ui';
import { TwitterShareButton } from '~/components/ui/TwitterShareButton';
import { motion } from 'framer-motion';
import { Tooltip } from '~/components/chat/Tooltip';
import ProjectInfoUpdateForm from '~/components/dashboard/ProjectInfoUpdateForm';
import GradientPage from '~/components/wrappers/GradientPage';
import DeployButton from '~/components/deploy/DeployButton';
import BackButton from '~/components/ui/BackButton';
import useViewport from '~/lib/hooks';
import { shortenString } from '~/utils/shortenString';

const InfoRow = ({ label, children, hidden }: { label: string; children: React.ReactNode; hidden?: boolean }) => {
  if (hidden) return null;
  return (
    <div className="text-sm md:text-base flex justify-between items-center border-b border-white/15 pb-3">
      <span className="text-white/80">{label}</span>
      <span className="font-bold text-white">{children}</span>
    </div>
  );
};

export default function Project() {
  const params = useParams();
  if (!params.id) {
    return (
      <div className="flex items-center justify-center h-screen w-screen text-center text-red-500 bg-black">
        Project ID is required.
      </div>
    );
  }
  const auth = useAuth();
  const { publicKey, connected } = useWallet();
  const projectQuery = useProjectQuery(params.id);
  const isMobile = useViewport(768);

  const isOwner = useMemo(() => {
    return !!(
      auth &&
      auth.isAuthorized &&
      connected &&
      publicKey?.toBase58() === projectQuery.data?.projectOwnerAddress
    );
  }, [auth, connected, publicKey, projectQuery.data?.projectOwnerAddress]);

  const [showInfoUpdateWindow, setShowInfoUpdateWindow] = useState(false);

  const s3Url = useDeploymentQuery(params.id, 's3').data;
  const icpUrl = useDeploymentQuery(params.id, 'icp').data;
  const akashUrl = useDeploymentQuery(params.id, 'akash').data;
  const { data: tokenInfo, isLoading: tokenInfoLoading } = useGetHeavenToken(params.id);

  const [showTokenWindow, setShowTokenWindow] = useState(false);

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const deployUrls = [
    s3Url && { name: 'S3', url: s3Url },
    icpUrl && { name: 'ICP', url: icpUrl },
    akashUrl && { name: 'Akash', url: akashUrl },
  ].filter(Boolean) as { name: string; url: string }[];

  if (projectQuery.isLoading || projectQuery.isPending) {
    return <LoadingScreen />;
  }

  if (projectQuery.isError) {
    return (
      <div className="flex items-center justify-center text-center text-red-500 bg-black">
        Error loading project. Error details: {projectQuery.error.message}
      </div>
    );
  }

  const project = projectQuery.data;

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen w-screen text-center text-red-500 bg-black">
        Project not found.
      </div>
    );
  }

  return (
    <GradientPage>
      <Popup
        isShow={showInfoUpdateWindow}
        handleToggle={() => {
          setShowInfoUpdateWindow(!showInfoUpdateWindow);
        }}
      >
        <div className="mb-5">
          <h1 className="text-2xl font-bold">Project details</h1>
        </div>

        <ProjectInfoUpdateForm projectId={params.id} jwtToken={auth?.jwtToken} setShowForm={setShowInfoUpdateWindow} />
      </Popup>
      <section id="project">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.25 }}
        >
          <section className="mb-12">
            {project.image && (
              <img
                src={project.image}
                alt={project.name}
                className="w-20 h-20 rounded-lg object-cover border border-gray-700 shadow-lg"
              />
            )}
            <div className="flex flex-col md:flex-row justify-between gap-5">
              <BackButton url="/projects" size="3xl" className="mb-unset">
                {isMobile ? 'Back to projects' : project.name}
              </BackButton>
              {isMobile && <p className="text-2xl md:text-3xl font-bold">{project.name}</p>}
              {isOwner && (
                <div className="flex gap-2 items-center self-end md:self-unset">
                  <TwitterShareButton
                    withLabel
                    customVariant="glowing"
                    deployUrls={deployUrls}
                    classNames="select-none"
                  />

                  <Tooltip content="Edit project info">
                    <Button
                      variant="glowing"
                      className="text-sm  py-2 px-3 transition-colors duration-200"
                      onClick={() => {
                        setShowInfoUpdateWindow(true);
                      }}
                    >
                      <div className="i-ph:pencil" />
                    </Button>
                  </Tooltip>
                </div>
              )}
              {project.category && <div className="text-lg text-purple-400 mt-2">{project.category}</div>}
            </div>
          </section>
          <section className="mb-12">
            <h2 className="text-xl md:text-2xl font-bold text-purple-300 mb-4">Project Overview</h2>

            <div className="flex justify-between gap-6">
              <p className="text-sm md:text-base leading-relaxed text-gray-300">
                {project.description || 'No description.'}
              </p>

              {isOwner && (
                <div className="flex items-end gap-2">
                  <a href={`/chat/${project.id}`}>
                    <Button variant="glowing" className="gap-1 px-3">
                      <div className="i-ph:code w-4 h-4" />
                      Open editor
                    </Button>
                  </a>
                  <DeployButton customVariant="glowing" />
                </div>
              )}
            </div>
          </section>
        </motion.div>

        {/* Project Details */}
        <section className="mb-12 bg-black/10 rounded-xl p-8 border-1 border-white/15 shadow-xl">
          <h2 className="text-lg md:text-xl font-semibold text-purple-300 mb-6">Project Details</h2>
          <div className="space-y-4">
            <InfoRow label="Created:">{new Date(project.createdAt).toLocaleString()}</InfoRow>
            <InfoRow label="Last Updated:">{new Date(project.updatedAt).toLocaleString()}</InfoRow>
            {project.category && <InfoRow label="Category:">{project.category}</InfoRow>}

            <h2 className="text-lg md:text-xl font-semibold text-purple-300 mb-6">Deployment Links</h2>
            {deployUrls && deployUrls.length > 0 ? (
              deployUrls.map(({ name, url }) => (
                <InfoRow key={name} label={name}>
                  <a
                    href={url}
                    className="text-sm md:text-base flex gap-1 items-center underline decoration-current hover:decoration-transparent transition-colors duration-100"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {shortenString(formatUrl(url), 14, 14)}
                    <div className="inline-block text-lg i-ph:arrow-square-out"></div>
                  </a>
                </InfoRow>
              ))
            ) : (
              <p className="text-sm md:text-base">This project hasn't been deployed yet</p>
            )}

            <a
              className={twMerge(
                'flex items-center mb-6 gap-0.5 text-purple-300 w-fit',
                tokenInfo && 'hover:text-[#c28aff] hover:cursor-pointer',
              )}
              onClick={() => setShowTokenWindow(true)}
            >
              <h2 className="text-lg md:text-xl font-semibold">Token Info</h2>
              {tokenInfo && <div className="i-ph:arrow-line-up-right size-5" />}
            </a>

            {tokenInfo ? (
              <>
                <InfoRow label="Address:">
                  <a
                    href={`https://solscan.io/account/${tokenInfo.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white text-xl hover:underline"
                  >
                    {truncateAddress(tokenInfo.address)}
                  </a>
                </InfoRow>
                <InfoRow label="Name:">
                  <span>
                    <span className="font-bold">{tokenInfo.metadata.name}</span> ({tokenInfo.metadata.symbol})
                  </span>
                </InfoRow>
                <InfoRow label="Description:" hidden={!tokenInfo.metadata.description}>
                  <p className="text-white overflow-auto max-h-36 whitespace-pre-line max-w-96 text-lg">
                    {tokenInfo.metadata.description}
                  </p>
                </InfoRow>
                <InfoRow label="Price:">
                  {`\$${tokenInfo.price ? formatNumber(tokenInfo.price) : '?'} (\$${tokenInfo.marketCap ? tokenInfo.marketCap.toFixed() : '?'} Market cap)`}
                </InfoRow>

                <Popup
                  isShow={showTokenWindow}
                  handleToggle={() => {
                    setShowTokenWindow(!showTokenWindow);
                  }}
                  positionClasses="sm:max-w-[500px] sm:w-[500px] mt-12"
                >
                  <TokenInfoForm tokenData={tokenInfo} />
                </Popup>
              </>
            ) : tokenInfoLoading ? (
              <LoadingDots text={'Loading'} />
            ) : (
              <p className="text-sm md:text-base">This project doesn't have a token</p>
            )}
          </div>
        </section>
      </section>
    </GradientPage>
  );
}
