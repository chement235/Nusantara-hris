import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

const DEMO_ACCOUNTS = [
  {
    name: "Rani Puspita",
    role: "HR Admin",
    email: "rani.puspita@nusantara.co.id",
    description: "Akses penuh: karyawan, cuti, payroll",
  },
  {
    name: "Budi Santoso",
    role: "Manager",
    email: "budi.santoso@nusantara.co.id",
    description: "Menyetujui cuti tim Engineering",
  },
  {
    name: "Dewi Lestari",
    role: "Karyawan",
    email: "dewi.lestari@nusantara.co.id",
    description: "Self-service: absensi, cuti, slip gaji",
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/");

  const { error } = await searchParams;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-slate-950 p-10 text-slate-300 lg:flex">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500 text-base font-bold text-white">
            N
          </span>
          <div className="leading-tight">
            <p className="text-base font-semibold text-white">Nusantara HR</p>
            <p className="text-xs text-slate-400">HRIS &amp; Payroll untuk tim modern</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white">
            Semua urusan SDM dalam satu sistem.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Data karyawan, absensi, cuti, sampai payroll dan slip gaji — terhubung dengan satu
            basis data dan alur persetujuan yang jelas.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              "Dashboard kehadiran & headcount real-time",
              "Pengajuan cuti dengan saldo dan persetujuan atasan",
              "Payroll otomatis: BPJS, PPh 21, potongan absen",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
                  ✓
                </span>
                <span className="text-slate-300">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative grid grid-cols-3 gap-4 border-t border-white/10 pt-6 text-sm">
          <div>
            <p className="text-lg font-semibold text-white">27</p>
            <p className="text-xs text-slate-400">karyawan aktif</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-white">5</p>
            <p className="text-xs text-slate-400">departemen</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-white">1</p>
            <p className="text-xs text-slate-400">sistem terpadu</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-5 py-10 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
              N
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-900">Nusantara HR</p>
              <p className="text-[11px] text-slate-500">HRIS &amp; Payroll</p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Masuk ke akun Anda</h2>
          <p className="mt-1 text-sm text-slate-500">
            Gunakan akun perusahaan untuk mengakses ruang kerja HR.
          </p>

          {error && (
            <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
              {error}
            </div>
          )}

          <form action="/api/login" method="post" className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                defaultValue="rani.puspita@nusantara.co.id"
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Kata sandi
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                defaultValue="demo1234"
                className="input"
              />
            </div>
            <button type="submit" className="btn btn-primary w-full">
              Masuk
            </button>
          </form>

          <div className="mt-8">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Akun demo · kata sandi demo1234
            </p>
            <div className="mt-3 space-y-2">
              {DEMO_ACCOUNTS.map((account) => (
                <form key={account.email} action="/api/login" method="post">
                  <input type="hidden" name="email" value={account.email} />
                  <input type="hidden" name="password" value="demo1234" />
                  <button
                    type="submit"
                    className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-800">
                        {account.name}
                      </span>
                      <span className="block truncate text-[11px] text-slate-500">
                        {account.description}
                      </span>
                    </span>
                    <span className="badge shrink-0 bg-slate-100 text-slate-600">
                      {account.role}
                    </span>
                  </button>
                </form>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
