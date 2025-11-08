import { useStore } from '@nanostores/react';
import { useEffect, useState } from 'react';
import { chatStore } from '~/lib/stores/chat';

export default function useNPSLogic() {
  const [shouldShow, setShouldShow] = useState(false);
  const chat = useStore(chatStore);

  useEffect(() => {
    const firstMessageTime = localStorage.getItem('firstMessageTime');
    const userVisits = parseInt(localStorage.getItem('userVisits') || '0');
    const now = Date.now();

    // If user has just sent their first message, store that time
    if (!firstMessageTime && userVisits === 1 && chat.started) {
      localStorage.setItem('firstMessageTime', now.toString());
      setTimeout(
        () => {
          setShouldShow(true);
        },
        10 * 60 * 1000,
      );
    }

    // Check if 10 minutes have passed since first message
    if (firstMessageTime && now - parseInt(firstMessageTime) >= 10 * 60 * 1000) {
      if (userVisits === 1 || userVisits % 10 === 0) {
        setShouldShow(true);
      }
    }
  }, [chat.started]);

  const markShown = () => {
    setShouldShow(false);
  };

  return { shouldShow, markShown };
}
