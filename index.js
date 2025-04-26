import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';

const app = express();
app.use(bodyParser.json());

const CHANNEL_ACCESS_TOKEN = '在這裡填入你的 LINE TOKEN';
const PORT = process.env.PORT || 3000;

// webhook 路由（LINE 驗證用）
app.post('/webhook', (req, res) => {
  console.log('📩 收到 LINE webhook:', req.body);
  res.sendStatus(200);
});

// 手動測試確認用
app.get('/', (req, res) => {
  res.send('✅ LINE Bot Railway 版本運作中');
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
