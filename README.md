# ArcticFlow — Interior Alaska fuel logging & winter readiness

React + Vite app. All user data stays in the browser (localStorage); optional private-Gist backup via the GitHub API.

## Live, keyless, free APIs
| Feature | API |
|---|---|
| Forecast, history, HDD, daylight | Open-Meteo `api.open-meteo.com` |
| PM2.5 / AQI | Open-Meteo `air-quality-api.open-meteo.com` |
| Place search | Open-Meteo `geocoding-api.open-meteo.com` |
| Watches/warnings, forecast text | NWS `api.weather.gov` |
| Aurora Kp | NOAA SWPC `services.swpc.noaa.gov` |
| Backup / restore | GitHub REST (gist scope token) |

## Run
`npm install && npm run dev` · build `npm run build` · deploy: push to `main`, enable Pages → GitHub Actions.

## Model
Burn = heating degree-days (base 65°F) ÷ K-factor (HDD/gal). K is learned from your reading-to-reading drops against real weather. Air "Stage" and freeze-time are estimates, not official determinations.
