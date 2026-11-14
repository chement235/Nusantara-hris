export type Criterion = {
  key: string;
  label: string;
  weight: number;
  description: string;
};

/** Kriteria penilaian kinerja standar (bobot total 100). */
export const CRITERIA: Criterion[] = [
  {
    key: "kualitas",
    label: "Kualitas kerja",
    weight: 25,
    description: "Ketepatan hasil, kelengkapan, dan kepatuhan pada standar mutu.",
  },
  {
    key: "produktivitas",
    label: "Produktivitas",
    weight: 25,
    description: "Volume dan ketepatan waktu penyelesaian pekerjaan.",
  },
  {
    key: "kerjasama",
    label: "Kerja sama",
    weight: 20,
    description: "Kolaborasi lintas tim, komunikasi, dan dukungan kepada rekan.",
  },
  {
    key: "inisiatif",
    label: "Inisiatif",
    weight: 15,
    description: "Proaktif memperbaiki proses dan menyelesaikan masalah.",
  },
  {
    key: "disiplin",
    label: "Disiplin",
    weight: 15,
    description: "Kehadiran, kepatuhan kebijakan, dan tanggung jawab.",
  },
];

export const SCORE_LABEL: Record<number, string> = {
  1: "Sangat kurang",
  2: "Kurang",
  3: "Sesuai harapan",
  4: "Di atas harapan",
  5: "Istimewa",
};

export function ratingFor(score: number): string {
  if (score >= 4.5) return "Istimewa";
  if (score >= 3.5) return "Di atas harapan";
  if (score >= 2.5) return "Sesuai harapan";
  if (score >= 1.5) return "Perlu perbaikan";
  return "Tidak memenuhi";
}

export function weightedScore(
  scores: { criterion: string; score: number | null }[],
): number | null {
  let total = 0;
  let weight = 0;
  for (const criterion of CRITERIA) {
    const row = scores.find((item) => item.criterion === criterion.key);
    if (!row || row.score === null) continue;
    total += row.score * criterion.weight;
    weight += criterion.weight;
  }
  if (weight === 0) return null;
  return Math.round((total / weight) * 100) / 100;
}
