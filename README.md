# Social-Book - Complete Social Media Platform 🚀

A comprehensive social media application with integrated AI assistant, ecommerce features, and real-time chat system.

## 🌟 Features

### 📱 Social Media Core
- **User Authentication**: Secure login/signup system
- **Profile Management**: User profiles with image uploads
- **Posts & Comments**: Create, like, and comment on posts
- **Real-time Chat**: One-on-one messaging with WebSocket support
- **Friends System**: Add and manage friends
- **Story Feature**: Share temporary stories

### 🤖 AI Assistant (Jarvis Integration)
- **Voice Commands**: Speak to your AI assistant
- **Web Search**: Get real-time search results
- **Weather Information**: Current weather updates
- **File Management**: Open files and applications
- **Window Control**: Manage desktop applications
- **Smart Responses**: Powered by OpenAI GPT

### 🛒 E-commerce Features
- **Product Catalog**: Browse products with detailed views
- **Shopping Cart**: Add items to cart
- **Checkout System**: Complete order processing
- **Order Management**: Track your orders

### 📨 Real-time Features
- **Live Chat**: Instant messaging with WebSocket
- **Unread Message Badges**: Visual notification system
- **Online Status**: See who's online
- **Typing Indicators**: Real-time typing feedback

## 🏗️ Architecture

### Backend (.NET Core)
```
backend/SocialMediaApi/
├── Controllers/          # API endpoints
├── Models/              # Data models
├── DTOs/               # Data transfer objects
├── Data/               # Database context
├── Services/           # Business logic
└── Hubs/              # SignalR hubs for real-time features
```

### Frontend (Angular)
```
frontend/src/app/
├── auth/               # Authentication components
├── home/               # Main dashboard
├── pages/              # Feature pages (chat, profile, etc.)
├── my-assistant/       # Jarvis AI integration
├── services/           # API services
└── core/              # Shared components and guards
```

### AI Assistant (Python)
```
Jarvis_Part_3/
├── jarvis_api_server.py    # Main API server
├── agent.py               # Core AI agent
├── Jarvis_*.py           # Feature modules
└── API_DOCUMENTATION.md  # Complete API docs
```

## 🚀 Quick Start

### Prerequisites
- **.NET 9.0 SDK**
- **Node.js 18+**
- **Python 3.10+**
- **SQL Server**

### 1. Clone Repository
```bash
git clone https://github.com/muhammadatif14/Social-Book.git
cd Social-Book
```

### 2. Setup Database
```bash
# Update connection string in appsettings.json
# Run the SQL scripts in the root directory
```

### 3. Start Backend API
```bash
cd backend/SocialMediaApi
dotnet restore
dotnet run
# Backend runs on http://localhost:5036
```

### 4. Start Frontend
```bash
cd frontend
npm install
ng serve --port 4201
# Frontend runs on http://localhost:4201
```

### 5. Start Jarvis AI (Optional)
```bash
cd Jarvis_Part_3/Jarvis_Part_3
pip install -r requirements.txt
python jarvis_api_server.py
# Jarvis API runs on http://localhost:8000
```

## 🔧 Configuration

### Backend Configuration
Update `appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=YOUR_SERVER;Database=socialBook;Trusted_Connection=true;TrustServerCertificate=true;"
  }
}
```

### Frontend Configuration
The frontend automatically connects to:
- Backend API: `http://localhost:5036`
- Jarvis API: `http://localhost:8000`

### AI Assistant Setup
1. Copy your API keys to Jarvis_Part_3/Jarvis_Part_3/.env:
```
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_google_key
WEATHER_API_KEY=your_weather_key
```

## 📊 API Endpoints

### Social Media API
- `POST /api/auth/login` - User authentication
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create new post
- `GET /api/chat/messages` - Get chat messages
- `POST /api/orders` - Place orders

### Jarvis AI API
- `GET /api/status` - Check AI status
- `POST /api/start` - Start AI agent
- `POST /api/chat` - Send message to AI
- `WebSocket /api/ws` - Real-time AI communication

## 🌐 Live Demo

Visit the application at: `http://localhost:4201`

### Demo Accounts
- Username: `demo` | Password: `demo123`
- Username: `test` | Password: `test123`

## 📱 Features Showcase

### Dashboard
![Dashboard Screenshot](frontend/public/dashboard-preview.png)
- Modern, responsive design
- Real-time updates
- Quick access to all features

### AI Assistant
![Jarvis Screenshot](frontend/public/jarvis-preview.png)
- Voice-activated commands
- Smart contextual responses
- 21+ integrated tools

### Chat System
![Chat Screenshot](frontend/public/chat-preview.png)
- Real-time messaging
- Unread message badges
- Typing indicators

## 🛠️ Development

### Adding New Features
1. **Backend**: Add controllers in `Controllers/`
2. **Frontend**: Create components in `src/app/pages/`
3. **AI**: Extend `Jarvis_Part_3/` modules

### Database Migrations
```bash
cd backend/SocialMediaApi
dotnet ef migrations add YourMigrationName
dotnet ef database update
```

### Running Tests
```bash
# Backend tests
dotnet test

# Frontend tests
npm test

# AI tests
python -m pytest
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **HTTPS Ready**: SSL/TLS support
- **Input Validation**: XSS and injection protection
- **CORS Configuration**: Controlled cross-origin requests
- **Secret Management**: Environment-based configuration

## 📦 Deployment

### Docker Support (Coming Soon)
```bash
docker-compose up -d
```

### Manual Deployment
1. Build frontend: `ng build --prod`
2. Publish backend: `dotnet publish -c Release`
3. Configure reverse proxy (nginx/IIS)
4. Set environment variables

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email muhammadatif14@example.com or create an issue on GitHub.

## 🙏 Acknowledgments

- Angular team for the amazing framework
- Microsoft for .NET Core
- OpenAI for GPT integration
- Bootstrap for UI components
- SignalR for real-time features

## 📈 Roadmap

- [ ] Mobile app (React Native)
- [ ] Video calling
- [ ] Advanced AI features
- [ ] Payment integration
- [ ] Content moderation
- [ ] Analytics dashboard

---

**Made with ❤️ by Muhammad Atif**

⭐ Star this repository if you found it helpful!
