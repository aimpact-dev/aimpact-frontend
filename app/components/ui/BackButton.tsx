import { useNavigate } from '@remix-run/react';
import { classNames } from '~/utils/classNames';

interface Props {
  url: string;
  children: React.ReactNode;
  size?: 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
}

const buttonSizes = {
  lg: 'h-3 w-3',
  xl: 'h-3 w-3 ',
  '2xl': 'h-3 w-3 md:h-4 md:w-4',
  '3xl': 'h-3 w-3 md:h-5 md:w-5',
};

const textSizes = {
  lg: 'text-lg md:text-lg',
  xl: 'text-lg  md:text-xl ',
  '2xl': 'text-lg md:text-2xl ',
  '3xl': 'text-lg md:text-3xl ',
};

export default function BackButton({ url, children, size = 'xl', className }: Props) {
  const navigate = useNavigate();

  return (
    <button className={classNames('flex gap-3 group mb-3', className)} onClick={() => navigate(url)}>
      <div className=" inline-flex justify-center items-center bg-bolt-elements-button-primary-background rounded-md p-2 transition-colors duration-200 group-hover:bg-bolt-elements-button-primary-backgroundHover">
        <div className={`i-ph:arrow-left ${buttonSizes[size]}  color-accent-500`}></div>
      </div>
      <h1
        className={`${textSizes[size]} font-bold text-left text-white transition-colors duration-300 group-hover:text-accent-500`}
      >
        {children}
      </h1>
    </button>
  );
}
