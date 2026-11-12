export type PlanId = 'free' | 'pro' | 'business' | 'search';

export interface Plan {
  id: PlanId;
  name: string;
  priceUsd: number;
  /** Anchored documents per calendar month; null = unlimited. */
  anchorsPerMonth: number | null;
  /** Env var holding the provider's price id; null for the free plan. */
  priceEnv: string | null;
  features: string[];
}

/** Pricing from docs/startup-business-plan.md, section 3. */
export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    priceUsd: 0,
    anchorsPerMonth: 100,
    priceEnv: null,
    features: ['Квитанція на кожен документ', 'Перевірка квитанцій безкоштовна', 'Без банківської картки'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceUsd: 49,
    anchorsPerMonth: 50_000,
    priceEnv: 'STRIPE_PRICE_PRO',
    features: ['Підключення через API', 'Квитанції в особистому кабінеті', 'Ключі доступу для команди'],
  },
  business: {
    id: 'business',
    name: 'Business',
    priceUsd: 499,
    anchorsPerMonth: null,
    priceEnv: 'STRIPE_PRICE_BUSINESS',
    features: ['Гарантія доступності 99,9 %', 'Журнал дій для аудиту'],
  },
  search: {
    id: 'search',
    name: 'Verifiable Search',
    priceUsd: 999,
    anchorsPerMonth: null,
    priceEnv: 'STRIPE_PRICE_SEARCH',
    features: ['Усе з Business', 'Підтвердження повноти пошуку', 'Звіти для аудиторів'],
  },
};

export const PAID_PLANS: PlanId[] = ['pro', 'business', 'search'];

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && value in PLANS;
}
