// deno-lint-ignore-file
import { parseFeed } from "@rss";

export async function blogroll(): Promise<FeedEntry[]> {
  const urls = (await Deno.readTextFile("content/blogroll.txt"))
    .split("\n").filter((line) => line.trim().length > 0);
  
  console.log(`Found ${urls.length} feed URLs in blogroll.txt`);
  
  // Use Promise.all to fetch all feeds
  const all_entries = [];
  for (const url of urls) {
    try {
      const entries = await blogroll_feed(url);
      all_entries.push(...entries);
      console.log(`Successfully fetched ${entries.length} entries from ${url}`);
    } catch (error) {
      console.error(`Error fetching feed from ${url}:`, error);
    }
  }
  
  console.log(`Total entries fetched: ${all_entries.length}`);
  all_entries.sort((a, b) => b.date.getTime() - a.date.getTime());
  return all_entries;
}

export interface FeedEntry {
  title: string;
  url: string;
  date: Date;
}

async function blogroll_feed(url: string): Promise<FeedEntry[]> {
  console.log(`Fetching feed: ${url}`);
  
  // Try to fetch with a timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const xml = await response.text();
    console.log(`Parsing feed content for ${url}`);
    const feed = await parseFeed(xml);
    console.log(`Feed parsed successfully with ${feed.entries.length} entries`);

    return feed.entries.map((entry) => {
      // Special handling for Google Security Blog
      if (url.includes('googleonlinesecurity.blogspot.com') || url.includes('security.googleblog.com')) {
        // For Google blogs, extract the correct post URL
        if (entry.id) {
          // The entry ID often contains the actual post URL
          const match = entry.id.match(/(https?:\/\/[^\/]+\/\d{4}\/\d{2}\/[^\/]+\.html)/);
          if (match && match[1]) {
            return {
              title: entry.title?.value || "Untitled Entry",
              url: match[1],
              date: (entry.published ?? entry.updated) || new Date(),
            };
          }
        }
      }
      
      // Standard extraction for other feeds
      const linkUrl = extractBestLinkUrl(entry, url);
      
      return {
        title: entry.title?.value || "Untitled Entry",
        url: linkUrl,
        date: (entry.published ?? entry.updated) || new Date(),
      };
    }).slice(0, 3); // Keep only 3 most recent entries per feed
  } catch (error) {
    console.error(`Error processing feed ${url}:`, error);
    throw error; // Rethrow to be caught by the caller
  } finally {
    clearTimeout(timeout);
  }
}

// Helper function to extract the best URL from a feed entry
function extractBestLinkUrl(entry: any, fallbackUrl: string): string {
  // If the entry has no links, use the fallback URL
  if (!entry.links || entry.links.length === 0) {
    // Try to use alternative fields if available
    if (entry.id && entry.id.startsWith('http')) {
      return entry.id;
    }
    return fallbackUrl;
  }

  // Look for a link with rel="alternate"
  const alternateLink = entry.links.find((link: any) => link.rel === "alternate" && link.href);
  if (alternateLink && alternateLink.href) {
    return alternateLink.href;
  }

  // Look for a link with type "text/html"
  const htmlLink = entry.links.find((link: any) => link.type === "text/html" && link.href);
  if (htmlLink && htmlLink.href) {
    return htmlLink.href;
  }

  // Look for a link ending with .html
  const htmlEndingLink = entry.links.find((link: any) => link.href && typeof link.href === "string" && link.href.endsWith(".html"));
  if (htmlEndingLink && htmlEndingLink.href) {
    return htmlEndingLink.href;
  }

  // Check if we have a link with a URL that looks like a blog post
  const blogPostLink = entry.links.find((link: any) => 
    link.href && 
    typeof link.href === "string" && 
    /\/\d{4}\/\d{2}\//.test(link.href) && 
    !link.href.includes('comment')
  );
  if (blogPostLink && blogPostLink.href) {
    return blogPostLink.href;
  }

  // Just use the first link's href that doesn't contain "comment"
  const nonCommentLink = entry.links.find((link: any) => 
    link.href && 
    typeof link.href === "string" && 
    !link.href.includes('comment')
  );
  if (nonCommentLink && nonCommentLink.href) {
    return nonCommentLink.href;
  }

  // If all else fails, just use the first link
  if (entry.links[0] && entry.links[0].href) {
    return entry.links[0].href;
  }

  // Fall back to the feed URL
  return fallbackUrl;
}