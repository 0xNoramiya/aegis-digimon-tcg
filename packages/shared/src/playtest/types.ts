export type PlaytestMembership = { member: boolean; since: number | null };

export type PlaytestMember = { id: string; displayName: string; since: number };

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
