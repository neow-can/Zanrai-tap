const { 
  ChannelType, 
  PermissionsBitField, 
  ContainerBuilder, 
  TextDisplayBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  MessageFlags,
  MediaGalleryBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  SeparatorBuilder
} = require("discord.js");
const axios = require("axios");
const GuildConfig = require("../models/GuildConfig");
const DynamicVoice = require("../models/DynamicVoice");
const UserConfig = require("../models/UserConfig");
const UserVoiceTime = require('../models/UserVoiceTime');
const config = require("../utils/config");
const themeManager = require("../utils/themeManager");
const joinCooldowns = new Map();
let globalClient;

// Import leaderboard refresh handler
const leaderboardRefresh = require('../handlers/leaderboardRefresh');
const parseColor = (color) => {
  if (typeof color === 'string' && color.startsWith('#')) {
    return parseInt(color.replace('#', '0x'), 16);
  }
  return color;
};

// Handle voice time tracking
async function updateVoiceTime(oldState, newState) {
  const userId = newState.member?.id;
  const guildId = newState.guild?.id;
  
  if (!userId || !guildId) return;
  
  try {
    // User joined a voice channel
    if (!oldState.channelId && newState.channelId) {
      // Update user voice time record
      await UserVoiceTime.findOneAndUpdate(
        { userId, guildId },
        { 
          $set: { 
            lastJoinTime: new Date(),
            currentChannelId: newState.channelId,
            lastUpdated: new Date()
          }
        },
        { upsert: true, new: true }
      );
    }
    // User left a voice channel
    else if (oldState.channelId && !newState.channelId) {
      const userVoiceTime = await UserVoiceTime.findOne({ userId, guildId });
      
      if (userVoiceTime && userVoiceTime.lastJoinTime) {
        // Calculate time spent in voice channel
        const timeInChannel = Math.floor((new Date() - userVoiceTime.lastJoinTime) / 1000);
        
        // Update total time
        await UserVoiceTime.findOneAndUpdate(
          { userId, guildId },
          { 
            $inc: { totalSeconds: timeInChannel },
            $set: { 
              lastJoinTime: null,
              currentChannelId: null,
              lastUpdated: new Date()
            }
          }
        );
      }
    }
    // User switched voice channels
    else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      const userVoiceTime = await UserVoiceTime.findOne({ userId, guildId });
      
      if (userVoiceTime && userVoiceTime.lastJoinTime) {
        // Calculate time spent in previous channel
        const timeInChannel = Math.floor((new Date() - userVoiceTime.lastJoinTime) / 1000);
        
        // Update total time and current channel
        await UserVoiceTime.findOneAndUpdate(
          { userId, guildId },
          { 
            $inc: { totalSeconds: timeInChannel },
            $set: { 
              lastJoinTime: new Date(),
              currentChannelId: newState.channelId,
              lastUpdated: new Date()
            }
          }
        );
      }
    }
  } catch (error) {
    console.error('Error updating voice time:', error);
  }
}

