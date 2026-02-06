/**
 * =============================================================================
 * API SERVICE - FlexiTrip PMR (Supabase Edition)
 * =============================================================================
 * Service centralisé pour tous les appels aux Edge Functions Supabase
 * Remplace l'ancien système axios avec des méthodes optimisées
 * 
 * USAGE:
 * import * as api from '../services/api';
 * const data = await api.getUserById(userId);
 */

import { callEdgeFunction } from '../config/supabase';

// =============================================================================
// 1. USER OPERATIONS
// =============================================================================

export const getUserById = async (userId) => {
  const { data, error } = await callEdgeFunction('user-operations', `/users/${userId}`);
  if (error) throw error;
  return data;
};

export const createUser = async (userData) => {
  const { data, error } = await callEdgeFunction('user-operations', '/users/insert', {
    method: 'POST',
    body: userData,
  });
  if (error) throw error;
  return data;
};

export const updateUser = async (userId, updates) => {
  const { data, error } = await callEdgeFunction('user-operations', `/users/${userId}`, {
    method: 'PUT',
    body: updates,
  });
  if (error) throw error;
  return data;
};

export const deleteUser = async (userId) => {
  const { data, error } = await callEdgeFunction('user-operations', `/users/${userId}`, {
    method: 'DELETE',
  });
  if (error) throw error;
  return data;
};

// =============================================================================
// 2. AUTH OPERATIONS
// =============================================================================

export const login = async (credentials) => {
  const { data, error } = await callEdgeFunction('auth-operations', '/auth/login', {
    method: 'POST',
    body: credentials,
  });
  if (error) throw error;
  return data;
};

export const logout = async () => {
  const { data, error } = await callEdgeFunction('auth-operations', '/auth/logout', {
    method: 'POST',
  });
  if (error) throw error;
  return data;
};

export const getMe = async () => {
  const { data, error } = await callEdgeFunction('auth-operations', '/auth/me');
  if (error) throw error;
  return data;
};

// =============================================================================
// 3. SEARCH & BOOKING
// =============================================================================

export const searchAutocomplete = async (input) => {
  const { data, error } = await callEdgeFunction(
    'search-routes',
    `/api/search/autocomplete?input=${encodeURIComponent(input)}`
  );
  if (error) throw error;
  return data;
};

export const searchRoutes = async (searchParams) => {
  const { data, error } = await callEdgeFunction('search-routes', '/api/search', {
    method: 'POST',
    body: searchParams,
  });
  if (error) throw error;
  return data;
};

export const previewWorkflow = async (workflowParams) => {
  const { data, error } = await callEdgeFunction('search-routes', '/api/booking/preview-workflow', {
    method: 'POST',
    body: workflowParams,
  });
  if (error) throw error;
  return data;
};

export const createBooking = async (bookingData) => {
  const { data, error } = await callEdgeFunction('booking-operations', '/api/booking/create', {
    method: 'POST',
    body: bookingData,
  });
  if (error) throw error;
  return data;
};

export const getBookingById = async (bookingId) => {
  const { data, error } = await callEdgeFunction('booking-operations', `/api/booking/${bookingId}`);
  if (error) throw error;
  return data;
};

export const cancelBooking = async (bookingId) => {
  const { data, error } = await callEdgeFunction('booking-operations', `/api/booking/${bookingId}/cancel`, {
    method: 'PUT',
  });
  if (error) throw error;
  return data;
};

// =============================================================================
// 4. VOYAGE OPERATIONS
// =============================================================================

export const getVoyageById = async (voyageId) => {
  const { data, error } = await callEdgeFunction('voyage-operations', `/api/voyages/${voyageId}`);
  if (error) throw error;
  return data;
};

export const getVoyagesByUser = async (userId) => {
  const { data, error } = await callEdgeFunction('voyage-operations', `/api/voyages/user/${userId}`);
  if (error) throw error;
  return data;
};

export const getVoyageHistory = async (userId) => {
  const { data, error } = await callEdgeFunction('voyage-operations', `/api/voyages/history/${userId}`);
  if (error) throw error;
  return data;
};

