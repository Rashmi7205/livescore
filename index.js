import express from "express";
import http from 'http';
import { matchRouter } from "./src/routes/matches.js";
import { attachWebSocketServer } from "./src/ws/server.js";
import { securityMiddleware } from "./src/arcject.js";
import { commentaryRouter } from "./src/routes/commentary.js";

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(express.json());

const server = http.createServer(app);

app.get('/', (req, res) => {
  res.send('Hello from Express Server!');
});

app.use(securityMiddleware);


app.use("/matches", matchRouter);
app.use('/matches/:id/commentary',commentaryRouter);

const { broadcastMatchCreated, broadcastCommentary } = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;

server.listen(PORT, HOST, () => {
  const baseUrl = HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
  console.log(`Server is running on ${baseUrl}`);
  console.log(`WS sever running on ${baseUrl.replace('http', 'ws')}/ws`)
});
