import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi").fill("demo1234");
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL("**/");
}

test.describe("login & RBAC", () => {
  test("HR dapat membuka dashboard dan halaman khusus HR", async ({ page }) => {
    await login(page, "rani.puspita@nusantara.co.id");
    await expect(page.getByRole("heading", { name: "Selamat datang, Rani" })).toBeVisible();

    for (const path of ["/organisasi", "/laporan", "/tim", "/payroll/analitik"]) {
      await page.goto(path);
      await expect(page.getByRole("heading").first()).toBeVisible();
      expect(page.url()).toContain(path);
    }
  });

  test("karyawan diarahkan keluar dari halaman khusus HR", async ({ page }) => {
    await login(page, "dewi.lestari@nusantara.co.id");
    await page.goto("/tim");
    await page.waitForURL("**/?denied=1");
    await page.goto("/laporan");
    await page.waitForURL("**/?denied=1");
  });

  test("manager dapat membuka Tim Saya", async ({ page }) => {
    await login(page, "budi.santoso@nusantara.co.id");
    await page.goto("/tim");
    await expect(page.getByRole("heading", { name: "Tim Saya" })).toBeVisible();
  });
});

test.describe("PII & akses data", () => {
  test("karyawan melihat NPWP sendiri utuh dan NPWP orang lain tersamar", async ({ page }) => {
    await login(page, "dewi.lestari@nusantara.co.id");
    await page.goto("/karyawan/6");
    await expect(page.getByText("09.105.305.5-405.000")).toBeVisible();

    await page.goto("/karyawan/1");
    await expect(page.getByText("09.1••••••••••••••••")).toBeVisible();
    await expect(page.getByText("09.101.301.1-401.000")).toHaveCount(0);
  });
});

test.describe("ESS — kehadiran", () => {
  test("karyawan absen masuk dan pulang", async ({ page }) => {
    await login(page, "dewi.lestari@nusantara.co.id");
    await page.goto("/kehadiran");

    const clockIn = page.getByRole("button", { name: "Absen masuk" });
    if (await clockIn.isVisible()) {
      await clockIn.click();
      await page.waitForURL("**/kehadiran**");
    }

    await page.goto("/kehadiran");
    const clockOut = page.getByRole("button", { name: "Absen pulang" });
    if (await clockOut.isVisible()) {
      await clockOut.click();
      await page.waitForURL("**/kehadiran**");
    }

    await page.goto("/kehadiran");
    await expect(page.getByText("Absen pulang tercatat")).toBeVisible();
  });
});
