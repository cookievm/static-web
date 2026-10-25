# static. website

The static. website: home page, email sign-in, and (soon) linking Root, the Connect page, history imports and profiles.
Built with Next.js and Supabase. It will be hosted on Vercel.

## Run it on your PC

Open this folder in VS Code, then open a terminal (View → Terminal) and run:

```powershell
cd C:\Users\thoma\Documents\Bots\static\website
Copy-Item .env.example .env.local
npm install
npm run dev
```

Then open http://localhost:3000 in your browser. Press `Ctrl + C` in the terminal to stop it.

## Settings

`.env.local` (a copy of `.env.example`) holds the Supabase address and the publishable key. Both are safe to be public (the browser uses them).
Linking Root and making scrobbler tokens need one secret: the Supabase **service role key**. Open `.env.local` in VS Code and paste it after `SUPABASE_SERVICE_ROLE_KEY=`
(Supabase → Project Settings → API Keys). `.env.local` is never uploaded to GitHub. Never paste this key in chat.

The bot also needs `STATIC_BOT_KEY`, a password you make yourself. `.env.example` has a PowerShell command that makes one.

## Sign-in emails

Supabase's built-in email only sends a few emails per hour, and only to addresses on your Supabase team.
That's fine for testing with your own email. Before launch we'll connect a real email sender.

## Files

- `app/page.tsx`: home page
- `app/login/`: sign-in page and the code that emails the link
- `app/auth/callback/route.ts`: where the email link lands
- `app/account/page.tsx`: your account page (needs you to be signed in)
- `app/link/`: enter the code from `/st link` to connect your Root account
- `app/connect/`: scrobbler tokens and app setup guides
- `app/import/`: upload a listening history file and watch its progress
- `lib/tokens.ts`: makes and hashes scrobbler tokens
- `lib/supabase/`: the two Supabase connections (normal and full-access)
- `proxy.ts`: keeps you signed in between pages
- `app/globals.css`: all the styles (colours match the bot's cards)
