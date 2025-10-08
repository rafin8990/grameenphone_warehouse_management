import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import config from './config';
import { errorlogger, logger } from './shared/logger';
import pool from './utils/dbClient';

// Global socket instance for emitting events
export let io: SocketIOServer;

async function bootstrap() {
  try {
    // Test database connection
    logger.info('🔍 Testing database connection...');
    const client = await pool.connect();
    logger.info('✅ Database connected successfully');
    client.release();
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  const server: Server = app.listen(config.port, () => {
    logger.info(`🚀 Server running on port ${config.port}`);
  });

  // Initialize Socket.IO
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info(`✅ Socket connected: ${socket.id}`);

    socket.on('disconnect', () => {
      logger.info(`❌ Socket disconnected: ${socket.id}`);
    });
  });

  logger.info('✅ Socket.IO initialized');


  const exitHandler = () => {
    if (server) {
      server.close(() => {
        logger.info('Server closed');
      });
    }
    process.exit(1);
  };

  const unexpectedErrorHandler = (error: unknown) => {
    errorlogger.error(error);
    exitHandler();
  };

  process.on('uncaughtException', unexpectedErrorHandler);
  process.on('unhandledRejection', unexpectedErrorHandler);

  process.on('SIGTERM', () => {
    if (process.env.NODE_ENV !== 'production') {
      return;
    }
    logger.info('SIGTERM received');
    if (server) {
      server.close();
    }
  });
}

bootstrap();
