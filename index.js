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

async function sendSmsReply({ to, content }) {
  try {
    const msg = await client.messages.create({
      to,
      from: "+17656306283", // your Twilio number, hard-coded for test
      body: content,
    });

    console.log("📨 SMS sent:", msg.sid, msg.status);
  } catch (err) {
    console.error("❌ Twilio SMS error:", err.code, err.message);
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function logBotMessageToChatwoot({ accountId, conversationId, content }) {
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
      sender_type: "bot",
    }),
  });

  const body = await r.text();
  console.log("🧾 Chatwoot bot log status:", r.status);
  console.log("🧾 Chatwoot bot log body:", body);
}

// routes
app.get("/", (req, res) => {
  res.send("Sasha SMS online");
});

app.post("/chatwoot/webhook", async (req, res) => {
  console.log("📥 Chatwoot webhook hit");
  console.log(JSON.stringify(req.body, null, 2));

  const conversation = req.body?.conversation;
  const message = req.body?.message;

  if (!conversation || !message) {
    return res.status(200).send("IGNORED");
  }

  if (message.message_type !== "incoming") {
    return res.status(200).send("IGNORED");
  }

  const to = conversation?.meta?.sender?.phone_number;
  const text = message.content;

  if (!to || !text) {
    return res.status(200).send("IGNORED");
  }

  try {
    // 1️⃣ SEND SMS (this was missing)
    await sendSmsReply({
      to,
      content: "Got it 👍",
    });

    // 2️⃣ LOG TO CHATWOOT
    await logBotMessageToChatwoot({
      accountId: conversation.account_id,
      conversationId: conversation.id,
      content: "Got it 👍",
    });
  } catch (err) {
    console.error("❌ Reply error:", err);
  }

  res.status(200).send("OK");
});

  // later: AI logic goes here

app.post("/ping", (req, res) => {
  console.log("🔥 PING HIT", req.body);
  res.status(200).send("OK");
});

// 🚨 EXACTLY ONE LISTEN — NO FALLBACK
const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
