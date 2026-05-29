/**
 * Trả về URL đầy đủ cho ảnh từ backend.
 * imageUrl từ DB có dạng "/uploads/question-images/xxx.jpg"
 * Cần prefix với host của backend (không phải frontend).
 */
export const getImageUrl = (imageUrl?: string | null): string | null => {
  if (!imageUrl) return null;
  // Nếu đã là absolute URL thì giữ nguyên
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
  // Lấy base URL của backend (bỏ /api ở cuối VITE_API_URL)
  const base = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') ?? 'http://localhost:5288';
  return `${base}${imageUrl}`;
};
