import { useState, type PropsWithChildren } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '../ui';
import Popup from '../common/Popup';

function Markdown({ children }: PropsWithChildren) {
  return (
    <ReactMarkdown
      className="text-left text-gray-200 leading-relaxed space-y-4
        [&>p]:mb-4 [&>p]:last:mb-0 [&>strong]:text-white [&>strong]:font-semibold"
    >
      {children as string}
    </ReactMarkdown>
  );
}

interface Props {
  isMobile?: boolean;
  onClick?: () => void;
}

export default function HowItWorksButton({ isMobile = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const text = `
**AImpact** — is AI powered agent, where you can create Web3 projects only by prompts.

Right now, you can generate front-end applications that interact with our prebuilt smart contracts for storage on Solana. 
This means you can easily create apps that read, write, and manage data on-chain using a simple interface powered by AI, no coding skills needed.

Soon, **AImpact** will go even further: you'll be able to generate custom smart contracts and build full-stack Web3 apps entirely with AI.

So, just describe your idea to AI. Try to give precise queries. Keep modifying it. Keep build.
`;

  return (
    <>
      {isMobile ? (
        <button onClick={handleToggle} className="text-gray-200/70 text-left py-2 px-4 font-medium">
          How it works?
        </button>
      ) : (
        <Button
          className="text-gray-200 bg-transparent py-2 px-4 text-bolt-elements-textPrimary bg-bolt-elements-background 
          rounded-md border-none border-bolt-elements-borderColor opacity-85"
          onClick={handleToggle}
        >
          How it works?
        </Button>
      )}

      <Popup isShow={isOpen} handleToggle={handleToggle}>
        <h3 className="text-2xl font-bold mb-4">How it works?</h3>
        <Markdown>{text}</Markdown>
      </Popup>
    </>
  );
}
