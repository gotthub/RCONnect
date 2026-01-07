import { Rcon } from 'rcon-client';
import express from 'express';
import { configToObject } from './rconfig.js';
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import cors from 'cors';

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3001;

const config_config = await readFile("configuration/config.rconfig", "utf-8");
const config_config_obj = await configToObject(config_config);

let selected = config_config_obj.selected;
if (!selected || !existsSync(`configuration/${selected}`)) {
  selected = "login.rconfig";
}

const config_file = await readFile(`configuration/${selected}`, "utf-8");
const config = await configToObject(config_file);

const rconPort = Number(config.port);
if (!Number.isFinite(rconPort)) throw new Error("Invalid RCON port in config");

const client = new Rcon({
    host: config.ip,
    password: config.password,
    port: rconPort
});

client.on('connect', () => {
    console.log("[rconnect-server] Connected with RCON server.");
});
client.on('authenticated', () => {
    console.log("[rconnect-server] Authenticated with RCON server.");
});
client.on('error', (err) => {
    console.log("[rconnect-server] Error connecting to RCON server.", err);
});

// Do not crash-loop if RCON is temporarily unavailable
client.connect().catch((err) => {
  console.error("[rconnect-server] Initial RCON connect failed:", err);
});

let idresponse = {};

app.get('/', (req, res) => {
    res.json({ server: true, connected: client.connected });
});

client.on('response', (requestId, packet) => {
    idresponse[requestId] = packet;
});

app.get("/sendCommand", async (req, res) => {
  const command = String(req.query.command || "");
  if (!command) return res.status(400).json({ error: "Missing command" });

  try {
    const response = await client.send(command);
    res.json({ command, output: response });
  } catch (e) {
    res.status(500).json({ error: "RCON command failed" });
  }
});

// POST /post-inventory will give us a string[]. We need to store this, give it an ID, and return the ID.
let inventories = [];
let id = 0;
app.get('/post-inventory', (req, res) => {
    let inventory = JSON.parse(req.query.inv);
    inventories.push(inventory);
    res.status(200).send(""+id+"");
    id++;
});
// GET /get-inventory?id=0 will return the inventory with ID 0.
app.get('/get-inventory', (req, res) => {
    let id = req.query.id;
    res.status(200).send(inventories[id]);
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`[rconnect-server] Server started on port ${PORT}.`);
});
