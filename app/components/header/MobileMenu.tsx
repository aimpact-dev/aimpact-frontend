'use client';

import { useState } from 'react';
import { motion, MotionValue, useScroll, useTransform } from 'framer-motion';
import { useLocation, useNavigate } from '@remix-run/react';
import { Menu, X } from 'lucide-react';
import { ClientOnly } from 'remix-utils/client-only';
import CustomWalletButton from '../common/CustomWalletButton';
import HowItWorksButton from '../chat/HowItWorksButton';
import { useWallet } from '@solana/wallet-adapter-react';
import { userInfo } from '~/lib/hooks/useAuth';
import { useStore } from '@nanostores/react';
import DepositButton from '../chat/DepositButton';
import GetMessagesButton from '../chat/GetMessagesButton';
import { useGlobalPopups } from '../chat/GlobalPopups';

export default function MobileMenu() {
  const user = useStore(userInfo);
  const { connected } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const { showWhatsNewPopup } = useGlobalPopups();

  const { scrollY } = useScroll();
  const navbarBackground = useTransform(scrollY, [0, 100], ['rgba(20,20,20,0)', 'rgba(20,20,20,0.8)']);

  const handleNavigate = (url: string, external?: boolean) => {
    if (external) {
      // Open external links in a new tab
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (location.pathname.startsWith('/chat/')) {
      // If current page is a chat page, perform full reload
      window.location.href = url;
    } else if (location.pathname !== url) {
      navigate(url);
    }

    setMenuOpen(false);
  };

  const MobileNavButton = ({ label, url, onClick }: { label: string; url?: string; onClick?: () => void }) => {
    const isExternal = !!url && /^https?:\/\//.test(url);
    const active = !isExternal && location.pathname === url;
    return (
      <button
        onClick={() => {
          onClick?.();
          url && handleNavigate(url, isExternal);
        }}
        className={`py-2 px-4 text-left font-medium ${active ? 'text-white' : 'text-gray-200/70 hover:text-gray-100'}`}
      >
        {label}
      </button>
    );
  };

  return (
    <motion.header
      style={{ backgroundColor: menuOpen ? 'rgba(30,30,30,0.9)' : navbarBackground }}
      className={`${menuOpen ? 'fixed' : 'sticky'} top-0 left-0 right-0 z-50 backdrop-blur-md transition-colors duration-300 ${menuOpen && 'h-screen'}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full">
        <div className="flex justify-between items-center py-4">
          <button onClick={() => handleNavigate('/')} className="flex items-center space-x-2" aria-label="Home">
            <img src="/aimpact-logo-beta-xmas.png" alt="AImpact Logo" className="h-8 w-auto" />
          </button>

          <div>
            <ClientOnly>{() => <CustomWalletButton />}</ClientOnly>
          </div>

          <button className="p-2 text-gray-200" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {menuOpen && (
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`h-full text-lg`}
          >
            <div className="flex justify-between gap-2 pb-5">
              {connected && user && (
                <>
                  <div className="whitespace-nowrap text-sm font-medium text-bolt-elements-textPrimary bg-bolt-elements-background rounded-md border border-bolt-elements-borderColor px-4 py-2">
                    <b>{user.messagesLeft - user.pendingMessages}</b>{' '}
                    <span className="text-xs">
                      message{user.messagesLeft - user.pendingMessages === 1 ? '' : 's'} left
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <ClientOnly>
                      {() => {
                        return connected && <DepositButton discountPercent={user.discountPercent || 0} isMobile />;
                      }}
                    </ClientOnly>

                    <GetMessagesButton isMobile />
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col gap-5 pt-5 pb-5 border-t border-white/10">
              <MobileNavButton label="Projects" url="/projects" />
              <MobileNavButton label="Rewards" url="/rewards" />
              <MobileNavButton label="Leaderboard" url="/leaderboard" />
            </div>

            <div className="flex flex-col gap-5 pt-5 pb-5 border-t border-white/10">
              <MobileNavButton label="What's new" onClick={() => showWhatsNewPopup()} />
              <HowItWorksButton isMobile />
              <MobileNavButton label="Report a bug" url="https://forms.gle/RQs67LKavBFiP1JL8" />
              <MobileNavButton label="Schedule a call" url="https://calendly.com/kostiantyn-aimpact/30min" />
            </div>

            <div className="px-6 py-6 border-t border-purple-500/10">
              <p className="text-sm text-gray-400 mb-3 font-medium">Join our community</p>
              <div className="flex gap-3">
                <a
                  href="https://discord.gg/MFTPPm3gwY"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg transition-all duration-200 font-medium shadow-lg shadow-indigo-500/20"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                  Discord
                </a>
                <a
                  href="https://x.com/aimpact_dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-black hover:bg-gray-900 text-white rounded-lg transition-all duration-200 font-medium shadow-lg shadow-black/20"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  X
                </a>
              </div>
            </div>
          </motion.nav>
        )}
      </div>
    </motion.header>
  );
}
