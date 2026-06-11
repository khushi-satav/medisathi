import { Server } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';

type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: any;
  };
};

export default function SocketHandler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (res.socket.server.io) {
    console.log('Socket is already running');
  } else {
    console.log('Socket is initializing');
    const io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
    });
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('A client connected:', socket.id);

      socket.on('patient_status_update', (data) => {
        // Broadcast the patient status update to all connected caregivers (or specific rooms)
        // Here we just broadcast to everyone for simplicity
        socket.broadcast.emit('patient_status_update', data);
      });

      socket.on('disconnect', () => {
        console.log('A client disconnected:', socket.id);
      });
    });
  }
  res.end();
}
