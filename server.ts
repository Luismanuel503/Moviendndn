import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const VIMEUS_BASE_URL = 'https://vimeus.com';
const VIMEUS_VIEW_KEY =
  process.env.VITE_VIMEUS_VIEW_KEY ||
  'KW3uvJT-KTH59ZeVICyoru1mmkixYzEQm--F2bWa5UY';

interface VimeusStreamEmbed {
  format: string | null;
  lang: string;
  quality: string;
  resolution: string | null;
  sala_id: number;
  server: string;
  size: string | null;
  subtitle: number;
  url: string;
}

interface VimeusEpisodeEntry {
  episode: number;
  season: number;
  title: string;
  poster: string | null;
}

interface VimeusSeasonEntry {
  season?: number;
  episodes: VimeusEpisodeEntry[];
}

interface VimeusResolvedPayload {
  available: boolean;
  tmdb_id: number;
  type: 'movie' | 'serie' | 'anime';
  title?: string;
  poster?: string | null;
  backdrop?: string | null;
  embeds: VimeusStreamEmbed[];
  seasons?: VimeusSeasonEntry[];
}

// In-memory cache for speed
const availabilityCache = new Map<string, { timestamp: number; data: VimeusResolvedPayload }>();
const CACHE_TTL_MS = 1000 * 60 * 45; // 45 minutes

