export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("پاسخ درگاه قابل خواندن نیست.");
  }
}

export function escapeXml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function postSoap(url: string, method: string, params: Record<string, string | number>) {
  const fields = Object.entries(params)
    .map(([key, value]) => `<${key}>${escapeXml(value)}</${key}>`)
    .join("");
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:int="http://interfaces.core.sw.bps.com/">
  <soapenv:Header/>
  <soapenv:Body>
    <int:${method}>${fields}</int:${method}>
  </soapenv:Body>
</soapenv:Envelope>`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `http://interfaces.core.sw.bps.com/${method}`,
    },
    body: envelope,
  });
  const text = await response.text();
  const result = text.match(/<return>([^<]*)<\/return>/i)?.[1]?.trim();
  if (!result) {
    const fault = text.match(/<faultstring>([^<]*)<\/faultstring>/i)?.[1];
    throw new Error(fault || "پاسخ بانک ملت قابل خواندن نیست.");
  }
  return result.replaceAll("&amp;", "&").trim();
}

export function tehranStamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return {
    localDate: `${pick("year")}${pick("month")}${pick("day")}`,
    localTime: `${pick("hour")}${pick("minute")}${pick("second")}`,
  };
}
