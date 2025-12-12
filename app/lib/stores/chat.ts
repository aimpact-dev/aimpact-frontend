import { atom, map } from 'nanostores';

export const chatStore = map({
  started: false,
  aborted: false,
  showChat: true,
  initialMessagesIds: [] as string[],
});

export const someActionsFinsihedTime = atom<null | number>(null);
