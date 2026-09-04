import WebSocket from 'ws';

const url = process.env.WS_URL || 'ws://localhost:3000/ws';
const matchId = Number(process.env.MATCH_ID || '1');

const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('WS open ->', url);
  // send subscribe message
  const msg = { type: 'subscribe', matchId };
  console.log('sending', JSON.stringify(msg));
  ws.send(JSON.stringify(msg));
});

ws.on('message', (data) => {
  try {
    const parsed = JSON.parse(data.toString());
    console.log('INCOMING:', JSON.stringify(parsed));
  } catch (e) {
    console.log('INCOMING (raw):', data.toString());
  }
});

ws.on('close', (code, reason) => {
  console.log('WS closed', code, reason?.toString());
  process.exit(0);
});

ws.on('error', (err) => {
  console.error('WS error', err);
});

// keep process alive
setInterval(() => { }, 1000);
