import type { DeploymentPlatform, OwnershipFilter, ProjectFilters, StatusFilter } from 'query/use-project-query';
import { Button, Checkbox, Label } from '../ui';
import { cn } from '~/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Tooltip } from '../chat/Tooltip';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { useSearchParams } from '@remix-run/react';
import useViewport from '~/lib/hooks';

interface ProjectFiltersProps {
  activeFilters: ProjectFilters[];
  onFilterChange: React.Dispatch<React.SetStateAction<ProjectFilters[]>>;
  isAuthorized: boolean;
}

const ownershipFilters: { key: OwnershipFilter; label: string; mobileLabel: string; icon: string }[] = [
  { key: 'all', label: 'All Projects', mobileLabel: 'All', icon: 'i-ph:squares-four' },
  { key: 'owned', label: 'My Projects', mobileLabel: 'My Projects', icon: 'i-ph:user' },
];
const statusFilters: { key: StatusFilter; label: string; icon: string }[] = [
  { key: 'featured', label: 'Our Favourites', icon: 'i-ph:star' },
  { key: 'deployed', label: 'Deployed', icon: 'i-ph:cloud-arrow-up' },
  { key: 'hackathonWinner', label: 'Hackathon Winners', icon: 'i-ph:trophy' },
];
const deploymentFilters: { key: DeploymentPlatform; label: string; color: string }[] = [
  { key: 'Akash', label: 'Akash Network', color: 'bg-red-500/50 text-red-200' },
  { key: 'S3', label: 'AWS', color: 'bg-orange-500/50 text-orange-200' },
  { key: 'ICP', label: 'Internet Computer', color: 'bg-blue-500/50 text-blue-200' },
];

