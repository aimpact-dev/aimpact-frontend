'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from '@remix-run/react';
import { ClientOnly } from 'remix-utils/client-only';
import CustomWalletButton from '../common/CustomWalletButton';
import HowItWorksButton from '../chat/HowItWorksButton';
import RewardsNavButton from '../chat/RewardsNavButton';
import LeaderboardNavButton from '../chat/LeaderboardNavButton';
import ProjectsNavButton from '../chat/ProjectsNavButton';
import MobileMenu from '../header/MobileMenu';
import { useViewport } from '~/lib/hooks';

const Navbar = () => {
  const { scrollY } = useScroll();
  const navigate = useNavigate();
  const { isMobile } = useViewport();
  const navbarBackground = useTransform(scrollY, [0, 100], ['rgba(20,20,20,0)', 'rgba(20,20,20,0.8)']);

  return !isMobile ? (
    <motion.header
      style={{ backgroundColor: navbarBackground }}
      className={`sticky top-0 left-0 right-0 z-100 backdrop-blur-sm transition-colors duration-300`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex justify-between items-center py-4">
          <button onClick={() => navigate('/')} className="flex items-center space-x-2" aria-label="Home">
            <img src="/aimpact-logo-beta.png" alt="AImpact Logo" className="h-8 w-auto" />
          </button>

          <nav className="hidden md:flex items-center space-x-8">
            <HowItWorksButton />
            <ProjectsNavButton />
            <RewardsNavButton />
            <LeaderboardNavButton />
          </nav>

          <div>
            <ClientOnly>{() => <CustomWalletButton />}</ClientOnly>
          </div>
        </div>
      </div>
    </motion.header>
  ) : (
    <MobileMenu />
  );
};

export default Navbar;
