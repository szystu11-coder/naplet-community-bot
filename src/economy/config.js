const ECONOMY = {
  currency: 'NP', maxMoney: 2_000_000_000,
  daily: { base: 100, streakBonus: 25, maxStreakBonus: 500, cooldownMs: 86_400_000 },
  work: { min: 50, max: 250, cooldownMs: 3_600_000 },
  crime: { min: 100, max: 500, winChance: 0.35, cooldownMs: 7_200_000, fineMin: 50, fineMax: 250 },
  rob: { minWallet: 100, winChance: 0.4, cooldownMs: 21_600_000, shareMin: 0.1, shareMax: 0.35, fineMin: 50, fineMax: 300 },
  xp: { command: 5, daily: 15, work: 10, crime: 10, transfer: 5, shop: 5, rob: 10 },
  levels: { baseXp: 100, growth: 1.35, levelReward: 100 },
  shop: [
    { id: 'coffee', name: 'Kawa', description: 'Jednorazowo dodaje 25 XP.', price: 150, effect: 'xp:25', consumable: true },
    { id: 'insurance', name: 'Ubezpieczenie', description: 'Kolejna przegrana w /crime nie zabiera pieniędzy.', price: 1000, effect: 'shield:crime', consumable: true },
    { id: 'lucky-charm', name: 'Amulet szczęścia', description: 'Jednorazowo zwiększa szansę /rob.', price: 2000, effect: 'luck:rob', consumable: true }
  ]
};
module.exports = ECONOMY;
