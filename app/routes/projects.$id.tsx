'use client';

import { useParams } from '@remix-run/react';
import { useDeploymentQuery, useProjectQuery } from 'query/use-project-query';
import { useAuth } from '~/lib/hooks/useAuth';
import { useWallet } from '@solana/wallet-adapter-react';
import { formatUrl } from '~/utils/urlUtils';
import { useGetHeavenToken } from '~/lib/hooks/tanstack/useHeaven';
import { classNames } from '~/utils/classNames';
import { twMerge } from 'tailwind-merge';
import { formatNumber } from '~/lib/utils';
import TokenInfoForm from '~/components/chat/TokenInfoForm';
import { useEffect, useState } from 'react';
import Popup from '~/components/common/Popup';
import { LoadingDots } from '~/components/ui';

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

  if (projectQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen text-center text-gray-400 bg-black">
        Loading...
      </div>
    );
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
    <div className="min-h-screen w-full bg-black text-gray-100 flex flex-col">
      <header className="bg-gradient-to-r from-gray-900 to-black p-8 border-b border-gray-800">
        <div className="max-w-7xl mx-auto flex items-center gap-6">
          <a href="/" className="mr-4">
            <img src="/aimpact-logo-beta.png" alt="AImpact Logo" className="h-12 w-auto" />
          </a>
          {project.image && (
            <img
              src={project.image}
              alt={project.name}
              className="w-20 h-20 rounded-lg object-cover border border-gray-700 shadow-lg"
            />
          )}
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-2 text-white">{project.name}</h1>
            {project.category && <div className="text-lg text-purple-400 mt-2">{project.category}</div>}
          </div>
        </div>
      </header>

      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-purple-300 mb-4">Project Overview</h2>
            <div className="flex justify-between">
              <p className="text-xl leading-relaxed text-gray-300">
                {project.description || 'No description available.'}
              </p>
              {auth && auth.isAuthorized && connected && publicKey?.toBase58() === project.projectOwnerAddress && (
                <a
                  className="flex items-center justify-center gap-2 text-center bg-purple-600 hover:bg-purple-700
                text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300"
                  href={`/chat/${project.id}`}
                >
                  <div className="i-ph:pencil w-5 h-5" />
                  Edit project
                </a>
              )}
            </div>
          </section>

          {/* Project Details */}
          <section className="mb-12 bg-gray-900 rounded-xl p-8 border border-gray-800 shadow-xl">
            <h2 className="text-xl font-semibold text-purple-300 mb-6">Project Details</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <span className="text-gray-400">Created:</span>
                <span className="text-xl font-bold text-white">{new Date(project.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <span className="text-gray-400">Last Updated:</span>
                <span className="text-xl font-bold text-white">{new Date(project.updatedAt).toLocaleString()}</span>
              </div>
              {project.category && (
                <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                  <span className="text-gray-400">Category:</span>
                  <span className="text-xl font-bold text-white">{project.category}</span>
                </div>
              )}
              <h2 className="text-xl font-semibold text-purple-300 mb-6">Deployment Links</h2>
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <span className="text-gray-400">AWS (Default):</span>
                <span className="text-xl font-bold text-white">
                  {s3Url ? (
                    <a href={s3Url} className="hover:underline" target={'_blank'}>
                      {formatUrl(s3Url)}
                    </a>
                  ) : (
                    'Not deployed yet'
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <span className="text-gray-400">Internet Computer:</span>
                <span className="text-xl font-bold text-white">
                  {icpUrl ? (
                    <a href={icpUrl} className="hover:underline" target={'_blank'}>
                      {formatUrl(icpUrl)}
                    </a>
                  ) : (
                    'Not deployed yet'
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <span className="text-gray-400">Akash:</span>
                <span className="text-xl font-bold text-white">
                  {akashUrl ? (
                    <a href={akashUrl} className="hover:underline" target={'_blank'}>
                      {formatUrl(akashUrl)}
                    </a>
                  ) : (
                    'Not deployed yet'
                  )}
                </span>
              </div>
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
                  <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                    <p className="text-gray-400">Address:</p>
                    <a
                      href={`https://solscan.io/account/${tokenInfo.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white text-xl hover:underline"
                    >
                      {truncateAddress(tokenInfo.address)}
                    </a>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                    <p className="text-gray-400">Name:</p>
                    <p className="text-white text-xl">
                      <span className="font-bold">{`${tokenInfo.metadata.name}`}</span>{' '}
                      {`(${tokenInfo.metadata.symbol})`}
                    </p>
                  </div>
                  <div
                    className={twMerge(
                      'flex justify-between items-center border-b border-gray-800 pb-3',
                      !tokenInfo.metadata.description && 'hidden',
                    )}
                  >
                    <p className="text-gray-400">Description:</p>
                    <p className="text-white overflow-auto max-h-36 whitespace-pre-line max-w-96 text-lg">
                      {tokenInfo.metadata.description}
                    </p>
                  </div>
                  <div className={twMerge('flex justify-between items-center border-b border-gray-800 pb-3')}>
                    <p className="text-gray-400">Price:</p>
                    <p className="text-white font-bold text-xl">{`\$${tokenInfo.price ? formatNumber(tokenInfo.price) : '?'} ${' '}
                      (\$${tokenInfo.marketCap ? tokenInfo.marketCap.toFixed() : '?'} Market cap)`}</p>
                  </div>

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
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 p-6 text-center text-gray-500">
        <p>
          © {new Date().getFullYear()} Project Explorer. All information is provided for educational purposes only.
        </p>
      </footer>
    </div>
  );
}
