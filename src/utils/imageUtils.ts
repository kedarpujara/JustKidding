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
   * Target: 400x400px, JPEG quality 0.8
   */
  async compressForAvatar(uri: string): Promise<CompressedImage> {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 400, height: 400 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
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
   * This is needed because fetch().blob() doesn't work correctly in React Native
   */
  async fileToArrayBuffer(uri: string): Promise<ArrayBuffer> {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
    return decode(base64);
  },
};
