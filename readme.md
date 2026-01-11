# Clear365 – Tracker privé

Static Web App privée (Entra ID) pour enregistrer un check-in quotidien (poids, sommeil MyAir%, volume d’entraînement) et afficher les 7 derniers jours.

## Architecture
- Front: `index.html` (racine)
- API: Azure Functions dans `/api`
- Data: Azure Table Storage `DailyCheckins`

## Endpoints
- GET `/api/checkins?days=7` : liste (7 derniers jours)
- PUT `/api/checkins` : upsert du jour (PK dérivée de l’utilisateur authentifié)

## Secrets
- `AZURE_STORAGE_CONNECTION_STRING` (Environment variables de la Static Web App)
