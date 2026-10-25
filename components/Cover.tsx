// Album cover, or a plain square when we haven't found one yet.
export default function Cover({ url }: { url: string | null }) {
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img className="cover" src={url} alt="" loading="lazy" width={44} height={44} /> : <span className="cover" />;
}
