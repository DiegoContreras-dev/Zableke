export interface SlotDayInfo {
  dayOfWeek: string;
}

export interface OfferingDayInfo {
  status: string;
  slots: SlotDayInfo[];
}

const DAY_OF_WEEK_BY_JS_INDEX: Record<number, string | null> = {
  0: null, // domingo: no existe en el enum DayOfWeek
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

export function countOpenSlotsForToday(
  offerings: OfferingDayInfo[],
  today: Date,
): number {
  const todayCode = DAY_OF_WEEK_BY_JS_INDEX[today.getDay()];
  if (!todayCode) return 0;

  return offerings
    .filter((offering) => offering.status === "OPEN")
    .reduce(
      (count, offering) =>
        count + offering.slots.filter((slot) => slot.dayOfWeek === todayCode).length,
      0,
    );
}
