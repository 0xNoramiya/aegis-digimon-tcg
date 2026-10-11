/** The opt-in group of players who agreed to be invited to interviews and usability studies. */
export type PlaytestMembership = { member: boolean; since: number | null };

export type PlaytestMember = { id: string; displayName: string; since: number };

export const MAX_STUDY_TITLE = 120;
export const MAX_STUDY_BLURB = 600;
export const MAX_STUDY_LINK = 500;

/** One recruiting window. Members are told through the notification bell while it is open. */
export type PlaytestStudy = {
  id: number;
  title: string;
  blurb: string;
  link: string;
  opensAt: number;
  closesAt: number;
  createdAt: number;
};

export type PlaytestStudyNotification = {
  studyId: number;
  title: string;
  blurb: string;
  link: string;
  closesAt: number;
};

export type PlaytestStudyFailure = "invalid_title" | "invalid_blurb" | "invalid_link" | "invalid_window";
