# Nota — Admin Rekap

A private order-recap dashboard for admins only: tracks orders, auto-computes profit and warranty status, shows dashboard stats and charts, and supports import/export via Excel or Google Sheets.

It's a **separate site** from your pricelist app, meant to live on its own subdomain (e.g. `nota.xiao-qi.my.id`), but it shares the same Firebase project and the same admin password — log in once with the same password you use on the pricelist site.

## 1. Set up Firebase

Use the **same Firebase project** as your pricelist app — don't create a new one. This is what lets the admin password and (optionally) data stay connected.

Update your Firestore rules to also allow the `nota` collection:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /pricelist/main {
      allow read: if true;
      allow write: if true;
    }
    match /pricelist/guides {
      allow read: if true;
      allow write: if true;
    }
    match /nota/data {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

As before, this is a convenience-level lock (protected by password inside the app), not real authentication. Since this page holds real financial/customer data, if that ever needs tightening, that's the first thing to upgrade — Firebase Authentication with a proper `request.auth != null` check.

## 2. Configure the project

```bash
cp .env.example .env
```

Paste in the **same Firebase config values** you used for the pricelist app.

## 3. Run locally

```bash
npm install
npm run dev
```

Log in with your existing admin password (the one set on the pricelist site — check there if you've forgotten it, or reset it from the Settings tab here once logged in).

## 4. Deploy to its own subdomain

1. Push this folder to its **own GitHub repo** (separate from the pricelist repo).
2. In Cloudflare: Workers & Pages → Create → Pages/Workers → Connect to Git → pick this repo.
   - Build command: `npm run build`
   - Output directory: `dist`
3. Add the same `VITE_FIREBASE_*` environment variables as your pricelist project.
4. Deploy, then go to the project's **Domains** tab → Add Domain → enter `nota.xiao-qi.my.id` (or whatever subdomain you want). Since `xiao-qi.my.id` is already on Cloudflare, this works the same way your pricelist custom domain did.

## How the data model works

Everything lives in one Firestore document (`nota/data`):

- **`settings`** — your dropdown option lists: platforms (Kode), apps (Aplikasi), plans, durations (with day-counts for warranty math), and suppliers (First Hand, with a saved contact). All fully editable from the **Settings tab** — add, rename, recolor, or delete any option, and every dropdown updates immediately. No code changes ever needed for this.
- **`orders`** — each order: date, customer, the dropdown selections above, account/password, sell price, cost price, notes, and a delivered/pending flag.

**Profit** (`Harga Jual − Harga Beli`) is never typed in — it's always computed live, in the form, on each order row, and in every dashboard total.

**Warranty status** is computed from the order date + the selected duration's day-count:
- No days set (e.g. "Lifetime") → always active
- Days remaining > 2 → active
- Days remaining ≤ 2 → "expiring soon" (shows in Reminders)
- Past the expiry date → "expired" (shows in Reminders)

## Reminders

There's no backend cron job or push-notification service wired up, so reminders work as an **in-app panel** on the Dashboard: any order expiring within 2 days or already expired shows up there automatically whenever you open the app. If you want actual push/WhatsApp/email reminders sent proactively (not just visible when you open the app), that needs an extra service — happy to help set that up later if it'd be useful.

## Import / Export

- **Export**: downloads all orders as a real `.xlsx`, with columns matching your original sheet (Tanggal Order, Nama Customer, Kode, Keterangan, Aplikasi, Plan, Durasi, Data Akun, Password, First Hand, Contact FH, Harga Jual, Harga Beli, Keuntungan, Catatan).
- **Import**: `.xlsx`/`.csv` upload, a published Google Sheet CSV link, or pasted cells. Any platform/app/plan/supplier value in the imported rows that doesn't already exist in your dropdown lists is **added automatically** — so bulk-importing a new batch of orders also grows your option lists on the fly.

Note: this is one-way, file-based import/export — not a live two-way sync with a specific Google Sheet. True two-way sync would require Google's Sheets API with OAuth or a service account, which is a heavier setup; the current approach covers "move data in/out easily" without that complexity.
