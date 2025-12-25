'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from '@remix-run/react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '~/lib/hooks/useAuth';
import { useProjectsQuery, type ProjectFilters } from 'query/use-project-query';
import { ProjectFilter } from '~/components/dashboard/ProjectFilter';
import { ProjectGrid } from '~/components/dashboard/project-grid';
import GradientPage from '~/components/wrappers/GradientPage';

export const PROJECTS_PER_PAGE = 9;
import { z } from 'zod';

const ProjectFiltersSchema = z
  .strictObject({
    owned: z.literal(true).optional(),
    featured: z.literal(true).optional(),
    hackathonWinner: z.literal(true).optional(),
    deployedFilter: z.enum(['all', 'Akash', 'S3', 'ICP']).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0);

function parsePage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export default function Home() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const auth = useAuth();

  const requestedPage = parsePage(searchParams.get('page'));
  const [currentPage, setCurrentPage] = useState(requestedPage);

  const [activeFilters, setActiveFilters] = useState<ProjectFilters>({});

  const projectsQuery = useProjectsQuery(
    currentPage,
    PROJECTS_PER_PAGE,
    activeFilters,
    'createdAt',
    'DESC',
    auth.jwtToken,
  );

  const projects = projectsQuery.data?.data;
  const pagination = projectsQuery.data?.pagination;

  const totalProjects = pagination?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalProjects / PROJECTS_PER_PAGE));

  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (!filterParam) return;

    try {
      const parsed = JSON.parse(decodeURIComponent(filterParam));
      const validated = ProjectFiltersSchema.safeParse(parsed);
      if (!validated.success) throw new Error();

      setActiveFilters(validated.data);
    } catch {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.delete('filter');
        return params;
      });
    }
  }, []);

  useEffect(() => {
    if (!projectsQuery.data) return;

    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set('page', String(totalPages));
        return params;
      });
    }
  }, [projectsQuery.data, currentPage, totalPages, setSearchParams]);

  const handleFilterChange = (next: ProjectFilters | ((prev: ProjectFilters) => ProjectFilters)) => {
    setActiveFilters((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;

      const params = new URLSearchParams();
      params.set('page', '1');

      if (Object.keys(resolved).length > 0) {
        params.set('filter', encodeURIComponent(JSON.stringify(resolved)));
      } else {
        params.delete('filter');
      }

      setCurrentPage(1);
      setSearchParams(params);

      return resolved;
    });
  };

  const handlePageChange = (page: number) => {
    const safePage = page > 0 ? page : 1;

    setCurrentPage(safePage);
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('page', String(safePage));
      return params;
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <GradientPage withBackButton>
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
              size="lg"
              className="flex items-center gap-1 hover:scale-105 whitespace-nowrap text-lg border border-bolt-elements-borderColor"
              onClick={() => navigate('/')}
            >
              <Plus className="w-6 h-6" /> Build a new app
            </Button>
          </div>
          <ProjectFilter
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            isAuthorized={auth?.isAuthorized}
          />
        </div>
      </motion.div>
      <ProjectGrid
        projects={projects}
        pagination={pagination}
        isLoading={projectsQuery.isLoading || projectsQuery.isPending}
        error={projectsQuery.error ?? undefined}
        filters={activeFilters}
        onPageChange={handlePageChange}
      />
    </GradientPage>
  );
}
