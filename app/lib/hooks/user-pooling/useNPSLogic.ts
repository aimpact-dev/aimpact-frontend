import { useEffect, useState } from 'react';
import { chatStore } from '~/lib/stores/chat';
import { useStore } from '@nanostores/react';

export default function useNPSLogic() {
  const [shouldShow, setShouldShow] = useState(false);
  const chat = useStore(chatStore);

  useEffect(() => {
    const firstMessageTime = localStorage.getItem('firstMessageTime');
    const userVisits = parseInt(localStorage.getItem('userVisits') || '0');
    const now = Date.now();
    const lastShownVisit = parseInt(localStorage.getItem('lastNPSVisit') || '0');

    // When the user first sends a message, remember that moment
    if (!firstMessageTime && userVisits === 1 && chat.started) {
      localStorage.setItem('firstMessageTime', now.toString());
      setTimeout(
        () => {
          setShouldShow(true);
          localStorage.setItem('lastNPSVisit', userVisits.toString());
        },
        10 * 60 * 1000,
      ); // 10 minutes
      return;
    }

    // If 10 minutes have passed since first message
    if (firstMessageTime && now - parseInt(firstMessageTime) >= 10 * 60 * 1000) {
      // Only show on 1st, 10th, 20th... visit, and not if already shown for this visit
      if ((userVisits === 1 || userVisits % 10 === 0) && userVisits !== lastShownVisit) {
        setShouldShow(true);
        localStorage.setItem('lastNPSVisit', userVisits.toString());
      }
    }
  }, [chat.started]);

  const markShown = () => {
    setShouldShow(false);
  };

  return { shouldShow, markShown };
}
