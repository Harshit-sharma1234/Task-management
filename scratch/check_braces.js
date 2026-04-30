const fs = require('fs');
const content = fs.readFileSync('src/app/dashboard/[workspace]/team/actions.ts', 'utf8');
let balance = 0;
let lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    for (let char of line) {
        if (char === '{') balance++;
        if (char === '}') balance--;
    }
    console.log(`${i + 1}: [${balance}] ${line}`);
}
