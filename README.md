# Career Resources Hub

A modern, interactive web application for browsing and accessing career development resources organized by month and session. Built with React, TypeScript, and Tailwind CSS.

## 🚀 Features

- **4-Month Curriculum**: Comprehensive career development program covering:
  - Month 1: Foundations (Self, Ownership & Communication)
  - Month 2: Career Positioning & Professional Identity
  - Month 3: Career Excellence & Growth Strategies
  - Month 4: Global Readiness & Future-Ready Skills

- **Resource Management**: Browse articles and videos organized by sessions
- **Interactive UI**: Beautiful dark-themed interface with smooth animations
- **Video Player**: Embedded YouTube/Vimeo player for video resources
- **Article Viewer**: Quick access to career development articles
- **Search & Filter**: Find resources by title, type, or content
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 📋 Prerequisites

- **Node.js**: v18 or higher
- **Package Manager**: pnpm (recommended, pre-configured) or npm/yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd career-resources-hub
   ```

2. **Install dependencies**
   
   Using pnpm (recommended, pre-configured):
   ```bash
   pnpm install
   ```
   
   Or using npm:
   ```bash
   npm install
   ```
   
   Or using yarn:
   ```bash
   yarn install
   ```

## 🏃 Running Locally

### Development Mode

Start the development server with hot-reload:

```bash
# Using pnpm (recommended)
pnpm dev

# Or using npm
npm run dev

# Or using yarn
yarn dev
```

The application will open at `http://localhost:3000` (or next available port).

### Production Build

Build the application for production:

```bash
pnpm build
```

Then start the production server:

```bash
pnpm start
```

### Preview Build

Preview the production build locally:

```bash
pnpm preview
```

## 📁 Project Structure

```
career-resources-hub/
├── client/              # Frontend React application
│   ├── public/         # Static assets
│   └── src/
│       ├── components/ # React components
│       │   ├── ui/    # shadcn/ui components
│       │   ├── ArticleViewer.tsx
│       │   ├── ErrorBoundary.tsx
│       │   └── VideoPlayer.tsx
│       ├── contexts/  # React contexts (Theme)
│       ├── data/      # Static data (resources.json)
│       ├── hooks/     # Custom React hooks
│       ├── lib/       # Utility functions
│       ├── pages/     # Page components
│       └── App.tsx    # Main app component
├── server/             # Express backend
│   └── index.ts       # Server entry point
├── shared/            # Shared types/constants
└── patches/           # Package patches
```

## 🎨 Key Technologies

- **Frontend**:
  - React 19.2
  - TypeScript 5.6
  - Tailwind CSS 4.1
  - Vite 7.1
  - shadcn/ui components
  - Wouter (routing)
  - Framer Motion (animations)

- **Backend**:
  - Express 4.21
  - Node.js ESM

- **Development**:
  - TypeScript strict mode
  - Prettier for code formatting
  - pnpm for package management (npm/yarn also work)

## 📝 Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` / `npm run dev` | Start development server with hot-reload |
| `pnpm build` / `npm run build` | Build for production (client + server) |
| `pnpm start` / `npm start` | Run production server |
| `pnpm preview` / `npm run preview` | Preview production build |
| `pnpm check` / `npm run check` | Run TypeScript type checking |
| `pnpm format` / `npm run format` | Format code with Prettier |

## 🎯 Usage

1. **Navigate through months**: Click on Month 1-4 in the sidebar to view different curriculum themes
2. **Select a session**: Click on any session card to view its resources
3. **Access resources**: Click on individual resources to open articles or play videos
4. **Search**: Use the search bar to find specific resources
5. **Filter**: Toggle between all resources, articles only, or videos only

## 🔧 Configuration

### Port Configuration

By default, the app runs on port 3000. To change:

1. Edit `vite.config.ts`:
   ```typescript
   server: {
     port: YOUR_PORT_NUMBER,
   }
   ```

2. Edit `server/index.ts`:
   ```typescript
   const port = process.env.PORT || YOUR_PORT_NUMBER;
   ```

### Theme Configuration

The app uses a dark theme by default. To change:

1. Edit `client/src/App.tsx`:
   ```typescript
   <ThemeProvider
     defaultTheme="light" // or "dark"
     switchable // Enable theme toggle
   >
   ```

2. Customize colors in `client/src/index.css`

## 📚 Adding Resources

To add or modify resources:

1. Edit `client/src/data/resources.json`
2. Follow the existing structure:
   ```json
   {
     "month": 1,
     "theme": "Your Theme",
     "sessions": [
       {
         "id": 1,
         "title": "Session Title",
         "resources": [
           {
             "type": "Core Article",
             "title": "Resource Title",
             "url": "https://..."
           }
         ]
       }
     ]
   }
   ```

## 🐛 Known Issues

- Article embedding is limited due to iframe restrictions on many sites
- Some videos may not be embeddable if they have restrictions
- Search is client-side only (no fuzzy matching)

## 🔮 Future Enhancements

- [ ] Backend API for dynamic resource management
- [ ] User authentication and progress tracking
- [ ] Bookmarking and favorites
- [ ] Enhanced search with fuzzy matching
- [ ] Admin panel for content management
- [ ] Analytics and usage tracking
- [ ] Export resources as PDF
- [ ] Social sharing features

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues or questions, please open an issue on the repository.

---

**Built with ❤️ for career development**
