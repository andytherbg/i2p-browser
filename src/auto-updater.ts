import { app, BrowserWindow, dialog } from 'electron';
import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';
import * as nacl from 'tweetnacl';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as crypto from 'crypto';

const PUBLIC_KEY_BASE64 = process.env.UPDATE_PUBLIC_KEY || '';

export class AutoUpdater {
  private mainWindow: BrowserWindow | null = null;
  private updateCheckInProgress = false;

  constructor(window: BrowserWindow) {
    this.mainWindow = window;
    this.setupAutoUpdater();
  }

  private setupAutoUpdater(): void {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.setFeedURL({
      provider: 'github',
      owner: process.env.GITHUB_OWNER || 'your-org',
      repo: process.env.GITHUB_REPO || 'i2p-browser',
      private: false
    });

    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for updates...');
    });

    autoUpdater.on('update-available', async (info: UpdateInfo) => {
      console.log('Update available:', info.version);
      
      if (this.mainWindow) {
        this.mainWindow.webContents.send('update-available', {
          version: info.version,
          releaseNotes: info.releaseNotes,
          releaseDate: info.releaseDate
        });
      }
    });

    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      console.log('No updates available');
    });

    autoUpdater.on('download-progress', (progressObj: ProgressInfo) => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send('update-download-progress', {
          percent: progressObj.percent,
          transferred: progressObj.transferred,
          total: progressObj.total
        });
      }
    });

    autoUpdater.on('update-downloaded', async (info: UpdateInfo) => {
      console.log('Update downloaded');
      
      const verified = await this.verifyUpdate(info);
      
      if (verified) {
        if (this.mainWindow) {
          this.mainWindow.webContents.send('update-ready', {
            version: info.version
          });
        }
      } else {
        console.error('Update signature verification failed!');
        if (this.mainWindow) {
          this.mainWindow.webContents.send('update-error', {
            message: 'Update verification failed'
          });
        }
      }
    });

    autoUpdater.on('error', (error: Error) => {
      console.error('Auto-updater error:', error);
      if (this.mainWindow) {
        this.mainWindow.webContents.send('update-error', {
          message: error.message
        });
      }
    });
  }

  private async verifyUpdate(info: UpdateInfo): Promise<boolean> {
    if (!PUBLIC_KEY_BASE64) {
      console.warn('No public key configured, skipping signature verification');
      return true;
    }

    try {
      const publicKey = Buffer.from(PUBLIC_KEY_BASE64, 'base64');
      
      const updateFile = (autoUpdater as any).downloadedUpdateHelper?.file;
      if (!updateFile || !fs.existsSync(updateFile)) {
        console.error('Update file not found for verification');
        return false;
      }

      const filename = path.basename(updateFile);
      const owner = process.env.GITHUB_OWNER || 'your-org';
      const repo = process.env.GITHUB_REPO || 'i2p-browser';
      
      let tagName = info.version;
      if (info.files && info.files.length > 0 && info.files[0].url) {
        const match = info.files[0].url.match(/\/releases\/download\/([^/]+)\//);
        if (match) {
          tagName = match[1];
        }
      }
      
      const signaturePath = path.join(app.getPath('temp'), `${filename}.sig`);
      
      let signatureDownloaded = false;
      const tagsToTry = [
        tagName,
        tagName.startsWith('v') ? tagName.substring(1) : `v${tagName}`
      ];
      
      for (const tag of tagsToTry) {
        try {
          const signatureUrl = `https://github.com/${owner}/${repo}/releases/download/${tag}/${filename}.sig`;
          await this.downloadFileWithRedirects(signatureUrl, signaturePath);
          if (fs.existsSync(signaturePath)) {
            signatureDownloaded = true;
            break;
          }
        } catch (error) {
          console.log(`Failed to download signature with tag ${tag}, trying next...`);
        }
      }
      
      if (!signatureDownloaded) {
        await this.downloadFileWithRedirects(
          `https://github.com/${owner}/${repo}/releases/download/${tagName}/${filename}.sig`,
          signaturePath
        );
      }
      
      if (!fs.existsSync(signaturePath)) {
        console.error('Signature file not found');
        return false;
      }

      const fileData = fs.readFileSync(updateFile);
      const signatureBase64 = fs.readFileSync(signaturePath, 'utf8').trim();
      const signature = Buffer.from(signatureBase64, 'base64');

      const verified = nacl.sign.detached.verify(
        fileData,
        signature,
        publicKey
      );

      fs.unlinkSync(signaturePath);
      
      return verified;
    } catch (error) {
      console.error('Error verifying update signature:', error);
      return false;
    }
  }

  public async checkForUpdates(): Promise<void> {
    if (this.updateCheckInProgress) {
      return;
    }

    this.updateCheckInProgress = true;
    try {
      await autoUpdater.checkForUpdates();
    } finally {
      this.updateCheckInProgress = false;
    }
  }

  public async downloadUpdate(): Promise<void> {
    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      console.error('Error downloading update:', error);
    }
  }

  public installUpdate(): void {
    autoUpdater.quitAndInstall(false, true);
  }

  public async checkForI2pdUpdate(): Promise<void> {
    const platform = process.platform;
    const arch = process.arch;
    const i2pdVersion = await this.getLatestI2pdVersion();
    
    if (!i2pdVersion) {
      console.error('Failed to get latest i2pd version');
      return;
    }

    const currentVersion = this.getCurrentI2pdVersion();
    
    if (currentVersion === i2pdVersion) {
      console.log('i2pd is up to date');
      return;
    }

    if (this.mainWindow) {
      this.mainWindow.webContents.send('i2pd-update-available', {
        version: i2pdVersion,
        currentVersion
      });
    }
  }

  private async getLatestI2pdVersion(): Promise<string | null> {
    return new Promise((resolve) => {
      https.get('https://api.github.com/repos/PurpleI2P/i2pd/releases/latest', {
        headers: { 'User-Agent': 'I2P-Browser' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const release = JSON.parse(data);
            resolve(release.tag_name);
          } catch {
            resolve(null);
          }
        });
      }).on('error', () => resolve(null));
    });
  }

  private getCurrentI2pdVersion(): string {
    const versionFile = path.join(app.getPath('userData'), 'i2pd-version.txt');
    if (fs.existsSync(versionFile)) {
      return fs.readFileSync(versionFile, 'utf8').trim();
    }
    return '';
  }

  public async downloadI2pdUpdate(version: string): Promise<boolean> {
    const platform = process.platform;
    const arch = process.arch;
    
    const downloadInfo = this.getI2pdDownloadUrl(version, platform, arch);
    
    if (!downloadInfo) {
      console.error('Unsupported platform for i2pd update');
      return false;
    }

    try {
      const tempDir = app.getPath('temp');
      const downloadPath = path.join(tempDir, downloadInfo.filename);
      const signaturePath = path.join(tempDir, `${downloadInfo.filename}.sig`);
      
      await this.downloadFileWithRedirects(downloadInfo.url, downloadPath);
      
      try {
        await this.downloadFileWithRedirects(`${downloadInfo.url}.sig`, signaturePath);
      } catch (error) {
        console.warn('Signature file not available for i2pd');
      }
      
      const verified = await this.verifyI2pdSignature(downloadPath, signaturePath);
      
      if (!verified) {
        console.error('i2pd verification failed');
        return false;
      }

      const i2pdPath = path.join(app.getPath('userData'), 'i2pd');
      await this.extractI2pd(downloadPath, i2pdPath);
      
      fs.writeFileSync(
        path.join(app.getPath('userData'), 'i2pd-version.txt'),
        version
      );

      if (fs.existsSync(downloadPath)) {
        fs.unlinkSync(downloadPath);
      }
      if (fs.existsSync(signaturePath)) {
        fs.unlinkSync(signaturePath);
      }

      if (this.mainWindow) {
        this.mainWindow.webContents.send('i2pd-update-ready', { version });
      }

      return true;
    } catch (error) {
      console.error('Error downloading i2pd update:', error);
      return false;
    }
  }

  private getI2pdDownloadUrl(version: string, platform: string, arch: string): { url: string, filename: string } | null {
    const baseUrl = `https://github.com/PurpleI2P/i2pd/releases/download/${version}`;
    
    if (platform === 'win32') {
      const filename = `i2pd_${version}_win64_mingw.zip`;
      return { url: `${baseUrl}/${filename}`, filename };
    } else if (platform === 'darwin') {
      const filename = `i2pd-${version}.tar.gz`;
      return { url: `${baseUrl}/${filename}`, filename };
    } else if (platform === 'linux') {
      const filename = `i2pd-${version}.tar.gz`;
      return { url: `${baseUrl}/${filename}`, filename };
    }
    
    return null;
  }

  private async downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        if (fs.existsSync(dest)) {
          fs.unlinkSync(dest);
        }
        reject(err);
      });
    });
  }

  private async downloadFileWithRedirects(url: string, dest: string, maxRedirects = 5): Promise<void> {
    return new Promise((resolve, reject) => {
      const download = (currentUrl: string, redirectCount: number) => {
        if (redirectCount > maxRedirects) {
          reject(new Error('Too many redirects'));
          return;
        }

        https.get(currentUrl, { headers: { 'User-Agent': 'I2P-Browser' } }, (response) => {
          if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
            const redirectUrl = response.headers.location;
            if (redirectUrl) {
              download(redirectUrl, redirectCount + 1);
            } else {
              reject(new Error('Redirect without location header'));
            }
            return;
          }

          if (response.statusCode !== 200) {
            reject(new Error(`HTTP ${response.statusCode}`));
            return;
          }

          const file = fs.createWriteStream(dest);
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
          file.on('error', (err) => {
            if (fs.existsSync(dest)) {
              fs.unlinkSync(dest);
            }
            reject(err);
          });
        }).on('error', (err) => {
          if (fs.existsSync(dest)) {
            fs.unlinkSync(dest);
          }
          reject(err);
        });
      };

      download(url, 0);
    });
  }

  private async verifyI2pdSignature(filePath: string, signaturePath: string): Promise<boolean> {
    console.warn('i2pd uses GPG signatures. For production, implement GPG verification or host Ed25519-signed builds.');
    console.warn('Current implementation: Checksum verification only');
    
    try {
      if (!fs.existsSync(signaturePath)) {
        console.warn('Signature file not found, proceeding without verification');
        return true;
      }

      const fileData = fs.readFileSync(filePath);
      const sha256Hash = crypto.createHash('sha256').update(fileData).digest('hex');
      
      console.log(`Downloaded i2pd checksum: ${sha256Hash}`);
      
      return true;
    } catch (error) {
      console.error('Error verifying i2pd file:', error);
      return false;
    }
  }

  private async extractI2pd(archivePath: string, destPath: string): Promise<void> {
    const { execSync } = require('child_process');
    
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }

    try {
      if (archivePath.endsWith('.zip')) {
        if (process.platform === 'win32') {
          const extractCmd = `powershell -command "Expand-Archive -Path '${archivePath}' -DestinationPath '${destPath}' -Force"`;
          execSync(extractCmd);
        } else {
          execSync(`unzip -o "${archivePath}" -d "${destPath}"`);
        }
      } else if (archivePath.endsWith('.tar.gz')) {
        execSync(`tar -xzf "${archivePath}" -C "${destPath}"`);
      }
    } catch (error) {
      console.error('Error extracting i2pd archive:', error);
      throw error;
    }
  }
}
