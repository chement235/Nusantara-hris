export const APPLICANT_STAGES = [
  "Baru",
  "Screening",
  "Interview",
  "Penawaran",
  "Diterima",
  "Ditolak",
] as const;

export type ApplicantStage = (typeof APPLICANT_STAGES)[number];

export const STAGE_TONE: Record<
  ApplicantStage,
  "slate" | "sky" | "amber" | "indigo" | "emerald" | "rose"
> = {
  Baru: "slate",
  Screening: "sky",
  Interview: "amber",
  Penawaran: "indigo",
  Diterima: "emerald",
  Ditolak: "rose",
};

export const ACTIVE_STAGES: ApplicantStage[] = ["Baru", "Screening", "Interview", "Penawaran"];
