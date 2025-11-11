import Popup from './Popup';
import { Badge, Card } from '../ui';
import { useWhatsNew } from '../../lib/hooks/useWhatsNew';
import { useEffect } from 'react';

export default function WhatsNewPopup() {
  const { showWhatsNew, setShowWhatsNew } = useWhatsNew();

  const newsArticles = [
    {
      heading: 'Vibecoding meets x402 !',
      text: 'We’ve integrated x402 standard directly into AImpact — now you can vibecode apps with built-in payments and seamless interoperability. This update unlocks a new layer of flexibility for Solana-based Web3 products, where every transaction and access request becomes part of a unified, intuitive ecosystem.',
      date: new Date(2025, 10, 11), // use monthIndex (10 is November)
    },
  ];

  useEffect(() => {
    const lastSeen = localStorage.getItem('whatsNewLastSeen') || '0';
    const newestDate = Math.max(...newsArticles.map((a) => a.date.getTime()));

    if (newestDate > Number(lastSeen)) {
      setShowWhatsNew(true);
      localStorage.setItem('whatsNewLastSeen', newestDate.toString());
    }
  }, [newsArticles, setShowWhatsNew]);

  return (
    <Popup isShow={showWhatsNew} handleToggle={() => setShowWhatsNew(false)}>
      <div className="flex flex-col items-center gap-1 mb-5">
        <div className="flex items-center gap-2">
          <div className="inline-block i-ph:sparkle-bold text-lg text-accent-500"></div>
          <h1 className="text-2xl font-bold ">What's new</h1>
        </div>
        <h2 className=" text-bolt-elements-textSecondary">Check our latest updates</h2>
      </div>

      <div>
        {newsArticles.map((article) => {
          return (
            <Card variant="accented" withHoverEffect key={article.date.getTime()}>
              <div className="flex flex-col gap-2 border-b border-border-light p-4">
                <div className="flex justify-between items-center">
                  <Badge variant="primary">Integration</Badge>
                  <span className="text-sm text-bolt-elements-textSecondary">
                    {article.date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center  gap-2">
                  <div className="inline-block i-ph:plug-bold text-accent-500"></div>
                  <h2 className="text-xl font-bold">{article.heading}</h2>
                </div>
              </div>

              <p className="text-left p-4">{article.text}</p>
            </Card>
          );
        })}
      </div>
    </Popup>
  );
}
