import express from "express";
import twilio from "twilio";
import OpenAI from "openai";

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

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
  console.log("📩 Incoming SMS:", req.body);

  const twiml = new twilio.twiml.MessagingResponse();

  try {
    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are Sasha. You are texting a potential client. Be natural, short, and human. One message only. Do not mention AI. Do not be explicit.",
        },
        {
          role: "user",
          content: req.body.Body,
        },
      ],
      max_tokens: 60,
      temperature: 0.7,
    });

    const reply = gptResponse.choices[0].message.content?.trim();

    if (reply) {
      twiml.message(reply);
    } else {
      console.warn("⚠️ GPT returned empty response — no SMS sent");
    }
  } catch (err) {
    console.error("❌ GPT ERROR — no SMS sent:", err);
    // intentional silence
  }

  res.type("text/xml").send(twiml.toString());
});

// 🚨 EXACTLY ONE LISTEN — NO FALLBACK
const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
