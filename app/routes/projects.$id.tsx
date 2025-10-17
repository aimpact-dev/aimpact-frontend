'use client';

import { useNavigate, useParams } from '@remix-run/react';
import { useDeploymentQuery, useProjectQuery } from 'query/use-project-query';
import { useAuth } from '~/lib/hooks/useAuth';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useUpdateProjectInfoMutation } from 'query/use-project-query';
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
import Navbar from '~/components/dashboard/navbar';
import Footer from '~/components/footer/Footer.client';
import { Tooltip } from '~/components/chat/Tooltip';
import ProjectInfoUpdateForm from '~/components/dashboard/ProjectInfoUpdateForm';

const InfoRow = ({ label, children, hidden }: { label: string; children: React.ReactNode; hidden?: boolean }) => {
  if (hidden) return null;
  return (
    <div className="flex justify-between items-center border-b border-white/15 pb-3">
      <span className="text-white/80">{label}</span>
      <span className="text-md font-bold text-white">{children}</span>
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

  const navigate = useNavigate();

  const isOwner = useMemo(() => {
    return !!(
      auth &&
      auth.isAuthorized &&
      connected &&
      publicKey?.toBase58() === projectQuery.data?.projectOwnerAddress
    );
  }, [auth, connected, publicKey, projectQuery.data?.projectOwnerAddress]);

  const [isEditing, setIsEditing] = useState(false);

  const [showInfoUpdateWindow, setShowInfoUpdateWindow] = useState(false);

  const s3Url = useDeploymentQuery(params.id, 's3').data;
  const icpUrl = useDeploymentQuery(params.id, 'icp').data;
  const akashUrl = useDeploymentQuery(params.id, 'akash').data;
  const { data: tokenInfo, isLoading: tokenInfoLoading, error: tokenInfoError } = useGetHeavenToken(params.id);

  useEffect(() => {
    console.log(!!tokenInfo, tokenInfoLoading, tokenInfoError);
  });

  const [showTokenWindow, setShowTokenWindow] = useState(false);

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const deployUrls = [
    s3Url && { name: 'S3', url: s3Url },
    icpUrl && { name: 'ICP', url: icpUrl },
    akashUrl && { name: 'Akash', url: akashUrl },
  ].filter(Boolean) as { name: string; url: string }[];

  const endTriggerRef = useRef(null);
  const [isFooterFixed, setIsFooterFixed] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFooterFixed(!entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0,
        rootMargin: '0px 0px -100% 0px',
      },
    );

    if (endTriggerRef.current) {
      observer.observe(endTriggerRef.current);
    }

    return () => {
      if (endTriggerRef.current) {
        observer.unobserve(endTriggerRef.current);
      }
    };
  }, []);

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
    <main className="flex flex-col min-h-screen bg-gradient-to-br from-black via-purple-900 to-black">
      <Popup
        isShow={showInfoUpdateWindow}
        handleToggle={() => {
          setShowInfoUpdateWindow(!showInfoUpdateWindow);
        }}
      >
        <div className="mb-3">
          <h1 className="text-2xl font-bold">Project details</h1>
        </div>

        <ProjectInfoUpdateForm projectId={params.id} jwtToken={auth?.jwtToken} setShowForm={setShowInfoUpdateWindow} />
      </Popup>
      <Navbar />
      <section id="project" className="flex-1 py-16 md:py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <div className="flex justify-between">
                <div className="flex gap-6 group">
                  <button className="flex gap-3" onClick={() => navigate(`/projects`)}>
                    <div className="inline-flex justify-center items-center bg-bolt-elements-button-primary-background rounded-md p-2 transition-colors duration-200 group-hover:bg-bolt-elements-button-primary-backgroundHover">
                      <div className="i-ph:arrow-left h-5 w-5 color-accent-500"></div>
                    </div>
                    <h1 className="text-3xl font-bold flex items-center gap-2 text-white transition-colors duration-300 group-hover:text-accent-500">
                      {project.name}
                    </h1>
                  </button>
                </div>
                {isOwner && (
                  <div className="flex gap-2 items-center">
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
              <h2 className="text-2xl font-bold text-purple-300 mb-4">Project Overview</h2>

              <div className="flex justify-between gap-6">
                <p className="text-xl leading-relaxed text-gray-300">
                  {project.description || 'No description available.'}
                </p>

                {isOwner && (
                  <div className="flex flex-col items-end gap-2 min-w-[220px]">
                    <a href={`/chat/${project.id}`}>
                      <Button variant="glowing" className="gap-1 px-3">
                        <div className="i-ph:code w-4 h-4" />
                        Open editor
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </section>
          </motion.div>

          {/* Project Details */}
          <section className="mb-12 bg-black/10 rounded-xl p-8 border-1 border-white/15 shadow-xl">
            <h2 className="text-xl font-semibold text-purple-300 mb-6">Project Details</h2>
            <div className="space-y-4">
              <InfoRow label="Created:">{new Date(project.createdAt).toLocaleString()}</InfoRow>
              <InfoRow label="Last Updated:">{new Date(project.updatedAt).toLocaleString()}</InfoRow>
              {project.category && <InfoRow label="Category:">{project.category}</InfoRow>}

              <h2 className="text-xl font-semibold text-purple-300 mb-6">Deployment Links</h2>
              {deployUrls && deployUrls.length > 0 ? (
                deployUrls.map(({ name, url }) => (
                  <InfoRow key={name} label={name}>
                    <a href={url} className="hover:underline" target="_blank" rel="noopener noreferrer">
                      {formatUrl(url)}
                    </a>
                  </InfoRow>
                ))
              ) : (
                <p>This project hasn't been deployed yet</p>
              )}

              <a
                className={twMerge(
                  'flex items-center mb-6 gap-0.5 text-purple-300 w-fit',
                  tokenInfo && 'hover:text-[#c28aff] hover:cursor-pointer',
                )}
                onClick={() => setShowTokenWindow(true)}
              >
                <h2 className="text-xl font-semibold">Token Info</h2>
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
                <p>This project doesn't have a token</p>
              )}
            </div>
          </section>
        </div>

        <Footer positionClass={isFooterFixed ? 'fixed bottom-0 left-0 w-full' : 'absolute bottom-0 left-0 w-full'} />
        <div ref={endTriggerRef} className="h-[1px] w-full absolute bottom-0" />
      </section>

      {/* Second footer */}
      <footer className="bg-black/50 border-t border-white/10 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-400">© 2025 Aimpact. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
