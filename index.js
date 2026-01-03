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

// routes
app.get("/", (req, res) => {
  res.send("Sasha SMS online");
});

app.post("/sms/inbound", async (req, res) => {
  try {
    const from = req.body.From;
    const body = req.body.Body;

    console.log("📩 Incoming SMS:", { from, body });

   const chatwootUrl = `https://app.chatwoot.com/api/v1/accounts/${process.env.CHATWOOT_ACCOUNT_ID}/inboxes/${process.env.CHATWOOT_INBOX_ID}/contacts`;

const chatwootResponse = await fetch(chatwootUrl, {
  method: "POST",
  headers: {
    api_access_token: process.env.CHATWOOT_API_TOKEN,
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  body: JSON.stringify({
    source_id: from,
    name: from,
    inbox_id: Number(process.env.CHATWOOT_INBOX_ID),
    message: {
      content: body,
    },
  }),
});

if (!chatwootResponse.ok) {
  const text = await chatwootResponse.text();
  console.error("❌ Chatwoot error:", chatwootResponse.status, text);
} else {
  console.log("✅ Pushed message to Chatwoot");
}

    // IMPORTANT: silence Twilio for now
    res.status(200).send("");
  } catch (err) {
    console.error("❌ Inbound handler failed:", err);
    res.status(200).send("");
  }
});

// 🚨 EXACTLY ONE LISTEN — NO FALLBACK
const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
