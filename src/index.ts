import { Server } from './server';
import { container } from './container';
import logger from './utils/logger';

async function main() {
  try {
    logger.info('启动 AI Agent 智能面试官系统...');
    
    // 启动WebSocket网关
    const wsGateway = container.getWebSocketGateway();
    await wsGateway.start();
    logger.info('WebSocket网关启动成功');
    
    // 启动REST API服务器
    const server = new Server();
    await server.start();
    
    logger.info('系统启动完成，所有服务正常运行');
    logger.info('========================================');
    logger.info('系统信息:');
    logger.info(`- REST API: http://localhost:${process.env.PORT || 3000}/api/v1`);
    logger.info(`- WebSocket: ws://localhost:${(parseInt(process.env.PORT || '3000') + 1)}/ws`);
    logger.info(`- 环境: ${process.env.NODE_ENV || 'development'}`);
    logger.info('========================================');
    
    // 健康检查
    const health = await container.healthCheck();
    logger.info('服务健康状态:', health);
    
  } catch (error) {
    logger.error('系统启动失败:', error);
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', reason);
});

// 启动应用
if (require.main === module) {
  main();
}

export { main };