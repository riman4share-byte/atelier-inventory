/**
 * Publishes the app to Cloudflare Pages and then proves that the live site
 * is serving that exact build.
 *
 * The Cloudflare Git integration builds the same commit on its own, and its
 * build queue can finish an older commit after a newer one - which silently
 * rolls the site back. Publishing from here, and checking the asset hash
 * that the browser will actually get, makes that impossible to miss.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT = 'atelier-inventory';
const SITE = `https://${PROJECT}.pages.dev`;

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

/** The built bundle in dist, named after its content hash. */
function builtBundle() {
  const bundle = readdirSync(join('dist', 'assets')).find((name) => /^index-.*\.js$/.test(name));
  if (!bundle) {
    throw new Error('There is no bundle in dist/assets. Run "npm run build" first.');
  }
  return bundle;
}

async function main() {
  const bundle = builtBundle();

  // A build without the Supabase project would show the setup screen to
  // everybody. Better to stop before publishing than after.
  const code = readFileSync(join('dist', 'assets', bundle), 'utf8');
  if (!/https:\/\/[a-z0-9]{20}\.supabase\.co/.test(code)) {
    throw new Error(
      'This build has no Supabase project in it. Put VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.production.local, then build again.',
    );
  }

  const sha = git(['rev-parse', 'HEAD']);
  const message = git(['log', '-1', '--pretty=%s']);

  // npx is a .cmd on Windows, so it is run through Node directly: a command
  // line through cmd.exe would mangle a commit message with parentheses.
  const npxCli = join(process.execPath, '..', 'node_modules', 'npm', 'bin', 'npx-cli.js');
  const npx = existsSync(npxCli) ? npxCli : 'npx';

  execFileSync(
    process.execPath,
    [npx, 'wrangler', 'pages', 'deploy', 'dist', `--project-name=${PROJECT}`, '--branch=main', `--commit-hash=${sha}`, `--commit-message=${message}`],
    { stdio: 'inherit' },
  );

  // The live site must serve this bundle, not an older one.
  const html = await (await fetch(`${SITE}/`, { headers: { 'cache-control': 'no-cache' } })).text();
  const live = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0];
  if (!live || !live.endsWith(bundle)) {
    console.error(`The live site is serving ${live ?? 'nothing'} but this build is ${bundle}.`);
    process.exit(1);
  }
  console.log(`Live: ${SITE} is serving ${bundle} (commit ${sha.slice(0, 7)}).`);
}

await main();
