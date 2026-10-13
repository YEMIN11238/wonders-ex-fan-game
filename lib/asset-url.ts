/** Resolve a public file under either the root app or a hosted demo subpath. */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}
