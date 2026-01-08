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
console.log("📨 Attempting SMS send to:", to);
    const msg = await client.messages.create({
      to,
      from: "+17656306283", // your Twilio number
      body: content,
    });
    console.log("📨 SMS sent:", msg.sid);
  } catch (err) {
    console.error("❌ Twilio SMS error:", err.code, err.message);
  }
}

function requireChatwootSmsPayload(req, res, next) {
  const phone =
    req.body?.conversation?.meta?.sender?.phone_number;
  const messageType =
    req.body?.message?.message_type;

  if (!phone || messageType !== "incoming") {
    console.log("⚠️ Ignoring non-incoming or malformed Chatwoot webhook", {
      hasPhone: Boolean(phone),
      messageType,
    });

    // IMPORTANT: never trigger retries
    return res.status(200).send("OK");
  }

  next();
}

app.post(
  "/chatwoot/webhook",
  requireChatwootSmsPayload,
  async (req, res) => {

  console.log("📥 Chatwoot webhook hit");
  console.log("🔎 message_type:", req.body?.message?.message_type);

  await sendSmsReply({
    to: req.body?.conversation?.meta?.sender?.phone_number,
    content: "Got it 👍",
  });

  res.status(200).send("OK");
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
