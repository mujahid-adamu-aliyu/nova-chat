# 9jaTalk

9jaTalk is a mobile-first social chat app for connecting, messaging, and sharing with people across Nigeria.

**Live app:** [9jatalk-space.vercel.app](https://9jatalk-space.vercel.app)

## Features

- Private conversations, message notifications, and media sharing
- A social feed with posts, stories, and comments
- Discover people and manage follows
- Profile editing, privacy settings, and account controls
- A phone-width interface on larger screens, with persistent app navigation

## Technology

- HTML, CSS, and vanilla JavaScript
- Supabase for authentication and app data
- Poppins and Phosphor icons, loaded from CDNs
- Vercel static hosting

## Run locally

No package installation or build step is required. From the repository root, start a local HTTP server:

```sh
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000). Use an HTTP server rather than opening `index.html` directly so browser authentication and page navigation work as expected. For local sign-in flows, add the localhost URL to the allowed redirect URLs in the Supabase project settings.

## Project layout

- `index.html` - Sign-up, sign-in, and account recovery
- `chats.html` - Main app shell, chats, feed, and shared tab navigation
- `profile.html` - Profile and Discover views; preloaded by the main app shell
- `app.js` - Supabase client behavior, messaging, feed, profile, and navigation logic
- `app.css` - Shared themes, components, mobile layout, and wide-screen notice
- `manifest.json` - Web app metadata

## Supabase configuration

The browser client configuration is in `index.html` and `app.js`. These files should contain only the Supabase project URL and public anon key. Keep privileged service-role keys and other secrets on a trusted server, and use Supabase Row Level Security policies to protect application data.

## Deploy

The production app is hosted at [9jatalk-space.vercel.app](https://9jatalk-space.vercel.app). The project is served as static files from the repository root; there is no build command or generated output directory.
