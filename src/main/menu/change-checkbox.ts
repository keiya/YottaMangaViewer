import { BrowserWindow } from 'electron';

const changeCheckbox = (mainWindow: BrowserWindow, type: string, value: boolean) => {
  mainWindow.webContents.send('menucheckchanged', {[type]: value})
}

export default changeCheckbox