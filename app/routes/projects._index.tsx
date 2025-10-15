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
import type { ProjectFilters } from 'query/use-project-query';
import ProjectFilter from '~/components/dashboard/ProjectFilter';
import GradientPage from '~/components/wrappers/GradientPage';

export default function Home() {
  const navigate = useNavigate();
  const auth = useAuth();

  const [activeFilters, setActiveFilters] = useState<ProjectFilters[]>(['all']);

  return (
    <GradientPage>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.25 }}
      >
        <div className="flex flex-col gap-8 w-full">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl text-center">
            Trending Blockchain Projects
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center w-full max-w-4xl mx-auto gap-6 relative">
            <Button
              variant="default"
              size={'lg'}
              className="flex items-center gap-1 hover:scale-105 whitespace-nowrap text-lg border border-bolt-elements-borderColor"
              onClick={() => navigate('/')}
            >
              <Plus className="w-6 h-6" /> Build a new app
            </Button>
          </div>
          <ProjectFilter
            activeFilters={activeFilters}
            onFilterChange={setActiveFilters}
            isAuthorized={auth?.isAuthorized}
          />
        </div>
      </motion.div>
      <ProjectGrid filters={activeFilters} />
    </GradientPage>
  );
}
