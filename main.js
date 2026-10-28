// Desktop test shell for Haunted Landlord.
// The game itself lives in ./game and is plain HTML/CSS/JS, so the same folder can be
// deployed to the web unchanged. This file only wraps it in a window.
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 820,
    minWidth: 360,
    minHeight: 560,
    backgroundColor: '#140d22',
    title: 'Haunted Landlord',
    autoHideMenuBar: true, // press Alt to show the menu (View > Toggle Developer Tools)
    webPreferences: { contextIsolation: true, sandbox: true },
  });

  // ?dev=1 turns on the "Test tools" panel in Settings. Drop it for a release build.
  win.loadFile(path.join(__dirname, 'game', 'index.html'), { query: { dev: '1' } });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
