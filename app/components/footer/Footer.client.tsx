import { IconButton } from "../ui";
import { useState } from "react";
import { classNames } from "~/utils/classNames";
import Popup from "../common/Popup";
import { Tooltip } from "../chat/Tooltip";

interface FooterProps {
  positionClass?: string;
}

export default function Footer({ positionClass }: FooterProps) {
  const [custOpen, setCustOpen] = useState(false);
  const [bountyOpen, setBountyOpen] = useState(false);
  const custHandleToggle = () => {
    setCustOpen(!custOpen);
  }

  const bountyHandleToggle = () => {
    setBountyOpen(!bountyOpen);
  }

  return (
    <footer className={classNames(
      "pb-2.5 px-2.5 bottom-0 left-0 w-full z-50",
      positionClass,
    )}>
      {/* Bug bounty button and Cast-Dev popup  */}
      <div className="relative w-full flex justify-between items-center">
        <div className="flex flex-col gap-2" onClick={bountyHandleToggle}>
            <IconButton className="text-4xl">
              <Tooltip content="Bug bounty form">
                <div className="i-bolt:bugbounty text-gray-400 hover:text-purple-400"></div>
              </Tooltip>
            </IconButton>
          {bountyOpen && 
            <Popup isShow={bountyOpen} handleToggle={bountyHandleToggle}>
              <h3 className="text-2xl font-bold mb-4">Found a bug? Fill the form</h3>
              <a 
                target="_blank" 
                href="https://forms.gle/RQs67LKavBFiP1JL8"
                className="underline font-medium text-xl hover:text-gray-200"
              >
                Bug bounty form
              </a>
            </Popup>
          }

            <IconButton className="text-4xl" onClick={custHandleToggle}>
              <Tooltip content="Schedule a call" side="right">
                <div className="i-bolt:custdev text-gray-400 hover:text-purple-400" />
              </Tooltip>
            </IconButton>
          {custOpen && 
            <Popup isShow={custOpen} handleToggle={custHandleToggle}>
              <h3 className="text-2xl font-bold mb-4">Let’s discuss how you are using AImpact to make it better</h3>
              <a
                href="https://calendly.com/kostiantyn-aimpact/30min"
                target="_blank"
                className="underline font-medium text-xl hover:text-gray-200"
              >
                Schedule call
              </a>
            </Popup>
          }
        </div>

        <div className="flex gap-2 text-4xl margin-0 p-0 flex-col">
          <Tooltip content="Subscribe on X">
            <a href="https://x.com/ostolex" target="_blank">
              <IconButton>
                <div className="i-ph:x-logo text-gray-400 hover:text-purple-400" />
              </IconButton>
            </a>
          </Tooltip>

          <Tooltip content="Join the community" side="left">
            <a href="https://discord.gg/MFTPPm3gwY" target="_blank" className="margin-0 p-0">
              <IconButton>
                <div className="i-ph:discord-logo text-gray-400 hover:text-purple-400 text-4xl" />
              </IconButton>
            </a>
          </Tooltip>
        </div>
      </div>
    </footer>
  )
}