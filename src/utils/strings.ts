/**
 * Removes the "Tạo bởi AI" suffix/prefix that the chatbot appends to exam titles.
 */
export const stripCreatedByAI = (title: string): string => {
  if (!title) return title;
  return title
    .replace(/\s*[\-–—]\s*Tạo bởi AI\s*$/i, '')
    .replace(/^Tạo bởi AI\s*[\-–—]\s*/i, '')
    .replace(/\(Tạo bởi AI\)\s*$/i, '')
    .trim();
};
