export const normalizePhone = (value) => String(value || '').replace(/[^+\d]/g, '');

export const matchesEmergencySearch = (record, query) => {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;

  const haystack = [
    record.service,
    record.number,
    record.category,
    ...(record.keywords || [])
  ].join(' ').toLowerCase();

  return terms.every((term) => haystack.includes(term));
};
