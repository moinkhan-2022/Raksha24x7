export const CATEGORY_RADIUS_METERS = Object.freeze({
  hospital: 10000,
  police: 8000,
  fire: 10000,
  pharmacy: 5000,
  ambulance: 10000,
  clinic: 5000,
  doctors: 5000,
  shelter: 10000,
  women_safety: 10000,
  blood_bank: 15000,
  emergency_phone: 20000
});

// The user's selected radius remains the upper bound while each category uses a smaller safe cap.
export const getCategoryRadius = (category, selectedRadius = 20000) => Math.min(
  Number(selectedRadius) || 5000,
  CATEGORY_RADIUS_METERS[category] || 5000
);
