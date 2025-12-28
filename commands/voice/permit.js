const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const DynamicVoice = require("../../models/DynamicVoice");
const themeManager = require("../../utils/themeManager");
const UserConfig = require("../../models/UserConfig");
const cooldownHandler = require("../../events/cooldown");

module.exports = {
  name: "permit",
  description: "Allow a user to join your voice channel",
  category: "voice",
  cooldown: 8,
  async execute(message, args) {
    const { member, guild, mentions } = message;
    const theme = await themeManager.getTheme(guild.id);
    let targetUser = mentions.users.first();

    if (!targetUser && args[0]) {
      try {
        targetUser = await guild.client.users.fetch(args[0]);
      } catch (error) {
      }
    }
    const timeLeft = cooldownHandler.checkCooldown("permit", message.author.id, 8);
    if (timeLeft) {
      message.delete();
      return sendEmbed(message, `***Please wait ${timeLeft} seconds***`,theme.color).then(msg => {
        setTimeout(() => msg.delete(), 5000);
      });
    }

    cooldownHandler.applyCooldown("permit", message.author.id, 8);

    if (!member.voice.channel) {
      return sendEmbed(message, `***${theme.emojis.no}・**Error!** You must be in a voice channel to use this command***`, theme.color);
    }

    const voiceData = await DynamicVoice.findOne({ 
      channelId: member.voice.channel.id,
      guildId: guild.id
    });
    
    if (!voiceData) {
      return sendEmbed(message,`***${theme.emojis.info}・**Warning!** ${member} this is not a temporary voice channel***`,theme.color);
    }
    
    const ownerConfig = await UserConfig.findOne({ userId: voiceData.ownerId });
    const managers = ownerConfig?.managers || [];
    if (voiceData.ownerId !== member.id && !managers.includes(member.id)) {
      return sendEmbed(message, `***${theme.emojis.info}・**Warning!** You must be the owner of this voice channel or an authorized manager***`, theme.color);
    }

    if (!targetUser) {
      return sendEmbed(message, `***${theme.emojis.info}・**Warning!** Please provide a valid user to permit***`, theme.color);
    }

    if (voiceData.allowedUsers.includes(targetUser.id)) {
      return sendEmbed(message, `***${theme.emojis.info}・**Warning!** ${targetUser} is already permitted to join the channel***`, theme.color);
    }

    try {
      // Check if the target user is still in the guild
      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) {
        return sendEmbed(message, `***${theme.emojis.no}・**Error!** User is no longer in this server***`, theme.color);
      }

      await Promise.all([
        member.voice.channel.permissionOverwrites.edit(targetUser.id, { 
          ViewChannel: true,
          Connect: true,
        }),
        DynamicVoice.updateOne(
          { channelId: member.voice.channel.id },
          { 
            $addToSet: { allowedUsers: targetUser.id }, 
            $pull: { rejectedUsers: targetUser.id }   
          }
        )
      ]);
      
      return sendEmbed(message, `***${theme.emojis.yes}・**Success!** ${targetUser} has been permitted to join <#${member.voice.channel.id}>***`, theme.color);
    } catch (error) {
      console.error("Error permitting user:", error);
      
      // Handle specific error cases
      if (error.code === 10009) {
        return sendEmbed(message, `***${theme.emojis.no}・**Error!** User is no longer available or has left the server***`, theme.color);
      }
      
      return sendEmbed(message, `***${theme.emojis.no}・**Error!** Failed to permit user: ${error.message}***`, theme.color);
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