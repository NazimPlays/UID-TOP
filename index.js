require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

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
            // Launch browser (headless: false means you can see the browser on your PC, set to true to hide it)
            browser = await puppeteer.launch({ 
                headless: true, 
                args: ['--no-sandbox', '--disable-setuid-sandbox'] 
            });
            const page = await browser.newPage();

            // Go to the website
            await page.goto('https://globaluidbypass.site/portal/9789a74edee9cb55', { 
                waitUntil: 'networkidle2', 
                timeout: 60000 
            });

            // 1. Find the input field and type the UID
            // We use the placeholder text from your screenshot to find the box
            await page.waitForSelector('input[placeholder="Enter numeric Game UID..."]', { timeout: 10000 });
            await page.type('input[placeholder="Enter numeric Game UID..."]', uid);

            // 2. Find the "ACTIVATE FREE ACCESS" button and click it
            // We look for all buttons and click the one containing the text
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

            // 3. Wait for the website to process the request (Wait 8 seconds)
            await new Promise(r => setTimeout(r, 8000));

            // Optional: Take a screenshot to prove it worked
            // await page.screenshot({ path: `result_${uid}.png` });

            await statusMsg.edit(`✅ **Success!** I have submitted the UID \`${uid}\` to the website. Please check the website or your game to see if it worked.`);

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
