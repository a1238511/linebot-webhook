import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';

const app = express();
app.use(bodyParser.json());

const CHANNEL_ACCESS_TOKEN = process.env.CHANNEL_ACCESS_TOKEN || 'YOUR_CHANNEL_TOKEN';

app.post('/webhook', (req, res) => {
  console.log('📥 LINE webhook received:', JSON.stringify(req.body));
  res.sendStatus(200);
});

app.get('/', (req, res) => {
  res.send('✅ LINE Webhook on Render is running.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
