/**
 * =============================================================================
 * STORAGE SERVICE - FlexiTrip PMR
 * =============================================================================
 * Service centralisé pour gérer les uploads de fichiers vers Supabase Storage
 * 
 * FONCTIONNALITÉS:
 * - Upload photos profil (avatars)
 * - Upload documents justificatifs (handicap, identité)
 * - Upload photos biométrie (enrollment)
 * - Génération URLs publiques
 * - Suppression fichiers
 * - Gestion taille et format
 * 
 * BUCKETS SUPABASE:
 * - avatars: Photos de profil utilisateurs (public)
 * - documents: Documents justificatifs PMR (private)
 * - biometric: Photos biométrie (private)
 * - attachments: Pièces jointes chat (private)
 */

import { supabase, uploadFile as baseUploadFile, getFileUrl as baseGetFileUrl } from '../config/supabase';
import * as api from './api';

// =============================================================================
// CONFIGURATION
// =============================================================================

const BUCKET_CONFIG = {
  avatars: {
    maxSize: 5 * 1024 * 1024, // 5 MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    public: true,
  },
  documents: {
    maxSize: 10 * 1024 * 1024, // 10 MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
    public: false,
  },
  biometric: {
    maxSize: 3 * 1024 * 1024, // 3 MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
    public: false,
  },
  attachments: {
    maxSize: 20 * 1024 * 1024, // 20 MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'],
    public: false,
  },
};

// =============================================================================
// HELPERS VALIDATION
// =============================================================================

/**
 * Valider fichier avant upload
 */
function validateFile(file, bucketName) {
  const config = BUCKET_CONFIG[bucketName];
  
  if (!config) {
    throw new Error(`Bucket ${bucketName} non configuré`);
  }

  // Vérifier taille
  if (file.size > config.maxSize) {
    const maxSizeMB = (config.maxSize / (1024 * 1024)).toFixed(1);
    throw new Error(`Fichier trop volumineux. Taille max: ${maxSizeMB} MB`);
  }

  // Vérifier type
  if (!config.allowedTypes.includes(file.type)) {
    throw new Error(`Type de fichier non autorisé. Types acceptés: ${config.allowedTypes.join(', ')}`);
  }

  return true;
}

/**
 * Générer nom de fichier unique
 */
function generateUniqueFilename(originalName, userId) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const extension = originalName.split('.').pop();
  return `${userId}_${timestamp}_${random}.${extension}`;
}

/**
 * Compresser image avant upload (optionnel)
 */
async function compressImage(file, maxWidth = 1920, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Redimensionner si trop large
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            } else {
              reject(new Error('Erreur compression image'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Erreur chargement image'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('Erreur lecture fichier'));
    reader.readAsDataURL(file);
  });
}

// =============================================================================
// UPLOAD AVATAR (Photo de profil)
// =============================================================================

/**
 * Upload photo de profil utilisateur
 * 
 * @param {string} userId - ID de l'utilisateur
 * @param {File} file - Fichier image
 * @param {Object} options - Options d'upload
 * @param {boolean} options.compress - Compresser l'image (défaut: true)
 * @param {boolean} options.updateProfile - Mettre à jour le profil utilisateur (défaut: true)
 * @returns {Promise<{url: string, path: string}>}
 * 
 * @example
 * const { url } = await uploadAvatar(user.user_id, imageFile);
 * console.log('Avatar URL:', url);
 */
export async function uploadAvatar(userId, file, options = {}) {
  const { compress = true, updateProfile = true } = options;

  try {
    // Validation
    validateFile(file, 'avatars');

    // Compression optionnelle
    let fileToUpload = file;
    if (compress && file.type.startsWith('image/')) {
      console.log('🗜️ Compression image...');
      fileToUpload = await compressImage(file, 800, 0.85);
    }

    // Générer chemin unique
    const filename = generateUniqueFilename(file.name, userId);
    const filePath = `${userId}/${filename}`;

    // Upload vers Supabase Storage
    const { data, error } = await baseUploadFile('avatars', filePath, fileToUpload);

    if (error) throw error;

    console.log('✅ Avatar uploadé:', data.publicUrl);

    // Mettre à jour le profil utilisateur
    if (updateProfile) {
      await api.updateUser(userId, {
        photo_url: data.publicUrl,
      });
      console.log('✅ Profil utilisateur mis à jour');
    }

    return {
      url: data.publicUrl,
      path: filePath,
    };
  } catch (error) {
    console.error('❌ Erreur upload avatar:', error);
    throw error;
  }
}

/**
 * Supprimer ancien avatar
 */
export async function deleteAvatar(filePath) {
  try {
    const { error } = await supabase.storage
      .from('avatars')
      .remove([filePath]);

    if (error) throw error;

    console.log('✅ Avatar supprimé:', filePath);
  } catch (error) {
    console.error('❌ Erreur suppression avatar:', error);
    throw error;
  }
}

// =============================================================================
// UPLOAD DOCUMENTS (Justificatifs PMR)
// =============================================================================

/**
 * Upload document justificatif (carte handicap, certificat médical)
 * 
 * @param {string} userId - ID de l'utilisateur
 * @param {File} file - Fichier document
 * @param {string} documentType - Type de document ('handicap_card', 'medical_certificate', 'id_card')
 * @returns {Promise<{url: string, path: string}>}
 */
