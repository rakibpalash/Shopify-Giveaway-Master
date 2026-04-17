import { Badge } from "@shopify/polaris";

type Status = "draft" | "active" | "ended" | "cancelled";

const toneMap: Record<Status, "new" | "success" | "info" | "critical"> = {
  draft: "new",
  active: "success",
  ended: "info",
  cancelled: "critical",
};

interface Props {
  status: string;
}

export function GiveawayStatusBadge({ status }: Props) {
  const tone = toneMap[status as Status] ?? "new";
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <Badge tone={tone}>{label}</Badge>;
}
