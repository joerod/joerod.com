# JoeRod.com

Built with [Azure Static Web Apps](https://docs.microsoft.com/azure/static-web-apps/overview)

## Config storage

The video/admin config can run without Cosmos DB when these app settings are set:

GitHub App auth:
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_APP_ID`
- `GITHUB_APP_INSTALLATION_ID`
- `GITHUB_APP_PRIVATE_KEY` or `GITHUB_APP_PRIVATE_KEY_BASE64`
- `GITHUB_BRANCH` and `GITHUB_CONFIG_PATH` are optional

Legacy token auth still works if you prefer a PAT:
- `GITHUB_TOKEN`

In either mode, `/api/config` and `/api/site-config` read and write `data/site-config.json` through the GitHub Contents API, which works well on the SWA free tier.