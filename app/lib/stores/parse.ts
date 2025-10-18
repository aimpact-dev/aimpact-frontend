import { atom, map } from 'nanostores';

export const currentParsingMessageState = atom<string | null>(null);
export const parserState = map({
  parserRan: false,
});
