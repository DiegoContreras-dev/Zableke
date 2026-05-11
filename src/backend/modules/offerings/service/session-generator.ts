import { OfferingsRepository } from "@/backend/modules/offerings/repository/offerings.repository";

export async function getOrCreateSessionForSlot(
  slotId: string,
  date: string,
  userId: string,
  repo = new OfferingsRepository()
) {
  return repo.getOrCreateScheduleForSlot({ slotId, date, createdById: userId });
}
