const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  categoryId: { type: String,  },
  voiceChannelId: { type: String, },
  eventsCategoryId: { type: String,  },
  backupCategoryId: {type: String,},
  hideShowRoleId: { type: String,  },
  staffroleId: { type: [String], default: []},
  rejectedVoiceChannelId: { type: String,  },
  theme: { type: String, default: 'White' },
  logChannelId: { type: String },
  leaderboardChannelId: { type: String },
  leaderboardMessageId: { type: String },
  panelChannelId: { type: String },
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);