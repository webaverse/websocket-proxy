import https from 'https';
import fs from 'fs';
import {
  WebSocketServer,
} from 'ws';

//

class Room {
  constructor({
    wss,
  }) {
    this.wss = wss;

    this.sockets = new Set();
  }
  addSocket(ws) {
    this.sockets.add(ws);
    
    ws.on('message', message => {
      for (const socket of this.sockets) {
        if (socket !== ws) {
          console.log('send message', message);
          socket.send(message);
        }
      }
    });
    ws.on('close', () => {
      this.sockets.delete(ws);
    });
  }
}

//

class Rooms {
  constructor({
    wss,
  }) {
    const rooms = new Map();

    const sockets = new Set();
    wss.on('connection', (ws, req) => {
      const roomId = req.url;
      let room = rooms.get(roomId);
      if (!room) {
        room = new Room({
          wss,
        });
        rooms.set(roomId, room);
      }

      room.addSocket(ws);
    });
  }
}

//

// websocket server that stupidly proxies messages to all peers
class WebsocketProxy {
  constructor({
    port,
  }) {
    this.port = port;
  }
  async listen() {
    const server = https.createServer({
      cert: fs.readFileSync('./certs-local/fullchain.pem'),
      key: fs.readFileSync('./certs-local/privkey.pem')
    });
    const wss = new WebSocketServer({
      server,
    });
    const rooms = new Rooms({
      wss,
    });

    await new Promise((accept, reject) => {
      server.listen(port, process.env.HOST || '0.0.0.0', () => {
        console.log('server listen', port, process.env.HOST);
        accept();
      });
    });
  }
}
const port = parseInt(process.env.PORT, 10) || 8001;
const wsp = new WebsocketProxy({
  port,
});
wsp.listen();
