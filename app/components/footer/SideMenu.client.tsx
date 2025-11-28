import { Button, IconButton } from '../ui';
import { useState } from 'react';
import { classNames } from '~/utils/classNames';
import Popup from '../common/Popup';
import { Tooltip } from '../chat/Tooltip';
import useViewport from '~/lib/hooks';
import WhatsNewPopup from '../common/WhatsNewPopup';
import { useWhatsNew } from '../../lib/hooks/useWhatsNew';

interface FooterProps {
  positionClass?: string;
}

type PopupType = 'bugBounty' | 'custDev' | null;

interface PopupConfig {
  icon: string;
  tooltip: string;
  title: string;
  subtitle?: string;
  link: string;
  linkText: string;
}

const POPUP_CONFIGS: Record<Exclude<PopupType, null>, PopupConfig> = {
  bugBounty: {
    icon: 'i-bolt:bugbounty',
    tooltip: 'Bug bounty form',
    title: 'Found a bug? Fill the form for a reward!',
    subtitle: 'Help us improve by reporting issues. Submit detailed bug reports and earn rewards for valid findings.',
    link: 'https://forms.gle/RQs67LKavBFiP1JL8',
    linkText: 'Bug bounty form',
  },
  custDev: {
    icon: 'i-bolt:custdev',
    tooltip: 'Schedule a call',
    title: 'Got ideas or questions? We’d love to hear from you!',
    subtitle:
      'Join a short chat with our team to share your thoughts, ideas, or feedback. Help us make AImpact work even better for you.',
    link: 'https://calendly.com/kostiantyn-aimpact/30min',
    linkText: 'Schedule call',
  },
};

export default function SideMenu({ positionClass }: FooterProps) {
  const [activePopup, setActivePopup] = useState<PopupType>(null);
  const isMobile = useViewport(768);

  const { setShowWhatsNew } = useWhatsNew();

  const handleToggle = (type: PopupType) => {
    setActivePopup(activePopup === type ? null : type);
  };

  const renderPopupButton = (type: Exclude<PopupType, null>) => {
    const config = POPUP_CONFIGS[type];
    const isActive = activePopup === type;

    return (
      <>
        <IconButton className="text-4xl" onClick={() => handleToggle(type)}>
          <Tooltip content={config.tooltip} side="right">
            <div className={`${config.icon} text-gray-400 hover:text-purple-400`} />
          </Tooltip>
        </IconButton>
        {isActive && (
          <Popup isShow={isActive} handleToggle={() => handleToggle(null)}>
            <div className="flex flex-col gap-5 text-left">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold">{config.title}</h2>
                {config.subtitle && <h3 className="text-sm text-bolt-elements-textSecondary">{config.subtitle}</h3>}
              </div>

              <a href={config.link} target="_blank" rel="noopener noreferrer">
                <Button className="w-full">
                  {config.linkText} <div className="inline-block i-ph:arrow-square-out text-accent-500"></div>
                </Button>
              </a>
            </div>
          </Popup>
        )}
      </>
    );
  };

  return (
    !isMobile && (
      <div className={classNames('pb-2.5 px-2.5 bottom-0 left-0 w-full z-50 pointer-events-none', positionClass)}>
        <div className="relative w-full flex justify-between items-end">
          <div className="flex gap-2 flex-col pointer-events-auto">
            <Tooltip content="What's new">
              <IconButton onClick={() => setShowWhatsNew(true)}>
                <div className="i-ph:megaphone-light text-gray-400 hover:text-purple-400 text-4xl" />
              </IconButton>
            </Tooltip>

            <WhatsNewPopup />

            <Tooltip content="Subscribe on X" side="left">
              <a href="https://x.com/aimpact_dev" target="_blank" rel="noopener noreferrer">
                <IconButton>
                  <div className="i-ph:x-logo text-gray-400 hover:text-purple-400 text-4xl" />
                </IconButton>
              </a>
            </Tooltip>

            <Tooltip content="Join the community" side="left">
              <a href="https://discord.gg/MFTPPm3gwY" target="_blank" rel="noopener noreferrer">
                <IconButton>
                  <div className="i-ph:discord-logo text-gray-400 hover:text-purple-400 text-4xl" />
                </IconButton>
              </a>
            </Tooltip>
          </div>

          <div className="flex flex-col gap-2 pointer-events-auto">
            {renderPopupButton('bugBounty')}
            {renderPopupButton('custDev')}
          </div>
        </div>
      </div>
    )
  );
}

function BugBountyPopup() {}
