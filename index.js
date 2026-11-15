const http = require('http'); // Render Port Fix (Top of file)

// --- HTTP SERVER FOR RENDER + UPTIMEROBOT (Start instantly) ---
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is alive and running 24/7!');
}).listen(PORT, '0.0.0.0', () => {
    console.log(`Web server listening on port ${PORT}`);
});

require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    InteractionType 
} = require('discord.js');

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

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`Listening in channel: ${ALLOWED_CHANNEL_ID}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== ALLOWED_CHANNEL_ID) return;

    if (message.content === '!free') {
        const embed = new EmbedBuilder()
            .setTitle('⚡ MXA FREE UID BYPASS')
            .setDescription('Enter your Game UID below to activate your free **2-day** proxy bypass access.')
            .setColor('#9b5de5')
            .setFooter({ text: 'Powered by MXA Free UID Bypass' })
            .setTimestamp();

        const button = new ButtonBuilder()
            .setCustomId('open_uid_modal')
            .setLabel('ACTIVATE FREE ACCESS')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('💎');

        const row = new ActionRowBuilder().addComponents(button);
        return message.reply({ embeds: [embed], components: [row] });
    }
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton() && interaction.customId === 'open_uid_modal') {
        const modal = new ModalBuilder()
            .setCustomId('uid_modal')
            .setTitle('Enter Game UID');

        const uidInput = new TextInputBuilder()
            .setCustomId('uid_input')
            .setLabel('GAME UID NUMBER')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter numeric Game UID (8-12 digits)...')
            .setMinLength(8)
            .setMaxLength(12)
            .setRequired(true);

        const actionRow = new ActionRowBuilder().addComponents(uidInput);
        modal.addComponents(actionRow);
        await interaction.showModal(modal);
    }

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'uid_modal') {
        const uid = interaction.fields.getTextInputValue('uid_input');

        if (!/^\d{8,12}$/.test(uid)) {
            return interaction.reply({ content: '❌ **Invalid UID.** Please provide a numeric UID between 8 and 12 digits.', ephemeral: true });
        }

        await interaction.reply({ content: `⏳ **Processing...** Attempting to activate free trial for UID: \`${uid}\`. Please wait...`, ephemeral: true });

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

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ SUCCESS')
                .setDescription(`I have successfully submitted the UID \`${uid}\` to the website for **2 Days (48 Hours)**. Check your game!`)
                .setColor('#00ff00');

            await interaction.editReply({ content: null, embeds: [successEmbed] });

        } catch (error) {
            console.error(error);
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ ERROR')
                .setDescription(`Failed to process UID \`${uid}\`. The website might be down or the layout changed.`)
                .setColor('#ff0000');
            await interaction.editReply({ content: null, embeds: [errorEmbed] });
        } finally {
            if (browser) await browser.close();
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
