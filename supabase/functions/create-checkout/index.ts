// Crée une session Stripe Checkout pour une offre de gemmes.
// Le prix vient de la base (gem_bundles), jamais du client.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { cors, json } from '../_shared.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Non connecté' }, 401);

    const { bundleId, returnUrl } = await req.json();
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: bundle } = await admin.from('gem_bundles').select('*').eq('id', bundleId).single();
    if (!bundle) return json({ error: 'Offre inconnue' }, 400);

    const origin = new URL(returnUrl ?? Deno.env.get('APP_URL')!).origin;
    const allowed = (Deno.env.get('APP_URL') ?? '').split(',').map((s) => new URL(s.trim()).origin);
    if (!allowed.includes(origin)) return json({ error: 'Origine non autorisée' }, 400);

    const form = new URLSearchParams({
      mode: 'payment',
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': Deno.env.get('CURRENCY') ?? 'eur',
      'line_items[0][price_data][unit_amount]': String(bundle.price_cents),
      'line_items[0][price_data][product_data][name]': `${bundle.label} — ${bundle.gems} gemmes`,
      'metadata[user_id]': user.id,
      'metadata[bundle_id]': bundle.id,
      client_reference_id: user.id,
      success_url: `${origin}/shop?paid=1`,
      cancel_url: `${origin}/shop?cancel=1`,
    });
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
    });
    const session = await r.json();
    if (!r.ok) return json({ error: session.error?.message ?? 'Erreur Stripe' }, 500);
    return json({ url: session.url });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