export const updateVoyageStatus = async (voyageId, status) => {
  const { data, error } = await callEdgeFunction('voyage-operations', `/api/voyages/${voyageId}/status`, {
    method: 'PUT',
    body: { status },
  });
  if (error) throw error;
  return data;
};

export const updateVoyage = async (voyageId, updates) => {
  const { data, error } = await callEdgeFunction('voyage-operations', `/api/voyages/${voyageId}`, {
    method: 'PUT',
    body: updates,
  });
  if (error) throw error;
  return data;
};

export const deleteVoyage = async (voyageId) => {
  const { data, error } = await callEdgeFunction('voyage-operations', `/api/voyages/${voyageId}`, {
    method: 'DELETE',
  });
  if (error) throw error;
  return data;
};

// =============================================================================
// 5. CHECK-IN OPERATIONS
// =============================================================================

export const createCheckin = async (checkinData) => {
  const { data, error } = await callEdgeFunction('checkin-operations', '/api/checkin', {
    method: 'POST',
    body: checkinData,
  });
  if (error) throw error;
  return data;
};

export const verifyCheckin = async (verificationData) => {
  const { data, error } = await callEdgeFunction('checkin-operations', '/api/checkin/verify', {
    method: 'POST',
    body: verificationData,
  });
  if (error) throw error;
  return data;
};

export const getCheckinStatus = async (voyageId) => {
  const { data, error } = await callEdgeFunction('checkin-operations', `/api/checkin/status/${voyageId}`);
  if (error) throw error;
  return data;
};

export const getCheckinByUser = async (userId) => {
  const { data, error } = await callEdgeFunction('checkin-operations', `/api/checkin/user/${userId}`);
  if (error) throw error;
  return data;
};

export const getCheckinById = async (checkinId) => {
  const { data, error } = await callEdgeFunction('checkin-operations', `/api/checkin/${checkinId}`);
  if (error) throw error;
  return data;
};

export const cancelCheckin = async (checkinId) => {
  const { data, error } = await callEdgeFunction('checkin-operations', `/api/checkin/${checkinId}/cancel`, {
    method: 'PUT',
  });
  if (error) throw error;
  return data;
};

// =============================================================================
// 6. BOARDING OPERATIONS
// =============================================================================

export const generateBoardingPass = async (boardingData) => {
  const { data, error } = await callEdgeFunction('boarding-operations', '/api/boarding/generate', {
    method: 'POST',
    body: boardingData,
  });
  if (error) throw error;
  return data;
};

export const getBoardingPassById = async (boardingPassId) => {
  const { data, error } = await callEdgeFunction('boarding-operations', `/api/boarding/${boardingPassId}`);
  if (error) throw error;
  return data;
};

export const getBoardingPassByReservation = async (reservationId) => {
  const { data, error } = await callEdgeFunction('boarding-operations', `/api/boarding/reservation/${reservationId}`);
  if (error) throw error;
  return data;
};

export const scanBoardingPass = async (scanData) => {
  const { data, error } = await callEdgeFunction('boarding-operations', '/api/boarding/scan', {
    method: 'POST',
    body: scanData,
  });
  if (error) throw error;
  return data;
};

export const updateBoardingPass = async (boardingPassId, updates) => {
  const { data, error } = await callEdgeFunction('boarding-operations', `/api/boarding/${boardingPassId}`, {
    method: 'PUT',
    body: updates,
  });
  if (error) throw error;
  return data;
};

export const cancelBoardingPass = async (boardingPassId) => {
  const { data, error } = await callEdgeFunction('boarding-operations', `/api/boarding/${boardingPassId}/cancel`, {
    method: 'PUT',
  });
  if (error) throw error;
  return data;
};

// =============================================================================
// 7. BAGGAGE OPERATIONS
// =============================================================================

export const createBagage = async (bagageData) => {
  const { data, error } = await callEdgeFunction('bagage-operations', '/api/bagages', {
    method: 'POST',
    body: bagageData,
  });
  if (error) throw error;
  return data;
};

export const analyzeBagage = async (analysisPayload) => {
  const { data, error } = await callEdgeFunction('bagage-operations', '/api/bagages/analyze', {
    method: 'POST',
    body: analysisPayload,
  });
  if (error) throw error;
  return data;
};

