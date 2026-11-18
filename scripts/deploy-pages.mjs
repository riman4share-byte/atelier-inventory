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

  const deployOutput = execFileSync(
    process.execPath,
    [npx, 'wrangler', 'pages', 'deploy', 'dist', `--project-name=${PROJECT}`, '--branch=main', `--commit-hash=${sha}`, `--commit-message=${message}`],
    { stdio: ['inherit', 'pipe', 'inherit'], encoding: 'utf8' },
  );
  process.stdout.write(deployOutput);

  // The live site must serve this deployment.
  //
  // The asset name is not compared on its own: Cloudflare's own build of the
  // same commit can differ by a byte or two (a trailing newline), which
  // changes the hash without changing the app. The code is compared instead.
  const deploymentUrl = deployOutput.match(/https:\/\/[a-z0-9]+\.atelier-inventory\.pages\.dev/)?.[0];
  if (!deploymentUrl) throw new Error('The deploy did not report a deployment address.');

  const liveHtml = await (await fetch(`${SITE}/`, { headers: { 'cache-control': 'no-cache' } })).text();
  const liveAsset = liveHtml.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0];
  if (!liveAsset) throw new Error('The live site serves no app bundle.');

  const liveCode = await (await fetch(`${SITE}${liveAsset}`)).text();
  const deploymentCode = await (await fetch(`${deploymentUrl}${liveAsset}`)).text();
  const same = liveCode.replace(/\s+/g, '') === deploymentCode.replace(/\s+/g, '');

  if (!same) {
    console.error(`The live site is serving ${liveAsset}, which is not this build.`);
    process.exit(1);
  }
  console.log(`Live: ${SITE} is serving ${liveAsset} (commit ${sha.slice(0, 7)}).`);
}

await main();
