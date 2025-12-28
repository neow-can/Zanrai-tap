const mongoose = require('mongoose');

const userVoiceTimeSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  guildId: {
    type: String,
    required: true,
    index: true
  },
  totalSeconds: {
    type: Number,
    default: 0
  },
  lastJoinTime: {
    type: Date,
    default: null
  },
  currentChannelId: {
    type: String,
    default: null
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient leaderboard queries
userVoiceTimeSchema.index({ guildId: 1, totalSeconds: -1 });

module.exports = mongoose.model('UserVoiceTime', userVoiceTimeSchema);