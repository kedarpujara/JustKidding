import { create } from 'zustand';
import type { Child, Appointment, DoctorProfile, Profile } from '@/types';

interface AppState {
  // Selected items for booking flow
  selectedChild: Child | null;
  selectedDoctor: (DoctorProfile & { profile: Profile }) | null;
  selectedSlotId: string | null;

  // Current video call
  activeVideoSession: {
    appointmentId: string;
    roomName: string;
    token: string;
  } | null;

  // UI state
  isBookingInProgress: boolean;
  currentIntakeAppointmentId: string | null;

  // Actions
  setSelectedChild: (child: Child | null) => void;
  setSelectedDoctor: (doctor: (DoctorProfile & { profile: Profile }) | null) => void;
  setSelectedSlot: (slotId: string | null) => void;
  setActiveVideoSession: (session: AppState['activeVideoSession']) => void;
  setBookingInProgress: (inProgress: boolean) => void;
  setCurrentIntakeAppointmentId: (id: string | null) => void;
  resetBookingFlow: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedChild: null,
  selectedDoctor: null,
  selectedSlotId: null,
  activeVideoSession: null,
  isBookingInProgress: false,
  currentIntakeAppointmentId: null,

  setSelectedChild: (child) => set({ selectedChild: child }),
  setSelectedDoctor: (doctor) => set({ selectedDoctor: doctor }),
  setSelectedSlot: (slotId) => set({ selectedSlotId: slotId }),
  setActiveVideoSession: (session) => set({ activeVideoSession: session }),
  setBookingInProgress: (inProgress) => set({ isBookingInProgress: inProgress }),
  setCurrentIntakeAppointmentId: (id) => set({ currentIntakeAppointmentId: id }),

  resetBookingFlow: () =>
    set({
      selectedChild: null,
      selectedDoctor: null,
      selectedSlotId: null,
      isBookingInProgress: false,
      currentIntakeAppointmentId: null,
    }),
}));
