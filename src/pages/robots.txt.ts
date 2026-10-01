import { publication } from '../data/publication';
export function GET() {
  return new Response(
    `User-agent: *\n${publication.mode === 'production' ? 'Allow: /' : 'Disallow: /'}\n`,
    {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    },
  );
}
