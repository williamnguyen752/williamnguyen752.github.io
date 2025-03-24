// server.js - Place this at the root of your project
import { serve } from "https://deno.land/std@0.170.0/http/server.ts";

// MIME types for common file extensions
const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".xml": "application/xml",
  ".pdf": "application/pdf",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

serve(async (req) => {
  const url = new URL(req.url);
  let path = url.pathname;
  
  // Handle root path
  if (path === "/") path = "/index.html";
  
  try {
    const filePath = `./out/www${path}`;
    const file = await Deno.readFile(filePath);
    
    const headers = new Headers();
    const extension = path.substring(path.lastIndexOf("."));
    const contentType = MIME_TYPES[extension] || "application/octet-stream";
    headers.set("content-type", contentType);
    
    return new Response(file, { headers });
  } catch (e) {
    console.error(`Error serving ${path}: ${e.message}`);
    return new Response("Not Found", { status: 404 });
  }
});
