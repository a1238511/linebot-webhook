import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import fs from 'fs-extra';

const app = express();
app.use(bodyParser.json());

const CHANNEL_ACCESS_TOKEN = 'ZfmREcmHR5OnAUUQGjnDvkxQVkr8ju0L/RmznL83iATN1K98yd4odv5/UhGW5gkKlezhS0V9+XRdcU2UHguy09igv4NVPrMPbnTrbYTMoanIOPOSl5uKm422cDHJq5ICBZ2VxLO5WrGn5YjhV+yOjwdB04t89/1O/w1cDnyilFU=';

let groupIds = [];
let userStatus = {};
let scheduledStatus = false;
let scheduledMessage = '';

const GROUP_FILE = './groups.json';

// 載入群組資料
async function loadGroups() {
  try {
    groupIds = await fs.readJson(GROUP_FILE);
    console.log('✅ 已載入群組:', groupIds);
  } catch {
    groupIds = [];
    console.log('⚠️ 尚無群組資料，將建立新檔');
  }
}

// 儲存群組資料
async function saveGroups() {
  await fs.writeJson(GROUP_FILE, groupIds);
}

// 根目錄
app.get('/', (req, res) => res.send('✅ LINE 機器人已正常運行'));

// LINE Webhook處理入口
app.post('/', async (req, res) => {
  const events = req.body.events || [];

  for (const event of events) {

    // 加入群組自動記錄
    if (event.type === 'join' && event.source.type === 'group') {
      const groupId = event.source.groupId;
      if (!groupIds.includes(groupId)) {
        groupIds.push(groupId);
        await saveGroups();
      }
      await pushMessage(groupId, `✅ 已記錄群組 ID：${groupId}`);
    }

    // 群組內發訊息自動補記錄
    if (event.type === 'message' && event.source.type === 'group') {
      const groupId = event.source.groupId;
      if (!groupIds.includes(groupId)) {
        groupIds.push(groupId);
        await saveGroups();
        await pushMessage(groupId, `✅ 已記錄群組 ID：${groupId}`);
      }
    }

    // 私訊指令與同步公告功能
    if (event.type === 'message'
        && event.message.type === 'text'
        && event.source.type === 'user') {
      const userId = event.source.userId;
      const text = event.message.text.trim();
      const replyToken = event.replyToken;

      if (text === '開啟定時') {
        scheduledStatus = true;
        await replyMessage(replyToken, '✅ 已開啟每4小時自動發送');
      } else if (text === '關閉定時') {
        scheduledStatus = false;
        await replyMessage(replyToken, '❌ 已關閉自動發送');
      } else if (text.startsWith('更新內容：')) {
        scheduledMessage = text.replace('更新內容：', '').trim();
        await replyMessage(replyToken, `✅ 已更新定時內容：「${scheduledMessage}」`);
      } else if (text === '指令') {
        await replyMessage(replyToken,
          '📌 指令清單：\n'
          + '開啟定時\n'
          + '關閉定時\n'
          + '更新內容：你的文字\n'
          + '指令\n'
          + '開啟\n'
          + '關閉');
      } else if (text === '開啟') {
        userStatus[userId] = true;
        await replyMessage(replyToken, '✅ 已開啟同步公告');
      } else if (text === '關閉') {
        userStatus[userId] = false;
        await replyMessage(replyToken, '❌ 已關閉同步公告');
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

// IFTTT觸發端點
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

// 回覆私訊函數
async function replyMessage(token, text) {
  await axios.post('https://api.line.me/v2/bot/message/reply',
    { replyToken: token, messages: [{ type: 'text', text }] },
    { headers: { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}` } });
}

// 主動推播函數
async function pushMessage(to, text) {
  try {
    await axios.post('https://api.line.me/v2/bot/message/push',
      { to, messages: [{ type: 'text', text }] },
      { headers: { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}` } });
  } catch (e) {
    console.error('❌ 推播錯誤:', e.response?.data || e.message);
  }
}

// 啟動伺服器並載入群組
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  await loadGroups();
  console.log(`✅ 伺服器已啟動於 port ${PORT}`);
});
