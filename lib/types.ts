export type WeeklyFast = {
  id: string;
  year: number;
  week: number;
  title: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

export type WeeklyFastSubject = {
  id: string;
  weekly_fast_id: string;
  position: number;
  label: string;
};

export type FastEntry = {
  id: string;
  device_id: string;
  user_name: string | null;
  weekly_fast_id: string;
  created_at: string;
  updated_at: string;
};

export type FastEntrySubject = {
  id: string;
  fast_entry_id: string;
  weekly_fast_subject_id: string;
  intercessions: number;
  prayer_minutes: number;
};

export type SubjectValues = {
  intercessions: number;
  prayerMinutes: number;
};

export type WeekData = {
  weeklyFast: WeeklyFast;
  subjects: WeeklyFastSubject[];
  values: Record<string, SubjectValues>;
};
