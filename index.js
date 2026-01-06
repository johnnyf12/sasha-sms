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
  "Content-Type": "application/json",
  "Accept": "application/json",
  api_access_token: process.env.CHATWOOT_API_TOKEN,
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

app.post("/chatwoot/webhook", async (req, res) => {
  res.status(200).send("OK"); // always ACK immediately

  const event = req.body?.event;
  const message = req.body?.message;
  const conversation = req.body?.conversation;

  if (event !== "message_created") return;
  if (!message) return;
  if (message.message_type !== "incoming") return;

  const from = conversation?.meta?.sender?.phone_number;
  const text = message.content;

  if (!from || !text) return;

  console.log("🟣 Chatwoot inbound:", { from, text });

  // later: AI logic goes here
});

// 🚨 EXACTLY ONE LISTEN — NO FALLBACK
const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
