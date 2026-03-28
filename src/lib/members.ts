export const MEMBERS: Record<string, string> = {
  "victory.jun01@gmail.com": "김승준",
  "ihayoem@gmail.com": "이하연",
  "workingminjee@gmail.com": "임민지",
  "jbinyim991214@gmail.com": "임정빈",
};

export function getMemberName(email: string): string {
  return MEMBERS[email] || email.split("@")[0];
}

export function getMemberList() {
  return Object.entries(MEMBERS).map(([email, name]) => ({ email, name }));
}
