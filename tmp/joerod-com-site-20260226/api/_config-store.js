const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
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
    (process.env.GITHUB_TOKEN || (
      process.env.GITHUB_APP_ID &&
      process.env.GITHUB_APP_INSTALLATION_ID &&
      (process.env.GITHUB_APP_PRIVATE_KEY || process.env.GITHUB_APP_PRIVATE_KEY_BASE64)
    ))
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

function base64Url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function parsePrivateKey() {
  const b64 = process.env.GITHUB_APP_PRIVATE_KEY_BASE64;
  if (b64) {
    return Buffer.from(String(b64).trim(), "base64").toString("utf8");
  }
  const raw = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!raw) return null;
  return String(raw).replace(/\\n/g, "\n");
}

function makeAppJwt() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = parsePrivateKey();
  if (!appId || !privateKey) {
    throw new Error("Missing GitHub App credentials");
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 30,
    exp: now + 9 * 60,
    iss: String(appId)
  };
  const header = { alg: "RS256", typ: "JWT" };
  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(privateKey);
  return `${signingInput}.${base64Url(signature)}`;
}

async function getGitHubInstallationToken() {
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN;
  }

  const cache = global.__joerodGithubAppToken || {};
  const now = Date.now();
  if (cache.token && cache.expiresAt && cache.expiresAt - now > 60_000) {
    return cache.token;
  }

  const installationId = process.env.GITHUB_APP_INSTALLATION_ID;
  const jwt = makeAppJwt();
  const res = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": `${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO} site-config`
    }
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `GitHub App token request failed with HTTP ${res.status}`;
    throw new Error(msg);
  }
  const token = data && data.token;
  const expiresAt = data && data.expires_at ? Date.parse(data.expires_at) : (Date.now() + 50 * 60 * 1000);
  global.__joerodGithubAppToken = { token, expiresAt };
  return token;
}

function getGitHubAuthKind() {
  if (process.env.GITHUB_TOKEN) return "token";
  if (process.env.GITHUB_APP_ID && process.env.GITHUB_APP_INSTALLATION_ID && (process.env.GITHUB_APP_PRIVATE_KEY || process.env.GITHUB_APP_PRIVATE_KEY_BASE64)) {
    return "app";
  }
  return null;
}

async function getGitHubAuthToken() {
  const kind = getGitHubAuthKind();
  if (kind === "token") {
    return process.env.GITHUB_TOKEN;
  }
  if (kind === "app") {
    return await getGitHubInstallationToken();
  }
  throw new Error("Missing GitHub auth settings");
}

function normalizeConfig(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const youtube = source.youtube && typeof source.youtube === "object" ? source.youtube : {};
  const overrides = source.overrides && typeof source.overrides === "object" ? source.overrides : {};
  return {
    id: source.id || "config",
    pk: source.pk || "config",
    youtube: {
      videos: Array.isArray(youtube.videos) ? youtube.videos : []
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
  const token = await getGitHubAuthToken();
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

async function writeToGitHub(config) {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const token = await getGitHubAuthToken();
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