export const registerBagage = async (registerPayload) => {
  const { data, error } = await callEdgeFunction('bagage-operations', '/api/bagages/register', {
    method: 'POST',
    body: registerPayload,
  });
  if (error) throw error;
  return data;
};

export const searchBagages = async (searchPayload) => {
  const { data, error } = await callEdgeFunction('bagage-operations', '/api/bagages/search', {
    method: 'POST',
    body: searchPayload,
  });
  if (error) throw error;
  return data;
};

export const createBagageEvent = async (eventData) => {
  const { data, error } = await callEdgeFunction('bagage-operations', '/api/bagages/event', {
    method: 'POST',
    body: eventData,
  });
  if (error) throw error;
  return data;
};

export const trackBagage = async (publicId) => {
  const { data, error } = await callEdgeFunction('bagage-operations', `/api/bagages/track/${publicId}`);
  if (error) throw error;
  return data;
};

export const getBagageById = async (bagageId) => {
  const { data, error } = await callEdgeFunction('bagage-operations', `/api/bagages/${bagageId}`);
  if (error) throw error;
  return data;
};

export const getBagagesByVoyage = async (voyageId) => {
  const { data, error } = await callEdgeFunction('bagage-operations', `/api/bagages/voyage/${voyageId}`);
  if (error) throw error;
  return data;
};

export const getBagagesByUser = async (userId) => {
  const { data, error } = await callEdgeFunction('bagage-operations', `/api/bagages/user/${userId}`);
  if (error) throw error;
  return data;
};

export const updateBagage = async (bagageId, updates) => {
  const { data, error } = await callEdgeFunction('bagage-operations', `/api/bagages/${bagageId}`, {
    method: 'PUT',
    body: updates,
  });
  if (error) throw error;
  return data;
};

export const deleteBagage = async (bagageId) => {
  const { data, error } = await callEdgeFunction('bagage-operations', `/api/bagages/${bagageId}`, {
    method: 'DELETE',
  });
  if (error) throw error;
  return data;
};

// =============================================================================
// 8. PRISE EN CHARGE OPERATIONS
// =============================================================================

export const createPriseEnCharge = async (priseEnChargeData) => {
  const { data, error } = await callEdgeFunction('prise-en-charge-operations', '/api/prise-en-charge', {
    method: 'POST',
    body: priseEnChargeData,
  });
  if (error) throw error;
  return data;
};

export const validatePriseEnCharge = async (validationData) => {
  const { data, error } = await callEdgeFunction('prise-en-charge-operations', '/api/prise-en-charge/validate', {
    method: 'POST',
    body: validationData,
  });
  if (error) throw error;
  return data;
};

export const getPriseEnChargeById = async (priseEnChargeId) => {
  const { data, error } = await callEdgeFunction('prise-en-charge-operations', `/api/prise-en-charge/${priseEnChargeId}`);
  if (error) throw error;
  return data;
};

export const getPriseEnChargeByAgent = async (agentId) => {
  const { data, error } = await callEdgeFunction('prise-en-charge-operations', `/api/prise-en-charge/agent/${agentId}`);
  if (error) throw error;
  return data;
};

export const getPriseEnChargeByUser = async (userId) => {
  const { data, error } = await callEdgeFunction('prise-en-charge-operations', `/api/prise-en-charge/user/${userId}`);
  if (error) throw error;
  return data;
};

export const getPriseEnChargeByVoyage = async (voyageId) => {
  const { data, error } = await callEdgeFunction('prise-en-charge-operations', `/api/prise-en-charge/voyage/${voyageId}`);
  if (error) throw error;
  return data;
};

export const updatePriseEnCharge = async (priseEnChargeId, updates) => {
  const { data, error } = await callEdgeFunction('prise-en-charge-operations', `/api/prise-en-charge/${priseEnChargeId}`, {
    method: 'PUT',
    body: updates,
  });
  if (error) throw error;
  return data;
};

export const cancelPriseEnCharge = async (priseEnChargeId) => {
  const { data, error } = await callEdgeFunction('prise-en-charge-operations', `/api/prise-en-charge/${priseEnChargeId}/cancel`, {
    method: 'PUT',
  });
  if (error) throw error;
  return data;
};

// =============================================================================
// 9. NOTIFICATION OPERATIONS
// =============================================================================

