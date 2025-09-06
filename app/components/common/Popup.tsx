import { type PropsWithChildren } from "react";
import { classNames } from "~/utils/classNames";

interface CustDevPopupProps extends PropsWithChildren {
  handleToggle: () => void;
  isShow: boolean;
  backgroundElement?: boolean;
  positionClasses?: string;
  closeByTouch?: boolean;
  childrenClasses?: string;
}

export default function Popup({ isShow, backgroundElement=true, positionClasses, childrenClasses, handleToggle, children, closeByTouch=true }: CustDevPopupProps) {
  if (!isShow) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-10 overflow-y-auto">
      <div className="flex relative items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {backgroundElement && <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" 
          onClick={closeByTouch ? handleToggle : undefined} />}
        <div className={classNames(
          "inline-block overflow-hidden text-left align-bottom transition-all transform border-2 border-bolt-elements-borderColor rounded-lg shadow-xl sm:align-middle sm:max-w-lg sm:w-full",
          positionClasses ?? "sm:my-8",
        )}>
          <button
            onClick={handleToggle}
            className="flex absolute m-0.5 right-0 items-center justify-center w-8 h-8 rounded-full bg-transparent hover:bg-gray-500/10 dark:hover:bg-gray-500/20 group transition-all duration-200"
          >
            <div className="i-ph:x md:w-4 md:h-4 w-6 h-6 text-gray-500 dark:text-gray-400 group-hover:text-gray-500 transition-colors" />
          </button>

          <div className={classNames(childrenClasses, "px-4 py-5 sm:p-6 bg-bolt-elements-background bg-bolt-elements-background-depth-3 text-center")}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}