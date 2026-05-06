import http from 'http';
import { createApiApp } from './api';
import logger from './utils/logger';

export class Application {
  constructor(private config: any, private db: any, private redis: any, private aiLayer: any, private sessionManager: any, private interviewEngine: any, private resumeParser: any) {}
  async start() { const app = createApiApp(); const server = http.createServer(app); return new Promise<void>((resolve) => { server.listen(this.config.http.port, this.config.http.host, () => { logger.info(`Server listening on ${this.config.http.port}`); resolve(); }); }); }
}
