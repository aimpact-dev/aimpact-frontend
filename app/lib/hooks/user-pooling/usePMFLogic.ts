import { useEffect, useState } from 'react';

export default function usePMFLogic() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const userVisits = parseInt(localStorage.getItem('userVisits') || '0');
    const lastShownVisit = parseInt(localStorage.getItem('lastPMFVisit') || '0');

    // Show on 3rd use and then every 17 visits (3, 20, 37, 54, 71…)
    const shouldTrigger = userVisits === 3 || (userVisits > 3 && (userVisits - 3) % 17 === 0);

    if (shouldTrigger && userVisits !== lastShownVisit) {
      setShouldShow(true);
      localStorage.setItem('lastPMFVisit', userVisits.toString());
    }
  }, []);

  const markShown = () => {
    setShouldShow(false);
  };

  return { shouldShow, markShown };
}
