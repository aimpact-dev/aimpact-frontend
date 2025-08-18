'use client';

import { useState, type FormEvent, useRef, useEffect } from 'react';
import ProjectGrid from '@/components/dashboard/project-grid';
import Navbar from '@/components/dashboard/navbar';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useNavigate } from '@remix-run/react';

import { Button } from '@/components/ui/Button';
import Footer from '~/components/footer/Footer.client';
import { useAuth } from '~/lib/hooks/useAuth';

export default function Home() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'owned'>(auth && auth.isAuthorized ? 'owned' : 'all');

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
        rootMargin: '0px 0px -100% 0px'
      }
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-purple-900 to-black">
      <Navbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <section id="projects" className="py-16 md:py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.25 }}
            className="mb-12"
          >
            <div className="w-full">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl mb-8 text-center">
                Trending Blockchain Projects
              </h2>
              <div className="flex flex-col sm:flex-row items-center justify-center w-full max-w-4xl mx-auto gap-6 relative">
                <Button
                  variant="secondary"
                  size={"lg"}
                  className="flex items-center gap-1 hover:scale-105 whitespace-nowrap text-lg"
                  onClick={() => navigate('/')}
                >
                  <Plus className="w-6 h-6" /> Build a new app
                </Button>
                { auth && auth.isAuthorized &&
                <div className="absolute right-0 flex items-center">
                  <span className={`mr-3 text-sm font-medium ${filter === 'all' ? 'text-white' : 'text-gray-400'}`}>
                    All Projects
                  </span>
                  <button
                    type="button"
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-0 focus:ring-offset-0 ${
                      filter === 'owned' ? 'bg-[#9987EE]' : 'bg-gray-600'
                    }`}
                    onClick={() => setFilter(filter === 'all' ? 'owned' : 'all')}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        filter === 'owned' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`ml-3 text-sm font-medium ${filter === 'owned' ? 'text-white' : 'text-gray-400'}`}>
                    My Projects
                  </span>
                </div>
                }
              </div>
            </div>
          </motion.div>
          <ProjectGrid filter={filter} />
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
