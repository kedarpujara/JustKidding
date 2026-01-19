import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { imageUtils } from '@/utils';
import type { Profile, UserRole } from '@/types';

const DEV_MODE = process.env.EXPO_PUBLIC_DEV_MODE === 'true';
const TEST_OTP = '123456';

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  profile: Profile | null;
  role: UserRole | null;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  sendOtp: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  devLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
  uploadAvatar: (uri: string) => Promise<{ success: boolean; url?: string; error?: string }>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isLoading: true,
  isAuthenticated: false,
  userId: null,
  profile: null,
  role: null,
  error: null,

  initialize: async () => {
    try {
      set({ isLoading: true, error: null });

      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        set({ userId: session.user.id, isAuthenticated: true });
        await get().fetchProfile();
      } else {
        set({ isAuthenticated: false, userId: null, profile: null, role: null });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        set({ userId: session.user.id, isAuthenticated: true });
        await get().fetchProfile();
      } else if (event === 'SIGNED_OUT') {
        set({
          isAuthenticated: false,
          userId: null,
          profile: null,
          role: null,
        });
      }
    });
  },

  sendOtp: async (phone: string) => {
    try {
      set({ isLoading: true, error: null });

      // In dev mode, skip actual OTP sending (user should use devLogin instead)
      if (DEV_MODE) {
        console.log('DEV MODE: OTP bypassed. Use code:', TEST_OTP);
        console.log('Note: For dev testing, use the Dev Login screen with test users instead.');
        return { success: true };
      }

      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      const message = (error as Error).message;
      set({ error: message });
      return { success: false, error: message };
    } finally {
      set({ isLoading: false });
    }
  },

  verifyOtp: async (phone: string, otp: string) => {
    try {
      set({ isLoading: true, error: null });

      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

      // In dev mode without Twilio, OTP verification won't work
      // Users should use devLogin with test users instead
      if (DEV_MODE && otp === TEST_OTP) {
        // This is a hint for developers - real OTP won't work without Twilio
        throw new Error('Phone OTP requires Twilio setup. Please use the Dev Login screen with test users for development.');
      }

      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: 'sms',
      });

      if (error) throw error;

      if (data.user) {
        set({ userId: data.user.id, isAuthenticated: true });
        await get().fetchProfile();
      }

      return { success: true };
    } catch (error) {
      const message = (error as Error).message;
      set({ error: message });
      return { success: false, error: message };
    } finally {
      set({ isLoading: false });
    }
  },

  devLogin: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        set({ userId: data.user.id, isAuthenticated: true });
        await get().fetchProfile();
      }

      return { success: true };
    } catch (error) {
      const message = (error as Error).message;
      set({ error: message });
      return { success: false, error: message };
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true });

      await supabase.auth.signOut();

      set({
        isAuthenticated: false,
        userId: null,
        profile: null,
        role: null,
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProfile: async () => {
    const { userId } = get();
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found
          set({ profile: null, role: null });
          return;
        }
        throw error;
      }

      set({ profile: data, role: data.role });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  updateProfile: async (updates: Partial<Profile>) => {
    const { userId } = get();
    if (!userId) return { success: false, error: 'Not authenticated' };

    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      set({ profile: data, role: data.role });
      return { success: true };
    } catch (error) {
      const message = (error as Error).message;
      set({ error: message });
      return { success: false, error: message };
    } finally {
      set({ isLoading: false });
    }
  },

  uploadAvatar: async (uri: string) => {
    const { userId, role } = get();
    if (!userId) return { success: false, error: 'Not authenticated' };

    try {
      set({ isLoading: true, error: null });

      const folderPrefix = role === 'doctor' ? 'doctors' : 'guardians';
      const fileName = `${folderPrefix}/${userId}/${Date.now()}.jpg`;

      // Convert file to ArrayBuffer (fetch().blob() doesn't work in React Native)
      const arrayBuffer = await imageUtils.fileToArrayBuffer(uri);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: data.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Update local state
      set((state) => ({
        profile: state.profile
          ? { ...state.profile, avatar_url: data.publicUrl }
          : null,
      }));

      return { success: true, url: data.publicUrl };
    } catch (error) {
      const message = (error as Error).message;
      set({ error: message });
      return { success: false, error: message };
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