export const getNotificationsByUser = async (userId) => {
  const { data, error } = await callEdgeFunction('notification-operations', `/api/notifications/user/${userId}`);
  if (error) throw error;
  return data;
};

export const getUnreadCount = async (userId) => {
  const { data, error } = await callEdgeFunction('notification-operations', `/api/notifications/count/${userId}`);
  if (error) throw error;
  return data;
};

export const getNotificationById = async (notificationId) => {
  const { data, error } = await callEdgeFunction('notification-operations', `/api/notifications/${notificationId}`);
  if (error) throw error;
  return data;
};

export const getNotificationTypes = async () => {
  const { data, error } = await callEdgeFunction('notification-operations', '/api/notifications/types');
  if (error) throw error;
  return data;
};

export const createNotification = async (notificationData) => {
  const { data, error } = await callEdgeFunction('notification-operations', '/api/notifications', {
    method: 'POST',
    body: notificationData,
  });
  if (error) throw error;
  return data;
};

export const sendBulkNotifications = async (notificationsData) => {
  const { data, error } = await callEdgeFunction('notification-operations', '/api/notifications/send-bulk', {
    method: 'POST',
    body: notificationsData,
  });
  if (error) throw error;
  return data;
};

export const markNotificationAsRead = async (notificationId) => {
  const { data, error } = await callEdgeFunction('notification-operations', `/api/notifications/${notificationId}/mark-read`, {
    method: 'PUT',
  });
  if (error) throw error;
  return data;
};

export const markAllNotificationsAsRead = async (userId) => {
  const { data, error } = await callEdgeFunction('notification-operations', `/api/notifications/mark-all-read/${userId}`, {
    method: 'PUT',
  });
  if (error) throw error;
  return data;
};

export const deleteNotification = async (notificationId) => {
  const { data, error } = await callEdgeFunction('notification-operations', `/api/notifications/${notificationId}`, {
    method: 'DELETE',
  });
  if (error) throw error;
  return data;
};

export const clearAllNotifications = async (userId) => {
  const { data, error } = await callEdgeFunction('notification-operations', `/api/notifications/clear-all/${userId}`, {
    method: 'DELETE',
  });
  if (error) throw error;
  return data;
};

// =============================================================================
// 10. CHAT OPERATIONS
// =============================================================================

export const createConversation = async (conversationData) => {
  const { data, error } = await callEdgeFunction('chat-operations', '/api/chat/conversations', {
    method: 'POST',
    body: conversationData,
  });
  if (error) throw error;
  return data;
};

export const getConversationById = async (conversationId) => {
  const { data, error } = await callEdgeFunction('chat-operations', `/api/chat/conversations/${conversationId}`);
  if (error) throw error;
  return data;
};

export const getConversationsByUser = async (userId) => {
  const { data, error } = await callEdgeFunction('chat-operations', `/api/chat/conversations/user/${userId}`);
  if (error) throw error;
  return data;
};

export const getConversationsByAgent = async (agentId) => {
  const { data, error } = await callEdgeFunction('chat-operations', `/api/chat/conversations/agent/${agentId}`);
  if (error) throw error;
  return data;
};

export const sendMessage = async (messageData) => {
  const { data, error } = await callEdgeFunction('chat-operations', '/api/chat/messages', {
    method: 'POST',
    body: messageData,
  });
  if (error) throw error;
  return data;
};

export const getMessagesByConversation = async (conversationId) => {
  const { data, error } = await callEdgeFunction('chat-operations', `/api/chat/messages/${conversationId}`);
  if (error) throw error;
  return data;
};

export const markMessageAsRead = async (messageId) => {
  const { data, error } = await callEdgeFunction('chat-operations', `/api/chat/messages/${messageId}/read`, {
    method: 'PUT',
  });
  if (error) throw error;
  return data;
};

export const closeConversation = async (conversationId) => {
  const { data, error } = await callEdgeFunction('chat-operations', `/api/chat/conversations/${conversationId}/close`, {
    method: 'PUT',
  });
  if (error) throw error;
  return data;
};

export const deleteMessage = async (messageId) => {
  const { data, error } = await callEdgeFunction('chat-operations', `/api/chat/messages/${messageId}`, {
    method: 'DELETE',
  });
  if (error) throw error;
  return data;
};

