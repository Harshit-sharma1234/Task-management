# Dashboard Prefetching Strategy

To achieve a "Linear-style" zero-latency experience, we need to move beyond standard Next.js route prefetching and implement granular, intent-driven data prefetching. 

Based on the architecture of your task management dashboard, here is the recommended three-tier prefetching strategy:

## 1. Intent-Based Route Prefetching (The Next.js Layer)

Currently, your `Sidebar.tsx` effectively uses `prefetch={false}` combined with an `onMouseEnter` trigger to prefetch routes dynamically. This should be expanded to all interactive lists.

*   **Overview Widgets**: In `Overview.tsx`, the lists for "Recent Issues" and "Project Overview" use standard `<Link>` components. You should wrap these in the same `onMouseEnter` mechanism used in the Sidebar to instruct Next.js to fetch the RSC (React Server Component) payload before the user clicks.
*   **List-to-Detail Flow**: When hovering over any row in `/dashboard/projects` or `/dashboard/issues`, `router.prefetch(href)` should fire automatically.

> [!TIP]
> **Implementation**: Create a reusable `<PrefetchLink>` component that wraps `next/link` and automatically handles intersection-observer or hover-based `router.prefetch()` to standardize this across the app without repeating `onMouseEnter` logic.

## 2. Predictive Data Prefetching (The Component Layer)

Route prefetching only partially solves latency for dynamic pages because Next.js primarily prefetches the static layout shell, not the dynamic data queries within the page.

*   **Debounced Hover Fetching**: Similar to what we implemented in `InboxClient.tsx`, when a user hovers over an Issue row in the `ProjectProgressPanel`, we should defensively pre-invoke the server action that fetches the issue details (comments, logs). 
*   **Top 3 Heuristic**: For lists that users almost always interact with (like "My Tasks" or the top items in the Inbox), automatically prefetch the data payload for the top 3 items immediately upon mount in the background.

## 3. Parallelization & Shared Cache (The Server Layer)

Your system uses `getCachedUsers()` and `getCachedStats()` powered by `unstable_cache` and `React.cache`. We need to ensure prefetching leverages this without creating thundering herds.

*   **Warm up the React Cache**: If a user navigates to `/dashboard/projects`, we should fetch the `getProjectList()` data. However, if they hover over a specific project, we should trigger a background fetch for `getProjectDetails(id)`. Because you use `React.cache`, if the user clicks 100ms later, the layout will simply resolve the *already-in-flight* Promise instead of starting a new one.
*   **Status/Dropdown Pre-warming**: When a user opens a `MemberSelector` or `StatusSelector`, the required metadata (e.g., all available users, tags) should already be in the browser's memory, fetched asynchronously when the parent modal/page was opened.

## Actionable Playbook for Your Project

If you want to implement this, here is the exact execution order to guarantee a seamless UI:

1.  **Refactor Links**: Create a custom `<HoverLink>` that standardizes `router.prefetch()` with a 50ms delay (to avoid accidental sweeps) and replace standard `<Link>` tags in `Overview.tsx` and the `issues`/`projects` tables.
2.  **Add Issue Detail Prefetching**: In the Project Details -> Issues Tab, add a debounced `onMouseEnter` event to the issue rows that silently calls `fetchEntityDetailAction` and caches the result.
3.  **Dropdown Hydration**: Update `MemberSelector` and `StatusSelector` to receive pre-fetched data from their parents instead of fetching their own data on click. (We recently did this for `CreateProjectButton`).

> [!IMPORTANT]
> Be careful not to aggressively prefetch data on mobile devices or slow connections. You should wrap predictive data prefetching in a check for `navigator.connection.saveData`.
