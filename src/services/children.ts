import { supabase } from '@/lib/supabase';
import { imageUtils } from '@/utils';
import type { Child } from '@/types';

export const childrenService = {
  async getChildren(guardianId: string): Promise<Child[]> {
    const { data, error } = await supabase
      .from('children')
      .select('*')
      .eq('guardian_id', guardianId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getChild(childId: string): Promise<Child> {
    const { data, error } = await supabase
      .from('children')
      .select('*')
      .eq('id', childId)
      .single();

    if (error) throw error;
    return data;
  },

  async createChild(
    child: Omit<Child, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Child> {
    const { data, error } = await supabase
      .from('children')
      .insert(child)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateChild(
    childId: string,
    updates: Partial<Omit<Child, 'id' | 'guardian_id' | 'created_at' | 'updated_at'>>
  ): Promise<Child> {
    const { data, error } = await supabase
      .from('children')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', childId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteChild(childId: string): Promise<void> {
    const { error } = await supabase
      .from('children')
      .delete()
      .eq('id', childId);

    if (error) throw error;
  },

  async uploadAvatar(childId: string, uri: string): Promise<string> {
    const fileName = `children/${childId}/${Date.now()}.jpg`;

    // Get session token for direct upload
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (token) {
      // Use efficient direct upload (doesn't load file into memory)
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
      const uploadResult = await imageUtils.uploadToSupabase(
        uri,
        supabaseUrl,
        'avatars',
        fileName,
        token
      );

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }
    } else {
      // Fallback to ArrayBuffer method if no token
      const arrayBuffer = await imageUtils.fileToArrayBuffer(uri);
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      if (uploadError) throw uploadError;
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    // Update child with new avatar URL
    const { error: updateError } = await supabase
      .from('children')
      .update({
        avatar_url: data.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', childId);

    if (updateError) throw updateError;

    return data.publicUrl;
  },
};
