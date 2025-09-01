import binaryExtensions from 'binary-extensions';


export function isBinaryPath(path: string): boolean{
  const extension = path.split('.').pop()?.toLowerCase();
  return extension ? binaryExtensions.includes(extension) : false;
}
