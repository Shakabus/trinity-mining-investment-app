export const FUNDING_COINS = ['USDT', 'BTC', 'ETH', 'SOL'] as const

export type FundingCoin = (typeof FUNDING_COINS)[number]

export const SYSTEM_FUNDING_WALLETS: Record<FundingCoin, string> = {
  BTC: 'bc1q76ztuupz9sycs3hf0l8q0t3mt5j78rxr29cwv4',
  ETH: '0x8610A9E40FAD02Ce4157FbbFb38752aBE1264334',
  USDT: '0x8610A9E40FAD02Ce4157FbbFb38752aBE1264334',
  SOL: '54fnCmk1gLDhtzDcd8xt7ar4YKKu9sJqqwyXNoDZMpw8',
}

export function toMoonPayCurrencyCode(coinType: FundingCoin) {
  if (coinType === 'USDT') return 'usdt_erc20'
  return coinType.toLowerCase()
}

