import { useEffect, useRef, useState } from 'react';
import Navbar from '../dashboard/navbar';
import Footer from '../footer/Footer.client';

interface GradientPageProps {
  children: React.ReactNode;
}

export default function GradientPage({ children }: GradientPageProps) {
  const endTriggerRef = useRef<HTMLDivElement | null>(null);
  const [isFooterFixed, setIsFooterFixed] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFooterFixed(!entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0,
        rootMargin: '0px 0px -100% 0px',
      },
    );

    if (endTriggerRef.current) {
      observer.observe(endTriggerRef.current);
    }

    return () => {
      if (endTriggerRef.current) {
        observer.unobserve(endTriggerRef.current);
      }
    };
  }, []);

  return (
    <main className="flex flex-col min-h-screen bg-gradient-to-br from-[#1B082A] via-purple-900 to-[#1B082A]">
      <Navbar />

      <section id="projects" className="flex-1 py-16 md:py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>

        <Footer positionClass={isFooterFixed ? 'fixed bottom-0 left-0 w-full' : 'absolute bottom-0 left-0 w-full'} />

        <div ref={endTriggerRef} className="h-[1px] w-full absolute bottom-0" />
      </section>

      <footer className="bg-black/50 border-t border-white/10 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-400">© 2025 Aimpact. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
