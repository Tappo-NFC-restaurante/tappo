import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { initSocketIO } from './socket';

// Routers
import nfcRouter from './routes/nfc';
import authRouter from './routes/auth';
import sessionRouter from './routes/session';
import publicMenuRouter from './routes/publicMenu';
import restaurantRouter from './routes/restaurant';
import adminRouter from './routes/admin';

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// 1. Inicializa WebSocket (Socket.io)
initSocketIO(server, CLIENT_URL);

// 2. Middlewares globais
app.use(
  cors({
    origin: (origin, callback) => {
      // Em produção no mesmo domínio ou sem origin (mobile apps/Postman)
      if (!origin || origin === CLIENT_URL || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else {
        callback(null, true); // Permite acessos remotos confiáveis
      }
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Healthcheck
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'tappo-api',
    timestamp: new Date().toISOString(),
  });
});

// 4. Rotas da Aplicação
// Rota direta de leitura de chip NFC: GET /m/:nfcToken
app.use('/', nfcRouter);

// APIs do Sistema
app.use('/api/auth', authRouter);
app.use('/api/session', sessionRouter);
app.use('/api/public/menu', publicMenuRouter);
app.use('/api/restaurant', restaurantRouter);
app.use('/api/admin', adminRouter);

// 5. Servir Frontend estático se construído (em produção ou container único)
const potentialWebDistPaths = [
  path.resolve(__dirname, '../../web/dist'),
  path.resolve(__dirname, '../web/dist'),
  path.resolve(process.cwd(), 'apps/web/dist'),
  path.resolve(process.cwd(), 'web/dist'),
];

const webDistPath = potentialWebDistPaths.find((p) => fs.existsSync(p));

if (webDistPath) {
  console.log(`📦 Servindo frontend estático de: ${webDistPath}`);
  app.use(express.static(webDistPath));
  
  // Qualquer rota não-API vai para o SPA React Router
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/m/') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(webDistPath, 'index.html'));
  });
}

// 6. Middleware de Tratamento de Erros Global
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled API Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno no servidor tappo',
  });
});

// 7. Iniciar Servidor
server.listen(PORT, () => {
  console.log(`\n====================================================`);
  console.log(`⚡ tappo Full-Stack Platform online na porta ${PORT}`);
  console.log(`📡 URL Base: http://localhost:${PORT}`);
  console.log(`📱 Leitura NFC: http://localhost:${PORT}/m/:nfcToken`);
  console.log(`====================================================\n`);
});

export { app, server };
