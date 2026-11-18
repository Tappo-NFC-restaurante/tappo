import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HttpServer, clientOrigin: string) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: [clientOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    // Entrar na sala do tenant (usado pelo painel do chefe / restaurante)
    socket.on('join:tenant', (tenantId: string) => {
      if (tenantId) {
        socket.join(`tenant:${tenantId}`);
        // console.log(`Socket ${socket.id} entrou na sala tenant:${tenantId}`);
      }
    });

    // Entrar na sala da sessão da mesa (usado pelo app do cliente)
    socket.on('join:session', (sessionId: string) => {
      if (sessionId) {
        socket.join(`session:${sessionId}`);
        // console.log(`Socket ${socket.id} entrou na sala session:${sessionId}`);
      }
    });

    socket.on('leave:session', (sessionId: string) => {
      if (sessionId) {
        socket.leave(`session:${sessionId}`);
      }
    });

    socket.on('disconnect', () => {
      // Cleanup automático pelo Socket.io
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io não foi inicializado ainda!');
  }
  return io;
}

export function emitToTenant(tenantId: string, event: string, payload: any) {
  if (io) {
    io.to(`tenant:${tenantId}`).emit(event, payload);
  }
}

export function emitToSession(sessionId: string, event: string, payload: any) {
  if (io) {
    io.to(`session:${sessionId}`).emit(event, payload);
  }
}
