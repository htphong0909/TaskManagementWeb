const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const base = process.argv[2];
const head = process.argv[3];

if (!base || !head) {
  console.error("usage: node review-package.js BASE HEAD [OUTFILE]");
  process.exit(2);
}

const shortBase = execSync(`git rev-parse --short ${base}`, { encoding: 'utf8' }).trim();
const shortHead = execSync(`git rev-parse --short ${head}`, { encoding: 'utf8' }).trim();

const sddDir = path.join(__dirname, '..', '..', '..', '..', '.superpowers', 'sdd');
fs.mkdirSync(sddDir, { recursive: true });

const outFile = process.argv[4] || path.join(sddDir, `review-${shortBase}..${shortHead}.diff`);

const commitsLog = execSync(`git log --oneline ${base}..${head}`, { encoding: 'utf8' });
const diffStat = execSync(`git diff --stat ${base}..${head}`, { encoding: 'utf8' });
const fullDiff = execSync(`git diff -U10 ${base}..${head}`, { encoding: 'utf8' });

const content = `# Review package: ${base}..${head}

## Commits
${commitsLog}

## Files changed
${diffStat}

## Diff
${fullDiff}
`;

fs.writeFileSync(outFile, content, 'utf8');
const count = execSync(`git rev-list --count ${base}..${head}`, { encoding: 'utf8' }).trim();
console.log(`wrote ${outFile}: ${count} commit(s), ${Buffer.byteLength(content, 'utf8')} bytes`);
