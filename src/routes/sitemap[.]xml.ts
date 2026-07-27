import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { INDUSTRY_LANDINGS } from "@/lib/industry-landings";

const BASE_URL = "";

interface SitemapEntry {
  path: string;
  changefreq?: "weekly" | "monthly";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/how-it-works", changefreq: "monthly", priority: "0.8" },
          { path: "/features", changefreq: "monthly", priority: "0.8" },
          { path: "/industries", changefreq: "monthly", priority: "0.7" },
          { path: "/pricing", changefreq: "monthly", priority: "0.9" },
          { path: "/compliance", changefreq: "monthly", priority: "0.7" },
          ...INDUSTRY_LANDINGS.map((i) => ({
            path: `/${i.slug}`,
            changefreq: "monthly" as const,
            priority: "0.8",
          })),
        ];
        const urls = entries
          .map((e) =>
            [
              `  <url>`,
              `    <loc>${BASE_URL}${e.path}</loc>`,
              e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
              e.priority ? `    <priority>${e.priority}</priority>` : null,
              `  </url>`,
            ]
              .filter(Boolean)
              .join("\n"),
          )
          .join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});