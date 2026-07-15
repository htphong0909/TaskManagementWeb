const fs = require('fs');
const path = require('path');

const planFile = process.argv[2];
const taskNum = process.argv[3];
const outFile = process.argv[4] || path.join(__dirname, '..', '..', '..', '..', '.superpowers', 'sdd', `task-${taskNum}-brief.md`);

if (!planFile || !taskNum) {
  console.error("Usage: node task-brief.js PLAN_FILE TASK_NUMBER [OUTFILE]");
  process.exit(2);
}

if (!fs.existsSync(planFile)) {
  console.error(`no such plan file: ${planFile}`);
  process.exit(2);
}

const content = fs.readFileSync(planFile, 'utf8');
const lines = content.split(/\r?\n/);
let inTask = false;
let infence = false;
const extracted = [];

for (const line of lines) {
  if (line.startsWith('```')) {
    infence = !infence;
  }
  if (!infence && /^#+\s+Task\s+(\d+)/i.test(line)) {
    const match = line.match(/^#+\s+Task\s+(\d+)/i);
    if (match[1] === taskNum) {
      inTask = true;
    } else {
      inTask = false;
    }
  }
  if (inTask) {
    extracted.push(line);
  }
}

if (extracted.length === 0) {
  console.error(`task ${taskNum} not found in ${planFile}`);
  process.exit(3);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, extracted.join('\n'));
console.log(`wrote ${outFile}: ${extracted.length} lines`);
