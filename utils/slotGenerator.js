const toMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const toTimeString = (minutes) => {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
};

export const generateSlots = (startTime, endTime, slotDuration) => {
  const slots = [];
  let cursor = toMinutes(startTime);
  const end = toMinutes(endTime);

  while (cursor + slotDuration <= end) {
    slots.push({
      startTime: toTimeString(cursor),
      endTime: toTimeString(cursor + slotDuration),
    });
    cursor += slotDuration;
  }

  return slots;
};

export { toMinutes, toTimeString };
