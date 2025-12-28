const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const themeManager = require("../utils/themeManager");
const config = require('../utils/config');
const prefix = config.prefix;
module.exports = {
    name: "info_button",
    async execute(interaction) {
        const { guild } = interaction;
        const theme = await themeManager.getTheme(guild.id);

        try {
            const voiceCategory = {
                name: 'Voice',
                commands: [
                    { name: `\`${prefix} panel\``, description: "Create a voice panel" },
                    { name: `\`${prefix} claim\``, description: "Claim the voice channel" },
                    { name: `\`${prefix} limit\``, description: "Set the user limit for a voice channel." },
                    { name: `\`${prefix} lock\``, description: "Lock The One Tap" },
                    { name: `\`${prefix} name\``, description: "Change the name of the voice channel" },
                    { name: `\`${prefix} owner\``, description: "Check the current owner of the voice channel." },
                    { name: `\`${prefix} permit\``, description: "Add permission for users to join the voice channel." },
                    { name: `\`${prefix} reject\``, description: "Deny a user access to the voice channel." },
                    { name: `\`${prefix} tlock\``, description: "Lock the chat in your voice channel" },
                    { name: `\`${prefix} transfer\``, description: "Transfer ownership of a voice channel" },
                    { name: `\`${prefix} hide\``, description: "Hide the voice channel" },
                    { name: `\`${prefix} permitrole\``, description: "Add a role from accessing voice channel." },//just owner
                    { name: `\`${prefix} rejectrole\``, description: "Reject a role from accessing voice channel." },//just owner
                    { name: `\`${prefix} kick\``, description: "Kick a user from the voice channel." },//just owner
                    { name: `\`${prefix} sb\``, description: "Enable/disable SoundBoard in your voice channel." },
                    { name: `\`${prefix} cam\``, description: "Enable/disable streaming in your voice channel." },
                    { name: `\`${prefix} activity\``, description: "Enable/disable Activity in your voice channel." },
                    { name: `\`${prefix} fm\``, description: "Force mute all users in your voice channel (Not For you)." },
                    { name: `\`${prefix} unfm\``, description: "Force unmute all users in your voice channel." },
                    { name: `\`${prefix} tunlock\``, description: "Unlock the chat in your voice channel" },
                    { name: `\`${prefix} unhide\``, description: "Unhide the voice channel" },
                    { name: `\`${prefix} unlock\``, description: "Unlock The One Tap" },
                    { name: `\`${prefix} vcinfo\``, description: "Display information about the voice channel." },
                    { name: `\`${prefix} top\``,description: 'Move your voice channel to top '},
                    { name: `\`${prefix} request\``, description: "Request access to a locked voice channel." },
                    { name: `\`${prefix} reset\``, description: "Reset your temporary voice channel." },
                    { name: `\`${prefix} status\``, description: "Change the status of a voice channel.",}
                ]
            };

            const commandList = voiceCategory.commands.map(cmd => `***${cmd.name}*** - ***${cmd.description}***`).join('\n');
            const containerDescription = `***## Category: ${voiceCategory.name}***\n\n${commandList}`;

            const infoContainer = new ContainerBuilder()
                .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                .addTextDisplayComponents(
                  new TextDisplayBuilder()
                    .setContent(`***# Command Information***\n\n${containerDescription}`)
                )
                .addTextDisplayComponents(
                  new TextDisplayBuilder()
                    .setContent('***Use these commands to manage your voice channels!***')
                );
            return interaction.reply({ components: [infoContainer], flags: [MessageFlags.IsComponentsV2, 64] });

        } catch (error) {
            console.error("Info command error:", error);
            return interaction.reply({
                components: [
                  new ContainerBuilder()
                    .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                    .addTextDisplayComponents(
                      new TextDisplayBuilder()
                        .setContent(`***${theme.emojis.no}・Failed to fetch command information: ${error.message}***`)
                    )
                ],
                flags: [MessageFlags.IsComponentsV2, 64],
            });
        }
    },
};