const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const path = require("path");
const themeManager = require("../utils/themeManager");
const fs = require("fs");

module.exports = {
    name: "interactionCreate",
    async execute(interaction, client) {
        if (!interaction.isButton()) return;
        
        const guild = interaction.guild;
        if (!guild) return; // Ensure we have a guild
        
        try {
            // Fetch guild theme with error handling
            let theme;
            try {
                theme = await themeManager.getTheme(guild.id);
            } catch (themeError) {
                console.error("Theme Manager Error:", themeError);
                theme = { color: "#FF0000" }; // Fallback color if theme can't be loaded
            }
            
            const buttonParts = interaction.customId.split("_");
            const buttonName = buttonParts[0];
            
            // Updated to include show button for show_my_rank
            const allowedButtons = ["claim", "hide", "info", "lock", "owner", "unhide", "unlock", "vcreset", "limit", "name", "show"];
            if (!allowedButtons.includes(buttonName)) return;
            
            // Special handling for show_my_rank button
            if (interaction.customId === 'show_my_rank') {
                // Load and execute the show handler
                const handlerPath = path.join(__dirname, "..", "handlers", `show.js`);
                if (!fs.existsSync(handlerPath)) {
                    throw new Error(`Handler file for show does not exist`);
                }
                
                const handler = require(handlerPath);
                
                // Check if handler has execute function
                if (typeof handler.execute !== 'function') {
                    throw new Error(`Handler for show does not have an execute function`);
                }
                
                await handler.execute(interaction, client);
                return;
            }
            
            // Check if handler file exists before trying to require it
            const handlerPath = path.join(__dirname, "..", "handlers", `${buttonName}.js`);
            if (!fs.existsSync(handlerPath)) {
                throw new Error(`Handler file for ${buttonName} does not exist`);
            }
            
            // Load and execute the button handler
            try {
                const handler = require(handlerPath);
                
                // Check if handler has execute function
                if (typeof handler.execute !== 'function') {
                    throw new Error(`Handler for ${buttonName} does not have an execute function`);
                }
                
                await handler.execute(interaction, client);
                
            } catch (handlerError) {
                console.error(`Button Handler Error [${buttonName}]:`, handlerError);
                
                const errorEmbed = new ContainerBuilder()
                    .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                    .addTextDisplayComponents(
                      new TextDisplayBuilder()
                        .setContent(`***❌ This button action failed: ${buttonName}***`)
                    );
                
                await safeReply(interaction, { components: [errorEmbed], flags: [MessageFlags.IsComponentsV2, 64] });
            }
        } catch (error) {
            console.error("Global Button Handler Error:", error);
            
            // Attempt to reply with a generic error message
            try {
                const errorEmbed = new ContainerBuilder()
                    .setAccentColor(0xFF0000)
                    .addTextDisplayComponents(
                      new TextDisplayBuilder()
                        .setContent("***❌ An unexpected error occurred***")
                    );
                
                await safeReply(interaction, { components: [errorEmbed], flags: [MessageFlags.IsComponentsV2, 64] });
            } catch (replyError) {
                console.error("Failed to send error message:", replyError);
            }
        }
    }
};

// Helper function to safely reply to interactions
async function safeReply(interaction, options) {
    try {
        if (!interaction) return;
        
        // Check if interaction is expired (Discord interactions expire after 15 minutes)
        const now = Date.now();
        const interactionTime = interaction.createdTimestamp;
        const FIFTEEN_MINUTES = 15 * 60 * 1000;
        
        if (now - interactionTime > FIFTEEN_MINUTES) {
            console.log(`Interaction ${interaction.id} has expired, skipping reply`);
            return;
        }
        
        // Check if interaction is still valid
        if (interaction.replied) {
            return await interaction.followUp(options);
        } else if (interaction.deferred) {
            return await interaction.editReply(options);
        } else {
            return await interaction.reply(options);
        }
    } catch (error) {
        // Only log if it's not a known expiry error
        if (error.code !== 10062 && error.code !== 10008) {
            console.error("Interaction Reply Error:", error);
        }
        // No additional handling here - this is the last resort
    }
}