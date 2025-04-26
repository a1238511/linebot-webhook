import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// Webhook 路由 (LINE 驗證)
app.post('/webhook', (req, res) => {
  console.log('📩 收到 LINE webhook:', req.body);
  res.sendStatus(200);
});

app.get('/', (req, res) => {
  res.send('✅ LINE Bot Railway 版本運作中');
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
