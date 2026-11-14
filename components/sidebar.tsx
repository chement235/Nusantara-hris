"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ROLE_LABEL, type SessionUser } from "@/lib/types";
import { initials } from "@/lib/format";
import { Icon, type IconName } from "./icons";

type NavItem = { href: string; label: string; short: string; icon: IconName };

const SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Ringkasan",
    items: [{ href: "/", label: "Dashboard", short: "Beranda", icon: "dashboard" as const }],
  },
  {
    label: "Kepegawaian",
    items: [
      { href: "/karyawan", label: "Data Karyawan", short: "Karyawan", icon: "users" as const },
      { href: "/kehadiran", label: "Kehadiran", short: "Absen", icon: "clock" as const },
      { href: "/cuti", label: "Cuti & Izin", short: "Cuti", icon: "calendar" as const },
    ],
  },
  {
    label: "Talent",
    items: [
      { href: "/rekrutmen", label: "Rekrutmen", short: "Rekrutmen", icon: "briefcase" as const },
      { href: "/kinerja", label: "Penilaian Kinerja", short: "Kinerja", icon: "check" as const },
    ],
  },
  {
    label: "Keuangan",
    items: [{ href: "/payroll", label: "Payroll", short: "Gaji", icon: "wallet" as const }],
  },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-[268px] shrink-0 flex-col bg-slate-950 text-slate-300 md:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-500 text-sm font-bold text-white">
          N
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">Nusantara HR</p>
          <p className="text-[11px] text-slate-400">HRIS &amp; Payroll</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {section.label}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`nav-link ${isActive(pathname, item.href) ? "nav-link-active" : ""}`}
                  >
                    <Icon name={item.icon} />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-200">
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-xs font-semibold text-white">{user.name}</p>
            <p className="truncate text-[11px] text-slate-400">{ROLE_LABEL[user.role]}</p>
          </div>
          <form action="/logout" method="post">
            <button
              type="submit"
              title="Keluar"
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Icon name="logout" className="h-4 w-4" />
              <span className="sr-only">Keluar</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav({ user }: { user: SessionUser }) {
  return (
    <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur md:hidden">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
          N
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-slate-900">Nusantara HR</p>
          <p className="text-[10px] text-slate-500">
            {user.name.split(" ")[0]} · {ROLE_LABEL[user.role]}
          </p>
        </div>
      </div>
      <form action="/logout" method="post">
        <button
          type="submit"
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-xl text-slate-500 hover:bg-slate-100 active:bg-slate-200"
          aria-label="Keluar"
        >
          <Icon name="logout" className="h-[18px] w-[18px]" />
        </button>
      </form>
    </header>
  );
}

const BOTTOM_PRIMARY: NavItem[] = [
  { href: "/", label: "Dashboard", short: "Beranda", icon: "dashboard" as const },
  { href: "/karyawan", label: "Data Karyawan", short: "Karyawan", icon: "users" as const },
  { href: "/kehadiran", label: "Kehadiran", short: "Absen", icon: "clock" as const },
  { href: "/cuti", label: "Cuti & Izin", short: "Cuti", icon: "calendar" as const },
];

const BOTTOM_MORE: NavItem[] = [
  { href: "/payroll", label: "Payroll & slip gaji", short: "Payroll", icon: "wallet" as const },
  { href: "/rekrutmen", label: "Rekrutmen", short: "Rekrutmen", icon: "briefcase" as const },
  { href: "/kinerja", label: "Penilaian kinerja", short: "Kinerja", icon: "check" as const },
];

export function MobileBottomNav({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const moreActive = BOTTOM_MORE.some((item) => isActive(pathname, item.href));

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu lainnya">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-slate-900/40"
            aria-label="Tutup menu"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 shadow-xl"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" aria-hidden="true" />
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                {initials(user.name)}
              </span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
                <p className="truncate text-[11px] text-slate-500">{ROLE_LABEL[user.role]}</p>
              </div>
            </div>
            <ul className="space-y-1">
              {BOTTOM_MORE.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100"
                  >
                    <Icon name={item.icon} className="h-5 w-5 text-slate-500" />
                    {item.label}
                    <span className="ml-auto text-slate-300">›</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={`/karyawan/${user.employeeId}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100"
                >
                  <Icon name="user" className="h-5 w-5 text-slate-500" />
                  Profil saya
                  <span className="ml-auto text-slate-300">›</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      )}

      <nav
        className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Navigasi utama"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {BOTTOM_PRIMARY.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 pt-1.5 text-[10px] font-medium transition-colors ${
                    active ? "text-indigo-600" : "text-slate-500 active:text-slate-700"
                  }`}
                >
                  <span
                    className={`grid h-7 w-10 place-items-center rounded-full ${
                      active ? "bg-indigo-50" : ""
                    }`}
                  >
                    <Icon name={item.icon} className="h-[20px] w-[20px]" />
                  </span>
                  <span>{item.short}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              className={`flex min-h-[56px] w-full cursor-pointer flex-col items-center justify-center gap-0.5 px-1 pt-1.5 text-[10px] font-medium transition-colors ${
                moreActive ? "text-indigo-600" : "text-slate-500 active:text-slate-700"
              }`}
            >
              <span
                className={`grid h-7 w-10 place-items-center rounded-full ${
                  moreActive ? "bg-indigo-50" : ""
                }`}
              >
                <Icon name="plus" className="h-[20px] w-[20px]" />
              </span>
              <span>Menu</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
