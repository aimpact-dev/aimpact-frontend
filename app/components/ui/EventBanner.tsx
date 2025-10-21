import { useEffect, useState } from 'react';
import { FlowingParticlesBackground } from './FlowingParticlesBackground';
import { classNames } from '~/utils/classNames';

interface Props {
  className?: string;
}

export function EventBanner({ className }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('bannerState') || '{}');
    if (!saved.timestamp || Date.now() - saved.timestamp > 14400000) {
      //4 hours
      setVisible(true);
    } else {
      setVisible(saved.visible);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('bannerState', JSON.stringify({ visible, timestamp: Date.now() }));
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={classNames(
        'relative h-8 w-full bg-gradient-to-r from-accent-700 to-purple-700 text-white text-center py-2 px-2 flex items-center justify-center z-5000',
        className,
      )}
    >
      <FlowingParticlesBackground />
      <div className="bg-bolt-elements-background-depth-4 w-full py-1 rounded-md">
        <p className="text-sm">
          🎉 Join the{' '}
          <a
            href="https://earn.superteam.fun/listing/aimpact-sidetrack-build-tokenize-and-launch-on-solana-with-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-200 transition-colors"
          >
            AImpact Hackathon
          </a>{' '}
          — Oct 13–30!
        </p>
        <button
          onClick={() => setVisible(false)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1  rounded-full hover:bg-white/10 transition-colors z-10000"
          aria-label="Close banner"
        >
          <div className="i-ph:x"></div>
        </button>
      </div>
    </div>
  );
}
