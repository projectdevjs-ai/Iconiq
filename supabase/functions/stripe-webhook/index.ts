// Webhook Stripe : crédite les gemmes après paiement confirmé (idempotent).
// Déployer avec --no-verify-jwt.
import Stripe from 'npm:stripe@17.2.0';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, Deno.env.get('STRIPE_WEBHOOK_SECRET')!);
  } catch {
    return new Response('Signature invalide', { status: 400 });
  }
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.payment_status === 'paid') {
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { error } = await admin.rpc('credit_purchase', {
        p_session: s.id,
        p_user: s.metadata?.user_id,
        p_bundle: s.metadata?.bundle_id,
      });
      if (error) return new Response(error.message, { status: 500 }); // Stripe réessaiera
    }
  }
  return new Response('ok');
});
