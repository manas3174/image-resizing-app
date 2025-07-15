const amqp = require('amqplib');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

async function startWorker() {
  const conn = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await conn.createChannel();
  await channel.assertQueue(process.env.QUEUE_NAME, { durable: true });

  channel.consume(process.env.QUEUE_NAME, async (msg) => {
    if (msg !== null) {
      const job = JSON.parse(msg.content.toString());
      console.log('Processing:', job.originalName);

      const outputFilename = `${Date.now()}_${job.originalName}`;
      const outputPath = path.join(__dirname, 'output', outputFilename);

      try {
        await sharp(job.filePath)
          .resize(job.width, job.height)
          .toFile(outputPath);

        console.log(`Resized: ${outputFilename}`);
        fs.unlinkSync(job.filePath); // delete original uploaded file
        channel.ack(msg);
      } catch (err) {
        console.error('Failed to process image:', err);
        channel.nack(msg);
      }
    }
  }, { noAck: false });
}

startWorker();
