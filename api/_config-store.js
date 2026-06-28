const fs = require("fs/promises");
const path = require("path");
const { getCosmos } = require("./_shared");

const DEFAULT_CONFIG = {
  id: "config",
  pk: "config",
  youtube: { videos: [] },
  overrides: { fireworks: "auto", snow: "auto" }
};

function hasGitHubConfig() {
  return !!(
    process.env.GITHUB_OWNER &&
    process.env.GITHUB_REPO &&
    process.env.GITHUB_TOKEN
  );
}

function getGitHubBranch() {
  return process.env.GITHUB_BRANCH || "main";
}

function getGitHubConfigPath() {
  return process.env.GITHUB_CONFIG_PATH || "data/site-config.json";
}

function getGitHubApiBase() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  return `https://api.github.com/repos/${owner}/${repo}/contents`;
}

function encodeRepoPath(repoPath) {
  return String(repoPath || "")
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
}

function normalizeVideoItem(item, category) {
  const raw = item && typeof item === "object" ? (item.id || item.url || item) : item;
  const id = String(raw || "").trim();
  if (!id) return null;
  return { id, category };
}

function flattenByCategory(byCategory) {
  if (!byCategory || typeof byCategory !== "object") return [];
  const out = [];
  const seen = new Set();
  for (const category of ["regular", "halloween", "xmas", "holiday"]) {
    const list = Array.isArray(byCategory[category]) ? byCategory[category] : [];
    for (const item of list) {
      const video = normalizeVideoItem(item, category);
      if (!video) continue;
      const key = `${video.category}:${video.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(video);
    }
  }
  return out;
}

function normalizeConfig(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const youtube = source.youtube && typeof source.youtube === "object" ? source.youtube : {};
  const overrides = source.overrides && typeof source.overrides === "object" ? source.overrides : {};
  const videos = Array.isArray(youtube.videos)
    ? youtube.videos
    : flattenByCategory(youtube.byCategory);
  return {
    id: source.id || "config",
    pk: source.pk || "config",
    youtube: {
      videos
    },
    overrides: {
      fireworks: overrides.fireworks || "auto",
      snow: overrides.snow || "auto"
    },
    stocks: source.stocks && typeof source.stocks === "object" ? source.stocks : undefined
  };
}

async function readFromGitHub() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  const branch = getGitHubBranch();
  const configPath = getGitHubConfigPath();
  const url = `${getGitHubApiBase()}/${encodeRepoPath(configPath)}?ref=${encodeURIComponent(branch)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": `${owner}/${repo} site-config`
    }
  });

  if (res.status === 404) {
    return null;
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `GitHub contents read failed with HTTP ${res.status}`;
    throw new Error(msg);
  }

  if (!data || typeof data.content !== "string") {
    return null;
  }

  const decoded = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
  let parsed = null;
  try {
    parsed = JSON.parse(decoded);
  } catch (e) {
    throw new Error(`Config file is not valid JSON: ${e.message}`);
  }

  return {
    source: "github",
    sha: data.sha || null,
    config: normalizeConfig(parsed)
  };
}

async function readFromBundledSeed() {
  const bundledPaths = [
    path.resolve(__dirname, "site-config.seed.json"),
    path.resolve(__dirname, "..", "data", "site-config.json")
  ];
  for (const localPath of bundledPaths) {
    try {
      const text = await fs.readFile(localPath, "utf8");
      return {
        source: "local",
        config: normalizeConfig(JSON.parse(text))
      };
    } catch (e) {}
  }
  return null;
}

async function writeToGitHub(config) {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  const branch = getGitHubBranch();
  const configPath = getGitHubConfigPath();
  const normalized = normalizeConfig(config);
  const readUrl = `${getGitHubApiBase()}/${encodeRepoPath(configPath)}?ref=${encodeURIComponent(branch)}`;
  const readRes = await fetch(readUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": `${owner}/${repo} site-config`
    }
  });

  let sha = null;
  if (readRes.ok) {
    const readData = await readRes.json().catch(() => null);
    sha = readData && readData.sha ? readData.sha : null;
  }

  const body = {
    message: "Update site config from admin panel",
    content: Buffer.from(JSON.stringify(normalized, null, 2), "utf8").toString("base64"),
    branch
  };
  if (sha) body.sha = sha;

  const writeRes = await fetch(`${getGitHubApiBase()}/${encodeRepoPath(configPath)}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": `${owner}/${repo} site-config`
    },
    body: JSON.stringify(body)
  });

  const writeData = await writeRes.json().catch(() => null);
  if (!writeRes.ok) {
    const msg = (writeData && (writeData.message || writeData.error)) || `GitHub contents write failed with HTTP ${writeRes.status}`;
    throw new Error(msg);
  }

  return {
    source: "github",
    sha: writeData && writeData.content && writeData.content.sha ? writeData.content.sha : null,
    config: normalized
  };
}

async function readFromCosmos() {
  const { container } = getCosmos();
  const res = await container.item("config", "config").read();
  return {
    source: "cosmos",
    config: normalizeConfig(res && res.resource)
  };
}

async function writeToCosmos(config) {
  const { container } = getCosmos();
  const normalized = normalizeConfig(config);
  await container.items.upsert(normalized);
  return {
    source: "cosmos",
    config: normalized
  };
}

async function readSiteConfig() {
  if (hasGitHubConfig()) {
    const github = await readFromGitHub();
    if (github) return github;
  }

  const bundled = await readFromBundledSeed();
  if (bundled) return bundled;

  try {
    return await readFromCosmos();
  } catch (e) {
    return {
      source: "fallback",
      config: normalizeConfig(DEFAULT_CONFIG),
      error: String(e.message || e)
    };
  }
}

async function writeSiteConfig(config) {
  if (hasGitHubConfig()) {
    return await writeToGitHub(config);
  }
  return await writeToCosmos(config);
}

module.exports = {
  DEFAULT_CONFIG,
  readSiteConfig,
  writeSiteConfig,
  normalizeConfig
};