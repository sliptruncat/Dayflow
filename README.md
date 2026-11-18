# DAYFLOW

AI-powered life planner for calendar, tasks, time tracking, reminders, personal analytics, and everyday planning.

## Project status

The responsive application foundation and Phase 2 identity code are implemented. Supabase project configuration and migration application are required before real authentication and durable user data can be verified.

## Product brief

See [docs/PRODUCT_BRIEF.md](docs/PRODUCT_BRIEF.md) for the product vision, feature scope, visual direction, architecture proposal, MVP sequence, and initial acceptance criteria.

## Development

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` using the Project URL and Publishable Key from Supabase.
3. Install dependencies with `npm install`.
4. Run `npm run dev` and open `http://localhost:3000`.
5. Before handing off a change, run `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`.

Never commit `.env.local`. Never expose a Supabase Secret Key or service-role key in browser code.

## Supabase setup (Phase 2)

1. Create a Supabase project.
2. Configure the public environment variables in `.env.local`.
3. Under **Authentication → URL Configuration**, set the local Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to Redirect URLs. Add the deployed callback URL when a deployment exists.
4. Review `supabase/migrations/202611180001_identity_and_preferences.sql` before applying it to the intended project.
5. Apply migrations using Supabase CLI against local/isolated infrastructure first. Do not run destructive resets against a cloud project.
6. Enable Email/password authentication. Production should retain email confirmation and configure SMTP before inviting real users.

The application intentionally shows a setup state when public Supabase configuration is absent. RLS and SQL tests must run only against local or isolated test infrastructure, never production.

## Documentation

- [Product brief](docs/PRODUCT_BRIEF.md)
- [Technical specification](docs/TECHNICAL_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database plan](docs/DATABASE.md)
- [Roadmap](docs/ROADMAP.md)
- [Architecture decisions](docs/DECISIONS.md)
