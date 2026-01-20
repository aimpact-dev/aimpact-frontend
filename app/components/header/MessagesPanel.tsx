import { useStore } from '@nanostores/react';
import { userInfo } from '~/lib/hooks/useAuth';
import Popup from '../common/Popup';
import { useState } from 'react';
import { Tooltip } from '../chat/Tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui';
import BuyMessagesTab from './BuyMessagesTab';
import GetFreeMessagesTab from './GetFreeMessagesTab';
import { motion } from 'framer-motion';

export default function MessagesPanel() {
  const user = useStore(userInfo);
  const [messagesPopupOpen, setMessagesPopupOpen] = useState(false);

  return (
    user && (
      <>
        <div className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-bolt-elements-textPrimary bg-bolt-elements-background rounded-md border border-bolt-elements-borderColor px-3 py-2">
          <div>
            <b>{user.messagesLeft - user.pendingMessages}</b>{' '}
            <span className="text-xs">message{user.messagesLeft - user.pendingMessages === 1 ? '' : 's'} left</span>
          </div>

          <Tooltip content="Get more messages" side="bottom">
            <button onClick={() => setMessagesPopupOpen(true)}>
              <div className="i-ph:plus-circle-bold h-5 w-5 hover:color-accent-500 transition-150"></div>
            </button>
          </Tooltip>
        </div>
        <Popup
          isShow={messagesPopupOpen}
          handleToggle={setMessagesPopupOpen}
          className="!max-w-2xl"
          title="Get more messages"
          description="You can receive messages either by buying them with SOL or by completing special tasks"
        >
          <Tabs defaultValue="buy" className="items-center">
            <TabsList className="bg-input h-9 w-[50%] box-border mb-2 md:mb-5">
              <TabsTrigger value="buy">Buy</TabsTrigger>
              <TabsTrigger value="free">Get free</TabsTrigger>
            </TabsList>
            <TabsContent value="buy">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <BuyMessagesTab />
              </motion.div>
            </TabsContent>
            <TabsContent value="free">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <GetFreeMessagesTab />
              </motion.div>
            </TabsContent>
          </Tabs>
        </Popup>
      </>
    )
  );
}
