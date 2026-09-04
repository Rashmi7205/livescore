import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../arcject.js";


const matchSubscribers = new Map();

function subscribe(matchId, socket) {
  matchId = Number(matchId);
  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }

  matchSubscribers.get(matchId).add(socket);
}

function unsubscribe(matchId, socket) {
  matchId = Number(matchId);
  const subscribers = matchSubscribers.get(matchId);

  if (!subscribers) {
    return;
  }

  // remove the socket from the subscribers set
  subscribers.delete(socket);

  // if there are no subscribers left, remove the entry
  if (subscribers.size === 0) {
    matchSubscribers.delete(matchId);
  }
}

function cleanupSubscriptions(socket) {
  for (const matchId of socket.subscriptions) {
    unsubscribe(matchId, socket);
  }
}

function broadcastToMatch(matchId, payload) {
  matchId = Number(matchId);
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers || subscribers.size === 0) {
    return;
  }
  const message = JSON.stringify(payload);

  for (const client of subscribers) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

function handleMessage(socket, data) {
  console.log(data);
  let message;
  try {
    message = JSON.parse(data.toString());
  } catch (error) {
    sendJson(socket, {
      type: 'error',
      message: 'Invalid JSON'
    });
    return;
  }
  if (message?.type === 'subscribe' && Number.isInteger(message.matchId)) {
    const matchId = Number(message.matchId);
    subscribe(matchId, socket);
    socket.subscriptions.add(matchId);
    sendJson(socket, {
      type: 'subscribed', matchId
    });
    return;
  }

  if (message?.type === 'unsubscribe' && Number.isInteger(message.matchId)) {
    const matchId = Number(message.matchId);
    unsubscribe(matchId, socket);
    socket.subscriptions.delete(matchId);
    sendJson(socket, {
      type: 'unsubscribed',
      matchId
    });
  }

}


function sendJson(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

function broadCastToAll(wss, payload) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    client.send(JSON.stringify(payload));
  }
}
export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 1024 * 1024, });

  wss.on('connection', async (socket, req) => {
    if (wsArcjet) {
      try {
        const descision = await wsArcjet.protect(req);
        if (descision.isDenied()) {
          const code = descision.reason.isRateLimit() ? 103 : 1008;
          const reason = descision.reason.isRateLimit() ? 'Rate Limit Exceeded' : "Access Denied";

          socket.close(code, reason);
          return;
        }
      } catch (error) {
        console.error('WS connection error', error);
        socket.close(1001, 'Server Security Error');
      }
    }
  })

  wss.on('error', console.error);
  wss.on('connection', (socket) => {
    socket.isAlive = true;
    socket.on('pong', () => { socket.isAlive = true; });

    socket.subscriptions = new Set();

    socket.on('message', (data) => {
      handleMessage(socket, data);
    })

    socket.on('error', (err) => {
      console.error('WS socket error', err);
      socket.terminate();
    });

    socket.on('close', (code, reason) => {
      try {
        console.log('WS socket closed', code, reason && reason.toString());
      } catch (e) {
        console.log('WS socket closed', code);
      }
      cleanupSubscriptions(socket);
    })


    sendJson(socket, {
      type: 'welcome'
    });
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 3000)
  wss.on('close', () => clearInterval(interval));

  function broadcastMatchCreated(match) {
    broadCastToAll(wss, { type: 'match_created', data: match });
  }

  function broadcastCommentary(matchId, comment) {
    broadcastToMatch(matchId, { type: 'commentary', data: comment });
  }

  return { broadcastMatchCreated, broadcastCommentary }
}