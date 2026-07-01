import express from "express"
import { matchRouter } from "./src/routes/matches.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello from Express Server!');
});

app.use("/matches",matchRouter);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
