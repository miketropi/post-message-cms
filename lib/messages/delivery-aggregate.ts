import { DeliveryStatus } from "@/app/generated/prisma/enums";

export function latestDeliveryRowsByDestination<T extends {
  destinationId: string;
  status: DeliveryStatus;
  createdAt: Date;
}>(rows: T[]): T[] {
  const byDest = new Map<string, T>();
  const sorted = [...rows].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  for (const r of sorted) {
    byDest.set(r.destinationId, r);
  }
  return [...byDest.values()];
}

export function deliveryStatsFromLatest(
  latest: { status: DeliveryStatus }[],
): {
  deliveryCount: number;
  deliverySuccess: number;
  deliveryFailed: number;
} {
  return {
    deliveryCount: latest.length,
    deliverySuccess: latest.filter((d) => d.status === DeliveryStatus.SUCCESS)
      .length,
    deliveryFailed: latest.filter((d) => d.status === DeliveryStatus.FAILED)
      .length,
  };
}
