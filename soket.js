const { Server } = require('socket.io');

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('🟢 New socket connected:', socket.id);

    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      console.log(`User joined room: ${roomId}`);
    });

    socket.on('code-change', ({ roomId, path, content }) => {
      socket.to(roomId).emit('code-update', { path, content });
    });

    socket.on('disconnect', () => {
      console.log('🔴 Socket disconnected:', socket.id);
    });
  });
};

module.exports = initSocket;
