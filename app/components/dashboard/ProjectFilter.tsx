import type { ProjectFilters } from 'query/use-project-query';
import { Button, Checkbox, Label } from '../ui';
import { cn } from '~/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Tooltip } from '../chat/Tooltip';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { useViewport } from '~/lib/hooks';

interface ProjectFiltersProps {
  activeFilters: ProjectFilters;
  onFilterChange: React.Dispatch<React.SetStateAction<ProjectFilters>>;
  isAuthorized: boolean;
}

function normalizeFilters(filters: ProjectFilters): ProjectFilters {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined)) as ProjectFilters;
}

export const ProjectFilter = ({ activeFilters, onFilterChange, isAuthorized }: ProjectFiltersProps) => {
  const { isMobile } = useViewport();

  const activeFiltersCount = Object.values(activeFilters).filter((val) => val !== undefined).length;

  function normalizeFilters(filters: ProjectFilters): ProjectFilters {
    return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined)) as ProjectFilters;
  }

  return (
    <div className="mb-6">
      <div className="flex gap-1 md:gap-3 justify-between items-center">
        <div className="flex flex-wrap bg-bolt-elements-button-primary-background p-1 rounded-3xl">
          {/* All Projects Button */}
          <Button
            variant={!activeFilters.owned ? 'outline' : 'ghost'}
            disabled={activeFilters.owned}
            onClick={() => onFilterChange((prev) => ({ ...prev, owned: undefined }))}
            className={cn(
              'outline-none !rounded-3xl transition-all border',
              !activeFilters.owned
                ? '!bg-purple-900 text-white box-border px-3 md:px-4'
                : 'hover:text-white hover:bg-transparent bg-transparent border-transparent text-white/80 px-2 md:px-4',
            )}
          >
            <div className="i-ph:squares-four w-4 h-4 mr-2" />
            {isMobile ? 'All' : 'All Projects'}
          </Button>

          {/* My Projects Button */}
          <Tooltip content={!isAuthorized ? 'Sign in to view your projects' : ''} disabled={isAuthorized}>
            <div className="inline-block">
              <Button
                variant={activeFilters.owned ? 'outline' : 'ghost'}
                disabled={!isAuthorized || !activeFilters.owned}
                onClick={() => onFilterChange((prev) => normalizeFilters({ ...prev, owned: true }))}
                className={cn(
                  'outline-none !rounded-3xl transition-all border',
                  activeFilters.owned
                    ? '!bg-purple-900 text-white box-border px-3 md:px-4'
                    : 'hover:text-white hover:bg-transparent bg-transparent border-transparent text-white/80 px-2 md:px-4',
                )}
              >
                <div className="i-ph:user w-4 h-4 mr-2" />
                My Projects
              </Button>
            </div>
          </Tooltip>
        </div>

        {/* Filters Dropdown */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <div className="bg-bolt-elements-button-primary-background p-1 rounded-3xl">
              <button className="inline-flex items-center justify-center text-sm font-medium h-9 px-3 md:px-6 box-content gap-2 rounded-3xl bg-purple-900 border-1 border-bolt-elements-borderColorActive text-white !hover:bg-purple-800/50 transition-all">
                <div className="i-ph:funnel h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <div className="flex justify-center items-center border-1 w-5.5 h-5.5 text-xs border-bolt-elements-borderColorActive bg-accent-500/50 rounded-full">
                    {activeFiltersCount}
                  </div>
                )}
                <div className="i-ph:caret-down h-4 w-4" />
              </button>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className=" bg-purple-900 border-white/10 backdrop-blur-lg w-64" align="end">
            <div className="p-2 space-y-3">
              {/* Featured Filter */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="featured"
                  checked={!!activeFilters.featured}
                  onCheckedChange={(checked) =>
                    onFilterChange((prev) =>
                      normalizeFilters({ ...prev, featured: checked === true ? true : undefined }),
                    )
                  }
                  className="border-white/20 data-[state=checked]:bg-accent-500/50 data-[state=checked]:border-bolt-elements-borderColorActive color-white"
                />
                <label
                  htmlFor="featured"
                  className="text-sm text-white/80 hover:text-white cursor-pointer flex items-center gap-2"
                >
                  <span className="i-ph:star"></span>
                  Our Favourites
                </label>
              </div>

              {/* Deployed Filter */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="deployed"
                    checked={!!activeFilters.deployedFilter}
                    onCheckedChange={(checked) =>
                      onFilterChange((prev) =>
                        normalizeFilters({ ...prev, deployedFilter: checked === true ? 'all' : undefined }),
                      )
                    }
                    className="border-white/20 data-[state=checked]:bg-accent-500/50 data-[state=checked]:border-bolt-elements-borderColorActive color-white"
                  />
                  <label
                    htmlFor="deployed"
                    className="text-sm text-white/80 hover:text-white cursor-pointer flex items-center gap-2"
                  >
                    <span className="i-ph:cloud-arrow-up"></span>
                    Deployed
                  </label>
                </div>

                {activeFilters.deployedFilter && (
                  <div className="ml-6 space-y-2 border-l border-white/10 pl-3">
                    <div className="text-xs text-white/60 mb-2">Deployment Platform:</div>
                    <RadioGroup
                      value={activeFilters.deployedFilter}
                      onValueChange={(value) =>
                        onFilterChange((prev) =>
                          normalizeFilters({ ...prev, deployedFilter: value as 'all' | 'Akash' | 'S3' | 'ICP' }),
                        )
                      }
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="all"
                          id="all-platforms"
                          className="border-white/20 data-[state=checked]:bg-accent-500/50 data-[state=checked]:border-bolt-elements-borderColorActive"
                        />
                        <Label
                          htmlFor="all-platforms"
                          className="text-xs text-white/70 hover:text-white cursor-pointer"
                        >
                          All Platforms
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="Akash"
                          id="akash"
                          className="border-white/20 data-[state=checked]:bg-accent-500/50 data-[state=checked]:border-bolt-elements-borderColorActive"
                        />
                        <Label
                          htmlFor="akash"
                          className="text-xs text-white/70 hover:text-white cursor-pointer flex items-center gap-2"
                        >
                          <div className="w-2 h-2 rounded-full bg-red-500/50" />
                          Akash Network
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="S3"
                          id="s3"
                          className="border-white/20 data-[state=checked]:bg-accent-500/50 data-[state=checked]:border-bolt-elements-borderColorActive"
                        />
                        <Label
                          htmlFor="s3"
                          className="text-xs text-white/70 hover:text-white cursor-pointer flex items-center gap-2"
                        >
                          <div className="w-2 h-2 rounded-full bg-orange-500/50" />
                          AWS
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="ICP"
                          id="icp"
                          className="border-white/20 data-[state=checked]:bg-accent-500/50 data-[state=checked]:border-bolt-elements-borderColorActive"
                        />
                        <Label
                          htmlFor="icp"
                          className="text-xs text-white/70 hover:text-white cursor-pointer flex items-center gap-2"
                        >
                          <div className="w-2 h-2 rounded-full bg-blue-500/50" />
                          Internet Computer
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </div>

              {/* Hackathon Winners Filter */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hackathonWinner"
                  checked={!!activeFilters.hackathonWinner}
                  onCheckedChange={(checked) =>
                    onFilterChange((prev) =>
                      normalizeFilters({ ...prev, hackathonWinner: checked === true ? true : undefined }),
                    )
                  }
                  className="border-white/20 data-[state=checked]:bg-accent-500/50 data-[state=checked]:border-bolt-elements-borderColorActive color-white"
                />
                <label
                  htmlFor="hackathonWinner"
                  className="text-sm text-white/80 hover:text-white cursor-pointer flex items-center gap-2"
                >
                  <span className="i-ph:trophy"></span>
                  Hackathon Winners
                </label>
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <>
                <DropdownMenuSeparator className="bg-white/10" />
                <div className="p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFilterChange((prev) => normalizeFilters({ owned: prev.owned }))}
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