export const deleteConversation = async (conversationId) => {
  const { data, error } = await callEdgeFunction('chat-operations', `/api/chat/conversations/${conversationId}`, {
    method: 'DELETE',
  });
  if (error) throw error;
  return data;
};

// =============================================================================
// 11. WALLET OPERATIONS
// =============================================================================

export const getWallet = async (userId) => {
  const { data, error } = await callEdgeFunction('wallet-operations', `/api/wallet/${userId}`);
  if (error) throw error;
  return data;
};

export const creditWallet = async (creditData) => {
  const { data, error } = await callEdgeFunction('wallet-operations', '/api/wallet/credit', {
    method: 'POST',
    body: creditData,
  });
  if (error) throw error;
  return data;
};

export const debitWallet = async (debitData) => {
  const { data, error } = await callEdgeFunction('wallet-operations', '/api/wallet/debit', {
    method: 'POST',
    body: debitData,
  });
  if (error) throw error;
  return data;
};

export const getTransactionsByUser = async (userId) => {
  const { data, error } = await callEdgeFunction('wallet-operations', `/api/wallet/transactions/${userId}`);
  if (error) throw error;
  return data;
};

export const getTransactionById = async (transactionId) => {
  const { data, error } = await callEdgeFunction('wallet-operations', `/api/wallet/transaction/${transactionId}`);
  if (error) throw error;
  return data;
};

export const transferFunds = async (transferData) => {
  const { data, error } = await callEdgeFunction('wallet-operations', '/api/wallet/transfer', {
    method: 'POST',
    body: transferData,
  });
  if (error) throw error;
  return data;
};

// =============================================================================
// 12. ENROLLMENT OPERATIONS
// =============================================================================

export const createEnrollment = async (enrollmentData) => {
  const { data, error } = await callEdgeFunction('enrollment-operations', '/api/enrollment', {
    method: 'POST',
    body: enrollmentData,
  });
  if (error) throw error;
  return data;
};

export const verifyEnrollment = async (verificationData) => {
  const { data, error } = await callEdgeFunction('enrollment-operations', '/api/enrollment/verify', {
    method: 'POST',
    body: verificationData,
  });
  if (error) throw error;
  return data;
};

export const getEnrollmentById = async (enrollmentId) => {
  const { data, error } = await callEdgeFunction('enrollment-operations', `/api/enrollment/${enrollmentId}`);
  if (error) throw error;
  return data;
};

export const getEnrollmentsByUser = async (userId) => {
  const { data, error } = await callEdgeFunction('enrollment-operations', `/api/enrollment/user/${userId}`);
  if (error) throw error;
  return data;
};

export const getEnrollmentsByVoyage = async (voyageId) => {
  const { data, error } = await callEdgeFunction('enrollment-operations', `/api/enrollment/voyage/${voyageId}`);
  if (error) throw error;
  return data;
};

export const updateEnrollment = async (enrollmentId, updates) => {
  const { data, error } = await callEdgeFunction('enrollment-operations', `/api/enrollment/${enrollmentId}`, {
    method: 'PUT',
    body: updates,
  });
  if (error) throw error;
  return data;
};

export const approveEnrollment = async (enrollmentId) => {
  const { data, error } = await callEdgeFunction('enrollment-operations', `/api/enrollment/${enrollmentId}/approve`, {
    method: 'PUT',
  });
  if (error) throw error;
  return data;
};

export const rejectEnrollment = async (enrollmentId, reason) => {
  const { data, error } = await callEdgeFunction('enrollment-operations', `/api/enrollment/${enrollmentId}/reject`, {
    method: 'PUT',
    body: { reason },
  });
  if (error) throw error;
  return data;
};

export const deleteEnrollment = async (enrollmentId) => {
  const { data, error } = await callEdgeFunction('enrollment-operations', `/api/enrollment/${enrollmentId}`, {
    method: 'DELETE',
  });
  if (error) throw error;
  return data;
};

// =============================================================================
// 13. AGENT OPERATIONS
// =============================================================================

