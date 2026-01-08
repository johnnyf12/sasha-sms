import express from "express";
import twilio from "twilio";
import OpenAI from "openai";

// In-memory idempotency cache (safe, resets on deploy)
const seenMessageIds = new Set();

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

function createOnce(fn) {
  let called = false;
  return async (...args) => {
    if (called) return { skipped: true };
    called = true;
    return fn(...args);
  };
}

function logWithReq(req, message, extra = {}) {
  console.log(message, { requestId: req.requestId, ...extra });
}

app.get("/debug/chatwoot", (req, res) => {
  res.status(501).send("Not implemented");
});

function attachRequestId(req, res, next) {
  // Prefer upstream IDs if present, otherwise generate one
  const headerId =
    req.headers["x-request-id"] ||
    req.headers["x-correlation-id"] ||
    req.headers["cf-ray"]; // sometimes present behind proxies

  req.requestId = String(headerId || `req_${Date.now()}_${Math.random().toString(16).slice(2)}`);

  res.setHeader("x-request-id", req.requestId);
  next();
}

app.use(attachRequestId);

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

function requireChatwootInboundMessage(req, res, next) {
const phone = req.body?.conversation?.meta?.sender?.phone_number;
const event = req.body?.event;

if (!phone || event !== "message_created") {
  logWithReq(req, "⏭️ Ignoring non-inbound Chatwoot webhook", {
    event,
    hasPhone: Boolean(phone),
  });
  return res.status(200).send("OK");
}

logWithReq(req, "✅ Inbound Chatwoot message accepted", { event });
next();
}

function dedupeChatwootMessages(req, res, next) {
const messageId = req.body?.message?.id;
const sourceId = req.body?.message?.source_id; // often Twilio SID

if (!messageId) {
  logWithReq(req, "⚠️ No Chatwoot message ID — skipping dedupe", { sourceId });
  return next();
}

if (seenMessageIds.has(messageId)) {
  logWithReq(req, "🔁 Duplicate Chatwoot message ignored", { messageId, sourceId });
  return res.status(200).send("OK");
}

seenMessageIds.add(messageId);
logWithReq(req, "🆕 Message marked seen", { messageId, sourceId });
next();

}

app.post(
  "/chatwoot/webhook",
  requireChatwootInboundMessage,
  dedupeChatwootMessages,
  async (req, res) => {

const phone = req.body?.conversation?.meta?.sender?.phone_number;
const messageId = req.body?.message?.id;
const sourceId = req.body?.message?.source_id;
const event = req.body?.event;

logWithReq(req, "📥 Chatwoot webhook hit", {
  event,
  phone,
  messageId,
  sourceId,
});

const sendOnce = createOnce(sendSmsReply);

const result = await sendOnce({
  to: phone,
  content: "Got it 👍",
});

if (result?.skipped) {
  logWithReq(req, "⏭️ SMS send skipped (already attempted)");
}

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
