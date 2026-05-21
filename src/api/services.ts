import api from './client';

export const authApi = {
  login: (username: string, password: string) =>
    api.post('/Auth/login', { username, password }),
};

export const examsApi = {
  getAll: () => api.get('/Exams'),
  getById: (id: number) => api.get(`/Exams/${id}`),
  getFull: (id: number) => api.get(`/Exams/${id}/full`),
  create: (data: object) => api.post('/Exams', data),
  createFull: (data: object) => api.post('/Exams/full', data),
  update: (id: number, data: object) => api.put(`/Exams/${id}`, data),
  delete: (id: number) => api.delete(`/Exams/${id}`),
  addQuestion: (examId: number, questionId: number, index?: number) => api.post(`/Exams/${examId}/questions/${questionId}${index ? `?index=${index}` : ''}`),
  removeQuestion: (examId: number, questionId: number) => api.delete(`/Exams/${examId}/questions/${questionId}`),
  getAvailableQuestions: (examId: number) => api.get(`/Exams/${examId}/available-questions`),
  reorderQuestions: (examId: number, orderedQuestionIds: number[]) => api.put(`/Exams/${examId}/questions/reorder`, orderedQuestionIds),
};

export const usersApi = {
  getAll: () => api.get('/Users'),
  getById: (id: number) => api.get(`/Users/${id}`),
  create: (data: object) => api.post('/Users', data),
  update: (id: number, data: object) => api.put(`/Users/${id}`, data),
  delete: (id: number) => api.delete(`/Users/${id}`),
  getHistory: (id: number) => api.get(`/Users/${id}/history`),
};

export const questionsApi = {
  getAll: () => api.get('/Questions'),
  getCategories: () => api.get('/Questions/categories'),
  getRandom: (category: string, level: string) =>
    api.get(`/Questions/random?category=${category}&level=${level}`),
  create: (data: object) => api.post('/Questions', data),
  update: (id: number, data: object) => api.put(`/Questions/${id}`, data),
  delete: (id: number) => api.delete(`/Questions/${id}`),
};

export const examResultsApi = {
  start: (examId: number) => api.post('/ExamResults/start', { examId }),
  submit: (resultId: number, answers: object[]) =>
    api.post(`/ExamResults/${resultId}/submit`, { answers }),
  getResult: (resultId: number) => api.get(`/ExamResults/${resultId}`),
  getHistory: () => api.get('/ExamResults/my-history'),
};

export const chatbotApi = {
  chat: (message: string) => api.post('/Chatbot/ask', { message }),
};

export const adminApi = {
  getStats: () => api.get('/Admin/stats'),
  getRecentActivity: () => api.get('/Admin/recent-activity'),
};

export const notificationsApi = {
  getAll: () => api.get('/Notifications'),
  markAllRead: () => api.post('/Notifications/mark-all-read'),
};

