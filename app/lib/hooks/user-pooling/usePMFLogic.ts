import { useEffect, useState } from 'react';

export default function usePMFLogic() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const userVisits = parseInt(localStorage.getItem('userVisits') || '0');

    if (userVisits === 3 || userVisits % 17 === 0) {
      setShouldShow(true);
    }
  }, []);

  const markShown = () => {
    setShouldShow(false);
  };

  return { shouldShow, markShown };
}
