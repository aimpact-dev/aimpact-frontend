import { type UIMessage } from 'ai';

export function extractContentFromUI(msg: UIMessage) {
  let contentParts = msg.parts.filter((part) => part.type === 'text');
  const textParts = contentParts.map((part) => part.text);
  return textParts.join('\n');
}
