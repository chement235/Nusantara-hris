import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { all } from "@/lib/db";

type TalentRow = {
  id: number;
  full_name: string;
  position: string;
  department_name: string;
  final_score: number;
  potential: number | null;
};

type Band = "rendah" | "sedang" | "tinggi";

function perfBand(score: number): Band {
  if (score >= 3.5) return "tinggi";
  if (score >= 2.5) return "sedang";
  return "rendah";
}

function potBand(potential: number | null): Band {
  if (potential === null) return "sedang";
  if (potential >= 4) return "tinggi";
  if (potential >= 3) return "sedang";
  return "rendah";
}

const QUADRANTS: Record<`${Band}-${Band}`, { label: string; tone: "emerald" | "sky" | "violet" | "amber" | "indigo" | "rose" | "slate" }> = {
  "tinggi-tinggi": { label: "Bintang (Star)", tone: "emerald" },
  "tinggi-sedang": { label: "Kontributor Kuat", tone: "sky" },
  "tinggi-rendah": { label: "Ahli Fungsional", tone: "indigo" },
  "sedang-tinggi": { label: "Potensi Tinggi", tone: "violet" },
  "sedang-sedang": { label: "Inti (Core Player)", tone: "sky" },
  "sedang-rendah": { label: "Pelaksana Andal", tone: "indigo" },
  "rendah-tinggi": { label: "Belum Terbukti", tone: "amber" },
  "rendah-sedang": { label: "Perlu Pengembangan", tone: "amber" },
  "rendah-rendah": { label: "Perlu Perhatian", tone: "rose" },
};

// Urutan visual: baris = kinerja (tinggi → rendah), kolom = potensi (rendah → tinggi).
const GRID: { perf: Band; pot: Band }[] = [
  { perf: "tinggi", pot: "rendah" },
  { perf: "tinggi", pot: "sedang" },
  { perf: "tinggi", pot: "tinggi" },
  { perf: "sedang", pot: "rendah" },
  { perf: "sedang", pot: "sedang" },
  { perf: "sedang", pot: "tinggi" },
  { perf: "rendah", pot: "rendah" },
  { perf: "rendah", pot: "sedang" },
  { perf: "rendah", pot: "tinggi" },
];

export default async function NineBoxPage() {
  const session = await requireSession();
  if (session.role !== "hr" && session.role !== "manager") {
    redirect("/?denied=1");
  }

  const rows = all<TalentRow>(
    `SELECT e.id, e.full_name, e.position, d.name AS department_name,
            a.final_score,
            (SELECT s.score FROM appraisal_scores s
              WHERE s.appraisal_id = a.id AND s.criterion = 'inisiatif') AS potential
     FROM employees e
     JOIN departments d ON d.id = e.department_id
     JOIN appraisals a ON a.employee_id = e.id
     WHERE e.status = 'Aktif'
       AND a.final_score IS NOT NULL
       AND a.id = (SELECT id FROM appraisals
                    WHERE employee_id = e.id AND final_score IS NOT NULL
                    ORDER BY id DESC LIMIT 1)
     ORDER BY e.full_name`,
  );

  const cells = GRID.map(({ perf, pot }) => {
    const members = rows.filter((row) => perfBand(Number(row.final_score)) === perf && potBand(row.potential) === pot);
    const quadrant = QUADRANTS[`${perf}-${pot}`];
    return { perf, pot, members, quadrant };
  });

  return (
    <>
      <PageHeader
        title="Matriks Talent 9-Box"
        description="Kinerja (nilai akhir penilaian) vs potensi (skor kriteria Inisiatif pada penilaian terakhir)"
      >
        <Link href="/kinerja" className="btn btn-ghost">
          ← Penilaian
        </Link>
      </PageHeader>

      <Card>
        <CardHeader
          title="Peta talent"
          subtitle={`${rows.length} karyawan dengan penilaian final · sumbu potensi diestimasi dari kriteria Inisiatif`}
        />
        {rows.length === 0 ? (
          <EmptyState
            title="Belum ada data penilaian final"
            description="9-Box akan terisi setelah penilaian kinerja difinalisasi."
          />
        ) : (
          <div className="p-5">
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <div />
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <span>Potensi rendah</span>
                <span>Potensi sedang</span>
                <span>Potensi tinggi</span>
              </div>
              <div className="flex items-center">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 [writing-mode:vertical-rl] [transform:rotate(180deg)]">
                  Kinerja tinggi
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {cells.slice(0, 3).map((cell) => (
                  <GridCell key={`${cell.perf}-${cell.pot}`} {...cell} />
                ))}
              </div>
              <div className="flex items-center">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 [writing-mode:vertical-rl] [transform:rotate(180deg)]">
                  Kinerja sedang
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {cells.slice(3, 6).map((cell) => (
                  <GridCell key={`${cell.perf}-${cell.pot}`} {...cell} />
                ))}
              </div>
              <div className="flex items-center">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 [writing-mode:vertical-rl] [transform:rotate(180deg)]">
                  Kinerja rendah
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {cells.slice(6, 9).map((cell) => (
                  <GridCell key={`${cell.perf}-${cell.pot}`} {...cell} />
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card className="mt-5">
        <CardHeader title="Daftar karyawan & kuadran" subtitle="Berdasarkan penilaian kinerja terakhir" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Karyawan</th>
                <th className="th">Departemen</th>
                <th className="th">Kinerja</th>
                <th className="th">Potensi</th>
                <th className="th">Kuadran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const perf = perfBand(Number(row.final_score));
                const pot = potBand(row.potential);
                const quadrant = QUADRANTS[`${perf}-${pot}`];
                return (
                  <tr key={row.id} className="hover:bg-slate-50/60">
                    <td className="td">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={row.full_name} size="sm" />
                        <div className="leading-tight">
                          <p className="text-sm font-medium text-slate-900">{row.full_name}</p>
                          <p className="text-[11px] text-slate-500">{row.position}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td text-slate-600">{row.department_name}</td>
                    <td className="td">{Number(row.final_score).toFixed(2)}</td>
                    <td className="td">{row.potential === null ? "—" : `${row.potential}/5`}</td>
                    <td className="td">
                      <Badge tone={quadrant.tone}>{quadrant.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function GridCell({
  perf,
  pot,
  members,
  quadrant,
}: {
  perf: Band;
  pot: Band;
  members: TalentRow[];
  quadrant: { label: string; tone: "emerald" | "sky" | "violet" | "amber" | "indigo" | "rose" | "slate" };
}) {
  return (
    <div className="min-h-[120px] rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-slate-700">{quadrant.label}</p>
        <Badge tone={quadrant.tone}>{members.length}</Badge>
      </div>
      <ul className="mt-2 space-y-1">
        {members.slice(0, 4).map((member) => (
          <li key={member.id} className="truncate text-[11px] text-slate-600">
            {member.full_name}
          </li>
        ))}
        {members.length > 4 && (
          <li className="text-[11px] text-slate-400">+{members.length - 4} lainnya</li>
        )}
      </ul>
    </div>
  );
}
