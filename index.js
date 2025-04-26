import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import fs from 'fs-extra';

const app = express();
app.use(bodyParser.json());

const CHANNEL_ACCESS_TOKEN = 'ZfmREcmHR5OnAUUQGjnDvkxQVkr8ju0L/RmznL83iATN1K98yd4odv5/UhGW5gkKlezhS0V9+XRdcU2UHguy09igv4NVPrMPbnTrbYTMoanIOPOSl5uKm422cDHJq5ICBZ2VxLO5WrGn5YjhV+yOjwdB04t89/1O/w1cDnyilFU=';

let groupIds = [];
let scheduledStatus = false;
let scheduledMessage = '';

const GROUP_FILE = './groups.json';

async function loadGroups() {
  try {
    groupIds = await fs.readJson(GROUP_FILE);
    console.log('✅ 已載入群組:', groupIds);
  } catch {
    groupIds = [];
    console.log('⚠️ 尚無群組資料，將建立新檔');
  }
}

async function saveGroups() {
  await fs.writeJson(GROUP_FILE, groupIds);
}

app.get('/', (req, res) => res.send('✅ LINE 機器人已正常運行'));

app.post('/', async (req, res) => {
  const events = req.body.events || [];

  for (const event of events) {
    const { type, source, message, replyToken } = event;

    // 自動記錄群組 ID（加入或講話）
    if (source?.type === 'group') {
      const gid = source.groupId;
      if (!groupIds.includes(gid)) {
        groupIds.push(gid);
        await saveGroups();
        if (type === 'join') {
          await pushMessage(gid, `✅ 已記錄群組 ID：${gid}`);
        } else if (type === 'message') {
          await pushMessage(gid, `✅ 已補記錄群組 ID：${gid}`);
        }
      }
    }

    // 私訊功能區
    if (type === 'message' && message.type === 'text' && source.type === 'user') {
      const text = message.text.trim();

      if (text === '開啟') {
        scheduledStatus = true;
        await replyMessage(replyToken, '✅ 已啟用定時訊息（IFTTT 將可觸發）');
      } else if (text === '關閉') {
        scheduledStatus = false;
        await replyMessage(replyToken, '❌ 已關閉定時訊息');
      } else if (text === '同步群組') {
        const newGroupIds = [];
        for (const e of events) {
          if (e.source?.type === 'group') {
            const gid = e.source.groupId;
            if (!groupIds.includes(gid)) {
              groupIds.push(gid);
              newGroupIds.push(gid);
            }
          }
        }
        if (newGroupIds.length > 0) {
          await saveGroups();
          await replyMessage(replyToken, `✅ 已補記錄 ${newGroupIds.length} 個群組`);
        } else {
          await replyMessage(replyToken, '⚠️ 沒有新群組需要補記錄');
        }
      } else if (text === '指令') {
        await replyMessage(replyToken,
          '📌 指令清單：\n'
          + '開啟（IFTTT 啟用）\n'
          + '關閉（IFTTT 停用）\n'
          + '同步群組（補記群 ID）\n'
          + '指令（查看這個清單）\n\n'
          + '📩 輸入任意文字會直接更新定時訊息內容');
      } else {
        scheduledMessage = text;
        await replyMessage(replyToken, `✅ 已更新定時內容：「${scheduledMessage}」`);
      }
    }
  }

  res.sendStatus(200);
});

// IFTTT 定時推播觸發
app.post('/ifttt', async (req, res) => {
  if (scheduledStatus && scheduledMessage) {
    for (const gid of groupIds) {
      await pushMessage(gid, `🕓 ${scheduledMessage}`);
    }
    res.send('✅ 已定時推播');
  } else {
    res.send('⚠️ 未啟用定時訊息或未設定內容');
  }
});

// LINE 回覆私訊
async function replyMessage(token, text) {
  await axios.post('https://api.line.me/v2/bot/message/reply',
    { replyToken: token, messages: [{ type: 'text', text }] },
    { headers: { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}` } });
}

// LINE 主動推播
async function pushMessage(to, text) {
  try {
    await axios.post('https://api.line.me/v2/bot/message/push',
      { to, messages: [{ type: 'text', text }] },
      { headers: { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}` } });
  } catch (e) {
    console.error('❌ 推播錯誤:', e.response?.data || e.message);
  }
}

// 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  await loadGroups();
  console.log(`✅ 伺服器啟動於 port ${PORT}`);
});
