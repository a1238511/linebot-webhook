import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';

const app = express();
app.use(bodyParser.json());

const CHANNEL_ACCESS_TOKEN = process.env.CHANNEL_ACCESS_TOKEN || 'YOUR_CHANNEL_TOKEN';

let groupIds = [];
let userStatus = {};
let scheduledStatus = false;
let scheduledMessage = '';

// LINE webhook 入口
app.post('/webhook', async (req, res) => {
  const events = req.body.events || [];

  for (const event of events) {
    // 加入群組時自動記錄群組 ID
    if (event.type === 'join' && event.source.type === 'group') {
      const groupId = event.source.groupId;
      if (!groupIds.includes(groupId)) {
        groupIds.push(groupId);
        await pushMessage(groupId, `✅ 已記錄群組 ID：${groupId}`);
      }
    }

    // 有人在群組內發話時補記錄群組 ID（防 join event 遺失）
    if (event.type === 'message' && event.source.type === 'group') {
      const groupId = event.source.groupId;
      if (!groupIds.includes(groupId)) {
        groupIds.push(groupId);
        await pushMessage(groupId, `⚠️ 發話補記錄群組 ID：${groupId}`);
      }
    }

    // 處理私訊文字
    if (event.type === 'message' && event.message.type === 'text' && event.source.type === 'user') {
      const userId = event.source.userId;
      const text = event.message.text.trim();
      const replyToken = event.replyToken;

      console.log(`💬 DM from ${userId}:`, text);

      if (text === '開啟') {
        userStatus[userId] = true;
        await replyMessage(replyToken, '✅ 已開啟公告同步功能');
      } else if (text === '關閉') {
        userStatus[userId] = false;
        await replyMessage(replyToken, '❌ 已關閉公告同步功能');
      } else if (text.startsWith('更新內容：')) {
        scheduledMessage = text.replace('更新內容：', '').trim();
        await replyMessage(replyToken, `✅ 已更新定時內容為：「${scheduledMessage}」`);
      } else if (text === '指令') {
        await replyMessage(replyToken,
          '📌 指令清單：\n'
          + '開啟\n'
          + '關閉\n'
          + '更新內容：你的文字\n'
          + '指令');
      } else if (userStatus[userId]) {
        for (const gid of groupIds) {
          await pushMessage(gid, `📢 ${text}`);
        }
        await replyMessage(replyToken, '📨 已公告至所有群組');
      } else {
        await replyMessage(replyToken, '⚠️ 尚未開啟公告同步，請先輸入「開啟」');
      }
    }
  }

  res.sendStatus(200);
});

// IFTTT 觸發
app.post('/ifttt', async (req, res) => {
  if (scheduledStatus && scheduledMessage) {
    for (const gid of groupIds) {
      await pushMessage(gid, `🕓 ${scheduledMessage}`);
    }
    res.send('✅ 已定時推播');
  } else {
    res.send('⚠️ 未啟動定時或未設定內容');
  }
});

// 測試首頁
app.get('/', (req, res) => {
  res.send('✅ LINE Webhook on Render is running.');
});

// 回覆私訊
async function replyMessage(token, text) {
  await axios.post(
    'https://api.line.me/v2/bot/message/reply',
    { replyToken: token, messages: [{ type: 'text', text }] },
    { headers: { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}` } }
  );
}

// 推播群組
async function pushMessage(to, text) {
  try {
    await axios.post(
      'https://api.line.me/v2/bot/message/push',
      { to, messages: [{ type: 'text', text }] },
      { headers: { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}` } }
    );
  } catch (e) {
    console.error('❌ push error:', e.response?.data || e.message);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
