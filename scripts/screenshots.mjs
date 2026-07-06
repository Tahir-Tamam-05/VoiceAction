// Visual validation harness — captures the three rebuilt experiences across
// viewports and themes. Run a dev server first:
//   Landing pass:  npm run dev                      (unauthenticated)
//   App pass:      VITE_DEV_BYPASS_AUTH=true npm run dev
// Then: node scripts/screenshots.mjs landing|app
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const MODE = process.argv[2] ?? 'landing';
const OUT = 'screenshots';
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = {
  m320: { width: 320, height: 568 },
  m375: { width: 375, height: 667 },
  m390: { width: 390, height: 844 },
  m430: { width: 430, height: 932 },
  tabP: { width: 768, height: 1024 },
  tabL: { width: 1024, height: 768 },
  d1366: { width: 1366, height: 768 },
  d1440: { width: 1440, height: 900 },
};

const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});

async function shoot(name, viewport, theme, actions) {
  const context = await browser.newContext({
    viewport,
    permissions: ['microphone'],
    reducedMotion: 'no-preference',
  });
  await context.addInitScript((t) => {
    localStorage.setItem('voiceaction_theme', t);
    localStorage.setItem('va_onboarding_complete', 'true');
    localStorage.setItem('va_graph_hints_seen', 'true');
    localStorage.setItem('va_intel_notice_seen', 'true');
  }, theme);
  const page = await context.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1200);
  if (actions) await actions(page);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await context.close();
  console.log('✓', name);
}

if (MODE === 'landing') {
  await shoot('landing-dark-320', VIEWPORTS.m320, 'dark', (p) => p.waitForTimeout(5500));
  await shoot('landing-dark-390', VIEWPORTS.m390, 'dark', (p) => p.waitForTimeout(8200)); // retrieve stage
  await shoot('landing-dark-768', VIEWPORTS.tabP, 'dark', (p) => p.waitForTimeout(3000));
  await shoot('landing-dark-1440', VIEWPORTS.d1440, 'dark', (p) => p.waitForTimeout(8200));
  await shoot('landing-light-390', VIEWPORTS.m390, 'light', (p) => p.waitForTimeout(8200));
  await shoot('landing-light-1440', VIEWPORTS.d1440, 'light', (p) => p.waitForTimeout(3000));
  await shoot('signin-dark-390', VIEWPORTS.m390, 'dark', async (p) => {
    await p.getByText('I already have an account').click().catch(() => {});
    await p.waitForTimeout(1200);
  });
} else {
  const loadDemo = async (p) => {
    const demo = p.getByText(/demo workspace/i).first();
    if (await demo.isVisible().catch(() => false)) {
      await demo.click();
      await p.waitForTimeout(1800);
    }
  };
  await shoot('home-dark-390', VIEWPORTS.m390, 'dark', loadDemo);
  await shoot('home-dark-1440', VIEWPORTS.d1440, 'dark', loadDemo);
  await shoot('home-light-390', VIEWPORTS.m390, 'light', loadDemo);
  await shoot('home-dark-320', VIEWPORTS.m320, 'dark', loadDemo);
  await shoot('recording-dark-390', VIEWPORTS.m390, 'dark', async (p) => {
    await loadDemo(p);
    await p.getByLabel('Record a thought').click();
    await p.waitForTimeout(3500); // field active with fake mic tone
  });
  await shoot('recording-dark-430', VIEWPORTS.m430, 'dark', async (p) => {
    await loadDemo(p);
    await p.getByLabel('Record a thought').click();
    await p.waitForTimeout(2000);
  });
  await shoot('graph-dark-390', VIEWPORTS.m390, 'dark', async (p) => {
    await loadDemo(p);
    await p.getByLabel('Graph').click();
    await p.waitForTimeout(4500);
  });
  await shoot('graph-dark-1366', VIEWPORTS.d1366, 'dark', async (p) => {
    await loadDemo(p);
    await p.getByLabel('Graph').click();
    await p.waitForTimeout(4500);
  });
  await shoot('history-dark-390', VIEWPORTS.m390, 'dark', async (p) => {
    await loadDemo(p);
    await p.getByLabel('History').click();
    await p.waitForTimeout(1500);
  });
  await shoot('settings-dark-375', VIEWPORTS.m375, 'dark', async (p) => {
    await loadDemo(p);
    await p.getByLabel('Settings').click();
    await p.waitForTimeout(1500);
  });
  await shoot('home-tablet-landscape', VIEWPORTS.tabL, 'dark', loadDemo);
}

await browser.close();
console.log('done');
