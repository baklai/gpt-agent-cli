export const truncate = (str, maxLength = 80) =>
  str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
