const amqp = require('amqplib');
require('dotenv').config();

async function sendToQueue(job) {
  const conn = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await conn.createChannel();
  await channel.assertQueue(process.env.QUEUE_NAME, { durable: true });
  channel.sendToQueue(process.env.QUEUE_NAME, Buffer.from(JSON.stringify(job)), {
    persistent: true,
  });
  setTimeout(() => conn.close(), 500);
}

module.exports = { sendToQueue };
