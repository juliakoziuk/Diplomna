/**
 * One-off Stripe TEST-mode setup: creates the AnchorProof products, monthly
 * prices and a Customer Portal configuration, then writes their ids to
 * .env.local. Safe to re-run: prices are found again by lookup_key, and a
 * price whose amount or currency no longer matches PLANS is replaced by a new
 * one (Stripe prices are immutable), so re-running after a price change
 * updates Stripe. Amounts mirror src/billing/plans.ts and are in hryvnias.
 *
 * Usage: put STRIPE_SECRET_KEY=sk_test_... into backend/.env.local, then
 *        npm run stripe:setup
 */
require('dotenv').config({ path: ['.env.local', '.env'] });
const fs = require('fs');
const path = require('path');
const Stripe = require('stripe');

const CURRENCY = 'uah';
const PLANS = [
  { env: 'STRIPE_PRICE_PRO', lookup: 'anchorproof_pro_monthly', name: 'AnchorProof Pro', uah: 400 },
  { env: 'STRIPE_PRICE_BUSINESS', lookup: 'anchorproof_business_monthly', name: 'AnchorProof Business', uah: 1200 },
  { env: 'STRIPE_PRICE_SEARCH', lookup: 'anchorproof_search_monthly', name: 'AnchorProof Verifiable Search', uah: 2000 },
];

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set (backend/.env.local)');
  if (!key.startsWith('sk_test_')) {
    throw new Error('This script only runs against Stripe test mode (sk_test_ key)');
  }
  const stripe = new Stripe(key);
  const out = {};
  const portalProducts = [];

  for (const plan of PLANS) {
    const existing = await stripe.prices.list({ lookup_keys: [plan.lookup], limit: 1 });
    const old = existing.data[0];
    let price = old;
    if (!old || old.unit_amount !== plan.uah * 100 || old.currency !== CURRENCY) {
      const productId = old ? old.product : (await stripe.products.create({ name: plan.name })).id;
      price = await stripe.prices.create({
        product: productId,
        currency: CURRENCY,
        unit_amount: plan.uah * 100,
        recurring: { interval: 'month' },
        lookup_key: plan.lookup,
        transfer_lookup_key: true,
      });
      if (old) await stripe.prices.update(old.id, { active: false });
      console.log(`${old ? 'updated' : 'created'} ${plan.name}: ${price.id} (${plan.uah} UAH/mo)`);
    } else {
      console.log(`found   ${plan.name}: ${price.id}`);
    }
    out[plan.env] = price.id;
    portalProducts.push({ product: price.product, prices: [price.id] });
  }

  const portal = await stripe.billingPortal.configurations.create({
    business_profile: { headline: 'AnchorProof: керування підпискою' },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ['email', 'name'] },
      subscription_cancel: { enabled: true, mode: 'at_period_end' },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ['price'],
        proration_behavior: 'create_prorations',
        products: portalProducts,
      },
    },
  });
  out.STRIPE_PORTAL_CONFIG = portal.id;
  console.log(`portal  configuration: ${portal.id}`);

  const envPath = path.join(__dirname, '..', '.env.local');
  let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  for (const [k, v] of Object.entries(out)) {
    const line = `${k}=${v}`;
    env = new RegExp(`^${k}=.*$`, 'm').test(env)
      ? env.replace(new RegExp(`^${k}=.*$`, 'm'), line)
      : env.replace(/\n?$/, '\n') + line + '\n';
  }
  fs.writeFileSync(envPath, env);
  console.log('\nwritten to backend/.env.local');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
