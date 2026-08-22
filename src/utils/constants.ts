export const DEFAULT_CFA_LOGO = 'https://i.postimg.cc/SKLjyxVP/CFA1.png';

export function getValidLogoUrl(url?: string): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return DEFAULT_CFA_LOGO;
  }
  if (url.includes('googleusercontent.com') || url.includes('aida-public')) {
    return DEFAULT_CFA_LOGO;
  }
  return url;
}
