require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const http = require('http'); // Render Port Fix

// Setup Puppeteer with Stealth to avoid bot detection
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent // REQUIRED to read message commands
    ]
});

// Your specific channel ID
const ALLOWED_CHANNEL_ID = '1567892746717626438';

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`Listening for !free commands in channel: ${ALLOWED_CHANNEL_ID}`);
});

client.on('messageCreate', async (message) => {
    // Ignore bots and other channels
    if (message.author.bot) return;
    if (message.channel.id !== ALLOWED_CHANNEL_ID) return;

    // Check for command !free <uid>
    if (message.content.startsWith('!free ')) {
        const args = message.content.split(' ');
        const uid = args[1];

        // Validate UID (must be 8-12 digits)
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

            await page.goto('https://globaluidbypass.site/portal/9789a74edee9cb55', { 
                waitUntil: 'networkidle2', 
                timeout: 60000 
            });

            await page.waitForSelector('input[placeholder="Enter numeric Game UID..."]', { timeout: 10000 });
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

            if (!clicked) {
                throw new Error("Could not find the 'ACTIVATE FREE ACCESS' button.");
            }

            await new Promise(r => setTimeout(r, 8000));

            await statusMsg.edit(`✅ **Success!** I have submitted the UID \`${uid}\` to the website for **2 Days (48 Hours)**. Please check the website or your game to see if it worked.`);

        } catch (error) {
            console.error(error);
            await statusMsg.edit(`❌ **Error:** Failed to process UID \`${uid}\`. The website might be down, or the layout changed.`);
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);

// --- HTTP SERVER FOR RENDER + UPTIMEROBOT ---
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is alive and running 24/7!');
}).listen(PORT, '0.0.0.0', () => {
    console.log(`Web server listening on port ${PORT}`);
});
