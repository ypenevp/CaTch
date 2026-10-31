function toBinaryString(text) {
  return encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export function encodeUtf8Base64(text) {
  return btoa(toBinaryString(text));
}

export function decodeBase64Utf8(base64) {
  if (!base64) return "";
  const binary = atob(base64);
  const percentEncoded = Array.from(binary, (char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join("");
  return decodeURIComponent(percentEncoded);
}

export function utf8ByteLength(text) {
  return toBinaryString(text).length;
}
