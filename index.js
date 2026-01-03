import express from "express";
import twilio from "twilio";

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});

// sanity check
if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  console.error("Missing Twilio env vars");
} else {
  console.log("Twilio env vars detected");
}

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// health check (IMPORTANT)
app.get("/", (req, res) => {
  res.send("Sasha SMS online");
});

// inbound SMS webhook
app.get("/sms/inbound", (req, res) => {
  res.status(200).send("GET inbound OK");
});

app.post("/sms/inbound", (req, res) => {
  console.log("📩 Incoming SMS:", req.body);

  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message("Sasha here 💬");

  res.type("text/xml").send(twiml.toString());
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
