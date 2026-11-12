// Asks the server to email people in a Talk topic about a new message.
// Fire and forget: a missed email should never get in the way of chatting.
export function notifyTalk(clubId: string, threadId: string) {
  fetch("/api/talk/notify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ clubId, threadId }),
    keepalive: true,
  }).catch(() => {});
}
