const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;

// ===== LINE Bot 設定 =====
const config = {
  channelAccessToken: 'ZfmREcmHR5OnAUUQGjnDvkxQVkr8ju0L/RmznL83iATN1K98yd4odv5/UhGW5gkKlezhS0V9+XRdcU2UHguy09igv4NVPrMPbnTrbYTMoanIOPOSl5uKm422cDHJq5ICBZ2VxLO5WrGn5YjhV+yOjwdB04t89/1O/w1cDnyilFU=',
  channelSecret: 'e1ee87316fdb81cd7770bbcee472c245'
};

const client = new Client(config);
app.use(express.json());
app.use(middleware(config));

// ===== 群組記錄處理 =====
const groupFile = 'groups.json';
let groups = [];
if (fs.existsSync(groupFile)) {
  try {
    groups = JSON.parse(fs.readFileSync(groupFile));
  } catch (e) {
    console.error('讀取群組資料錯誤，初始化為空：', e);
    groups = [];
  }
}

// ===== Webhook 主入口 =====
app.post('/webhook', async (req, res) => {
  try {
    await Promise.all(req.body.events.map(handleEvent));
    res.status(200).end();
  } catch (err) {
    console.error('Webhook 錯誤：', err);
    res.status(500).end();
  }
});

// ===== 處理 LINE 各類事件 =====
async function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') {
    const message = event.message.text;

    // 加入群組時自動記錄 groupId
    if (event.source.type === 'group') {
      const groupId = event.source.groupId;
      if (!groups.includes(groupId)) {
        groups.push(groupId);
        fs.writeFileSync(groupFile, JSON.stringify(groups));
        console.log('新群組已加入：', groupId);
      }
    }

    // 私訊轉發到所有已儲存群組
    if (event.source.type === 'user') {
      const pushText = `[同步訊息]\n${message}`;
      for (const groupId of groups) {
        try {
          await client.pushMessage(groupId, { type: 'text', text: pushText });
        } catch (e) {
          console.warn(`推送至群組 ${groupId} 失敗：`, e.message);
        }
      }
    }
  }

  return Promise.resolve();
}

// ===== Render 預設根目錄檢查用 =====
app.get('/', (req, res) => {
  res.send('✅ LINE Webhook 運作中');
});

app.listen(port, () => {
  console.log(`✅ 伺服器啟動，監聽於 port ${port}`);
});
