# Self Directed Learning Platform

## For dev

```bash
docker compose up 
```

When you start the project, the database will be empty.

Run the migration, init the database schema:

```bash
docker compose exec api npm run migrate
```
