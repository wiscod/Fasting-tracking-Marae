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

export type FastKind = "team" | "personal";

export type FastEntry = {
  id: string;
  device_id: string;
  user_name: string | null;
  kind: FastKind;
  weekly_fast_id: string | null;
  title: string | null;
  fast_date: string | null;
  in_team_fast: boolean;
  global_hours: number | null;
  created_at: string;
  updated_at: string;
};

export type FastEntrySubject = {
  id: string;
  fast_entry_id: string;
  weekly_fast_subject_id: string | null;
  custom_label: string | null;
  intercessions: number;
  hours: number;
  position: number;
};
