'use client';

import type { Project } from 'query/use-project-query';
import { BadgeCustom, type BadgeCustomProps } from '@/components/ui/badge-custom';
import { formatDistanceToNow } from 'date-fns';
import { useLocation, useNavigate } from '@remix-run/react';
import { Tooltip } from '../chat/Tooltip';
import { formatUrl } from '~/utils/urlUtils';
import { Card } from '../ui';

interface ProjectCardProps {
  project: Project;
}

const ProjectCard = ({ project }: ProjectCardProps) => {
  const { name, description, category, image, createdAt, appDeployments } = project;
  const s3Deployment = appDeployments?.find((d) => d.provider === 'AWS');
  const icpDeployment = appDeployments?.find((d) => d.provider === 'ICP');
  const akashDeployment = appDeployments?.find((d) => d.provider === 'Akash');

  const navigate = useNavigate();
  const location = useLocation();

  const deployments = [
    { name: 'AWS', tooltip: 'Deployed on AWS', data: s3Deployment },
    { name: 'ICP', tooltip: 'Deployed on ICP', data: icpDeployment },
    { name: 'Akash', tooltip: 'Deployed on Akash', data: akashDeployment },
  ];

  function handleDeployLabelClick(e: React.MouseEvent, url: string) {
    e.stopPropagation();
    window.open(formatUrl(url), '_blank', 'noopener');
  }

  const getCategoryVariant = (category: string): string => {
    return category.toLowerCase() as any;
  };

  return (
    <Card variant="accented" withHoverEffect>
      <div
        className="flex flex-col justify-between h-full  p-6 relative z-10 cursor-pointer"
        onClick={() =>
          navigate(`/projects/${project.id}`, {
            state: {
              from: location.pathname + location.search,
            },
          })
        }
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {image && (
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                <img src={image} alt={name} className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-foreground">{name}</h3>
              <div className="flex items-center mt-1">
                {category && (
                  <BadgeCustom variant={getCategoryVariant(category) as BadgeCustomProps['variant']}>
                    {category}
                  </BadgeCustom>
                )}
              </div>
            </div>
          </div>
        </div>

        {description && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{description}</p>}

        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <BadgeCustom variant="nft" className="flex gap-1">
              {<div className="i-ph:calendar-blank"></div>}
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </BadgeCustom>
          </div>

          <div className="flex space-x-1">
            {deployments.map(
              (dep) =>
                dep.data?.url && (
                  <Tooltip key={dep.name} content={dep.tooltip}>
                    <BadgeCustom
                      variant="secondary"
                      onClick={(e) => handleDeployLabelClick(e, dep.data!.url!)}
                      className="hover:bg-gray-600 bg-gray-700"
                    >
                      {dep.name}
                    </BadgeCustom>
                  </Tooltip>
                ),
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ProjectCard;
