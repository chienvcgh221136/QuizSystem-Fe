export const stripCreatedByAI = (s?: string | null) => {
  if (!s) return s ?? '';
  return s.replace(/\s*\(?\s*Tạo\s+bởi\s*AI\s*\)?\s*/ig, ' ').replace(/\s+/g, ' ').trim();
};

export default { stripCreatedByAI };
