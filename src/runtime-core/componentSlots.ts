export function initSlots(instance, children) {
  //   instance.slots = Array.isArray(children) ? children : [children];
  normalizeSlotObject(instance.slots, children);
}

function normalizeSlotObject(slots, children) {
  for (const key in children) {
    const value = children[key];

    slots[key] = normalizeSlotValue(value);
  }
  slots = slots;
}

function normalizeSlotValue(value) {
  return Array.isArray(value) ? value : [value];
}
