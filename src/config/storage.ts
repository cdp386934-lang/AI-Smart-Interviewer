import fs from 'fs/promises';
import path from 'path';
import { config } from './loader';

export interface StorageAdapter {
  upload(file: Buffer, filename: string, mimeType: string): Promise<{ url: string; key: string }>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getUrl(key: string): string;
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private baseDir = config.storage.localDir || './uploads') { void fs.mkdir(this.baseDir, { recursive: true }); }
  private p(key: string) { return path.join(this.baseDir, key); }
  async upload(file: Buffer, filename: string) { const key = `${Date.now()}-${filename}`; await fs.writeFile(this.p(key), file); return { key, url: this.getUrl(key) }; }
  async download(key: string) { return fs.readFile(this.p(key)); }
  async delete(key: string) { await fs.rm(this.p(key), { force: true }); }
  async exists(key: string) { try { await fs.access(this.p(key)); return true; } catch { return false; } }
  getUrl(key: string) { return `/files/${encodeURIComponent(key)}`; }
}

export class StorageFactory {
  static create(): StorageAdapter { return new LocalStorageAdapter(); }
}
