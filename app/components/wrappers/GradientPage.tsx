import { useEffect, useRef, useState } from 'react';
import Navbar from '../dashboard/navbar';
import SideMenu from '../footer/SideMenu.client';
import Footer from '../footer/Footer';
import { EventBanner } from '../ui/EventBanner';
import BackButton from '../ui/BackButton';

interface GradientPageProps {
  children: React.ReactNode;
  withBackButton?: boolean;
}

export default function GradientPage({ children, withBackButton = false }: GradientPageProps) {
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
      {/* <EventBanner /> */}
      <Navbar />

      <section className="flex-1 py-8 md:py-16 relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {withBackButton && <BackButton url="/">Back to chat</BackButton>}
          {children}
        </div>

        <SideMenu positionClass={isFooterFixed ? 'fixed bottom-0 left-0 w-full' : 'absolute bottom-0 left-0 w-full'} />

        <div ref={endTriggerRef} className="h-[1px] w-full absolute bottom-0" />
      </section>

      <Footer withLabel />
    </main>
  );
}