export async function uploadDocument(userId, file, documentType) {
  try {
    // Validation
    validateFile(file, 'documents');

    // Générer chemin
    const filename = generateUniqueFilename(file.name, userId);
    const filePath = `${userId}/${documentType}/${filename}`;

    // Upload
    const { data, error } = await baseUploadFile('documents', filePath, file);

    if (error) throw error;

    console.log('✅ Document uploadé:', filePath);

    return {
      url: data.publicUrl,
      path: filePath,
    };
  } catch (error) {
    console.error('❌ Erreur upload document:', error);
    throw error;
  }
}

/**
 * Récupérer URL signée (temporaire) pour document privé
 */
export async function getSignedDocumentUrl(filePath, expiresIn = 3600) {
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, expiresIn);

    if (error) throw error;

    return data.signedUrl;
  } catch (error) {
    console.error('❌ Erreur génération URL signée:', error);
    throw error;
  }
}

// =============================================================================
// UPLOAD BIOMETRIC (Photos enrollment)
// =============================================================================

/**
 * Upload photo biométrie pour enrollment
 * 
 * @param {string} userId - ID de l'utilisateur
 * @param {string} voyageId - ID du voyage
 * @param {File} file - Photo biométrie
 * @param {string} captureType - Type de capture ('face', 'id_document')
 * @returns {Promise<{url: string, path: string}>}
 */
export async function uploadBiometricPhoto(userId, voyageId, file, captureType = 'face') {
  try {
    // Validation
    validateFile(file, 'biometric');

    // Compression
    const compressedFile = await compressImage(file, 1200, 0.9);

    // Générer chemin
    const filename = generateUniqueFilename(file.name, userId);
    const filePath = `${userId}/${voyageId}/${captureType}_${filename}`;

    // Upload
    const { data, error } = await baseUploadFile('biometric', filePath, compressedFile);

    if (error) throw error;

    console.log('✅ Photo biométrie uploadée:', filePath);

    return {
      url: data.publicUrl,
      path: filePath,
    };
  } catch (error) {
    console.error('❌ Erreur upload biométrie:', error);
    throw error;
  }
}

// =============================================================================
// UPLOAD ATTACHMENTS (Pièces jointes chat)
// =============================================================================

/**
 * Upload pièce jointe pour chat
 * 
 * @param {string} conversationId - ID de la conversation
 * @param {string} senderId - ID de l'expéditeur
 * @param {File} file - Fichier à uploader
 * @returns {Promise<{url: string, path: string, type: string}>}
 */
export async function uploadChatAttachment(conversationId, senderId, file) {
  try {
    // Validation
    validateFile(file, 'attachments');

    // Générer chemin
    const filename = generateUniqueFilename(file.name, senderId);
    const filePath = `${conversationId}/${filename}`;

    // Upload
    const { data, error } = await baseUploadFile('attachments', filePath, file);

    if (error) throw error;

    console.log('✅ Pièce jointe uploadée:', filePath);

    return {
      url: data.publicUrl,
      path: filePath,
      type: file.type,
      size: file.size,
      name: file.name,
    };
  } catch (error) {
    console.error('❌ Erreur upload pièce jointe:', error);
    throw error;
  }
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Lister fichiers d'un utilisateur dans un bucket
 */
export async function listUserFiles(bucket, userId, folder = '') {
  try {
    const path = folder ? `${userId}/${folder}` : userId;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path);

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('❌ Erreur listage fichiers:', error);
    throw error;
  }
}

/**
 * Supprimer fichier
 */
export async function deleteFile(bucket, filePath) {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) throw error;

    console.log('✅ Fichier supprimé:', filePath);
  } catch (error) {
    console.error('❌ Erreur suppression fichier:', error);
    throw error;
  }
}

/**
 * Obtenir URL publique (pour buckets publics uniquement)
 */
export function getPublicUrl(bucket, filePath) {
  return baseGetFileUrl(bucket, filePath);
}

/**
 * Vérifier si un fichier existe
 */
export async function fileExists(bucket, filePath) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(filePath.split('/').slice(0, -1).join('/'));

    if (error) return false;

    const filename = filePath.split('/').pop();
    return data.some(file => file.name === filename);
  } catch (error) {
    return false;
  }
}

/**
 * Obtenir métadonnées d'un fichier
 */
export async function getFileMetadata(bucket, filePath) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(filePath.split('/').slice(0, -1).join('/'));

    if (error) throw error;

    const filename = filePath.split('/').pop();
    const file = data.find(f => f.name === filename);

    return file || null;
  } catch (error) {
    console.error('❌ Erreur métadonnées fichier:', error);
    return null;
  }
}

// =============================================================================
// EXPORT
// =============================================================================

const storageService = {
  // Avatar
  uploadAvatar,
  deleteAvatar,
  
  // Documents
  uploadDocument,
  getSignedDocumentUrl,
  
  // Biometric
  uploadBiometricPhoto,
  
  // Chat attachments
  uploadChatAttachment,
  
  // Utilities
  listUserFiles,
  deleteFile,
  getPublicUrl,
  fileExists,
  getFileMetadata,
  
  // Validation
  validateFile,
  
  // Config
  BUCKET_CONFIG,
};

export default storageService;
