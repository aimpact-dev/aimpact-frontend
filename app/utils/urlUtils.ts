export function formatUrl(url: string) {
  if (!url.startsWith('https://') && !url.startsWith('http://')) {
    url = 'https://' + url;
  }

  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }

  return url;
}