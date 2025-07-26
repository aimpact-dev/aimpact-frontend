'use client';

import { useParams } from '@remix-run/react';
import { useProjectQuery, useS3DeployemntQuery } from 'query/use-project-query';
import { useAuth } from '~/lib/hooks/useAuth';
import { useWallet } from '@solana/wallet-adapter-react';

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
  const deploymentUrlQuery = useS3DeployemntQuery(params.id);

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
                  <div className='i-ph:pencil w-5 h-5' />
                  Edit project
                </a>
              )
              }
            </div>
          </section>

          {/* Project Details */}
          <section className="mb-12 bg-gray-900 rounded-xl p-8 border border-gray-800 shadow-xl">
            <h2 className="text-2xl font-bold text-purple-300 mb-6">Project Details</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <span className="text-gray-400">Created:</span>
                <span className="text-xl font-bold text-white">{new Date(project.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <span className="text-gray-400">Last Updated:</span>
                <span className="text-xl font-bold text-white">{new Date(project.updatedAt).toLocaleDateString()}</span>
              </div>
              {project.category && (
                <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                  <span className="text-gray-400">Category:</span>
                  <span className="text-xl font-bold text-white">{project.category}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <span className="text-gray-400">Deployment URL:</span>
                <span className="text-xl font-bold text-white">
                  {deploymentUrlQuery.data ? <a href={deploymentUrlQuery.data} target={'_blank'}>{deploymentUrlQuery.data}</a> : 'Not deployed yet'}
                </span>
              </div>
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
