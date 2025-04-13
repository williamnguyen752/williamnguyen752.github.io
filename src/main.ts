import { debounce } from "@std/async/debounce";
import * as templates from "./templates.ts";
import * as djot from "./djot.ts";
import * as blogroll from "./blogroll.ts";
import { HtmlString } from "./templates.ts";

async function main() {
  const params = {
    blogroll: false,
    update: false,
    spell: false,
    profile: false,
    filter: "",
  };

  const subcommand = Deno.args[0];
  if (subcommand === "touch") {
    const slug = Deno.args[1];
    const date = new Date().toISOString().split("T")[0];
    const path = `./content/posts/${date}-${slug}.dj`;
    console.log(`touching ${path}`);
    await Deno.writeTextFile(path, "#\n");
    return;
  }

  let i = 1;
  for (; i < Deno.args.length; i++) {
    switch (Deno.args[i]) {
      case "--update": {
        params.update = true;
        break;
      }
      case "--spell": {
        params.spell = true;
        break;
      }
      case "--profile": {
        params.profile = true;
        break;
      }
      case "--filter": {
        params.filter = Deno.args[i + 1] ?? "";
        i++;
        break;
      }
      case "--blogroll": {
        params.blogroll = true;
        break;
      }
      default:
        fatal(`unexpected argument: ${Deno.args[i]}`);
    }
  }

  if (subcommand === "build") {
    await build(params);
  } else if (subcommand === "watch") {
    await watch(params);
  } else {
    fatal("subcommand required");
  }
}

function fatal(message: string) {
  console.error(message);
  Deno.exit(1);
}

async function watch(params: { filter: string }) {
  let signal = Promise.withResolvers();
  (async () => {
    let build_id = 0;
    while (await signal.promise) {
      signal = Promise.withResolvers();
      console.log(`rebuild #${build_id}`);
      build_id += 1;
      await build({
        blogroll: false,
        update: true,
        spell: false,
        profile: false,
        filter: params.filter,
      });
    }
  })();

  signal.resolve(true);

  const rebuild_debounced = debounce(
    () => signal.resolve(true),
    16,
  );

  for await (const event of Deno.watchFs("./content", { recursive: true })) {
    if (event.kind == "access") continue;
    await rebuild_debounced();
  }
  signal.resolve(false);
}

class Ctx {
  constructor(
    public read_ms: number = 0,
    public parse_ms: number = 0,
    public render_ms: number = 0,
    public collect_ms: number = 0,
    public total_ms: number = 0,
  ) {}
}

async function build(params: {
  blogroll: boolean;
  update: boolean;
  spell: boolean;
  profile: boolean;
  filter: string;
}) {
  const t = performance.now();

  const ctx = new Ctx();

  if (!params.update) {
    try {
      await Deno.remove("./out/www", { recursive: true });
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) {
        throw err;
      }
    }
  }
  await Deno.mkdir("./out/www", { recursive: true });

  const posts = await collect_posts(ctx, params.filter);
  await update_file("out/www/index.html", templates.post_list(posts).value);
  await update_file("out/www/feed.xml", templates.feed(posts).value);
  for (const post of posts) {
    await update_file(
      `out/www${post.path}`,
      templates.post(post, params.spell).value,
    );
  }

  console.log("Generating blogroll...");
  try {
    const blogroll_posts = await blogroll.blogroll();
    console.log(`Generated blogroll with ${blogroll_posts.length} entries`);
    await update_file(
      "out/www/blogroll.html",
      templates.blogroll_list(blogroll_posts).value,
    );
  } catch (error) {
    console.error("Error generating blogroll:", error);
    // Still create a basic blogroll page even if feeds fail
    await update_file(
      "out/www/blogroll.html",
      templates.blogroll_list([]).value,
    );
  }

  const pages = ["about", "resume", "links", "style"];
  for (const page of pages) {
    const text = await Deno.readTextFile(`content/${page}.dj`);
    const ast = await djot.parse(text);
    const html = djot.render(ast, {});
    await update_file(`out/www/${page}.html`, templates.page(page, html).value);
  }

  const redirects = [
    ["/2024/09/32/-what-is-io-uring.html", "/2024/09/23/what-is-io-uring.html"],
  ];

  for (const [from, to] of redirects) {
    await update_file(`out/www/${from}`, templates.redirect(to).value);
  }

  const paths = [
    "favicon.svg",
    "favicon.png",
    "resume.pdf",
    "css/*",
    "assets/*",
    "assets/resilient-parsing/*",
  ];
  for (const path of paths) {
    await update_path(path);
  }

  ctx.total_ms = performance.now() - t;
  console.log(`${ctx.total_ms}ms`);
  if (params.profile) console.log(JSON.stringify(ctx));
}

