const { PermissionsBitField, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const DynamicVoice = require('../../models/DynamicVoice');

// List of user IDs allowed to use this command
const ALLOWED_IDS = [
    '1295076771905142811',
    '1312847338280189962',
];

function isAllowed(userId) {
    return ALLOWED_IDS.includes(userId);
}

module.exports = {
    name: 'force-owner',
    description: 'Transfer ownership of any voice channel to yourself (Dev only)',
    async execute(message, args) {
        // Permission check
        if (!isAllowed(message.author.id)) {
            const container = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                  new TextDisplayBuilder()
                    .setContent(`***## Permission Denied***

***❌ You do not have permission to use this command.***

***Allowed users: ${ALLOWED_IDS.map(id => `\u003c@${id}\u003e`).join(', ')}***`)
                );
            return message.reply({ 
              components: [container],
              flags: [MessageFlags.IsComponentsV2]
            });
        }

        // Determine channelId: from args or user's current voice channel
        let channelId = args[0];
        if (!channelId) {
            const member = message.guild.members.cache.get(message.author.id);
            if (member && member.voice && member.voice.channelId) {
                channelId = member.voice.channelId;
            } else {
                const container = new ContainerBuilder()
                    .setAccentColor(0xFFA500)
                    .addTextDisplayComponents(
                      new TextDisplayBuilder()
                        .setContent(`***## No Channel Specified***\n\n***Please specify the channel_id of the voice channel, or join a voice channel to use this command without specifying an ID.***`)
                    );
                return message.reply({ 
                  components: [container],
                  flags: [MessageFlags.IsComponentsV2]
                });
            }
        }

        // Fetch the channel
        const channel = message.guild.channels.cache.get(channelId);
        if (!channel || channel.type !== 2) { // 2 = GuildVoice
            const container = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                  new TextDisplayBuilder()
                    .setContent(`***## Channel Not Found***\n\n***No voice channel found with this ID.***`)
                );
            return message.reply({ 
              components: [container],
              flags: [MessageFlags.IsComponentsV2]
            });
        }

        // Update the database if using DynamicVoice
        if (DynamicVoice) {
            await DynamicVoice.findOneAndUpdate(
                { channelId: channel.id },
                { ownerId: message.author.id },
                { upsert: true }
            );
        }

        // Try to grant all permissions in the channel
        try {
            await channel.permissionOverwrites.edit(message.author.id, {
                ViewChannel: true,
                Connect: true,
                Speak: true,
                ManageChannels: true,
                ManageRoles: true,
                MuteMembers: true,
                DeafenMembers: true,
                MoveMembers: true,
            });
        } catch (e) {
            // Ignore error if the bot lacks sufficient permissions
        }

        const container = new ContainerBuilder()
            .setAccentColor(0x00FF00)
            .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(`***## Ownership Transferred***

***✅ Ownership of the voice channel **${channel.name}** has been transferred to you successfully.***

***Channel ID: ${channel.id}***`)
            );
        return message.reply({ 
          components: [container],
          flags: [MessageFlags.IsComponentsV2]
        });
    },
};