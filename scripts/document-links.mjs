const markdownLinkPattern = /(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
const htmlLinkPattern = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi;

function cleanTarget(rawTarget) {
  const trimmed = rawTarget.trim();
  return trimmed.startsWith("<") && trimmed.endsWith(">") ? trimmed.slice(1, -1) : trimmed;
}

export function extractDocumentLinkTargets(source) {
  const targets = [];

  for (const match of source.matchAll(markdownLinkPattern)) {
    targets.push(match[3]);
  }

  for (const match of source.matchAll(htmlLinkPattern)) {
    targets.push(match[1]);
  }

  return targets;
}

function comparableUrl(rawTarget) {
  let parsed;
  try {
    parsed = new URL(cleanTarget(rawTarget));
  } catch {
    return null;
  }

  return {
    hash: parsed.hash,
    hostname: parsed.hostname,
    password: parsed.password,
    pathname: parsed.pathname,
    port: parsed.port,
    protocol: parsed.protocol,
    search: parsed.search,
    username: parsed.username,
  };
}

export function documentLinksToExactUrl(source, expectedTarget) {
  const expected = comparableUrl(expectedTarget);
  if (!expected) throw new TypeError(`Expected a valid absolute URL, received ${expectedTarget}`);

  return extractDocumentLinkTargets(source).some((rawTarget) => {
    const candidate = comparableUrl(rawTarget);
    return (
      candidate !== null &&
      candidate.protocol === expected.protocol &&
      candidate.hostname === expected.hostname &&
      candidate.port === expected.port &&
      candidate.username === expected.username &&
      candidate.password === expected.password &&
      candidate.pathname === expected.pathname &&
      candidate.search === expected.search &&
      candidate.hash === expected.hash
    );
  });
}
