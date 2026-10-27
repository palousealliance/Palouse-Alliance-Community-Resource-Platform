# Palouse Alliance Community Resource Platform

## Project Summary

### One-sentence description
A community-focused React web application that organizes Palouse area events, organizations, and volunteer opportunities into a searchable, accessible hub for local health, wellness, and community resources.

### Additional information about the project
The Palouse Alliance Community Resource Platform is a React + Vite web application built to make local health, wellness, and community event resources easier to find and use across the Palouse region. It centralizes event and organization information, offers search and category-based discovery, and helps local organizations share updates through a community-facing platform.

The platform is intended to support a range of community members, including students, families, seniors, veterans, and individuals seeking housing support, food assistance, mental health services, or community programs. The app emphasizes accessibility, responsive layout, and a clean search-driven experience so people can quickly find relevant events and organizations.

**Key Features:**
- Public events calendar with category filtering and event search
- Organization directory with search and contact summaries
- Login/logout flow using Supabase authentication
- Protected dashboard area for authenticated users
- Multi-step event posting experience
- Mobile-friendly navigation and responsive layout
- Real-time data synced with Supabase backend

## Installation

### Prerequisites
- Node.js 24.x
- npm 10+ or yarn 4+
- Git 2.0+

### Add-ons
The following packages and dependencies are included in this project:

| Package | Purpose |
|---------|---------|
| React 19 | UI library and component framework |
| Vite | Fast build tool and development server |
| React Router DOM | Client-side routing between pages |
| Supabase JavaScript Client | Backend authentication, database, and file storage |
| ESLint | Code quality and style linting |
| Vitest | Unit and component testing framework |

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/vdevaa/Palouse-Alliance-Community-Resource-Platform.git
   cd Palouse-Alliance-Community-Resource-Platform
   ```

2. **Navigate to the application directory:**
   ```bash
   cd code
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Configure environment variables:**
   - Create a `.env` file in the `code/` directory
   - Add the following required variables:
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     SUPABASE_URL=your_supabase_url
     SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
     ```
   - Optional: Set `VITE_API_BASE` if using a custom API endpoint (leave blank for same-origin API calls)

5. **Start the development server:**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`

6. **Verify the installation:**
   ```bash
   npm run test
   ```

### Building for Production

From the `code/` directory:
```bash
npm run build      # Build production assets
npm run preview    # Preview the production build locally
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite development server with HMR |
| `npm run build` | Build production assets to `dist/` folder |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint to check code quality |
| `npm run test` | Run Vitest test suite once |
| `npm run test:watch` | Run Vitest in watch mode for development |
| `npm run test:coverage` | Generate test coverage report |

### Supabase Configuration

The project uses Supabase for authentication, data storage, and file management. Configuration is handled in `code/src/lib/supabase.js`:

- The client reads configuration from environment variables:
  - `VITE_SUPABASE_URL` - Your Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous public key

To connect to your own Supabase instance, update these variables in your `.env` file.

### Vercel Deployment

1. Import the repository into Vercel
2. Set the project root to `code/`
3. Set the Node.js version to 24.x in your deployment environment or use the `code/package.json` engines setting
4. Configure build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
5. Add all environment variables in Vercel Project Settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - Optional: `VITE_API_BASE`
6. The included `code/vercel.json` routes `/api/*` to serverless functions and all other routes to the SPA entrypoint

## Functionality

### Application Overview

The Palouse Alliance Community Resource Platform provides the following core functionality:

**Home Page (`/`)**
- Displays all approved community events in an interactive calendar view
- Search functionality to filter events by keyword
- Category-based filtering for event discovery
- "My Events" sidebar for authenticated users to track submitted events
- Real-time data loaded from the `events` Supabase table

**Events Calendar**
- Visual calendar representation of community events
- Date-based navigation and filtering
- Event details displayed in expandable cards
- Color-coded categories for quick identification

**Organizations Directory (`/organizations`)**
- Searchable directory of local organizations and resources
- Organization cards with contact information summaries
- Real-time data loaded from the `organizations` Supabase table
- Filter and sort by category and name

**Authentication & User Dashboard**
- Secure login using Supabase password authentication (`/login`)
- User registration page placeholder for future signup flow (`/register`)
- Protected dashboard area for authenticated users (`/dashboard`)
- Persistent session management via Supabase auth

**Event Posting (`/post-event`)**
- Multi-step form for community members to submit new events
- Step 1: Event title and description
- Step 2: Date, time, and location details
- Step 3: Optional event flyer/image upload
- Form validation and error handling
- Submitted events await admin approval before public display

**Admin Interface (`/admin`)**
- Placeholder page for admin dashboard functionality
- Intended for event approval, user management, and analytics

### Core Features

- **Search & Filtering:** Find events and organizations by keyword, category, or date
- **Event Management:** Submit, track, and manage community events
- **Mobile Responsive:** Full functionality on desktop, tablet, and mobile devices
- **Accessible Design:** WCAG-compliant layout and navigation
- **Real-time Updates:** Data synchronized with Supabase backend

### Directory Structure

- `code/` - Main web application source code
- `code/src/` - React components, pages, and Supabase client setup
  - `components/` - Reusable React components
  - `pages/` - Page/route components
  - `lib/` - Utility libraries and configurations
  - `styles/` - Component-specific CSS files
  - `test/` - Test configuration and utilities
- `Reports/` - Project reports and documentation
- `Sprints/` - Sprint plans, meeting minutes, and sprint reports
- `coverage/` - Test coverage reports

## Known Problems

There are currently no known critical issues in this repository. However, the following features are noted as placeholders for future enhancement:

- `/register` - User registration flow is not yet fully implemented
- `/dashboard` - Protected dashboard route exists but lacks specific user-facing features
- `/admin` - Admin interface is a placeholder and requires full development

If you encounter any bugs or issues, please document them with:
- Steps to reproduce
- Expected vs. actual behavior
- Browser and OS information
- Relevant error messages or console logs

## Contributing

We welcome contributions to the Palouse Alliance Community Resource Platform! To contribute:

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

**Before submitting a pull request:**
- Ensure all tests pass: `npm run test`
- Run linter: `npm run lint`
- Update relevant documentation
- Follow the existing code style and conventions

## Additional Documentation

- [Sprint Reports](Reports/) - Project sprint documentation and progress reports
- [Sprint Meetings and Planning](Sprints/) - Sprint plans, meeting notes, and deliverables
- [Course Reports](Reports/CptS421_Report/) - Academic project reports
- [Senior Capstone Documentation](Reports/CptS423_Report/) - Senior capstone project files

## License

This project is licensed according to the terms in the license, see [LICENSE](LICENSE) file for the full text of the license and terms of use.
