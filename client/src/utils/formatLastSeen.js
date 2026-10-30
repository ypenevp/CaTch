export function formatTimeAgo(date, now = Date.now()) {
  const seconds = Math.max(0, Math.floor((now - new Date(date).getTime()) / 1000));
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;

  return `${Math.floor(hours / 24)} d ago`;
}

export function formatLastSeen(lastSeen, now = Date.now()) {
  if (!lastSeen) return "Never connected";
  return `Last seen ${formatTimeAgo(lastSeen, now)}`;
}
