'use client';

import CustomWalletButton from '../common/CustomWalletButton';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ClientOnly } from 'remix-utils/client-only';
import waterStyles from '../ui/WaterButton.module.scss';
import { classNames } from '~/utils/classNames';
import HowItWorksButton from '../chat/HowItWorksButton';
import RewardsNavButton from '../chat/RewardsNavButton';
import { useLocation, useNavigate } from '@remix-run/react';

interface NavBarProps {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
}

const Navbar = () => {
  const { scrollY } = useScroll();
  const backgroundColor = useTransform(scrollY, [0, 100], ['rgba(20, 20, 20, 0)', 'rgba(20, 20, 20, 0.8)']);
  const location = useLocation();
  const navigate = useNavigate();

  const isRewardsPage = location.pathname === '/rewards';

  return (
    <>
      <motion.header
        style={{ backgroundColor }}
        className="sticky top-0 left-0 right-0 z-50 backdrop-blur-sm transition-colors duration-300"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button onClick={() => navigate('/')} className="flex items-center space-x-2" aria-label="Home">
                <img src="/aimpact-logo-beta.png" alt="AImpact Logo" className="h-8 w-auto" />
              </button>
            </div>

            <nav className="flex items-center space-x-8">
              <HowItWorksButton />
              {!isRewardsPage && <RewardsNavButton />}
            </nav>
            <ClientOnly>{() => <CustomWalletButton />}</ClientOnly>
          </div>
        </div>
      </motion.header>

      {/* Mobile Navigation */}
      {/* {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-16 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-lg md:hidden"
        >
          <div className="p-4 space-y-3">
            <a
              href="#projects"
              className="block px-4 py-3 rounded-lg hover:bg-gray-100 transition duration-150 text-white"
              onClick={() => setIsMenuOpen(false)}
            >
              Projects
            </a>
            <a
              href="#"
              className="block px-4 py-3 rounded-lg hover:bg-gray-100 transition duration-150 text-white"
              onClick={() => setIsMenuOpen(false)}
            >
              Categories
            </a>
            <a
              href="#"
              className="block px-4 py-3 rounded-lg hover:bg-gray-100 transition duration-150 text-white"
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </a>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search projects..."
                className="w-full pl-10 pr-4 py-2 rounded-full bg-gray-100 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
              />
            </div>
          </div>
        </motion.div>
      )} */}
    </>
  );
};

export default Navbar;
