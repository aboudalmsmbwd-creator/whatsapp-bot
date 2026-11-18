const express = require('express');
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    makeInMemoryStore, 
    WAMessageStubType,
    Browsers,
    downloadMediaMessage
} = require('@whiskeysockets/baileys');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ==========================================
// إعدادات الأمان والبيانات (تُقرأ من السيرفر)
// ==========================================
// NOTE: لا تضع التوكن والآيدي هنا مباشرة. قم بإضافتها في إعدادات Variables في Railway/Render.
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; 
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// قاعدة بيانات الأكواد المفعلة (يمكنك تعديلها هنا)
let validCodes = ['VIP-1122', 'TECH-9988', 'ADMIN-2026', 'ABDO-FREE'];

// دالة الإرسال لتيليجرام (للإشعارات وطلب الأكواد)
async function sendToTelegram(text) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return console.log('Telegram creds missing, cannot send notification.');
    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: text,
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('Telegram Error:', error.message);
    }
}

// ==========================================
// 1. واجهة الموقع (Abdulrahman Bot)
// ==========================================
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Abdulrahman Bot - تفعيل الخدمة</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card { background: #1e293b; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 100%; max-width: 400px; text-align: center; box-sizing: border-box; }
                h2 { color: #38bdf8; margin-bottom: 5px; font-size: 28px; }
                .dev-tag { font-size: 13px; color: #94a3b8; margin-bottom: 30px; border-bottom: 1px solid #475569; padding-bottom: 15px; }
                p { color: #e2e8f0; margin-bottom: 10px; }
                input { width: 100%; padding: 15px; margin: 10px 0 20px 0; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #fff; text-align: center; font-size: 18px; box-sizing: border-box; transition: border-color 0.3s; }
                input:focus { outline: none; border-color: #38bdf8; }
                button { width: 100%; padding: 15px; margin-top: 10px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 16px; transition: opacity 0.3s; }
                button:hover { opacity: 0.9; }
                .btn-login { background: #22c55e; color: white; }
                .btn-request { background: #0284c7; color: white; margin-top: 20px; }
                .footer { font-size: 11px; color: #64748b; margin-top: 30px; }
                @media (max-width: 480px) { .card { padding: 20px; } }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>🤖 Abdulrahman Bot</h2>
                <div class="dev-tag">تصميم وبرمجة: عبدالرحمن عبدالمغني</div>
                
                <p>أدخل كود التفعيل الخاص بك للبدء:</p>
                <form action="/verify" method="POST">
                    <input type="text" name="code" placeholder="مثال: VIP-1122" required autocomplete="off">
                    <button type="submit" class="btn-login">دخول وربط البوت</button>
                </form>

                <hr style="border-color: #334155; margin: 20px 0;">
                
                <p style="font-size: 14px; color: #94a3b8;">ليس لديك كود؟ اطلب كوداً جديداً الآن:</p>
                <form action="/request-code" method="POST">
                    <button type="submit" class="btn-request">طلب كود تفعيل جديد</button>
                </form>

                <div class="footer">جميع الحقوق محفوظة © 2026</div>
            </div>
        </body>
        </html>
    `);
});

// معالجة طلب كود جديد من العميل وإرساله لتيليجرام
app.post('/request-code', async (req, res) => {
    // جلب IP العميل
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    // توليد كود مقترح
    const requestedCode = 'REQ-' + Math.floor(100000 + Math.random() * 900000);
    
    await sendToTelegram(`🔔 **طلب كود تفعيل جديد لـ Abdulrahman Bot!**\n🌐 IP العميل: \`${clientIP}\`\n🔑 الكود المقترح للعميل: \`${requestedCode}\`\n\n*(قم بإضافة هذا الكود إلى قائمة الأكواد المفعلة في server.js إذا قام بالشراء)*`);

    res.send(`
        <html lang="ar" dir="rtl"><body style="background:#0f172a; color:#fff; text-align:center; padding-top:50px; font-family: sans-serif;">
        <div style="background:#1e293b; padding:30px; border-radius:12px; display:inline-block; max-width:300px;">
        <h2 style="color:#22c55e;">✅ تم إرسال طلبك بنجاح!</h2>
        <p>تم إرسال طلبك إلى الإدارة. يرجى التواصل مع الدعم للحصول على الكود الخاص بك وإتمام العملية.</p>
        <a href="/" style="color:#38bdf8; text-decoration:none; display:block; margin-top:20px;">العودة للصفحة الرئيسية</a>
        </div>
        </body></html>
    `);
});

// التحقق من صحة الكود المُدخل وتشغيل البوت
app.post('/verify', async (req, res) => {
    const userCode = req.body.code ? req.body.code.trim().toUpperCase() : '';

    if (validCodes.includes(userCode)) {
        res.send(`
            <html lang="ar" dir="rtl"><body style="background:#0f172a; color:#fff; text-align:center; padding-top:50px; font-family: sans-serif;">
             <div style="background:#1e293b; padding:30px; border-radius:12px; display:inline-block; max-width:300px;">
            <h2 style="color:#22c55e;">✅ كود صحيح وتم التحقق بنجاح!</h2>
            <p>جاري ربط Abdulrahman Bot وتشغيله... تفقد "التيرمنال" (Logs) في لوحة تحكم الاستضافة لربط رقمك عبر QR Code.</p>
            <p style="font-size:12px; color:#f87171;">⚠️ لا تغلق الصفحة حتى يتم الربط بنجاح في الـ Logs.</p>
             </div>
            </body></html>
        `);
        
        console.log(`[AUTH] تم استخدام كود صحيح بنجاح: ${userCode}`);
        // بدء تشغيل جلسة بوت الواتساب لهذا الكود
        startUserWhatsAppBot(userCode);

    } else {
        console.log(`[AUTH] محاولة دخول فاشلة بالكود: ${userCode}`);
        res.send(`
            <html lang="ar" dir="rtl"><body style="background:#0f172a; color:#fff; text-align:center; padding-top:50px; font-family: sans-serif;">
             <div style="background:#1e293b; padding:30px; border-radius:12px; display:inline-block; max-width:300px;">
            <h2 style="color:#ef4444;">❌ كود التفعيل غير صالح!</h2>
            <p>الرجاء التأكد من الكود المدخل أو طلب كود جديد.</p>
            <a href="/" style="color:#38bdf8; text-decoration:none; display:block; margin-top:20px;">الرجوع للخلف</a>
             </div>
            </body></html>
        `);
    }
});

// ==========================================
// 2. تشغيل بوت الواتساب لكل مستخدم (Multi-Session)
// ==========================================
const store = makeInMemoryStore({});
// تفعيل الذاكرة المؤقتة للمساعدة في ميزة منع الحذف

async function startUserWhatsAppBot(sessionName) {
    // إنشاء مجلد خاص وآمن لحفظ بيانات جلسة كل مستخدم (لكي لا يضيع الربط عند إعادة التشغيل)
    const sessionDir = path.join(__dirname, `session_store/sess_${sessionName}`);
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    const sock = makeWASocket({
        auth: state,
        browser: Browsers.macOS('Desktop'), // يظهر كواتساب ديسكتاوب
        printQRInTerminal: true, // يظهر الـ QR Code في الـ Logs
        logger: null // إخفاء الـ Logs الكثيرة والمزعجة
    });

    store.bind(sock.ev);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
             console.log(`[BOT:${sessionName}] يرجى مسح QR Code الظاهر أعلاه (في الـ Logs) لربط حساب العميل.`);
        }

        if (connection === 'close') {
            // محاولة إعادة الاتصال تلقائياً إذا انقطع
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`[BOT:${sessionName}] انقطع الاتصال. إعادة المحاولة: ${shouldReconnect}`);
            if (shouldReconnect) startUserWhatsAppBot(sessionName);
        } else if (connection === 'open') {
            console.log(`✅ [BOT:${sessionName}] تم اتصال بوت الواتساب بنجاح!`);
            sendToTelegram(`🚀 **Abdulrahman Bot: تم ربط مستخدم جديد!**\n🔑 كود التفعيل المستخدم: \`${sessionName}\``);
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // --- وظائف البوت الأساسية ---
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        // أ) مشاهدة الحالات تلقائياً (Auto-View)
        if (m.key.remoteJid === 'status@broadcast') {
            await sock.readMessages([m.key]);
            console.log(`👁️ [BOT:${sessionName}] تم مشاهدة حالة جديدة (Status) تلقائياً.`);
        }

        // ب) التقاط الوسائط المشفرة (View Once) سراً
        try {
            const msgContent = m.message;
            const isViewOnce = msgContent.imageMessage?.viewOnce || 
                               msgContent.videoMessage?.viewOnce ||
                               msgContent.viewOnceMessageV2;

            if (isViewOnce) {
                console.log(`📸 [BOT:${sessionName}] تم رصد رسالة مشفرة (عرض لمرة واحدة)! جاري التقاطها...`);
                
                // تحميل الوسيطة بدون علم الطرف الآخر
                const buffer = await downloadMediaMessage(
                    m,
                    'buffer',
                    {},
                    { logger: console, reuploadRequest: sock.updateMediaMessage }
                );

                // تحديد JID لصاحب البوت (العميل)
                const ownerJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                
                // إرسال الصورة/الفيديو لصاحب البوت
                await sock.sendMessage(ownerJid, { 
                    image: buffer, 
                    caption: `🚨 [Abdulrahman Bot] \nتم التقاط صورة/فيديو مشفر (View Once) سراً بدون علم المرسل.\n👤 المرسل: ${m.key.participant || m.key.remoteJid}` 
                });
                console.log(`✅ [BOT:${sessionName}] تم إرسال الصورة/الفيديو المشفر لصاحب البوت بنجاح.`);
            }
        } catch (err) {
            console.error(`❌ [BOT:${sessionName}] Error handling View Once media:`, err.message);
        }
    });

    // ج) منع حذف الرسائل (Anti-Revoke)
    sock.ev.on('messages.update', async (updates) => {
        for (let update of updates) {
            if (update.update.messageStubType === WAMessageStubType.REVOKE) {
                console.log(`⚠️ [BOT:${sessionName}] تم حذف رسالة! جاري استرجاع المحتوى...`);
                const messageId = update.key.id;
                const msgData = store.loadMessage(update.key.remoteJid, messageId);

                if (msgData) {
                    const sender = msgData.key.participant || msgData.key.remoteJid;
                    const msgType = Object.keys(msgData.message)[0]; // نوع الرسالة (نص، صورة، الخ)
                    const chatName = msgData.key.remoteJid.endsWith('@g.us') ? '*(مجموعة)*' : '*(خاص)*';

                    let alertText = `⚠️ **[Abdulrahman Bot] تم حذف رسالة عليك!** ${chatName}\n👤 من: ${sender}\n`;
                    
                    // استخراج المحتوى النصي
                    if (msgType === 'conversation') {
                        alertText += `💬 المحتوى: ${msgData.message.conversation}`;
                    } else if (msgType === 'extendedTextMessage') {
                        alertText += `💬 المحتوى: ${msgData.message.extendedTextMessage.text}`;
                    } else {
                        alertText += `📎 المحتوى: [رسالة محذوفة من نوع: ${msgType}]`;
                    }

                    const ownerJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                    
                    // إرسال تنبيه بالرسالة المحذوفة لصاحب البوت
                    await sock.sendMessage(ownerJid, { text: alertText });
                    
                    // إذا كانت الرسالة المحذوفة ميديا (صورة/فيديو/صوت)، حاول تحميلها وإرسالها أيضاً
                    if (msgType !== 'conversation' && msgType !== 'extendedTextMessage') {
                         try {
                             const buffer = await downloadMediaMessage(msgData, 'buffer');
                             await sock.sendMessage(ownerJid, { [msgType.replace('Message', '')]: buffer, caption: `[ميديا محذوفة]\n${alertText}` });
                         } catch(e) { console.log('Could not download revoked media file.'); }
                    }
                    console.log(`✅ [BOT:${sessionName}] تم إرسال الرسالة المحذوفة لصاحب البوت بنجاح.`);
                } else {
                     console.log(`❌ [BOT:${sessionName}] لم يتم العثور على الرسالة المحذوفة في الذاكرة المؤقتة (Store).`);
                }
            }
        }
    });
}

// ==========================================
// 3. تشغيل السيرفر (Web Server)
// ==========================================
const PORT = process.env.PORT || 3000;
// الاستماع على البورت المحدد من الاستضافة أو 3000 محلياً
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Abdulrahman Bot Dashboard is running on port: ${PORT}`);
});
