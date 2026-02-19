export const postJson = async (baseUrl: string, path: string, headers: Record<string, string>, body: any) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${path} failed: ${res.status} ${txt}`.trim());
  }
  return res.json().catch(() => ({}));
};
