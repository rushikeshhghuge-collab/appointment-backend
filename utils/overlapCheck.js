import { toMinutes } from "./slotGenerator.js";

export const isOverlapping = (newStart, newEnd, existingStart, existingEnd) => {
  const ns = toMinutes(newStart);
  const ne = toMinutes(newEnd);
  const es = toMinutes(existingStart);
  const ee = toMinutes(existingEnd);

  return ns < ee && ne > es;
};
