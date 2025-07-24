import { Button } from "../ui";
import { Tooltip } from './Tooltip';

export default function RewardsNavButton() {
  return (
    <Tooltip content="Get rewards by referals">
      <Button
        _asChild={true}
        className='text-gray-200 bg-transparent py-2 px-4 text-bolt-elements-textPrimary bg-bolt-elements-background \
          rounded-md border-none border-bolt-elements-borderColor opacity-85 font-medium transition-colors relative overflow-hidden'
      >
        <a href="/rewards">
          Rewards
        </a>
      </Button>
    </Tooltip>
  );
}
