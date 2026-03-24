import dotenv from "dotenv";

import { createApp } from "./app.js";

dotenv.config();

const port = Number.parseInt(process.env.PORT || "4500", 10);
const app = createApp();

app.listen(port, () => {
  console.log(`zCorvus backend listening on http://127.0.0.1:${port}`);
});
