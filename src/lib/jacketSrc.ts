const byName = new Map<string, string>()
{
  const jacketUrls = import.meta.glob('../../../DrillMAX-dev-data/jackets/*.webp', {
    query: '?url',
    import: 'default',
    eager: true,
  }) as Record<string, string>
  for (const [file, url] of Object.entries(jacketUrls)) {
    const name = file.split(/[/\\]/).pop()
    if (name) byName.set(name, url)
  }
}

export function jacketSrc(titleJacket?: string): string | undefined {
  if (!titleJacket) return undefined
  const name = titleJacket.split(/[/\\]/).pop()
  return name ? byName.get(name) : undefined
}

export function jacketSrcForId(titleId?: number): string | undefined {
  if (typeof titleId !== 'number' || !Number.isFinite(titleId)) return undefined
  return jacketSrc(`jackets/${titleId}.webp`)
}
