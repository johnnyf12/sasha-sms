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
import express from 'express';
const app = express();

app.get("/", (req, res) => {
  res.send("Sasha is alive");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
