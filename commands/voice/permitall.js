const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const DynamicVoice = require("../../models/DynamicVoice");
const themeManager = require("../../utils/themeManager");
const UserConfig = require("../../models/UserConfig");
const cooldownHandler = require("../../events/cooldown");

module.exports = {
  name: "permitall",
  description: "Give Permission to all user in your voice",
  category: "voice",
  aliases: ['pall'],
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
    const timeLeft = cooldownHandler.checkCooldown("permitall", message.author.id, 8);
    if (timeLeft) {
      message.delete();
      return sendEmbed(message, `***Please wait ${timeLeft} seconds***`,theme.color).then(msg => {
        setTimeout(() => msg.delete(), 5000);
      });
    }

    cooldownHandler.applyCooldown("permitall", message.author.id, 8);

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
    

    if (voiceData.ownerId !== member.id) {
      return sendEmbed(message, `***${theme.emojis.info}・**Warning!** You must be the owner of this voice channel***`, theme.color);
    }

    try {
      const currentMembers = member.voice.channel.members.filter(m => !m.user.bot);
      const memberIds = currentMembers.map(m => m.id);

      await DynamicVoice.updateOne(
        { channelId: member.voice.channel.id },
        { 
          $addToSet: { allowedUsers: { $each: memberIds } },
          $pull: { rejectedUsers: { $in: memberIds } }
        }
      );

      // Handle permissions with error handling for each member
      const permissionPromises = currentMembers.map(async (member) => {
        try {
          await member.voice.channel.permissionOverwrites.edit(member.id, {
            ViewChannel: true,
            Connect: true
          });
          return { success: true, member };
        } catch (error) {
          console.error(`Failed to set permissions for ${member.user.tag}:`, error);
          return { success: false, member, error };
        }
      });

      const results = await Promise.allSettled(permissionPromises);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length;
      
      let responseMessage = `***${theme.emojis.yes}・**Success!** ✅ Permitted **${successful}** members in <#${member.voice.channel.id}>***`;
      if (failed > 0) {
        responseMessage += `\n***⚠️ **${failed}** members failed (left the server)***`;
      }
      
      return sendEmbed(message, responseMessage, theme.color);
    } catch (error) {
      console.error("Error permitting users:", error);
      return sendEmbed(message, `***${theme.emojis.no}・**Error!** Failed to permit members: ${error.message}***`, theme.color);
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