module.exports = {
  name: "voiceStateUpdate",
  execute: async (oldState, newState, client) => { 
    
    // Update voice time tracking
    await updateVoiceTime(oldState, newState);
    
    if (client && !globalClient) {
      globalClient = client;
      
      // Start leaderboard refresh for all guilds the bot is in
      client.guilds.cache.forEach(guild => {
        leaderboardRefresh.startRefresh(guild.id, client);
      });
    }
    
    
    const guild = newState?.guild;
    const member = newState?.member;
    
    if (!guild || !member) return; 
    
    // Fetch guild configuration
    const guildConfig = await GuildConfig.findOne({ guildId: guild.id }).catch(err => {
      console.error(`Failed to fetch guild config for ${guild.id}:`, err);
      return null;
    });
    
    if (!guildConfig || !guildConfig.voiceChannelId || !guildConfig.categoryId) return;
    
    // Get theme
    const theme = await themeManager.getTheme(guild.id).catch(err => {
      console.error(`Failed to fetch theme for ${guild.id}:`, err);
      return { 
        color: "#0099ff", 
        emojis: { 
          lock: "🔒", 
          unlock: "🔓", 
          owner: "👑", 
          hide: "👁️", 
          show: "👁️‍🗨️", 
          transfer: "🔄", 
          limit: "🔢", 
          name: "✏️", 
          info: "ℹ️" 
        }
      };
    });

    // Handle anti-spam for join attempts
    if (newState.channelId === guildConfig.voiceChannelId) {
      const now = Date.now();
      const cooldownTime = 15 * 1000; 
      const maxAttempts = 3;
      
      // Use a synchronized approach to avoid race conditions
      const cooldownData = joinCooldowns.get(member.id) || { lastJoin: 0, attempts: 0 };
      
      if (now - cooldownData.lastJoin < cooldownTime) {
        cooldownData.attempts += 1;
        
        if (cooldownData.attempts >= maxAttempts) {
          try {
            // Disconnect member and delete their channel if it exists
            await member.voice.disconnect().catch(err => console.error(`Failed to disconnect ${member.user.tag}:`, err));
            
            const dynamicVoice = await DynamicVoice.findOne({ ownerId: member.id }).catch(err => {
              console.error(`Failed to fetch DynamicVoice for owner ${member.id}:`, err);
              return null;
            });
            
            if (dynamicVoice && dynamicVoice.channelId) {
              const channel = guild.channels.cache.get(dynamicVoice.channelId);
              if (channel) {
                await channel.delete().catch(err => console.error(`Failed to delete channel ${dynamicVoice.channelId}:`, err));
              }
              await DynamicVoice.deleteOne({ _id: dynamicVoice._id }).catch(err => {
                console.error(`Failed to delete DynamicVoice document for ${dynamicVoice.channelId}:`, err);
              });
            }
            
            // Send warning to user
            const container = new ContainerBuilder()
              .setAccentColor(parseColor(theme.color))
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent(`***## Anti-Spam Protection***\n***You have been kicked for spamming joins. Please wait ${Math.ceil(cooldownTime / 1000)} seconds before trying again.***`)
              );
            
            await member.send({
              components: [container],
              flags: [MessageFlags.IsComponentsV2]
            }).catch(() => {});
            
            joinCooldowns.delete(member.id);
            return;
          } catch (error) {
            console.error("Failed to handle voice spam:", error);
          }
        }
      } else {
        cooldownData.attempts = 1;
      }
      
      cooldownData.lastJoin = now;
      joinCooldowns.set(member.id, cooldownData);
    }

    // Create or reuse dynamic voice channel
    if (newState.channelId === guildConfig.voiceChannelId) {
      try {
        // Check if user already has a dynamic voice channel
        const existingVoice = await DynamicVoice.findOne({ ownerId: member.id }).catch(err => {
          console.error(`Failed to check existing DynamicVoice for ${member.id}:`, err);
          return null;
        });

        if (existingVoice && existingVoice.channelId) {
          const existingChannel = guild.channels.cache.get(existingVoice.channelId);
          if (existingChannel) {
            // Check if the existing channel is empty
            if (existingChannel.members.size === 0) {
              // Move user to their existing empty channel
              if (member.voice && member.voice.channel) {
                await member.voice.setChannel(existingChannel).catch(err => {
                  // Only log if it's not a "Unknown Channel" error which can happen if channel was just deleted
                  if (err?.code !== 10003) {
                    console.error(`Failed to move ${member.user.tag} to existing voice channel ${existingVoice.channelId}:`, err);
                  }
                });
              }
              // Reset voice channel status to server name
              try {
                const url = `https://discord.com/api/v10/channels/${existingChannel.id}/voice-status`;
                // Simplified status without emojis
                const payload = { 
                  status: `${guild.name} - ${member.user.username}` 
                };
                
                await axios.put(url, payload, {
                  headers: {
                    Authorization: `Bot ${client.token}`,
                    'Content-Type': 'application/json',
                  },
                });
              } catch (err) {
                // Only log if it's not a "Unknown Channel" error which can happen if channel was just deleted
                if (err?.response?.data?.code !== 10003) {
                  console.error('Failed to reset voice status for existing voice channel:', err?.response?.data || err.message);
                }
              }
              return;
            }
            // If the channel is not empty, proceed to create a new channel
          } else {
            // Clean up stale database entry if channel doesn't exist
            await DynamicVoice.deleteOne({ _id: existingVoice._id }).catch(err => {
              console.error(`Failed to delete stale DynamicVoice document for ${existingVoice.channelId}:`, err);
            });
          }
        }

        const category = guild.channels.cache.get(guildConfig.categoryId);
        if (!category) {
          console.error(`Category ${guildConfig.categoryId} not found in guild ${guild.id}!`);
          return;
        }

        // Fetch user configuration with error handling
        const userConfig = await UserConfig.findOne({ userId: member.id }).catch(err => {
          console.error(`Failed to fetch user config for ${member.id}:`, err);
          return { blacklist: [], whitelist: [] };
        });
        
        const blacklistUsers = userConfig?.blacklist || [];
        const whitelistUsers = userConfig?.whitelist || [];

        // Build permission overwrites
        const permissionOverwrites = [
          {
            id: guild.id, // @everyone role
            deny: [PermissionsBitField.Flags.Connect],
          },
          {
            id: member.id,
            allow: [
              PermissionsBitField.Flags.Connect,
              PermissionsBitField.Flags.Speak,
              PermissionsBitField.Flags.ManageChannels,
            ],
          }
        ];

        // Add category permissions
        category.permissionOverwrites.cache.forEach(perm => {
          if (perm.id !== member.id) {
            const isRole = guild.roles.cache.has(perm.id);
            const isMember = guild.members.cache.has(perm.id);
            if (isRole || isMember || perm.id === guild.id) {
              permissionOverwrites.push({
                id: perm.id,
                allow: perm.allow.bitfield,
                deny: perm.deny.bitfield,
              });
            }
          }
        });

        // Add blacklist/whitelist permissions
        const usersToFetch = [...blacklistUsers, ...whitelistUsers];
        const fetchedMembers = usersToFetch.length > 0 
          ? await guild.members.fetch({ user: usersToFetch }).catch(() => new Map())
          : new Map();

        for (const blacklistedUserId of blacklistUsers) {
          if (fetchedMembers.has(blacklistedUserId)) {
            permissionOverwrites.push({
              id: blacklistedUserId,
              deny: [PermissionsBitField.Flags.Connect],
            });
          }
        }
        
        for (const whitelistedUserId of whitelistUsers) {
          if (fetchedMembers.has(whitelistedUserId)) {
            permissionOverwrites.push({
              id: whitelistedUserId,
              allow: [PermissionsBitField.Flags.Connect],
            });
          }
        }

        // Create the channel
        let tempVoice = null;
        try {
          const channelName = generateVoiceChannelName(member);
          tempVoice = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildVoice,
            parent: category,
            permissionOverwrites,
          });
        } catch (err) {
          if (err.code === 50013 || (err.rawError && err.rawError.code === 50013)) {
            console.error(`Missing Permissions: Could not create temp voice channel for ${member.user.tag}.`);
            return;
          } else {
            console.error(`Failed to create temp voice channel for ${member.user.tag}:`, err);
            return;
          }
        }

        if (!tempVoice) {
          console.error("Failed to create temp voice channel for", member.user.tag);
          return;
        }

        // Set voice channel status to server name
        try {
          const url = `https://discord.com/api/v10/channels/${tempVoice.id}/voice-status`;
          // Simplified status without emojis
          const payload = { 
            status: `${guild.name}` 
          };
 
          await axios.put(url, payload, {
            headers: {
              Authorization: `Bot ${client.token}`,
              'Content-Type': 'application/json',
            },
          });
        } catch (err) {
          // Only log if it's not a "Unknown Channel" error which can happen if channel was just deleted
          if (err?.response?.data?.code !== 10003) {
            console.error('Failed to update voice status for new voice channel:', err?.response?.data || err.message);
          }
        }

        // Move member to the new channel
        if (member.voice && member.voice.channel) {
          await member.voice.setChannel(tempVoice).catch(err => {
            // Only log if it's not a "Unknown Channel" error which can happen if channel was just deleted
            if (err?.code !== 10003) {
              console.error(`Failed to move ${member.user.tag} to new voice channel:`, err);
            }
          });
        } else {
          console.warn(`${member.user.tag} is not connected to a voice channel, skipping move.`);
        }

        // Save the channel in the database
        await DynamicVoice.create({
          guildId: guild.id,
          channelId: tempVoice.id,
          ownerId: member.id,
        }).catch(err => {
          console.error(`Failed to create DynamicVoice document for ${tempVoice.id}:`, err);
        });

        // Log creation of the dynamic voice channel
        // Log creation of the dynamic voice channel
        if (guildConfig?.logChannelId) {
          const logChannel = guild.channels.cache.get(guildConfig.logChannelId);
          if (logChannel) {
            const container = new ContainerBuilder()
              .setAccentColor(parseColor('#2b2d42'))
              .addSectionComponents(
                new SectionBuilder()
                  .addTextDisplayComponents(
                    new TextDisplayBuilder()
                      .setContent(`***Voice Channel Created***`)
                  )
                  .addTextDisplayComponents(
                    new TextDisplayBuilder()
                      .setContent(`***Channel Details:***\n` +
                        `***__Owner:__ <@${member.id}>***\n` +
                        `***__Room:__ ${tempVoice.name}***\n` +
                        `***__Room ID:__ ${tempVoice.id}***\n` +
                        `***__Creation Time:__ <t:${Math.floor(Date.now()/1000)}:F>***`)
                  )
                  .setThumbnailAccessory(
                    new ThumbnailBuilder()
                      .setURL(member.user.displayAvatarURL({ dynamic: true, size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
                  )
              )
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent(`Requested by ${member.user.tag}`)
              )

            logChannel.send({
              components: [container],
              flags: [MessageFlags.IsComponentsV2],
              allowedMentions: { parse: [] }
            }).catch(err => {
              console.error(`Failed to send log message for channel creation:`, err);
            });
          }
        }
        const mediaGallery = new MediaGalleryBuilder().addItems([
          { media: { url: theme.image } }
        ]);
        
        const container = new ContainerBuilder()
          .setAccentColor(parseColor(theme.color))
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent(
                    `***## - Welcome ${member.user.toString()}!***\n` +
                    `***- Enjoy managing your voice channels!***\n` +
                    `***- Contact the developer for support***`
                  )
              )
              .setThumbnailAccessory(
                new ThumbnailBuilder()
                  .setURL(member.user.displayAvatarURL({ dynamic: true, size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
              )
          )
        
          // فاصل بين الكلام والصورة
          .addSeparatorComponents(new SeparatorBuilder())
        
          // 2. عنوان التحكم
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`***### Voice Channel Controls***`)
          )
        
          // 3. الصورة في الوسط
          .addMediaGalleryComponents(mediaGallery)
        
          // فاصل بين الصورة والأزرار
          .addSeparatorComponents(new SeparatorBuilder())
        
          // 4. صف الأزرار الأول
          .addActionRowComponents(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('lock_button')
                .setEmoji(theme.emojis.lock)
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId('unlock_button')
                .setEmoji(theme.emojis.unlock)
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId('claim_button')
                .setEmoji(theme.emojis.owner)
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId('hide_button')
                .setEmoji(theme.emojis.hide)
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId('unhide_button')
                .setEmoji(theme.emojis.show)
                .setStyle(ButtonStyle.Secondary)
            )
          )
        
          // 5. صف الأزرار الثاني
          .addActionRowComponents(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('owner_button')
                .setEmoji(theme.emojis.owner)
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId('vcreset_button')
                .setEmoji(theme.emojis.transfer)
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId('limit_button')
                .setEmoji(theme.emojis.limit)
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId('name_button')
                .setEmoji(theme.emojis.name)
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId('info_button')
                .setEmoji(theme.emojis.info)
                .setStyle(ButtonStyle.Secondary)
            )
          )
        .addSeparatorComponents(new SeparatorBuilder())
.addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(`Requested by ${member.user.tag}`)
    );

        await tempVoice.send({
          components: [container],
          flags: [MessageFlags.IsComponentsV2]
        }).catch(err => {
          console.error(`Failed to send welcome message to ${member.user.tag}:`, err);
        });
      } catch (error) {
        console.error(`Failed to create DynamicVoice for ${member.user.tag}:`, error);
      }
    }

    // Handle deletion of empty dynamic voice channels
    if (
      oldState &&
      oldState.channel &&
      typeof oldState.channel.id === 'string' &&
      oldState.channel.members &&
      oldState.channel.members.size === 0
    ) {
      try {
        let channelId = oldState.channel ? oldState.channel.id : null;
        const dynamicVoice = channelId ? await DynamicVoice.findOne({ channelId }).catch(err => {
          console.error(`Failed to fetch DynamicVoice for channel ${channelId}:`, err);
          return null;
        }) : null;
        if (dynamicVoice && oldState.channel) {
          
          if (!guild.channels.cache.has(channelId)) {
            console.warn(`Channel ${channelId} not found in cache, removing from database`);
            await DynamicVoice.deleteOne({ _id: dynamicVoice._id }).catch(err => {
              console.error(`Failed to delete DynamicVoice document for ${channelId}:`, err);
            });
            return;
          }

          const channel = guild.channels.cache.get(channelId);
          if (!channel) {
            await DynamicVoice.deleteOne({ _id: dynamicVoice._id }).catch(err => {
              console.error(`Failed to delete DynamicVoice document:`, err);
            });
            return;
          }

          // Check if channel is actually empty
          if (channel.members.size === 0) {
            
            // Log deletion of the dynamic voice channel
            if (guildConfig?.logChannelId) {
              const logChannel = guild.channels.cache.get(guildConfig.logChannelId);
              if (logChannel) {
                const ownerMember = await guild.members.fetch(dynamicVoice.ownerId).catch(() => null);
                const container = new ContainerBuilder()
                  .setAccentColor(parseColor('#2b2d42'))
                  .addSectionComponents(
                    new SectionBuilder()
                      .addTextDisplayComponents(
                        new TextDisplayBuilder()
                          .setContent(`***Voice Channel Deleted***`)
                      )
                      .addTextDisplayComponents(
                        new TextDisplayBuilder()
                          .setContent(`***Channel Details:***\n` +
                            `***__Owner:__ <@${dynamicVoice.ownerId}>***\n` +
                            `***__Room:__ ${oldState.channel.name || 'Unknown'}***\n` +
                            `***__Room ID:__ ${oldState.channel.id || 'Unknown'}***\n` +
                            `***__Deletion Time:__ <t:${Math.floor(Date.now()/1000)}:F>***`)
                      )
                      .setThumbnailAccessory(
                        new ThumbnailBuilder()
                          .setURL(ownerMember ? ownerMember.user.displayAvatarURL({ dynamic: true, size: 256 }) : 'https://cdn.discordapp.com/embed/avatars/0.png')
                      )
                  )
                  .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(`Requested by ${member.user.tag}`)
    );

                logChannel.send({
                  components: [container],
                  flags: [MessageFlags.IsComponentsV2],
                  allowedMentions: { parse: [] }
                }).catch(err => {
                  console.error(`Failed to send log message for channel deletion:`, err);
                });
              }
            }
            
            // Delete the channel
            await channel.delete().catch(err => {
              if (err?.code !== 10003) { // Ignore "Unknown Channel" error
                console.error(`Failed to delete channel ${channel.id}:`, err);
              } else {
                // Channel was already deleted
              }
            });
            
            // Remove from database
            await DynamicVoice.deleteOne({ _id: dynamicVoice._id }).catch(err => {
              console.error(`Failed to delete DynamicVoice document:`, err);
            });
          }
        }
      } catch (error) {
        console.error("Failed to handle voice state update:", error);
      }
    }

    // Check if guild owner still exists
    if (guildConfig.ownerId && !guild.members.cache.has(guildConfig.ownerId)) {
      try {
        await GuildConfig.updateOne(
          { guildId: guild.id },
          { $set: { ownerId: null } }
        ).catch(err => {
          console.error(`Failed to update owner ID for guild ${guild.id}:`, err);
        });
      } catch (error) {
        console.error("Failed to update owner ID:", error);
      }
    }
  },
};

