import {
  DeliveryStatus,
  MessageStatus,
} from "@/app/generated/prisma/enums";

export function resolveMessageStatus(
  deliveryStatuses: DeliveryStatus[],
): MessageStatus {
  if (deliveryStatuses.length === 0) {
    return MessageStatus.NO_MATCH;
  }
  const allOk = deliveryStatuses.every((d) => d === DeliveryStatus.SUCCESS);
  const allFail = deliveryStatuses.every((d) => d === DeliveryStatus.FAILED);
  if (allOk) return MessageStatus.SUCCESS;
  if (allFail) return MessageStatus.FAILED;
  return MessageStatus.PARTIAL;
}

/** Latest attempt per destination wins (by `createdAt`). */
export function latestDeliveryStatusPerDestination(
  rows: { destinationId: string; status: DeliveryStatus; createdAt: Date }[],
): DeliveryStatus[] {
  const byDest = new Map<string, (typeof rows)[0]>();
  const sorted = [...rows].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  for (const d of sorted) {
    byDest.set(d.destinationId, d);
  }
  return [...byDest.values()].map((d) => d.status);
}

export function recomputeMessageStatusFromDeliveries(
  allRows: { destinationId: string; status: DeliveryStatus; createdAt: Date }[],
): MessageStatus {
  return resolveMessageStatus(latestDeliveryStatusPerDestination(allRows));
}