function dirname(path: string): string {
  return path.substring(0, path.lastIndexOf("/"));
}

async function update_file(path: string, content: Uint8Array | string) {
  if (!content) return;
  await Deno.mkdir(dirname(path), { recursive: true });
  await Deno.mkdir("./out/tmp", { recursive: true });
  const temp = await Deno.makeTempFile({ dir: "./out/tmp" });
  if (content instanceof Uint8Array) {
    await Deno.writeFile(temp, content);
  } else {
    await Deno.writeTextFile(temp, content);
  }
  await Deno.rename(temp, path);
}

async function update_path(path: string) {
  if (path.endsWith("*")) {
    const dir = path.replace("*", "");
    const futs = [];
    for await (const entry of Deno.readDir(`content/${dir}`)) {
      if (entry.isFile) {
        futs.push(update_path(`${dir}/${entry.name}`));
      }
    }
    await Promise.all(futs);
  } else {
    await update_file(
      `out/www/${path}`,
      await Deno.readFile(`content/${path}`),
    );
  }
}

export type Post = {
  year: number;
  month: number;
  day: number;
  slug: string;
  date: Date;
  title: string;
  path: string;
  src: string;
  content: HtmlString;
  summary: string;
};

async function collect_posts(ctx: Ctx, filter: string): Promise<Post[]> {
  const start = performance.now();
  const posts = [];
  for await (const file_path of walk("./content/posts/")) {
    if (!file_path.endsWith(".dj")) continue;
    if (filter !== "") {
      if (file_path.indexOf(filter) === -1) continue;
    }
    const [, y, m, d, slug] = file_path.match(
      /^.*(\d\d\d\d)-(\d\d)-(\d\d)-(.*)\.dj$/,
    )!;
    const [year, month, day] = [y, m, d].map((it) => parseInt(it, 10));
    const date = new Date(Date.UTC(year, month - 1, day));

    let t = performance.now();
    const text = await Deno.readTextFile(file_path);
    ctx.read_ms += performance.now() - t;

    t = performance.now();
    const ast = djot.parse(text);
    ctx.parse_ms += performance.now() - t;

    t = performance.now();
    const render_ctx = { date, summary: undefined, title: undefined };
    const html = djot.render(ast, render_ctx);
    ctx.render_ms += performance.now() - t;

    posts.push({
      year,
      month,
      day,
      slug,
      date,
      title: render_ctx.title!,
      content: html,
      summary: render_ctx.summary!,
      path: `/${y}/${m}/${d}/${slug}.html`,
      src: `/content/posts/${y}-${m}-${d}-${slug}.dj`,
    });
  }
  posts.sort((l, r) => l.path < r.path ? 1 : -1);
  ctx.collect_ms = performance.now() - start;
  return posts;
}

async function* walk(root: string): AsyncIterableIterator<string> {
  for await (const entry of Deno.readDir(root)) {
    const path = `${root}${entry.name}`;
    if (entry.isDirectory) {
      yield* walk(path);
    } else {
      yield path;
    }
  }
}

if (import.meta.main) await main();

