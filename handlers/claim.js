const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const DynamicVoice = require("../models/DynamicVoice");
const themeManager = require("../utils/themeManager");
const cooldownHandler = require("../events/cooldown");
const UserConfig = require("../models/UserConfig");

module.exports = {
  name: "claim",
  description: "Claim ownership of an abandoned voice channel",
  category: "voice",
  cooldown: 6,
  async execute(ctx) {
    const isInteraction = typeof ctx.isButton === 'function' || !!ctx.user;
    const member = ctx.member;
    const guild = ctx.guild;
    const theme = await themeManager.getTheme(guild.id);

    try {
      const authorId = isInteraction ? ctx.user?.id : ctx.author?.id;
      const timeLeft = cooldownHandler.checkCooldown("claim", authorId, 6);
      if (timeLeft) {
        if (!isInteraction && ctx.deletable) {
          try { await ctx.delete(); } catch {}
        }
        return sendEmbed(ctx, `***Please wait ${timeLeft} seconds***`, theme.color).then(msg => {
          // Only auto-delete normal messages; interaction replies are ephemeral by default here
          if (msg?.deletable) setTimeout(() => msg.delete().catch(() => {}), 5000);
        });
      }

      cooldownHandler.applyCooldown("claim", authorId, 6);

      if (!member?.voice?.channel) {
        return sendEmbed(ctx, `***${theme.emojis.no}・You must be in a voice channel to claim it***`, theme.color);
      }

      const voiceData = await DynamicVoice.findOne({ 
        channelId: member.voice.channel.id 
      });
      
      if (!voiceData) {
        return sendEmbed(ctx, `***${theme.emojis.info}・This is not a temporary voice channel***`, theme.color);
      }

      if (voiceData.ownerId === member.id) {
        return sendEmbed(ctx, `***${theme.emojis.owner}・${member} You are already the owner!***`, theme.color);
      }

      const currentOwner = guild.members.cache.get(voiceData.ownerId);
      if (currentOwner?.voice?.channelId === member.voice.channel.id) {
        return sendEmbed(ctx, `***${theme.emojis.owner}・The channel is already owned by <@${currentOwner.id}>***`, theme.color);
      }

      const channel = member.voice.channel;
      const overwrites = channel.permissionOverwrites.cache;
      

      for (const [id, overwrite] of overwrites) {
        if (id !== guild.id) {
          try {
            await channel.permissionOverwrites.delete(id);
          } catch (error) {
            console.log(`Failed to remove permissions for ${id}: ${error.message}`);
          }
        }
      }
      
      await DynamicVoice.updateOne(
        { channelId: member.voice.channel.id },
        { 
          $set: { 
            ownerId: member.id,
            allowedUsers: [],
            rejectedUsers: [] 
          } 
        }
      );
      await member.voice.channel.permissionOverwrites.edit(member.id, {
        Connect: true,
        Speak: true,
      });

      return sendEmbed(ctx, `***${theme.emojis.owner}・${member} has claimed this voice channel!***`, theme.color);

    } catch (error) {
      console.error("Claim command error:", error);
      return sendEmbed(ctx, `***${theme.emojis.no}・Failed to claim voice channel: ${error.message}***`, theme.color);
    }
  }
};

function sendEmbed(ctx, description, color) {
  const container = new ContainerBuilder()
    .setAccentColor(typeof color === 'string' ? parseInt(color.replace('#', '0x'), 16) : color)
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(description)
    );
  const isInteraction = typeof ctx.isButton === 'function' || !!ctx.user;
  if (isInteraction) {
    try {
      if (ctx.replied) return ctx.followUp({ components: [container], flags: [MessageFlags.IsComponentsV2], ephemeral: true });
      if (ctx.deferred) return ctx.editReply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
      return ctx.reply({ components: [container], flags: [MessageFlags.IsComponentsV2], ephemeral: true });
    } catch (e) {
      // Fallback to channel send if available
      if (ctx.channel) return ctx.channel.send({ components: [container], flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
    }
  }
  return ctx.channel.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });
}
