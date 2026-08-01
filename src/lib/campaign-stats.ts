export type CampaignStats = {
  sent: number;
  delivered: number;
  replies: number;
  optOuts: number;
  recipients: number;
  conversations: number;
  aiChats: number;
  needsHuman: number;
  awaiting: number;
  deliveryRate: number;
  replyRate: number;
  optOutRate: number;
  health: number;
  latestReply: { body: string; at: string } | null;
};

export function emptyStats(): CampaignStats {
  return {
    sent: 0,
    delivered: 0,
    replies: 0,
    optOuts: 0,
    recipients: 0,
    conversations: 0,
    aiChats: 0,
    needsHuman: 0,
    awaiting: 0,
    deliveryRate: 0,
    replyRate: 0,
    optOutRate: 0,
    health: 0,
    latestReply: null,
  };
}

export function healthLabel(health: number) {
  if (health >= 85) return "Excellent";
  if (health >= 70) return "Good";
  if (health >= 50) return "Fair";
  if (health > 0) return "At Risk";
  return "No Data";
}

export function timeAgo(iso?: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "Just Now";
  if (mins < 60) return `${mins} Min Ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} Hr${hrs === 1 ? "" : "s"} Ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days} Day${days === 1 ? "" : "s"} Ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
