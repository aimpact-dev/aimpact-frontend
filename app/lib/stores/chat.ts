import { atom, map } from 'nanostores';

export const chatStore = map({
  started: false,
  aborted: false,
  showChat: true,
  initialMessagesIds: [] as string[],
});

export const someActionsFinishedTime = atom<null | number>(null);
