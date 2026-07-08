# JoeRod.com

Built with [Azure Static Web Apps](https://docs.microsoft.com/azure/static-web-apps/overview)

## Config storage

The video/admin config can run without Cosmos DB when these app settings are set:

- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_TOKEN`
- `GITHUB_BRANCH` and `GITHUB_CONFIG_PATH` are optional

In that mode, `/api/config` and `/api/site-config` read and write `data/site-config.json` through the GitHub Contents API, which works well on the SWA free tier.
