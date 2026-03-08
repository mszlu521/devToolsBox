const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'electron/main.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace all electron.xxx with xxx
content = content.replace(/electron\.app/g, 'app');
content = content.replace(/electron\.BrowserWindow/g, 'BrowserWindow');
content = content.replace(/electron\.ipcMain/g, 'ipcMain');
content = content.replace(/electron\.dialog/g, 'dialog');
content = content.replace(/electron\.shell/g, 'shell');
content = content.replace(/electron\.protocol/g, 'protocol');
content = content.replace(/electron\.nativeTheme/g, 'nativeTheme');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed electron imports');
