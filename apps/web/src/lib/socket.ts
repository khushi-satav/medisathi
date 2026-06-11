import { io, Socket } from 'socket.io-client';

let socket: Socket | undefined;

export const getSocket = () => {
  if (!socket) {
    // First ping the API to ensure the socket server is initialized
    fetch('/api/socket').finally(() => {
      if (!socket) {
        socket = io({
          path: '/api/socket',
        });
      }
    });
  }
  return socket;
};
