import express from "express";
import twilio from "twilio";
import OpenAI from "openai";

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get("/debug/chatwoot", async (req, res) => {
  try {
    const r = await fetch(
      `https://app.chatwoot.com/api/v1/accounts/${process.env.CHATWOOT_ACCOUNT_ID}`,
      {
        headers: {
  api_access_token: process.env.CHATWOOT_API_TOKEN,
  "Content-Type": "application/json",
  Accept: "application/json",
}
      }
    );

    const text = await r.text();
    res.status(r.status).send(text);
  } catch (err) {
    console.error("Debug Chatwoot failed:", err);
    res.status(500).send(String(err));
  }
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

async function sendToChatwoot({ from, text }) {
const url = `https://app.chatwoot.com/api/v1/accounts/${process.env.CHATWOOT_ACCOUNT_ID}/inboxes/${process.env.CHATWOOT_INBOX_ID}/messages.json`;

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      api_access_token: process.env.CHATWOOT_API_TOKEN,
    },
    body: JSON.stringify({
      source_id: from,
      content: text,
      message_type: "incoming",
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    console.error("❌ Chatwoot fanout failed:", t);
  } else {
    console.log("✅ Chatwoot fanout OK");
  }
}

// routes
app.get("/", (req, res) => {
  res.send("Sasha SMS online");
});

app.post("/sms/inbound", async (req, res) => {
  const from = req.body.From;
  const body = req.body.Body;

  console.log("🔥 INBOUND:", { from, body });

  await client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    to: from,
    body: "Got it 👍",
  });

  res.status(200).send("OK");
  sendToChatwoot({ from, text: body }).catch(console.error);
});

app.post("/chatwoot/webhook", (req, res) => {
  console.log("🔔 Chatwoot webhook HIT");
  console.log("Headers:", req.headers);
  console.log("Body:", JSON.stringify(req.body, null, 2));

  res.status(200).send("ok");
});

app.post("/chatwoot/webhook", async (req, res) => {
  try {
    const event = req.body?.event;
    const message = req.body?.message;
    const conversation = req.body?.conversation;

    // Only care about new messages
    if (event !== "message_created") {
      return res.status(200).send("ignored");
    }

    // Ignore human replies
    if (message?.sender_type === "Agent") {
      console.log("👤 Human replied, AI suppressed");
      return res.status(200).send("ok");
    }

    const text = message?.content;
    const from = conversation?.meta?.sender?.phone_number;

    console.log("🤖 Chatwoot webhook received:", { from, text });

    // DO NOTHING ELSE YET
    // (no GPT, no Twilio reply yet)

    res.status(200).send("ok");
  } catch (err) {
    console.error("Chatwoot webhook error:", err);
    res.status(200).send("ok"); // never cause retries
  }
});

// 🚨 EXACTLY ONE LISTEN — NO FALLBACK
const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
