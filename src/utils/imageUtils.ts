import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
}

export const imageUtils = {
  /**
   * Compress and resize image for avatar upload
   * Target: 300x300px, JPEG quality 0.7 (smaller for faster upload)
   */
  async compressForAvatar(uri: string): Promise<CompressedImage> {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 300, height: 300 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result;
  },

  /**
   * Compress image with custom options
   */
  async compress(
    uri: string,
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
    } = {}
  ): Promise<CompressedImage> {
    const { maxWidth = 800, maxHeight = 800, quality = 0.8 } = options;

    const actions: ImageManipulator.Action[] = [];

    if (maxWidth || maxHeight) {
      actions.push({
        resize: {
          width: maxWidth,
          height: maxHeight,
        },
      });
    }

    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result;
  },

  /**
   * Read a local file URI and return as ArrayBuffer for Supabase upload
   * Uses chunked reading for better performance on larger files
   */
  async fileToArrayBuffer(uri: string): Promise<ArrayBuffer> {
    // For small files (avatars), base64 is fine
    const fileInfo = await FileSystem.getInfoAsync(uri);

    // If file is small (< 500KB), use base64 (faster for small files)
    if (fileInfo.exists && fileInfo.size && fileInfo.size < 500000) {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      return decode(base64);
    }

    // For larger files, use blob approach which is more memory efficient
    const response = await fetch(uri);
    const blob = await response.blob();
    return await blob.arrayBuffer();
  },

  /**
   * Upload file directly to Supabase using FileSystem.uploadAsync
   * This is more efficient for React Native as it doesn't load the file into memory
   */
  async uploadToSupabase(
    uri: string,
    supabaseUrl: string,
    bucket: string,
    path: string,
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;

      const result = await FileSystem.uploadAsync(uploadUrl, uri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'image/jpeg',
          'x-upsert': 'true',
        },
      });

      if (result.status >= 200 && result.status < 300) {
        return { success: true };
      } else {
        return { success: false, error: `Upload failed with status ${result.status}` };
      }
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
};
