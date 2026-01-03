import 'dotenv/config';
import Twilio from 'twilio';

console.log("BOOTING APP");

// sanity check
if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  console.error("Missing Twilio env vars", {
    sid: process.env.TWILIO_ACCOUNT_SID,
    token: process.env.TWILIO_AUTH_TOKEN ? "present" : "missing"
  });
  process.exit(1);
}

console.log("Twilio env vars detected");

// init twilio ONLY after check
const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

console.log("Twilio client initialized");

// minimal server so Railway stays alive
import express from "express";
import twilio from "twilio";

const app = express();

// Twilio needs urlencoded, not JSON
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.send("Sasha is alive");
});

// inbound SMS webhook
app.post("/sms", (req, res) => {
  const incomingMsg = req.body.Body;
  const from = req.body.From;

  console.log("Incoming SMS:", { from, incomingMsg });

  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message("Hey 🙂 I got your message. What were you thinking?");

  res.type("text/xml");
  res.send(twiml.toString());
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
