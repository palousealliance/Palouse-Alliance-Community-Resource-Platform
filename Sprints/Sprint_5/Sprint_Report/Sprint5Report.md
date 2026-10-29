# Sprint 5 Report (10/01/2026 to 10/31/2026)
## YouTube link of Sprint Video
[Sprint 5 Video](INSERT)

## What's New (User Facing)
* **Event Card Thumbnails**: Events with flyers now display miniature flyer preview thumbnails directly on their event cards, improving readability and visual discovery when browsing events.
* **New History Tab**: Added a dedicated History page accessible via the navigation bar and home page, allowing community members to view the history of the Palouse Alliance and enabling administrators to upload updated history documents.
* **Organization Details Event Count Fix**: Corrected the event counter on organization profile pages to accurately reflect only approved events, rather than incorrectly summing both pending and approved events.
* **Event Calendar Month Filtering Fix**: Fixed an issue where the event calendar displayed all scheduled events at once; the calendar now accurately filters and shows only events occurring in the currently selected month.
* **UI & CSS Formatting Improvements**: Resolved visual styling glitches, including preventing browser scrollbars from displaying over darkened modal dialog overlays and removing inappropriate gradient styling from the home page history card.
* **Beta Testing Rollout**: Began user beta testing using client-provided user accounts and organization rosters to collect early usability feedback.

## Work Summary (Developer Facing)
This sprint focused on delivering newly requested client features, addressing high-priority UI and data filtering bugs, integrating document storage workflows, and launching user beta testing. 

On the frontend, we developed the dedicated History page ([`History.jsx`](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/blob/main/code/src/pages/History.jsx)) with responsive document viewing, direct download capabilities, and administrative upload controls. We created the event flyer preview system ([`EventCard.jsx`](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/blob/main/code/src/components/EventCard.jsx), [`PdfFlyerBackground.jsx`](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/blob/main/code/src/components/PdfFlyerBackground.jsx)) to render flyer thumbnails on event cards. We refactored event filtering in [`Events.jsx`](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/blob/main/code/src/pages/Events.jsx) and [`EventCalendar.jsx`](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/blob/main/code/src/components/EventCalendar.jsx) so the calendar strictly displays events within the active selected month, and updated [`dateTime.js`](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/blob/main/code/src/lib/dateTime.js) and [`Organizations.jsx`](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/blob/main/code/src/pages/Organizations.jsx) to filter event counts strictly by approved status. Additionally, we addressed modal z-index and styling inconsistencies across the CSS stylesheets, prevented unauthorized event submissions by unaffiliated users, and eliminated admin dashboard re-entry flashing through background role verification in [`App.jsx`](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/blob/main/code/src/App.jsx).

On the backend and database side, we extended [`supabase.js`](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/blob/main/code/src/lib/supabase.js) with storage bucket integration and access policies to handle official history document uploads and public retrieval. We updated the database schema and traceability documentation to reflect system enhancements, media upload verification, and scheduled retention execution. Comprehensive automated unit and integration tests were added and maintained across all modified components. Our automated GitHub Actions CI/CD pipeline continues to validate linting, run test suites, and deploy live staging builds to Vercel on each commit and pull request. In consultation with our client during our October 14 meeting, the previously considered FAQ page was formally removed from scope.

## Unfinished Work
We finished everything we were hoping to for this sprint! Based on client consultation with Christine Oakley during the October 14 meeting, the planned FAQ page was officially cancelled and removed from the project scope to prioritize the History tab and key user experience fixes.

## Completed Issues/User Stories
Here are links to the issues that we completed in this sprint:
* [Organizations Page Details Bug](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/issues/66)
* [New History Tab on Website](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/issues/68)
* [Event Calendar Bug](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/issues/69)
* [.css Formatting Issues](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/issues/70)
* [Event Card Thumbnails](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/issues/62)

## Code Files for Review
Please review the following code files, which were actively developed during this sprint, for quality:
* [History.jsx](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/blob/main/code/src/pages/History.jsx): Contains the new History page interface, including Palouse Alliance history flyer viewing and administrative document upload controls.
* [History.test.jsx](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/blob/main/code/src/pages/History.test.jsx): Unit and integration tests covering History page rendering and administrative upload workflows.
* [EventCard.jsx](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/blob/main/code/src/components/EventCard.jsx): Component rendering event cards, updated to display mini flyer thumbnails and improved action button formatting.
* [PdfFlyerBackground.jsx](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/blob/main/code/src/components/PdfFlyerBackground.jsx): Helper component for rendering PDF-based flyer preview thumbnails on event cards.
* [Events.jsx](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/blob/main/code/src/pages/Events.jsx): Event browsing page updated to fix calendar month filtering and enforce event creation permission checks.
* [Organizations.jsx](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/blob/main/code/src/pages/Organizations.jsx): Organization profile view updated to accurately count approved events.
* [supabase.js](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/blob/main/code/src/lib/supabase.js): Extended with storage bucket API integration for uploading and retrieving the official history document.
* [App.jsx](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/blob/main/code/src/App.jsx): Main application routing and session handling, updated with the History route and background role verification to eliminate admin flashing.
* [/styles](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/tree/main/code/src/styles): Updated styling files including [History.css](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/blob/main/code/src/styles/History.css), [EventCard.css](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/blob/main/code/src/styles/EventCard.css), [Landing.css](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/blob/main/code/src/styles/Landing.css), and [Popup.css](https://github.com/palousealliance/Palouse-Alliance-Community-Resource-Platform/blob/main/code/src/styles/Popup.css).

## Retrospective Summary
Here's what went well:
* Bi-weekly meetings were enough to get feedback and have time for us to work.
* Members attended every meeting on time, and were cooperative when rescheduling was needed.
* Rapid implementation and turnaround on newly requested client features, such as delivering the new History tab within two weeks of the client request.

Here's what we'd like to improve:
* We received minimal feedback from our initial beta testing list. In the future, we will provide feedback forms to testers to get more detailed reports.

Here are changes we plan to implement in the next sprint:
* Change Vercel Domain (Migrating from Vercel staging URL to the client's official custom domain)
* Update robots.txt and other crawler restrictions to ensure the site is searchable on Google and other search engines
* Disable Physical Location as a Requirement in Post Event Flow
* Implement feedback and quality-of-life changes as more reports come in from beta testers
