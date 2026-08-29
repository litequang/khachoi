const fs = require('fs');
const content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
console.log(content.match(/const designingTasks = useMemo\(\(\) => \{[\s\S]*?\}, \[tasks\]\);/)[0]);
