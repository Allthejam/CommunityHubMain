# Guest Book Enhancements & Layout Fixes

## Goal Description
The user wants several improvements and fixes:
1. **Filter star selection bug** – currently only 1‑star can be selected in the filter sheet; need to enable 2‑5 stars.
2. **Mock data with images** – add a placeholder image to the mock guest‑book entries and ensure this data is used on the Guest Book page.
3. **Header/Footer missing on Guest Book page** – the page should render within the standard app layout so navigation works.
4. **Wider carousel on home page** – on large screens the carousel should occupy up to 75 % of the viewport width (or max‑width).

## User Review Required
> [!IMPORTANT] Ensure the new mock image URL is publicly accessible (e.g., via `https://picsum.photos/seed/.../400/300`). The user may prefer a different placeholder – confirm if needed.

## Open Questions
- Do you want a specific placeholder image (brand‑specific) or is a random image from `picsum.photos` acceptable?
- Should the carousel width be set via a Tailwind utility (`max-w-3xl`, `w-3/4`) or custom CSS?

## Proposed Changes
---
### Guest Book Component (`src/components/guest-book.tsx`)
- Fix star filter UI: replace the single `Checkbox` per star with a group of toggles allowing multiple selections.
- Update `defaultFilters` to allow an empty `stars` array meaning "all".
- Adjust filter logic to handle multiple selected stars.
- Add a mock image URL to each entry in `MOCK_ENTRIES` (use `https://picsum.photos/seed/<id>/400/300`).
- Export `MOCK_ENTRIES` so the Guest Book page can import and display them when Firestore has no data.

### Guest Book Page (`src/app/guestbook/page.tsx`)
- Wrap the page content with the shared layout component (e.g., `AppLayout` or `MainLayout` used by other pages) so header/footer appear.
- Import the `MOCK_ENTRIES` and use them as fallback data when Firestore is empty.

### Layout Fix (`src/app/layout.tsx` or equivalent)
- Ensure `app/guestbook/page.tsx` is placed under the same `(main)` route group so Next.js applies the global layout. If needed, move the file to `src/app/(main)/guestbook/page.tsx`.

### Home Carousel Width (`src/components/guest-book.tsx` in carousel usage on home page)
- Add a responsive container with `max-w-screen-xl mx-auto w-full` and on large screens set `w-3/4` (75 %).
- Adjust Tailwind classes accordingly.

---
## Verification Plan
### Automated Tests
- Run `npm run dev` and verify the home page carousel expands to ~75 % width on desktop.
- Open the Guest Book page and confirm header/footer navigation are present.
- Open the filter sheet and verify that clicking any star toggles its checkbox; multiple stars can be selected simultaneously.
- Verify that mock entries display an image thumbnail.

### Manual Verification
- Visually inspect the carousel on different screen sizes.
- Test filter behavior with various star combinations.
- Navigate to Guest Book page via the Engage menu and confirm back/forward navigation works.
- Ensure image upload still functions (no regression).
