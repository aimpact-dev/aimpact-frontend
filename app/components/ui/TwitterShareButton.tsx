import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';
import { Button, type ButtonProps } from './Button';
import { classNames as cn } from '~/utils/classNames';
import { Tooltip } from '../chat/Tooltip';

type DeployUrl = {
  name: string;
  url: string;
};

type TwitterShareButtonProps = {
  customVariant?: ButtonProps['variant'];
  deployUrls: DeployUrl[];
  withLabel?: boolean;
  classNames?: string;
};

export function TwitterShareButton({
  customVariant,
  deployUrls,
  withLabel = false,
  classNames,
  ...props
}: TwitterShareButtonProps) {
  const tweets = [
    'Built this with @AImpact_dev — one-prompt Web3 app generator. AI did the coding, I did the vibing.\nTake a look 👇\n',
    'Just shipped my new Web3 app with @AImpact_dev ⚡️\nNo team. No code. Just vibes.\nSee it live 👇\n',
    'My latest project is live — fully generated & deployed by @AImpact_dev.\nAI x Web3 = 🔥\nCheck it out 👇\n',
    'Built a whole dApp with @AImpact_dev in minutes.\nVibe-coded, smart-contracted, deployed. 💻\nHave a look 👇\n',
    'Web3 development, but make it AI-powered.\nJust launched my project via @AImpact_dev — check this out 👇\n',
    'Proud to launch my project built with @AImpact_dev — an AI platform that generates and deploys Web3 apps instantly.\nExplore it 👇\n',
    'Another step toward AI-driven Web3. My project is live, powered by @AImpact_dev.\nDive in 👇\n',
    'Excited to share my latest build — generated with @AImpact_dev.\nAI-assisted coding is the future 🔮\nDiscover it 👇\n',
    "Me: “I need a dev.”\n@AImpact_dev: “No you don't.”\nAnd just shipped my app 😂\nCheck this out 👇\n",
    'Built this dApp with @AImpact_dev — no devs were harmed in the making. 🧘‍♂️\nSee it here 👇\n',
  ];

  function getRandomTweet() {
    return tweets[Math.floor(Math.random() * tweets.length)];
  }

  function shareOnTwitter(url: string) {
    const tweet = encodeURIComponent(getRandomTweet());
    const fullUrl = `https://twitter.com/intent/tweet?text=${tweet}&url=${encodeURIComponent(url)}`;
    window.open(fullUrl, '_blank');
  }

  // Case: No deploys
  if (deployUrls.length === 0) {
    return (
      <Tooltip content="Deploy your app to share it on X!" side="bottom">
        <Button
          variant={customVariant ? customVariant : 'ghost'}
          className={cn(
            'flex items-center gap-2 px-3 py-2 bg-black text-bolt-elements-textSecondary border border-black rounded-md cursor-not-allowed hover:bg-black hover:text-bolt-elements-textSecondary z-10',
            classNames,
          )}
          {...props}
        >
          <div className="i-ph:x-logo" />
          {withLabel && 'Share'}
        </Button>
      </Tooltip>
    );
  }

  if (deployUrls.length > 1) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={customVariant ? customVariant : 'ghost'}
            className={cn(
              'flex items-center gap-1 px-3 py-2 outline-none bg-black text-white border border-black rounded-md hover:bg-gray-800 transition z-10',
              classNames,
            )}
            {...props}
          >
            {withLabel && 'Share on'}
            <div className="i-ph:x-logo" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" sideOffset={8} className="bg-black/50 border-white/10 backdrop-blur-sm">
          {deployUrls.map(({ name, url }) => (
            <DropdownMenuItem
              key={name}
              onClick={() => shareOnTwitter(url)}
              className="rounded-lg cursor-pointer text-white/80 hover:text-white !hover:bg-purple-900/50"
            >
              Share {name} deploy
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      variant={customVariant ? customVariant : 'ghost'}
      className={cn(
        'flex items-center gap-1 px-3 py-2 outline-none bg-black text-white border border-black rounded-md hover:bg-gray-800 transition z-10',
        classNames,
      )}
      onClick={() => shareOnTwitter(deployUrls[0].url)}
      {...props}
    >
      {withLabel && 'Share on'}
      <div className="i-ph:x-logo" />
    </Button>
  );
}
