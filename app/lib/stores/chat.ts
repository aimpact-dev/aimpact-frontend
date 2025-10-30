import { map } from 'nanostores';

export const chatStore = map({
  started: false,
  aborted: false,
  showChat: true,
  initialMessagesIds: [] as string[],
  needToSave: null as null | string,
});
