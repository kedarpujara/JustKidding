import {
  format,
  formatDistanceToNow,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
  differenceInMinutes,
  differenceInYears,
  addDays,
  startOfDay,
  endOfDay,
  isBefore,
  isAfter,
} from 'date-fns';

export const dateUtils = {
  formatDate(date: string | Date, formatString = 'dd MMM yyyy'): string {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, formatString);
  },

  formatTime(date: string | Date): string {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'h:mm a');
  },

  formatDateTime(date: string | Date): string {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'dd MMM yyyy, h:mm a');
  },

  formatRelativeDate(date: string | Date): string {
    const d = typeof date === 'string' ? parseISO(date) : date;

    if (isToday(d)) {
      return `Today at ${format(d, 'h:mm a')}`;
    }
    if (isTomorrow(d)) {
      return `Tomorrow at ${format(d, 'h:mm a')}`;
    }
    if (isYesterday(d)) {
      return `Yesterday at ${format(d, 'h:mm a')}`;
    }

    return format(d, 'dd MMM yyyy, h:mm a');
  },

  formatTimeAgo(date: string | Date): string {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(d, { addSuffix: true });
  },

  calculateAge(dateOfBirth: string | Date): {
    years: number;
    months: number;
    display: string;
  } {
    const dob = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : dateOfBirth;
    const now = new Date();

    const years = differenceInYears(now, dob);

    // Calculate remaining months
    const dobWithYearsAdded = addDays(dob, years * 365);
    const months = Math.floor(differenceInMinutes(now, dobWithYearsAdded) / (60 * 24 * 30));

    let display: string;
    if (years === 0) {
      display = months === 1 ? '1 month' : `${months} months`;
    } else if (years < 2) {
      display = `${years} year${years > 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
    } else {
      display = `${years} years`;
    }

    return { years, months, display };
  },

  getMinutesUntil(date: string | Date): number {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return differenceInMinutes(d, new Date());
  },

  isPast(date: string | Date): boolean {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return isBefore(d, new Date());
  },

  isFuture(date: string | Date): boolean {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return isAfter(d, new Date());
  },

  getWeekDays(): { value: number; label: string }[] {
    return [
      { value: 0, label: 'Sunday' },
      { value: 1, label: 'Monday' },
      { value: 2, label: 'Tuesday' },
      { value: 3, label: 'Wednesday' },
      { value: 4, label: 'Thursday' },
      { value: 5, label: 'Friday' },
      { value: 6, label: 'Saturday' },
    ];
  },

  getDayRange(date: Date): { start: Date; end: Date } {
    return {
      start: startOfDay(date),
      end: endOfDay(date),
    };
  },

  generateTimeSlots(
    startTime: string,
    endTime: string,
    durationMinutes: number
  ): string[] {
    const slots: string[] = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    let currentHour = startHour;
    let currentMin = startMin;

    while (
      currentHour < endHour ||
      (currentHour === endHour && currentMin < endMin)
    ) {
      const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
      slots.push(timeString);

      currentMin += durationMinutes;
      if (currentMin >= 60) {
        currentHour += Math.floor(currentMin / 60);
        currentMin = currentMin % 60;
      }
    }

    return slots;
  },
};
