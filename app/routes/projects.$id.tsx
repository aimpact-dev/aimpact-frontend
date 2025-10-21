'use client';

import { useNavigate, useParams } from '@remix-run/react';
import { useDeploymentQuery, useProjectQuery } from 'query/use-project-query';
import { useAuth } from '~/lib/hooks/useAuth';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useMemo, useState } from 'react';
import { useUpdateProjectInfoMutation } from 'query/use-project-query';
import { formatUrl } from '~/utils/urlUtils';
import LoadingScreen from '~/components/common/LoadingScreen';
import { useGetHeavenToken } from '~/lib/hooks/tanstack/useHeaven';
import { twMerge } from 'tailwind-merge';
import { formatNumber } from '~/lib/utils';
import TokenInfoForm from '~/components/chat/TokenInfoForm';
import Popup from '~/components/common/Popup';
import { LoadingDots } from '~/components/ui';
import Footer from '~/components/footer/Footer';
import { EventBanner } from '~/components/ui/EventBanner';

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
  const navigate = useNavigate();
  const { publicKey, connected } = useWallet();
  const projectQuery = useProjectQuery(params.id);

  const updateProjectMutation = useUpdateProjectInfoMutation(params.id, auth?.jwtToken);
  const isOwner = useMemo(() => {
    return !!(
      auth &&
      auth.isAuthorized &&
      connected &&
      publicKey?.toBase58() === projectQuery.data?.projectOwnerAddress
    );
  }, [auth, connected, publicKey, projectQuery.data?.projectOwnerAddress]);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const editProjectInfo = async () => {
    setErrorMsg(null);
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setErrorMsg('Project name cannot be empty');
      return;
    }
    try {
      await updateProjectMutation.mutateAsync({
        name: trimmedName,
        description: editDescription,
      });
      setIsEditing(false);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to save changes');
    }
  };

  const s3Url = useDeploymentQuery(params.id, 's3').data;
  const icpUrl = useDeploymentQuery(params.id, 'icp').data;
  const akashUrl = useDeploymentQuery(params.id, 'akash').data;
  const { data: tokenInfo, isLoading: tokenInfoLoading } = useGetHeavenToken(params.id);

  const [showTokenWindow, setShowTokenWindow] = useState(false);

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  // Initialize form fields when project data arrives or when entering edit mode
  useEffect(() => {
    if (projectQuery.data && isEditing) {
      setEditName(projectQuery.data.name || '');
      setEditDescription(projectQuery.data.description ?? '');
    }
  }, [projectQuery.data, isEditing]);

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
    <div className="min-h-screen w-full bg-black text-gray-100 flex flex-col">
      <EventBanner />
      <header className="bg-gradient-to-r from-gray-900 to-black p-8 border-b border-gray-800">
        <div className="max-w-7xl mx-auto flex items-center gap-6">
          <button onClick={() => navigate('/')} className="mr-4">
            <img src="/aimpact-logo-beta.png" alt="AImpact Logo" className="h-12 w-auto" />
          </button>
          {project.image && (
            <img
              src={project.image}
              alt={project.name}
              className="w-20 h-20 rounded-lg object-cover border border-gray-700 shadow-lg"
            />
          )}
          <div className="flex gap-6 group">
            {!isEditing ? (
              <button className="flex gap-3" onClick={() => navigate(`/projects`)}>
                <div className="inline-flex justify-center items-center bg-bolt-elements-button-primary-background rounded-md p-2 transition-colors duration-200 group-hover:bg-bolt-elements-button-primary-backgroundHover">
                  <div className="i-ph:arrow-left h-5 w-5 color-accent-500"></div>
                </div>
                <h1 className="text-3xl font-bold flex items-center gap-2 text-white transition-colors duration-300 group-hover:text-accent-500">
                  {project.name}
                </h1>
              </button>
            ) : (
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-3xl font-bold bg-gray-800 text-white border border-gray-700 rounded px-3 w-full"
                placeholder="Project name"
              />
            )}
            {project.category && <div className="text-lg text-purple-400 mt-2">{project.category}</div>}
          </div>
        </div>
      </header>

      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-purple-300 mb-4">Project Overview</h2>

            <div className="flex justify-between gap-6">
              {!isEditing ? (
                <p className="text-xl leading-relaxed text-gray-300">
                  {project.description || 'No description available.'}
                </p>
              ) : (
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="flex-1 min-h-[140px] text-lg leading-relaxed bg-gray-900 text-gray-100 border border-gray-800 rounded-lg p-4"
                  placeholder="Add a description..."
                />
              )}

              {isOwner && (
                <div className="flex flex-col items-end gap-2 min-w-[220px]">
                  {!isEditing ? (
                    <div className="flex gap-2">
                      <a
                        className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                        href={`/chat/${project.id}`}
                      >
                        <div className="i-ph:code w-5 h-5" />
                        Edit project
                      </a>
                      <button
                        className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                        onClick={() => {
                          setIsEditing(true);
                          setErrorMsg(null);
                        }}
                      >
                        <div className="i-ph:pencil w-5 h-5" />
                        Edit project info
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-60"
                        disabled={updateProjectMutation.isPending}
                        onClick={editProjectInfo}
                      >
                        {updateProjectMutation.isPending ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg"
                        onClick={() => {
                          setIsEditing(false);
                          setErrorMsg(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {errorMsg && <div className="text-red-400 text-sm">{errorMsg}</div>}
                </div>
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

      <Footer withLabel />
    </div>
  );
}
