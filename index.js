import express from "express";
import twilio from "twilio";
import OpenAI from "openai";

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get("/debug/chatwoot", (req, res) => {
  res.status(501).send("Not implemented");
});

// safety: surface crashes
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});

// env check
if (!process.env.PORT) {
  throw new Error("PORT not set by Railway");
}

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  console.error("Missing Twilio env vars");
} else {
  console.log("Twilio env vars detected");
}

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OpenAI API key");
}

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function sendChatwootReply({ accountId, conversationId, content }) {
  const url = `${process.env.CHATWOOT_BASE_URL}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`;

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.CHATWOOT_API_TOKEN}`,
    },
    body: JSON.stringify({
      content,
      message_type: "outgoing",
    }),
  });

  const body = await r.text();
  console.log("📤 Chatwoot reply status:", r.status);
  console.log("📤 Chatwoot reply body:", body);
}


// routes
app.get("/", (req, res) => {
  res.send("Sasha SMS online");
});

app.post("/chatwoot/webhook", async (req, res) => {
  console.log("📥 Chatwoot webhook hit");
  console.log(JSON.stringify(req.body, null, 2));

  const event = req.body?.event;
  const message = req.body?.message;
  const conversation = req.body?.conversation;

  if (event !== "message_created") {
    return res.status(200).send("IGNORED");
  }

  if (!message || message.message_type !== "incoming") {
    return res.status(200).send("IGNORED");
  }

  const from = conversation?.meta?.sender?.phone_number;
  const text = message.content;

  if (!from || !text) {
    return res.status(200).send("IGNORED");
  }

  console.log("🟣 Chatwoot inbound:", { from, text });

  // 🔥 THIS must happen BEFORE the ACK
  await sendChatwootReply({
    accountId: conversation.account_id, // IMPORTANT
    conversationId: conversation.id,
    content: "Got it 👍",
  });

  // ✅ ACK goes LAST — final line inside this handler
  res.status(200).send("OK");
});

  // later: AI logic goes here
});

app.post("/ping", (req, res) => {
  console.log("🔥 PING HIT", req.body);
  res.status(200).send("OK");
});

// 🚨 EXACTLY ONE LISTEN — NO FALLBACK
const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