export const getAllAgents = async (filters = {}) => {
  const queryParams = new URLSearchParams(filters).toString();
  const path = queryParams ? `/api/agents?${queryParams}` : '/api/agents';
  const { data, error } = await callEdgeFunction('agent-operations', path);
  if (error) throw error;
  return data;
};

export const getAgentById = async (agentId) => {
  const { data, error } = await callEdgeFunction('agent-operations', `/api/agents/${agentId}`);
  if (error) throw error;
  return data;
};

export const getAgentByQR = async (qrCode) => {
  const { data, error } = await callEdgeFunction('agent-operations', `/api/agents/qr/${qrCode}`);
  if (error) throw error;
  return data;
};

export const getAgentStats = async (agentId) => {
  const { data, error } = await callEdgeFunction('agent-operations', `/api/agents/stats/${agentId}`);
  if (error) throw error;
  return data;
};

export const createAgent = async (agentData) => {
  const { data, error } = await callEdgeFunction('agent-operations', '/api/agents', {
    method: 'POST',
    body: agentData,
  });
  if (error) throw error;
  return data;
};

export const updateAgentAvailability = async (agentId, disponible) => {
  const { data, error } = await callEdgeFunction('agent-operations', `/api/agents/${agentId}/availability`, {
    method: 'PUT',
    body: { disponible },
  });
  if (error) throw error;
  return data;
};

export const updateAgent = async (agentId, updates) => {
  const { data, error } = await callEdgeFunction('agent-operations', `/api/agents/${agentId}`, {
    method: 'PUT',
    body: updates,
  });
  if (error) throw error;
  return data;
};

export const deleteAgent = async (agentId) => {
  const { data, error } = await callEdgeFunction('agent-operations', `/api/agents/${agentId}`, {
    method: 'DELETE',
  });
  if (error) throw error;
  return data;
};

// =============================================================================
// EXPORT PAR DÉFAUT
// =============================================================================

const api = {
  // Users
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  // Auth
  login,
  logout,
  getMe,
  // Search & Booking
  searchAutocomplete,
  searchRoutes,
  previewWorkflow,
  createBooking,
  getBookingById,
  cancelBooking,
  // Voyages
  getVoyageById,
  getVoyagesByUser,
  getVoyageHistory,
  updateVoyageStatus,
  updateVoyage,
  deleteVoyage,
  // Check-in
  createCheckin,
  verifyCheckin,
  getCheckinStatus,
  getCheckinByUser,
  getCheckinById,
  cancelCheckin,
  // Boarding
  generateBoardingPass,
  getBoardingPassById,
  getBoardingPassByReservation,
  scanBoardingPass,
  updateBoardingPass,
  cancelBoardingPass,
  // Bagages
  createBagage,
  analyzeBagage,
  registerBagage,
  searchBagages,
  createBagageEvent,
  trackBagage,
  getBagageById,
  getBagagesByVoyage,
  getBagagesByUser,
  updateBagage,
  deleteBagage,
  // Prise en charge
  createPriseEnCharge,
  validatePriseEnCharge,
  getPriseEnChargeById,
  getPriseEnChargeByAgent,
  getPriseEnChargeByUser,
  getPriseEnChargeByVoyage,
  updatePriseEnCharge,
  cancelPriseEnCharge,
  // Notifications
  getNotificationsByUser,
  getUnreadCount,
  getNotificationById,
  getNotificationTypes,
  createNotification,
  sendBulkNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  // Chat
  createConversation,
  getConversationById,
  getConversationsByUser,
  getConversationsByAgent,
  sendMessage,
  getMessagesByConversation,
  markMessageAsRead,
  closeConversation,
  deleteMessage,
  deleteConversation,
  // Wallet
  getWallet,
  creditWallet,
  debitWallet,
  getTransactionsByUser,
  getTransactionById,
  transferFunds,
  // Enrollment
  createEnrollment,
  verifyEnrollment,
  getEnrollmentById,
  getEnrollmentsByUser,
  getEnrollmentsByVoyage,
  updateEnrollment,
  approveEnrollment,
  rejectEnrollment,
  deleteEnrollment,
  // Agents
  getAllAgents,
  getAgentById,
  getAgentByQR,
  getAgentStats,
  createAgent,
  updateAgentAvailability,
  updateAgent,
  deleteAgent,
};

export default api;
