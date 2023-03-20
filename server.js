import * as dotenv from "dotenv";
dotenv.config();
import { Level } from "level";
const db = new Level(".data/level", { valueEncoding: "json" });
import bot from "./bot.js";
let client;
const clientReady = (async()=>{client = await bot(db)})()
import express from "express";
import bodyParser from "body-parser";
import __dirname from "./dirname.js";
const app = express();
app.use(bodyParser.text({ type: "*/*" }));
app.use(express.static("public"));

app.get("/", (request, response) => {
  response.sendFile(`${__dirname}/views/index.html`);
});

app.delete("/notify/:token", async (request, response) => {
  try {
    await db.get(request.params.token + "-room");
    await db.del(request.params.token + "-room");
    response.status(204).end();
  } catch (e) {
    response
      .status(e.notFound ? 404 : 500)
      .send(e.notFound ? "Not Found" : "Internal Server Error");
    if (!e.notFound) console.error(e);
  }
})
app.post("/notify/:token", async (request, response) => {
  try {
    const type = request.headers["content-type"].match(
      /^text\/(?:(html)|(plain))(?:;\s*charset=utf-8)?$/
    );
    if (!type) return response.status(415).send("Unsupported Media Type");
    const room = await db.get(request.params.token + "-room");
    await clientReady;
    await client[type[1] ? "sendHtmlText" : "sendText"](room, request.body);
    response.status(204).end();
  } catch (e) {
    response
      .status(e.notFound ? 404 : 500)
      .send(e.notFound ? "Not Found" : "Internal Server Error");
    if (!e.notFound) console.error(e);
  }
});
const listener = app.listen(process.env.PORT, '127.0.0.1', () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});
