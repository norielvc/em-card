const fs = require('fs');
const path = require('path');

const cssPath = path.resolve(__dirname, '../app/globals.css');
const lines = fs.readFileSync(cssPath, 'utf8').split('\n');

lines.forEach((line, idx) => {
  if (line.includes('.admin-table') || line.includes('.residents-action-bar') || line.includes('.table-responsive') || line.includes('.member-row') || line.includes('.filter-selects-wrap') || line.includes('.status-badge')) {
    console.log(`Line ${idx + 1}: ${line.trim().slice(0, 100)}`);
  }
});
