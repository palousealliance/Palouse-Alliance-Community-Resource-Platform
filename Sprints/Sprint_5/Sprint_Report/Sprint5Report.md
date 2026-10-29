# Sprint 4 Report (08/24/2026 to 09/30/2026)
## YouTube link of Sprint Video
[Sprint 4 Video](https://youtu.be/6Ck36kUL_XE)

## What's New (User Facing)
* Organization members can now see clear instructions on how to request changes to their organization's details via an administrator.
* We onboarded 50 partner organizations and members directly into the platform from the client-provided list.
* Visitors and members can view full event details alongside approved event flyers, including location, time, and host information.
* Administrators can preview pending event submissions and flyers before deciding to approve or reject them for public display.
* Events older than one month are now automatically purged from the platform to maintain database efficiency, and public event browsing is focused on the next three months.

## Work Summary (Developer Facing)
We focused this sprint on data onboarding, flyer asset lifecycle workflows, and automated database retention policies. On the front end, we implemented member-facing steps on the organization page detailing how to request profile updates from admins. We also developed the event and flyer viewing interface to cleanly render uploaded flyer images, locations, times, hosts, and descriptive event metadata. In addition, we built out the admin preview view for pending event submissions to allow moderators to inspect flyers and event information before approving or rejecting them for public listing.

On the backend, we processed and registered 50 organizations and 150 member accounts into the database from the client roster. We finalized the cloud storage and retrieval pipeline for flyer assets, ensuring uploaded media correctly links to pending event records and displays upon approval. To optimize Supabase storage and resource usage, we established automated event retention logic that deletes events older than 30 days and restricts queries to prevent users from viewing events scheduled more than three months in advance. The platform remains stable, performant, and prepared for our upcoming sprint focus on notifications, FAQ content, domain adjustments, and post-event requirements.

## Unfinished Work
We finished everything we were hoping to for this sprint!

## Completed Issues/User Stories
Here are links to the issues that we completed in this sprint:
* [Members See Steps on How to Edit Their Org](https://github.com/vdevaa/Palouse-Alliance-Community-Resource-Platform/issues/9)
* [Register Members / Orgs to Platform from Client List](https://github.com/vdevaa/Palouse-Alliance-Community-Resource-Platform/issues/29)
* [Finalizing Flyer Storage and Retrieval](https://github.com/vdevaa/Palouse-Alliance-Community-Resource-Platform/issues/35)
* [View Flyers](https://github.com/vdevaa/Palouse-Alliance-Community-Resource-Platform/issues/8)
* [Event Retention (in Supabase)](https://github.com/vdevaa/Palouse-Alliance-Community-Resource-Platform/issues/49)

## Code Files for Review
Please review the following code files, which were actively developed during this sprint, for quality:
* [App.jsx](https://github.com/vdevaa/Palouse-Alliance-Community-Resource-Platform/blob/main/code/src/App.jsx): Contains the main logic like website URL forwarding and management, who is logged in, and caching.
* [App.test.jsx](https://github.com/vdevaa/Palouse-Alliance-Community-Resource-Platform/blob/main/code/src/App.test.jsx): The file containing tests for [App.jsx](https://github.com/vdevaa/Palouse-Alliance-Community-Resource-Platform/blob/main/code/src/App.jsx).
* [theme.css](https://github.com/vdevaa/Palouse-Alliance-Community-Resource-Platform/blob/main/code/src/theme.css): Contains the main theming for the platform, all aspects of the UI reference this styling in some way.
* [/styles](https://github.com/vdevaa/Palouse-Alliance-Community-Resource-Platform/tree/main/code/src/styles): Contains all of the .css styling for all pages.
* [/pages](https://github.com/vdevaa/Palouse-Alliance-Community-Resource-Platform/tree/main/code/src/pages): Contains the code for all of the pages, supported by components and tests.
* [/components](https://github.com/vdevaa/Palouse-Alliance-Community-Resource-Platform/tree/main/code/src/components): Contains reusable components like the footer, navbar, popup, and event card/calendar.

## Retrospective Summary
Here's what went well:
* Bi-weekly meetings were enough to get feedback and have time for us to work.
* Members attended meetings on time, and were cooperative when rescheduling was needed.

Here's what we'd like to improve:
* We all got our tasks done and more, there isn't anything we can do to improve becuase we got more than expected done and worked well together.

Here are changes we plan to implement in the next sprint:
* Email Notifications
* Add FAQ Page or Section
* Change Vercel Domain
* Disable Physical Location as a Requirement in Post Event Flow
