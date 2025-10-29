import { atom, map } from 'nanostores';

export const currentParsingMessageState = atom<string | null | undefined>(undefined);
