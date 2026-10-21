export async function dispatchWebhook(event: string, payload: any) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    return { dispatched: false, reason: 'N8N_WEBHOOK_URL not configured' };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Event-Type': event,
      },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        payload,
      }),
      signal: AbortSignal.timeout(3000), // Non-blocking timeout
    });

    return { dispatched: res.ok, status: res.status };
  } catch (err: any) {
    console.warn(`[Webhook n8n] Error despachando evento ${event}:`, err.message);
    return { dispatched: false, error: err.message };
  }
}
