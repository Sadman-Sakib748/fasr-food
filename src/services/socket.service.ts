import { Server } from 'socket.io';
import { io } from '../app';
import logger from '../utils/logger';

export class SocketService {
  private static instance: SocketService;
  private io: Server;

  private constructor() {
    this.io = io;
    this.setupListeners();
  }

  // Get singleton instance
  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  // Setup socket listeners
  private setupListeners(): void {
    this.io.on('connection', (socket) => {
      logger.info(`🔌 New client connected: ${socket.id}`);

      // Join order room
      socket.on('join-order', (orderId: string) => {
        socket.join(`order-${orderId}`);
        logger.info(`📦 Socket ${socket.id} joined order ${orderId}`);
      });

      // Leave order room
      socket.on('leave-order', (orderId: string) => {
        socket.leave(`order-${orderId}`);
        logger.info(`📦 Socket ${socket.id} left order ${orderId}`);
      });

      // Join user room
      socket.on('join-user', (userId: string) => {
        socket.join(`user-${userId}`);
        logger.info(`👤 Socket ${socket.id} joined user ${userId}`);
      });

      // Join restaurant room
      socket.on('join-restaurant', (restaurantId: string) => {
        socket.join(`restaurant-${restaurantId}`);
        logger.info(`🏪 Socket ${socket.id} joined restaurant ${restaurantId}`);
      });

      // Join rider room
      socket.on('join-rider', (riderId: string) => {
        socket.join(`rider-${riderId}`);
        logger.info(`🏍️ Socket ${socket.id} joined rider ${riderId}`);
      });

      // Typing indicator
      socket.on('typing', (data: { room: string; isTyping: boolean }) => {
        socket.to(data.room).emit('user-typing', {
          socketId: socket.id,
          isTyping: data.isTyping,
        });
      });

      // Send message
      socket.on('send-message', (data: { room: string; message: any }) => {
        this.io.to(data.room).emit('new-message', {
          ...data.message,
          timestamp: new Date(),
        });
        logger.info(`📨 Message sent to room ${data.room}`);
      });

      // Disconnect
      socket.on('disconnect', () => {
        logger.info(`🔌 Client disconnected: ${socket.id}`);
      });

      // Error handling
      socket.on('error', (error: Error) => {
        logger.error(`❌ Socket error for ${socket.id}:`, error);
      });
    });
  }

  // Emit event to room
  emitToRoom(room: string, event: string, data: any): void {
    try {
      this.io.to(room).emit(event, data);
      logger.info(`📤 Emitted ${event} to ${room}`);
    } catch (error) {
      logger.error(`Error emitting to room ${room}:`, error);
    }
  }

  // Emit event to user
  emitToUser(userId: string, event: string, data: any): void {
    try {
      this.io.to(`user-${userId}`).emit(event, data);
      logger.info(`📤 Emitted ${event} to user ${userId}`);
    } catch (error) {
      logger.error(`Error emitting to user ${userId}:`, error);
    }
  }

  // Emit event to all
  emitToAll(event: string, data: any): void {
    try {
      this.io.emit(event, data);
      logger.info(`📤 Emitted ${event} to all`);
    } catch (error) {
      logger.error(`Error emitting to all:`, error);
    }
  }

  // Broadcast order update
  broadcastOrderUpdate(orderId: string, status: string, data: any): void {
    this.emitToRoom(`order-${orderId}`, 'order-updated', {
      orderId,
      status,
      ...data,
      timestamp: new Date(),
    });
  }

  // Notify new order
  notifyNewOrder(restaurantId: string, orderData: any): void {
    this.emitToRoom(`restaurant-${restaurantId}`, 'new-order', orderData);
  }

  // Notify rider
  notifyRider(riderId: string, deliveryData: any): void {
    this.emitToUser(riderId, 'new-delivery', deliveryData);
  }

  // Get connected sockets count
  getConnectedSockets(): number {
    return this.io.engine.clientsCount;
  }

  // Get rooms
  getRooms(): string[] {
    const rooms: string[] = [];
    const roomMap = this.io.sockets.adapter.rooms;
    roomMap.forEach((_, key) => {
      rooms.push(key);
    });
    return rooms;
  }

  // Disconnect all
  disconnectAll(): void {
    this.io.disconnectSockets();
    logger.info('🔌 All sockets disconnected');
  }
}

export default SocketService;