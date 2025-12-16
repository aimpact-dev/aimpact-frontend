import { useNavigate } from '@remix-run/react';
import { POLICIES } from '../wrappers/PolicyPage';
import { classNames } from '~/utils/classNames';

interface FooterProps {
  withLabel?: boolean;
}

export default function Footer({ withLabel }: FooterProps) {
  const navigate = useNavigate();
  return (
    <footer className={classNames('bg-black/50 border-t border-white/10', withLabel ? 'p-6' : 'p-3')}>
      <div className="flex flex-col gap-3 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs">
        <div className="flex justify-center gap-5 text-white/80">
          {POLICIES.map((p) => (
            <button key={p.name} onClick={() => navigate(p.url)} className="hover:text-white transition-all">
              {p.name}{' '}
            </button>
          ))}
        </div>
        {withLabel && <p className="text-bolt-elements-textSecondary">© 2025 Aimpact. All rights reserved.</p>}
      </div>
    </footer>
  );
}
