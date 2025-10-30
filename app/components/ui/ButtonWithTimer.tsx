import { useEffect, useState, type PropsWithChildren } from 'react';
import { Button, type ButtonProps } from './Button';

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

type ButtonWithTimerProps = PropsWithChildren<{ timeToWait: number; startTimer: boolean }> & ButtonProps;

export default function ButtonWithTimer(props: ButtonWithTimerProps) {
  const { startTimer, children, timeToWait, disabled, className, ...buttonProps } = props;
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (!startTimer) return;

    setTimer(timeToWait);

    const timerInterval = window.setInterval(async () => {
      setTimer((val) => {
        if (val <= 1) {
          window.clearInterval(timerInterval);
          return 0;
        }
        return val - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timerInterval);
    };
  }, [startTimer, timeToWait]);

  const mergedClassName = `relative overflow-hidden ${className || ''}`;

  return (
    <Button {...buttonProps} className={mergedClassName} disabled={disabled || timer > 0} aria-busy={timer > 0}>
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150
          ${timer > 0 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={timer === 0}
      >
        <div className="absolute inset-0 bg-black/50" />
        <span className="relative text-gray-200 font-medium" aria-live="polite">
          {timer > 0 ? timer : ''}
        </span>
      </div>

      {/* Button content — could dim while waiting */}
      <span className={`${timer > 0 ? 'opacity-60' : 'opacity-100'}`}>{children}</span>
    </Button>
  );
}
