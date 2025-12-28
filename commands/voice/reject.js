const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const DynamicVoice = require("../../models/DynamicVoice");
const GuildConfig = require("../../models/GuildConfig");
const themeManager = require("../../utils/themeManager");
const UserConfig = require("../../models/UserConfig");
const cooldownHandler = require("../../events/cooldown");

module.exports = {
  name: "reject",
  aliases: ["denyr"],
  description: "Reject a user from joining your voice channel",
  category: "voice",
  cooldown: 3,
  async execute(message, args) {
    const { member, guild, mentions } = message;
    const theme = await themeManager.getTheme(guild.id);

    const timeLeft = cooldownHandler.checkCooldown("reject", message.author.id, 3);
    if (timeLeft) {
      message.delete();
      return sendEmbed(message, `***Please wait ${timeLeft} seconds***`,theme.color).then(msg => {
        setTimeout(() => msg.delete(), 5000);
      });
    }

    cooldownHandler.applyCooldown("reject", message.author.id, 3);

    if (!member.voice.channel) {
      return sendEmbed(message,`***${theme.emojis.no}・You must be in the voice channel to reject users***`,theme.color);
    }

    try {
      const voiceData = await DynamicVoice.findOne({ 
        channelId: member.voice.channel.id 
      });
      
      if (!voiceData) {
        return sendEmbed(message,`***${theme.emojis.info}・This is not a temporary voice channel***`,theme.color);
      }
    const ownerConfig = await UserConfig.findOne({ userId: voiceData.ownerId });
    const managers = ownerConfig?.managers || [];
  
    if (voiceData.ownerId !== member.id && !managers.includes(member.id)) {
        return sendEmbed(message,`***${theme.emojis.no}・Only channel owners can reject users***`,theme.color);
      }

      if (!args[0]) {
        return sendEmbed(message,`***${theme.emojis.info}・please provide a valid user***`,theme.color);
      }
  
      
      let target;


      if (mentions.members.size > 0) {
        target = mentions.members.first();
      } else {
        try {
          target = await guild.members.fetch(args[0].replace(/[<@!>]/g, ''));
        } catch {
          return sendEmbed(message,`***${theme.emojis.no}・Invalid user - please provide a valid user***`,theme.color );
        }
      }

      if (target.id === member.id) {
        return sendEmbed(message,`***${theme.emojis.no}・You cannot reject yourself***`,theme.color);
      }
      if (voiceData.rejectedUsers.includes(target.id)) {
        return sendEmbed(message,
          `***${theme.emojis.info}・<@${target.user.id}> is already rejected from this channel***`,
          theme.color
        );
      }
      const channel = guild.channels.cache.get(voiceData.channelId);
      const guildConfig = await GuildConfig.findOne({ guildId: guild.id });
      
      await Promise.all([
        channel.permissionOverwrites.edit(target, {
          ViewChannel: true,
          Connect: false,
        }),
        DynamicVoice.updateOne(
          { channelId: channel.id },
          { 
            $addToSet: { rejectedUsers: target.id }, 
            $pull: { allowedUsers: target.id }  
          }
        )
      ]);

      if (target.voice?.channelId === channel.id) {
        try {
          const moveToChannelId = guildConfig?.rejectedVoiceChannelId || guildConfig?.voiceChannelId;
          
          if (moveToChannelId) {
            await target.voice.setChannel(moveToChannelId);

            return sendEmbed(message,`***${theme.emojis.yes}・Rejected <@${target.user.id}> from your voice channel***`,theme.color);
          } else {
            await target.voice.disconnect();
            return sendEmbed(message,`***${theme.emojis.yes}・Rejected <@${target.user.id}> from your voice channel***`,theme.color);
          }
        } catch (moveError) {
          console.error("Move failed:", moveError);
          
          return sendEmbed(message,`***${theme.emojis.yes}・Rejected <@${target.user.id}> from joining your voice channel***`,theme.color);
        }
      } else {
        return sendEmbed(message,`${theme.emojis.yes}・Rejected <@${target.user.id}> from joining your voice channel`,theme.color);
      }

    } catch (error) {
      console.error("Reject command error:", error);
      return sendEmbed(message,`***${theme.emojis.no}・Failed to reject user: ${error.message}***`,theme.color);
    }
  }
};

function sendEmbed(message, description, color) {
  const container = new ContainerBuilder()
    .setAccentColor(typeof color === 'string' ? parseInt(color.replace('#', '0x'), 16) : color)
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(description)
    );
  return message.channel.send({
    components: [container],
    flags: [MessageFlags.IsComponentsV2]
  });
}
