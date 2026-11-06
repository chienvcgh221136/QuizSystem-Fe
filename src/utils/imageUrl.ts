
export const getImageUrl = (imageUrl?: string | null): string | null => {
  if (!imageUrl) return null;

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;

  const base = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') ?? 'http://localhost:5288';
  return `${base}${imageUrl}`;
};
