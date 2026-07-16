// Display date for freshly-signed guestbook entries. Kept as a tiny module so
// the "just now" stamp stays consistent and easy to change.
export const RETRO_DATE = new Date().toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
