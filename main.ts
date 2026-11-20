import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

/** The entry directory is stable even when the hand-in command runs from another cwd. */
const entryDir = fileURLToPath(new URL('.', import.meta.url));
const handoffDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Copy one hand-in folder while keeping the output layout predictable. */
function copyFolder(folderName: string): void {
  const source = join(entryDir, folderName);
  if (!existsSync(source)) return;
  cpSync(source, join(handoffDir, folderName), { recursive: true });
}

function writeHandoffDossier(): void {
  const dossier = buildDossier(handoffDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  });
  writeFileSync(join(handoffDir, 'dossier.json'), dossier);
}

mkdirSync(handoffDir, { recursive: true });
copyFolder('app');
copyFolder('screenshots');
writeHandoffDossier();
