import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from './app';
import { optimizeImage } from '../utils/imageOptimizer';

/**
 * Firebase Storage Instance
 */
export const storage = app ? getStorage(app) : null;

/**
 * Helper: Upload a file to Storage
 * @param {string} path - The path/filename in storage (e.g., 'images/product1.jpg')
 * @param {File|Blob} file - The file to upload
 * @param {object} [metadata] - Optional metadata (e.g., { contentType: 'image/jpeg' })
 * @returns {import('firebase/storage').UploadTask} The upload task (can be used to monitor progress)
 */
export const uploadFile = async (path, file, metadata = {}) => {
  if (!storage) throw new Error('Storage not initialized');
  const storageRef = ref(storage, path);
  
  try {
    const optimizedFile = await optimizeImage(file);
    return uploadBytesResumable(storageRef, optimizedFile, metadata);
  } catch (error) {
    console.warn('Image optimization failed, uploading original', error);
    return uploadBytesResumable(storageRef, file, metadata);
  }
};

/**
 * Helper: Get the download URL for a file
 * @param {string} path - The path/filename in storage
 * @returns {Promise<string>} The download URL
 */
export const getFileUrl = async (path) => {
  if (!storage) throw new Error('Storage not initialized');
  const storageRef = ref(storage, path);
  return getDownloadURL(storageRef);
};

/**
 * Helper: Delete a file from Storage
 * @param {string} path - The path/filename in storage
 * @returns {Promise<void>}
 */
export const deleteFile = async (path) => {
  if (!storage) throw new Error('Storage not initialized');
  const storageRef = ref(storage, path);
  return deleteObject(storageRef);
};
