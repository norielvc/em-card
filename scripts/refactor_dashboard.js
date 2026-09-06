const fs = require('fs');
const file = 'c:/Users/SCREENS/OneDrive/Desktop/EM-CARD/app/admin/page.jsx';
let content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

const startSidebar = 3222; // index 3222 is line 3223
const endSidebar = 3302; // up to line 3302 (exclusive)

const sidebarLines = lines.slice(startSidebar, endSidebar);
const remainingLinesBefore = lines.slice(0, startSidebar);
const remainingLinesAfter = lines.slice(endSidebar);

let endIdx = -1;
for (let i = 0; i < remainingLinesAfter.length; i++) {
  if (remainingLinesAfter[i].trim() === '</>' && remainingLinesAfter[i+1] && remainingLinesAfter[i+1].trim() === ');' && remainingLinesAfter[i+2] && remainingLinesAfter[i+2].trim() === '};') {
    endIdx = i;
    break;
  }
}

if (endIdx !== -1) {
  const newAfter = [
    '      <div className=\"dashboard-layout-grid\">',
    '        <main className=\"dash-main-col\">',
    ...remainingLinesAfter.slice(0, endIdx),
    '        </main>',
    '        <aside className=\"dash-sidebar-col\">',
    ...sidebarLines,
    '        </aside>',
    '      </div>',
    ...remainingLinesAfter.slice(endIdx)
  ];
  fs.writeFileSync(file, [...remainingLinesBefore, ...newAfter].join('\n'));
  console.log('Success');
} else {
  console.log('Could not find end of renderDashboard');
}
