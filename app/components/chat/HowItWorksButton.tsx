import { useState, type PropsWithChildren } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '../ui';

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
}

export default function HowItWorksButton({ isMobile = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const handleToggle = () => {
    setIsOpen(!isOpen);
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
        <button onClick={handleToggle} className="text-gray-200 text-left py-2 px-4 font-medium">
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

      {isOpen && (
        <div className="fixed min-h-screen inset-0 top-20 z-10 overflow-auto">
          <div className="flex relative items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 min-h-screen transition-opacity bg-gray-900 bg-opacity-75"
              onClick={handleToggle}
            ></div>
            <div
              className="inline-block xoverflow-hidden text-left align-bottom transition-all transform border-2 border-bolt-elements-borderColor rounded-lg
              shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full "
            >
              <button
                onClick={handleToggle}
                className="flex absolute right-0 items-center justify-center w-8 h-8 rounded-full bg-transparent hover:bg-gray-500/10 dark:hover:bg-gray-500/20 group transition-all duration-200"
              >
                <div className="i-ph:x w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-500 transition-colors" />
              </button>

              <div className="px-4 py-5 sm:p-6 bg-bolt-elements-background bg-bolt-elements-background-depth-3 text-center">
                <h3 className="text-2xl font-bold mb-4">How it works?</h3>
                <Markdown>{text}</Markdown>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
