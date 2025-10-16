import { IconButton } from '../ui';
import { useState } from 'react';
import { classNames } from '~/utils/classNames';
import Popup from '../common/Popup';
import { Tooltip } from '../chat/Tooltip';
import { useNavigate } from '@remix-run/react';
interface FooterProps {
  positionClass?: string;
}

type PopupType = 'bugBounty' | 'custDev' | 'policies' | null;

interface PopupConfig {
  icon: string;
  tooltip: string;
  title: string;
  link: string;
  linkText: string;
  type: 'external' | 'internal';
}

const POPUP_CONFIGS: Record<Exclude<PopupType, null>, PopupConfig> = {
  policies: {
    icon: 'i-ph:file-text',
    tooltip: 'Terms & Policies',
    title: 'Legal Information',
    link: '/policies',
    linkText: 'View policies',
    type: 'internal',
  },
  bugBounty: {
    icon: 'i-bolt:bugbounty',
    tooltip: 'Bug bounty form',
    title: 'Found a bug? Fill the form',
    link: 'https://forms.gle/RQs67LKavBFiP1JL8',
    linkText: 'Bug bounty form',
    type: 'external',
  },
  custDev: {
    icon: 'i-bolt:custdev',
    tooltip: 'Schedule a call',
    title: "Let's discuss how you are using AImpact to make it better",
    link: 'https://calendly.com/kostiantyn-aimpact/30min',
    linkText: 'Schedule call',
    type: 'external',
  },
};

const POLICIES_LINKS = [
  { label: 'Terms of Service', path: '/terms-of-service' },
  { label: 'Privacy Policy', path: '/privacy-policy' },
  { label: 'Refund Policy', path: '/refund-policy' },
];

export default function Footer({ positionClass }: FooterProps) {
  const [activePopup, setActivePopup] = useState<PopupType>(null);
  const navigate = useNavigate();

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
            <h3 className="text-2xl font-bold mb-4">{config.title}</h3>
            {config.type === 'internal' ? (
              <div className="flex flex-col gap-2">
                <ul className="flex flex-col gap-4 text-left">
                  {POLICIES_LINKS.map((link) => (
                    <div className="py-3 px-5 rounded-lg cursor-pointer border border-bolt-elements-borderColor hover:border-bolt-elements-borderColorActive transition-al group">
                      <li key={link.path} className="flex items-center gap-3 " onClick={() => navigate(link.path)}>
                        <span className="text-2xl text-violet-400 group-hover:text-violet-300 transition-colors">
                          •
                        </span>
                        <span className="font-medium text-white group-hover:text-violet-300 transition-colors">
                          {link.label}
                        </span>
                      </li>
                    </div>
                  ))}
                </ul>
              </div>
            ) : (
              <a
                href={config.link}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium text-xl hover:text-gray-200"
              >
                {config.linkText}
              </a>
            )}
          </Popup>
        )}
      </>
    );
  };

  return (
    <footer className={classNames('pb-2.5 px-2.5 bottom-0 left-0 w-full z-50 pointer-events-none', positionClass)}>
      <div className="relative w-full flex justify-between items-end">
        {/* Left side - Action buttons */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          {renderPopupButton('policies')}
          {renderPopupButton('bugBounty')}
          {renderPopupButton('custDev')}
        </div>

        <div className="flex gap-2 text-4xl flex-col pointer-events-auto">
          <Tooltip content="Subscribe on X">
            <a href="https://x.com/aimpact_dev" target="_blank" rel="noopener noreferrer">
              <IconButton>
                <div className="i-ph:x-logo text-gray-400 hover:text-purple-400" />
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
      </div>
    </footer>
  );
}
