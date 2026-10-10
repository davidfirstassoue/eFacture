const { app, BrowserWindow } = require('electron');
const path = require('path');

// 1. Démarrer le serveur Express & SQLite en arrière-plan
require('./server.js');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'Gestion des Bons de Commande Internes (BCI) - CHU Owendo',
    icon: path.join(__dirname, 'public', 'logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true
  });

  // Laisser 800ms au serveur Express pour démarrer et charger l'interface
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:3000');
  }, 800);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
