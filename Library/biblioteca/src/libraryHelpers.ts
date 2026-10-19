export const clean = (s: string) => s.replace(/[<>]/g, '').trim();
export const idOf = (key: string) => key.replace('/works/', '');
export const copiesOf = (key: string) => {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 1 + (h % 3);
};
