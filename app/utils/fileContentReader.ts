import { getEncoding } from 'istextorbinary';
import { Buffer } from 'node:buffer';

const utf8TextDecoder = new TextDecoder('utf8', { fatal: true });

function decodeFileContent(buffer?: Uint8Array) {
  if (!buffer || buffer.byteLength === 0) {
    return '';
  }

  try {
    return utf8TextDecoder.decode(buffer);
  } catch (error) {
    console.log(error);
    return '';
  }
}


export function isBinaryFile(buffer: Uint8Array | undefined) {
  if (buffer === undefined) {
    return false;
  }

  return getEncoding(convertToBuffer(buffer), { chunkLength: 100 }) === 'binary';
}

/**
 * Converts a `Uint8Array` into a Node.js `Buffer` by copying the prototype.
 * The goal is to  avoid expensive copies. It does create a new typed array
 * but that's generally cheap as long as it uses the same underlying
 * array buffer.
 */
function convertToBuffer(view: Uint8Array): Buffer {
  return Buffer.from(view.buffer, view.byteOffset, view.byteLength);
}

export function readContent(buffer?:  Uint8Array<ArrayBufferLike>): string {
  let content = '';
  const isBinary = isBinaryFile(buffer);
  if (isBinary && buffer){
    content = Buffer.from(buffer).toString('base64');
  }
  else if(!isBinary){
    content = decodeFileContent(buffer);
  }
  return content;
}
