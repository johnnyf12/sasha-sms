import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendSMS({ to, from, body }) {
  const msg = await client.messages.create({
    to,
    from,
    body,
  });

  return {
    carrier: "twilio",
    carrierMessageId: msg.sid,
    status: msg.status,
  };
}