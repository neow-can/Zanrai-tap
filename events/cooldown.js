const devs = require('../utils/devs.json')
const cooldowns = new Map();

module.exports = {
  checkCooldown: (commandName, userId, cooldownTime) => {
    const isDeveloper = devs.developerIds.includes(userId);
    
    if (isDeveloper) {return ;}
    
    if (!cooldowns.has(commandName)) {
      cooldowns.set(commandName, new Map());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(commandName);

    if (timestamps.has(userId)) {
      const expirationTime = timestamps.get(userId) + cooldownTime * 1000;
      if (now < expirationTime) {
        const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
        return timeLeft;
      }
    }

    timestamps.set(userId, now);
    setTimeout(() => timestamps.delete(userId), cooldownTime * 1000);
    return null; 
  },

  applyCooldown: (commandName, userId, cooldownTime) => {
    const isDeveloper = devs.developerIds.includes(userId);
    if (isDeveloper) {return ;}

    if (!cooldowns.has(commandName)) {
      cooldowns.set(commandName, new Map());
    }
    const now = Date.now();
    cooldowns.get(commandName).set(userId, now);
    setTimeout(() => cooldowns.get(commandName).delete(userId), cooldownTime * 1000);
  }
};