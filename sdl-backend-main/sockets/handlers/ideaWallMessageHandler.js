const { SocketHandlerFactory } = require('../socketHandlers');

class IdeaWallMessageHandler {
    static registerEvents(io, socket) {
        SocketHandlerFactory.registerSimpleEvent(socket, 'join_ideawall', this.handleJoinIdeaWall);
    }

    static async handleJoinIdeaWall(wallId) {
        const roomName = `ideawall_${wallId}`;
        this.socket.join(roomName);
        console.log(`Socket ${this.socket.id} joined IdeaWall room: ${roomName}`);
    }
}

module.exports = IdeaWallMessageHandler;
