const BINARY_EXTENSIONS = new Set([
  'exe', 'dll', 'so', 'dylib', 'bin', 'class', 'jar', 'war', 'ear', 'o', 'a', 'lib',
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'ico', 'svg',
  'mp3', 'wav', 'flac', 'aac', 'ogg',
  'mp4', 'mkv', 'avi', 'mov', 'wmv',
  'pdf',
  'zip', 'tar', 'gz', 'bz2', '7z', 'rar',
]);

export function isBinaryFile(path: string): boolean{
  const extension = path.split('.').pop()?.toLowerCase();
  return extension ? BINARY_EXTENSIONS.has(extension) : false;
}
