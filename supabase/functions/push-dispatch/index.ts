// Envoie les notifications push en attente + annonce les boosters quotidiens prêts.
// À appeler toutes les 5 min par pg_cron (voir README). Protégé par CRON_SECRET.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return new Response('forbidden', { status: 403 });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  await db.rpc('enqueue_daily_notifications');

  const { data: notes } = await db.from('notifications').select('*').eq('pushed', false).limit(500);
  if (!notes?.length) return new Response('0');
  const users = [...new Set(notes.map((n) => n.user_id))];
  const { data: subs } = await db.from('push_subscriptions').select('*').in('user_id', users);

  let sent = 0;
  for (const n of notes) {
    for (const s of subs?.filter((x) => x.user_id === n.user_id) ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: n.title, body: n.body, url: n.url ?? '/' }),
          { TTL: 86400 },
        );
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
      }
    }
  }
  await db.from('notifications').update({ pushed: true }).in('id', notes.map((n) => n.id));
  return new Response(String(sent));
});
