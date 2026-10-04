import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const outDir = path.resolve('../screenshots');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function setAuth(page, email, password) {
  const res = await fetch('http://localhost:8080/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then((r) => r.json());

  if (!res.success || !res.data) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res)}`);
  }

  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate((data) => {
    localStorage.setItem('token', data.accessToken);
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: data.userId,
        name: data.name,
        email: data.email,
        roles: data.roles,
      })
    );
  }, res.data);
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  });

  const page = await browser.newPage();

  console.log('1. Capturing login page...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(outDir, 'login.png') });

  console.log('2. Capturing Admin pages...');
  await setAuth(page, 'admin@sekolah.id', 'password');

  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'admin-dashboard.png') });

  await page.goto('http://localhost:3000/teachers', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'admin-teachers.png') });

  await page.goto('http://localhost:3000/students', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'admin-students.png') });

  await page.goto('http://localhost:3000/classrooms', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'admin-classrooms.png') });

  await page.goto('http://localhost:3000/subjects', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'admin-subjects.png') });

  await page.goto('http://localhost:3000/announcements', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'admin-announcements.png') });

  console.log('3. Capturing Teacher pages...');
  await setAuth(page, 'budi@sekolah.id', 'password');

  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'teacher-dashboard.png') });

  await page.goto('http://localhost:3000/materials', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'teacher-materials.png') });

  await page.goto('http://localhost:3000/assignments', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'teacher-assignments.png') });

  await page.goto('http://localhost:3000/exams', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'teacher-exams.png') });

  await page.goto('http://localhost:3000/exams/builder/1', { waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'teacher-questions.png') });

  console.log('4. Capturing Student pages (Mobile Viewport)...');
  await page.setViewport({ width: 440, height: 850, deviceScaleFactor: 2 });
  await setAuth(page, 'andi.pratama1@siswa.id', 'password');

  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'student-dashboard.png') });

  await page.goto('http://localhost:3000/materials', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'student-materials.png') });

  await page.goto('http://localhost:3000/assignments', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'student-assignments.png') });

  await page.goto('http://localhost:3000/exams', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'student-exams.png') });

  await page.goto('http://localhost:3000/grades', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'student-grades.png') });

  await browser.close();
  console.log('ALL SCREENSHOTS CAPTURED PERFECTLY!');
}

run().catch((err) => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
