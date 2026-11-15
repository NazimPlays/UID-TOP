require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const http = require('http');

// Setup Puppeteer
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const ALLOWED_CHANNEL_ID = '1567892746717626438';

// --- HTTP SERVER FOR RENDER ---
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is alive and running 24/7!');
}).listen(PORT, '0.0.0.0', () => {
    console.log(`Web server listening on port ${PORT}`);
});

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== ALLOWED_CHANNEL_ID) return;

    if (message.content.startsWith('!free ')) {
        const args = message.content.split(' ');
        const uid = args[1];

        if (!uid || !/^\d{8,12}$/.test(uid)) {
            return message.reply('❌ **Invalid UID.** Please provide a numeric UID between 8 and 12 digits. Example: `!free 621345641`');
        }

        const statusMsg = await message.reply(`⏳ **Processing...** Attempting to activate free trial for UID: \`${uid}\`. Please wait...`);

        let browser;
        try {
            browser = await puppeteer.launch({ 
                headless: true, 
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
            });
            const page = await browser.newPage();

            // অ্যান্টি-বট বাইপাস করার জন্য একটু ইউজার এজেন্ট সেট করা
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            await page.goto('https://globaluidbypass.site/portal/9789a74edee9cb55', { 
                waitUntil: 'networkidle2', 
                timeout: 60000 
            });

            await page.waitForSelector('input[placeholder="Enter numeric Game UID..."]', { timeout: 15000 });
            await page.type('input[placeholder="Enter numeric Game UID..."]', uid);

            const buttons = await page.$$('button');
            let clicked = false;
            for (const btn of buttons) {
                const text = await page.evaluate(el => el.innerText, btn);
                if (text && text.includes('ACTIVATE FREE ACCESS')) {
                    await btn.click();
                    clicked = true;
                    break;
                }
            }

            if (!clicked) throw new Error("Button not found");

            await new Promise(r => setTimeout(r, 8000));

            // নরমাল সাকসেস মেসেজ
            await statusMsg.edit(`✅ **Success!** I have submitted the UID \`${uid}\` to the website for **2 Days (48 Hours)**. Please check your game.`);

        } catch (error) {
            console.error(error);
            await statusMsg.edit(`❌ **Error:** Failed to process UID \`${uid}\`. The website might be down, or the layout changed.`);
        } finally {
            if (browser) await browser.close();
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
