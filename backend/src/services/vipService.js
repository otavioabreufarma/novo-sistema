const { withTransaction, readDb } = require('../db/jsonDatabase');
const { addDays } = require('../utils/date');

const VIP_RULES = {
  vip: { days: 30 },
  'vip+': { days: 30 }
};

async function activateVip({ serverName, steamId64, vipType, orderNsu }) {
  const now = new Date().toISOString();

  return withTransaction(serverName, (db) => {
    const user = db.users.find((item) => item.steamId64 === steamId64);
    if (!user) {
      throw new Error('Usuário não encontrado para ativação de VIP.');
    }

    const existingVip = db.vips.find((item) => item.steamId64 === steamId64 && item.vipType === vipType);
    const startDate = existingVip && new Date(existingVip.expiresAt) > new Date(now) ? existingVip.expiresAt : now;
    const expiresAt = addDays(startDate, VIP_RULES[vipType].days);

    if (existingVip) {
      existingVip.startsAt = startDate;
      existingVip.expiresAt = expiresAt;
      existingVip.updatedAt = now;
      existingVip.orderNsu = orderNsu;
      existingVip.status = 'active';
    } else {
      db.vips.push({
        steamId64,
        vipType,
        startsAt: startDate,
        expiresAt,
        status: 'active',
        orderNsu,
        updatedAt: now
      });
    }

    return { steamId64, vipType, startsAt: startDate, expiresAt, orderNsu };
  });
}

async function getVipStatus({ serverName, steamId64 }) {
  const db = await readDb(serverName);
  const now = new Date();

  const activeVips = db.vips.filter((vip) => {
    return vip.steamId64 === steamId64 && vip.status === 'active' && new Date(vip.expiresAt) > now;
  });

  return activeVips;
}

module.exports = {
  VIP_RULES,
  activateVip,
  getVipStatus
};
