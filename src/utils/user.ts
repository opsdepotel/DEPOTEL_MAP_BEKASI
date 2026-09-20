/**
 * Menghasilkan inisial nama pengguna:
 * - Jika nama terdiri dari 1 kata, ambil 1 huruf pertama.
 * - Jika nama terdiri lebih dari 1 kata, inisial terdiri dari 2 huruf (kata pertama dan kata kedua).
 */
export function getUserInitials(name?: string): string {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return 'U';
  }

  // Pisahkan berdasarkan spasi
  const words = name.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 'U';

  const getFirstLetter = (word: string) => {
    const match = word.match(/[a-zA-Z0-9]/);
    return match ? match[0].toUpperCase() : (word[0] ? word[0].toUpperCase() : '');
  };

  if (words.length === 1) {
    return getFirstLetter(words[0]) || 'U';
  }

  // Jika lebih dari satu kata: 2 huruf (huruf pertama kata ke-1 dan huruf pertama kata ke-2)
  const first = getFirstLetter(words[0]);
  const second = getFirstLetter(words[1]);
  const combined = `${first}${second}`.trim();

  return combined || first || 'U';
}