const ProjectFilter = ({ activeFilters, onFilterChange, isAuthorized }: ProjectFiltersProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useViewport(768);

  const toggleFilter = (filter: ProjectFilters) => {
    setSearchParams({ page: '1' });

    onFilterChange((prev: ProjectFilters[]) => {
      if (filter === 'all' || filter === 'owned') {
        // ownership filters are mutually exclusive
        return [filter, ...prev.filter((f) => f !== 'all' && f !== 'owned')];
      }

      if (filter === 'deployed') {
        if (prev.includes('deployed')) {
          // when removing "deployed" also remove any deployment platform
          return prev.filter((f) => f !== 'deployed' && !deploymentFilters.some((d) => d.key === f));
        } else {
          return [...prev, 'deployed'];
        }
      }

      return prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter];
    });
  };

  const setDeploymentFilter = (platform: DeploymentPlatform | 'all-platforms') => {
    setSearchParams({ page: '1' });

    onFilterChange((prev: ProjectFilters[]) => {
      // remove any existing deployment platform keys
      const withoutDeployment = prev.filter((f) => !deploymentFilters.some((d) => d.key === f));

      if (platform === 'all-platforms') {
        return withoutDeployment;
      } else {
        return [...withoutDeployment, platform];
      }
    });
  };

  const clearAllFilters = () => {
    setSearchParams({ page: '1' });

    onFilterChange((prev) => prev.filter((f) => f === 'all' || f === 'owned'));
  };

  const getActiveFiltersCount = () => activeFilters.filter((f) => statusFilters.some((d) => d.key === f)).length;

  return (
    <div className="mb-6">
      <div className="flex gap-1 md:gap-3 justify-between items-center">
        <div className="flex flex-wrap bg-bolt-elements-button-primary-background p-1 rounded-3xl">
          {ownershipFilters.map((filter) => {
            const isActive = activeFilters.includes(filter.key);
            const isOwned = filter.key === 'owned';
            const isDisabled = isOwned && !isAuthorized;

            const button = (
              <Button
                key={filter.key}
                variant={isActive ? 'outline' : 'ghost'}
                onClick={() => {
                  if (!isActive) toggleFilter(filter.key);
                }}
                disabled={isDisabled}
                className={cn(
                  'outline-none !rounded-3xl transition-all border',
                  isActive
                    ? '!bg-purple-900 text-white box-border px-3 md:px-4'
                    : 'hover:text-white hover:bg-transparent bg-transparent border-transparent text-white/80 px-2 md:px-4',
                )}
              >
                <div className={`${filter.icon} w-4 h-4 mr-2`} />
                {isMobile ? filter.mobileLabel : filter.label}
              </Button>
            );

            return isOwned && !isAuthorized ? (
              <Tooltip key={filter.key} content="Sign in to view your projects">
                <div className="inline-block">{button}</div>
              </Tooltip>
            ) : (
              button
            );
          })}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="bg-bolt-elements-button-primary-background p-1 rounded-3xl">
              <button className="inline-flex items-center justify-center text-sm font-medium h-9 px-3 md:px-6 box-content gap-2 rounded-3xl bg-purple-900 border-1 border-bolt-elements-borderColorActive text-white !hover:bg-purple-800/50 transition-all">
                <div className="i-ph:funnel h-4 w-4" />
                Filters
                {getActiveFiltersCount() > 0 && (
                  <div className="flex justify-center items-center border-1 w-5.5 h-5.5 text-xs border-bolt-elements-borderColorActive bg-accent-500/50 rounded-full">
                    {getActiveFiltersCount()}
                  </div>
                )}
                <div className="i-ph:caret-down h-4 w-4" />
              </button>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-purple-900/50 border-white/10 backdrop-blur-sm w-64" align="end">
            <div className="p-2 space-y-3">
              {statusFilters.map((filter) => (
                <div key={filter.key} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={filter.key}
                      checked={activeFilters.includes(filter.key)}
                      onCheckedChange={() => toggleFilter(filter.key)}
                      className="border-white/20 data-[state=checked]:bg-accent-500/50 data-[state=checked]:border-bolt-elements-borderColorActive color-white"
                    />
                    <label
                      htmlFor={filter.key}
                      className="text-sm text-white/80 hover:text-white cursor-pointer flex items-center gap-2"
                    >
                      <span className={filter.icon}></span>
                      {filter.label}
                    </label>
                  </div>

                  {filter.key === 'deployed' && activeFilters.includes('deployed') && (
                    <div className="ml-6 space-y-2 border-l border-white/10 pl-3">
                      <div className="text-xs text-white/60 mb-2">Deployment Platform:</div>

                      <RadioGroup
                        value={activeFilters.find((f) => deploymentFilters.some((d) => d.key === f)) || 'all-platforms'}
                        onValueChange={(value: ProjectFilters | 'all-platforms') =>
                          setDeploymentFilter(value as DeploymentPlatform | 'all-platforms')
                        }
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value="all-platforms"
                            id="all-platforms"
                            className=" border-white/20 data-[state=checked]:bg-accent-500/50 data-[state=checked]:border-bolt-elements-borderColorActive"
                          />
                          <Label
                            htmlFor="all-platforms"
                            className="text-xs text-white/70 hover:text-white cursor-pointer"
                          >
                            All Platforms
                          </Label>
                        </div>

                        {deploymentFilters.map((deployment) => (
                          <div key={deployment.key} className="flex items-center space-x-2">
                            <RadioGroupItem
                              value={deployment.key}
                              id={deployment.key}
                              className="border-white/20 data-[state=checked]:bg-accent-500/50 data-[state=checked]:border-bolt-elements-borderColorActive"
                            />
                            <Label
                              htmlFor={deployment.key}
                              className="text-xs text-white/70 hover:text-white cursor-pointer flex items-center gap-2"
                            >
                              <div className={cn('w-2 h-2 rounded-full', deployment.color.split(' ')[0])} />
                              {deployment.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {getActiveFiltersCount() > 0 && (
              <>
                <DropdownMenuSeparator className="bg-white/10" />
                <div className="p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearAllFilters()}
                    className="w-full border-0.5 border-bolt-elements-borderColorActive text-white/60 hover:text-white hover:bg-white/5"
                  >
                    Clear All Filters
                  </Button>
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default ProjectFilter;
