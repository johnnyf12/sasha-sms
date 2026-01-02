import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";
import OpenAI from "openai";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const twilioClient = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY
});

app.post("/sms", async (req, res) => {
  const from = req.body.From;
  const body = req.body.Body || "";

  let reply = "im stepping away for a moment, text back shortly";

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "you are sasha. brief, lowercase, non explicit, booking focused. no emojis. redirect explicit messages to boundaries and booking. max 240 characters."
        },
        { role: "user", content: body }
      ]
    });

    reply = completion.choices[0].message.content.trim();
  } catch (e) {
    console.log(e);
  }

  await twilioClient.messages.create({
    to: from,
    from: process.env.TWILIO_NUMBER,
    body: reply
  });

  res.send("<Response></Response>");
});

app.get("/", (req, res) => res.send("sasha is live"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("running"));
