import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('i2pBrowser', {
  version: process.versions.electron
});