function generateVoiceChannelName(member) {
  try {
    const baseName = member.displayName || member.user.username;
    let channelName = `${baseName}'s VC`.trim();

    if (!channelName || channelName.length === 0) {
      channelName = "Private Voice Channel";
    }

    return channelName.substring(0, 100);
  } catch (error) {
    console.error("Error generating channel name:", error);
    return "Private Voice Channel";
  }
}


const CLEANUP_INTERVAL = 6 * 1000; 
let cleanupInterval;

// Make sure client is properly initialized when the module is loaded
function setClient(client) {
  if (client && !globalClient) {
    globalClient = client;
    
    // Start leaderboard refresh for all guilds the bot is in
    client.guilds.cache.forEach(guild => {
      leaderboardRefresh.startRefresh(guild.id, client);
    });
    
    // Start cleanup interval only after client is initialized
    if (!cleanupInterval) {
      cleanupInterval = setInterval(async () => { 
        if (!globalClient) {
          return;
        }

        try {
          const allDynamicVoices = await DynamicVoice.find({}).catch(err => {
            console.error("Failed to fetch dynamic voices:", err);
            return [];
          });
          
          for (const dynamicVoice of allDynamicVoices) {
            if (!dynamicVoice || !dynamicVoice.guildId || !dynamicVoice.channelId) {
              if (dynamicVoice && dynamicVoice._id) {
                await DynamicVoice.deleteOne({ _id: dynamicVoice._id }).catch(console.error);
              }
              continue;
            }
            
            const guild = globalClient.guilds.cache.get(dynamicVoice.guildId);
            if (!guild) {
              await DynamicVoice.deleteOne({ _id: dynamicVoice._id }).catch(console.error);
              continue;
            }

            
            if (!guild.channels.cache.has(dynamicVoice.channelId)) {
              console.warn(`Channel ${dynamicVoice.channelId} not found in cache, removing from database`);
              await DynamicVoice.deleteOne({ _id: dynamicVoice._id }).catch(err => {
                console.error(`Failed to delete DynamicVoice document for ${dynamicVoice.channelId}:`, err);
              });
              continue;
            }

            const channel = guild.channels.cache.get(dynamicVoice.channelId);
            if (!channel) {
              await DynamicVoice.deleteOne({ _id: dynamicVoice._id }).catch(console.error);
              continue;
            }

            if (channel.members.size === 0) {
              await channel.delete().catch(err => {
                if (err?.code !== 10003) { // Ignore "Unknown Channel" error
                  console.error(`Failed to delete empty channel ${channel.id}:`, err);
                }
              });
              
              await DynamicVoice.deleteOne({ _id: dynamicVoice._id }).catch(err => {
                console.error(`Failed to delete DynamicVoice document for ${channel.id}:`, err);
              });
            }
          }
        } catch (error) {
          console.error("Error during interval check for empty voice channels:", error);
        }
      }, CLEANUP_INTERVAL);
    }
  }
}

process.on('SIGINT', () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  process.exit(0);
});

module.exports.setClient = setClient;