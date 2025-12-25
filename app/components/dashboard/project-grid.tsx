'use client';

import ProjectCard from '@/components/dashboard/project-card';
import DataPagination from '@/components/common/DataPagination';
import { motion } from 'framer-motion';
import type { Project, ProjectFilters } from 'query/use-project-query';
import { PROJECTS_PER_PAGE } from '~/routes/projects._index';

interface ProjectGridProps {
  projects?: Project[];
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
  };
  filters: ProjectFilters;
  isLoading?: boolean;
  error?: Error;
  onPageChange: (page: number) => void;
}

export const ProjectGrid = ({ projects, pagination, filters, isLoading, error, onPageChange }: ProjectGridProps) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-black/30 rounded-xl shadow-lg animate-pulse h-64">
              <div className="p-6 h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-purple/10"></div>
                    <div>
                      <div className="h-6 w-24 bg-purple/10 rounded"></div>
                      <div className="h-4 w-16 bg-purple/10 rounded mt-2"></div>
                    </div>
                  </div>
                  <div className="h-8 w-16 bg-purple/10 rounded"></div>
                </div>
                <div className="h-4 w-full bg-purple/10 rounded mb-4"></div>
                <div className="h-4 w-3/4 bg-purple/10 rounded mb-4"></div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="h-14 bg-purple/10 rounded-lg"></div>
                  <div className="h-14 bg-purple/10 rounded-lg"></div>
                </div>
                <div className="flex justify-between">
                  <div className="h-6 w-20 bg-purple/10 rounded"></div>
                  <div className="h-6 w-20 bg-purple/10 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-destructive/10 border border-destructive rounded-lg p-6 text-center"
      >
        <h3 className="text-lg font-medium text-destructive mb-2">Error Loading Projects</h3>
        <p className="text-muted-foreground">{error.message}</p>
        <button
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </motion.div>
    );
  }

  if (!projects || !pagination) {
    return;
  }

  if (projects.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-black/30 rounded-lg p-10 text-center">
        <h3 className="text-lg font-medium mb-2">No Projects Found</h3>
        <p className="text-muted-foreground">
          {filters.owned
            ? "You haven't created any projects yet. Press 'Build a new app' to get started or change the filter to view all projects."
            : 'There are currently no blockchain projects to display.'}
        </p>
      </motion.div>
    );
  }

  const allItems = pagination.total;
  const startItem = (pagination.page - 1) * pagination.pageSize + 1;
  const endItem = Math.min(pagination.page * pagination.pageSize, allItems);
  const paginationLabel = `Showing projects ${startItem}-${endItem} out of ${allItems}`;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      {pagination.total > 1 && (
        <DataPagination
          totalPages={Math.ceil(pagination.total / PROJECTS_PER_PAGE)}
          currentPage={pagination.page}
          label={paginationLabel}
          onChange={onPageChange}
        />
      )}
    </div>
  );
};