async function probeVimeusEndpoint(
  endpointType: 'movie' | 'serie' | 'anime',
  tmdbId: number,
  season?: number,
  episode?: number
): Promise<VimeusResolvedPayload> {
  const cacheKey = `${endpointType}:${tmdbId}:${season || 0}:${episode || 0}`;
  const cached = availabilityCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const url = new URL(`${VIMEUS_BASE_URL}/e/${endpointType}`);
  url.searchParams.set('tmdb', String(tmdbId));
  if ((endpointType === 'serie' || endpointType === 'anime') && season && episode) {
    url.searchParams.set('se', String(season));
    url.searchParams.set('ep', String(episode));
  }
  url.searchParams.set('view_key', VIMEUS_VIEW_KEY);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        Referer: `${VIMEUS_BASE_URL}/`,
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      const notFoundPayload: VimeusResolvedPayload = {
        available: false,
        tmdb_id: tmdbId,
        type: endpointType,
        embeds: [],
      };
      availabilityCache.set(cacheKey, { timestamp: Date.now(), data: notFoundPayload });
      return notFoundPayload;
    }

    const html = await response.text();
    const match = html.match(/<script[^>]*id="data"[^>]*>([\s\S]*?)<\/script>/i);
    if (!match || !match[1]) {
      const emptyPayload: VimeusResolvedPayload = {
        available: false,
        tmdb_id: tmdbId,
        type: endpointType,
        embeds: [],
      };
      availabilityCache.set(cacheKey, { timestamp: Date.now(), data: emptyPayload });
      return emptyPayload;
    }

    const parsed = JSON.parse(match[1].trim());
    const embeds: VimeusStreamEmbed[] = Array.isArray(parsed.embeds) ? parsed.embeds : [];
    const seasons: VimeusSeasonEntry[] | undefined = Array.isArray(parsed.seasons)
      ? parsed.seasons
      : undefined;

    const isAvailable = embeds.length > 0 || Boolean(seasons && seasons.length > 0);
    const resolved: VimeusResolvedPayload = {
      available: isAvailable,
      tmdb_id: tmdbId,
      type: endpointType,
      title: parsed.title,
      poster: parsed.poster || null,
      backdrop: parsed.backdrop || null,
      embeds,
      seasons,
    };

    availabilityCache.set(cacheKey, { timestamp: Date.now(), data: resolved });
    return resolved;
  } catch {
    return {
      available: false,
      tmdb_id: tmdbId,
      type: endpointType,
      embeds: [],
    };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. Resolve raw streams & metadata for instant direct playback
  app.get('/api/vimeus/resolve', async (req, res) => {
    const tmdbId = Number(req.query.tmdb);
    const rawType = String(req.query.type || 'movie');
    const season = req.query.se ? Number(req.query.se) : undefined;
    const episode = req.query.ep ? Number(req.query.ep) : undefined;

    if (!tmdbId) {
      res.status(400).json({ available: false, embeds: [] });
      return;
    }

    const endpointType: 'movie' | 'serie' | 'anime' =
      rawType === 'anime' ? 'anime' : rawType === 'serie' || rawType === 'tv' ? 'serie' : 'movie';

    let result = await probeVimeusEndpoint(endpointType, tmdbId, season, episode);

    if (!result.available && endpointType !== 'movie') {
      const altType = endpointType === 'anime' ? 'serie' : 'anime';
      const altResult = await probeVimeusEndpoint(altType, tmdbId, season, episode);
      if (altResult.available) {
        result = altResult;
      }
    }

    res.json(result);
  });

  // 2. Custom Clean Player Proxy (Strips all Vimeus branding, green splash, and watermarks)
  app.get('/api/player/stream', async (req, res) => {
    const tmdbId = Number(req.query.tmdb);
    const rawType = String(req.query.type || 'movie');
    const season = req.query.se ? Number(req.query.se) : undefined;
    const episode = req.query.ep ? Number(req.query.ep) : undefined;
    const customTitle = String(req.query.title || 'Cinema Player');

    if (!tmdbId) {
      res.status(400).send('Invalid TMDB ID');
      return;
    }

    const endpointType: 'movie' | 'serie' | 'anime' =
      rawType === 'anime' ? 'anime' : rawType === 'serie' || rawType === 'tv' ? 'serie' : 'movie';

    const url = new URL(`${VIMEUS_BASE_URL}/e/${endpointType}`);
    url.searchParams.set('tmdb', String(tmdbId));
    if ((endpointType === 'serie' || endpointType === 'anime') && season && episode) {
      url.searchParams.set('se', String(season));
      url.searchParams.set('ep', String(episode));
    }
    url.searchParams.set('view_key', VIMEUS_VIEW_KEY);

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          Referer: `${VIMEUS_BASE_URL}/`,
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) {
        res.status(response.status).send('Video not available');
        return;
      }

      let html = await response.text();

      // Clean CSS injection: pitch black background, zero green splash, zero Vimeus text or branding
      const customStyles = `
        <style>
          /* Pure Pitch Black Canvas */
          html, body, #root {
            background-color: #000000 !important;
            color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          /* Neutralize all green/lime/emerald gradient overlays */
          [class*="from-green"], [class*="via-green"], [class*="to-green"],
          [class*="emerald"], [class*="lime"],
          .bg-gradient-to-br, .bg-gradient-to-t, .bg-gradient-to-b {
            background: #000000 !important;
            border-color: rgba(255, 255, 255, 0.15) !important;
          }
          /* Eliminate any branding text watermarks */
          div[class*="fixed"]:has(span) {
            background: #000000 !important;
          }
        </style>
      `;

      // Neutralize data payload splash and theme
      const scriptMatch = html.match(/<script type="text\/json" id="data">([\s\S]*?)<\/script>/i);
      if (scriptMatch) {
        try {
          const parsedData = JSON.parse(scriptMatch[1]);
          parsedData.theme = 'minimal';
          parsedData.splash = false;
          parsedData.title = customTitle;
          html = html.replace(
            scriptMatch[0],
            `<script type="text/json" id="data">${JSON.stringify(parsedData)}</script>`
          );
        } catch {
          // keep original if json parsing failed
        }
      }

      // Inject custom styling and fix relative asset URLs to point to vimeus.com
      html = html
        .replace('<head>', `<head>${customStyles}`)
        .replace(/<title>[^<]*<\/title>/i, `<title>${customTitle}</title>`)
        .replaceAll('src="/player-assets/', 'src="https://vimeus.com/player-assets/')
        .replaceAll('href="/player-assets/', 'href="https://vimeus.com/player-assets/');

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch {
      res.status(500).send('Error loading player');
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
