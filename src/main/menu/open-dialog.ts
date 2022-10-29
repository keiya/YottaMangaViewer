import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';

const openDialog = (mainWindow: BrowserWindow) => {
  dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'openDirectory']
  }).then(result => {
    if (!result.canceled) {
      mainWindow.webContents.send('openfile', result.filePaths[0])
    }
  }).catch(err => {
    console.log(err)
  })
}

export default openDialog