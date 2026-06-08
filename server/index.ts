import "dotenv/config";
import { createApp } from "./app";

const port = Number(process.env.PORT || 5174);
const app = createApp();

app.listen(port, () => {
  console.log(`Commitment Issues API listening on http://localhost:${port}`);
});
