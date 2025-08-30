# TikTok TechJam 2025 Project Submission - AI-Powered Short Video Recommendation Platform

## Project Overview

This project is an advanced short-video recommendation platform that combines federated machine learning with a TikTok-style user interface. The project implements a full-stack solution featuring video content processing, personalized recommendations, and interactive user experiences across mobile and web platforms.

## Core Problem Statement

The project addresses the challenge of creating personalized video recommendations in a privacy-preserving manner while maintaining an engaging user experience. It demonstrates how federated learning can be applied to video recommendation systems without centralized data collection, allowing users to receive personalized content while keeping their interaction data locally.

## Key Features

### Frontend Features
- **Trust Graph Visualization**: Interactive SVG-based network graph showing client trust relationships
- **Enhanced Embedding Visualization**: PCA-based 2D projection of high-dimensional video embeddings
- **Real-time Analytics Dashboard**: Live visualization of ML model performance and client trust metrics
- **Advanced SVG Animations**: Gradient effects, pulsing animations, and interactive graph elements
- **Vertical Video Feed**: Full-screen videos with snap paging and smooth scrolling
- **Auto-Play System**: Current video plays automatically, others pause intelligently  
- **Interactive Gestures**: Double-tap to like with animated heart burst effects
- **Comments System**: Bottom sheet interface with real-time commenting
- **Personalized Recommendations**: ML-driven content suggestions based on user interactions
- **Analytics Dashboard**: Visual representation of user preferences and ML model insights
- **Pause/Play Controls**: Single-tap video controls with visual feedback
- **Real-time Updates**: Live synchronization of likes, comments, and user interactions

### Backend Features
- **Trust Graph System**: NetworkX-based client reliability tracking with dynamic trust scoring
- **Trust-Weighted Federated Learning**: Model aggregation weighted by client trust scores for robust learning
- **Noisy Client Detection**: Automatic identification and mitigation of unreliable participants
- **Advanced Graph Analytics**: Real-time trust relationship visualization and monitoring
- **Federated Learning System**: Privacy-preserving ML model training across distributed clients
- **Differential Privacy**: Gaussian noise addition, weight clipping, and random subsetting for client privacy
- **Privacy-Preserving Weight Vectors**: Client embeddings stored locally with privacy-preserving techniques
- **Randomized Recommendations**: 20% randomness injection in recommendations to prevent filter bubbles
- **Video Processing Pipeline**: Automated video compression, frame extraction, and embedding generation
- **Vector Similarity Matching**: CLIP-based video embeddings for content understanding
- **Real-time Recommendations**: FastAPI endpoints for personalized video suggestions
- **Supabase Integration**: Cloud storage and database management for videos and metadata

## Development Tools and Technologies

### Frontend Stack
- **Framework**: React Native with Expo (v53.0.22)
- **Navigation**: Expo Router with typed routes
- **State Management**: Zustand for global state
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Video Player**: Expo-AV for optimized video playback
- **Animations**: React Native Reanimated v3 for smooth UI transitions
- **Gestures**: React Native Gesture Handler for touch interactions
- **UI Components**: Custom components with BlurView and LinearGradient effects
- **Visualizations**: React Native SVG (v15.11.2) for advanced graph rendering and animations

### Backend Stack
- **API Framework**: FastAPI with automatic OpenAPI documentation
- **ML Libraries**: TensorFlow 2.20.0, PyTorch 2.8.0, OpenAI CLIP
- **Graph Analytics**: NetworkX (v3.x) for trust graph operations and network analysis
- **Visualization**: Matplotlib (v3.10.6) for scientific plotting and graph visualization
- **Video Processing**: FFmpeg, OpenCV for video manipulation
- **Database**: Supabase (PostgreSQL) with real-time subscriptions
- **Storage**: Supabase Storage for video hosting and delivery

### Development Environment
- **TypeScript**: Full type safety across frontend
- **Python**: Backend API and ML pipeline
- **Metro Bundler**: React Native build system
- **ESLint**: Code quality and consistency
- **Prettier**: Automatic code formatting

## APIs and External Services

### Supabase APIs
- **Database**: PostgreSQL for videos, comments, and user interactions
- **Storage**: Cloud storage for video files with CDN delivery
- **Real-time**: WebSocket connections for live updates
- **Authentication**: User management (ready for implementation)

### Custom Backend APIs
- **Recommendation Engine**: `/recommend` - Personalized video suggestions
- **Model Management**: `/get_global_model`, `/update_model` - Federated learning coordination  
- **Trust Management**: `/trust_graph` - Real-time client trust relationship data and network analysis
- **User Analytics**: `/user_vector` - Client preference vectors for personalization insights
- **Health Monitoring**: `/docs` - API documentation and health checks
- **Local Processing**: `/local/*` - Device-specific ML operations

### Third-party Integrations
- **OpenAI CLIP**: Video content understanding and embedding generation
- **Expo Services**: Development tooling, over-the-air updates, and device testing

## Assets and Media

### Video Content
- **Processed Videos**: Compressed 1080p MP4 files optimized for mobile streaming
- **Thumbnails**: Auto-generated preview frames for video cards
- **Duration**: 5-second clips for optimal engagement

### Visual Assets
- **App Icons**: iOS and Android adaptive icons
- **Splash Screens**: Custom loading screens with branding
- **UI Elements**: Custom emoji-based interaction buttons (hearts, comments)

## Libraries and Dependencies

### Core Dependencies
- **@supabase/supabase-js** (v2.56.1): Database and storage integration
- **@tensorflow/tfjs** (v4.22.0): Client-side machine learning
- **@react-navigation/native** (v7.1.6): Navigation framework
- **@gorhom/bottom-sheet** (v5.2.4): Modal interfaces
- **axios** (v1.11.0): HTTP client for API requests
- **react-native-svg** (v15.11.2): Advanced SVG graphics and animations for data visualization

### ML and Data Processing
- **numpy** (v2.3.2): Numerical computing
- **tensorflow** (v2.20.0): Machine learning framework  
- **torch** (v2.8.0): PyTorch for advanced ML operations
- **networkx** (v3.x): Graph theory and complex network analysis for trust relationships
- **matplotlib** (v3.10.6): Scientific plotting and graph visualization backend
- **opencv-python**: Computer vision and video processing
- **ffmpeg-python**: Video encoding and manipulation

### Development Dependencies
- **eslint** (v9.25.0): Code linting and quality
- **typescript** (v5.8.3): Type checking and development experience
- **tailwindcss** (v3.4.17): Utility-first CSS framework

## Architecture Overview

### Frontend Architecture
```
src/
├── screens/
│   ├── FeedScreen.tsx          # Main video feed with infinite scroll
│   └── AnalyticsScreen.tsx     # ML insights and user preferences  
├── components/
│   ├── VideoCard.tsx           # Individual video player with interactions
│   ├── CommentsSheet.tsx       # Bottom sheet comments interface
│   ├── LoadingSpinner.tsx      # Animated loading states
│   ├── TrustGraph.tsx          # Interactive trust network visualization
│   └── EmbeddingGraph.tsx      # PCA-based video embedding visualization
├── lib/
│   ├── feed.ts                 # Video data fetching and caching
│   ├── api.ts                  # Backend API communication
│   ├── supabase.ts             # Database client configuration
│   └── ml.ts                   # Client-side ML operations
├── state.ts                    # Global state management with Zustand
└── types.ts                    # TypeScript type definitions
```

### Backend Architecture
```
backend/
├── main.py                     # FastAPI application and federated learning coordinator
│                              # - Trust-weighted model aggregation
│                              # - 20% randomness in recommendations  
│                              # - Client weight vector storage
├── model.py                    # Binary MLP neural network definition
├── trust_graph_utils.py        # NetworkX-based trust graph operations and client scoring
├── local_api.py                # Device-specific API endpoints with differential privacy
│                              # - Weight clipping (L2 norm ≤ 1.5)
│                              # - Gaussian noise addition (σ=0.1)
│                              # - Random weight subsetting (90% retention)
├── config.py                   # Environment configuration
└── requirements.txt            # Python dependencies

videovector/
├── vector.py                   # CLIP-based video processing pipeline
└── config.py                   # Video processing configuration

federated/
├── trainer.py                  # Federated learning training algorithms
├── mlp_model.py               # Keras model architecture
└── utils.py                    # ML utility functions
```

## Machine Learning Pipeline

### Federated Learning System
1. **Local Training**: Each client trains on their interaction data locally
2. **Trust-Based Aggregation**: Server combines client updates weighted by trust scores for robust learning
3. **Dynamic Trust Scoring**: Client reliability tracked through validation accuracy and contribution quality
4. **Noisy Client Mitigation**: Automatic detection and de-weighting of unreliable or malicious participants
5. **Privacy Preservation**: Raw user data never leaves the device
6. **Personalization**: Global model provides personalized recommendations with improved robustness

### Privacy-Preserving Features
1. **Differential Privacy Implementation**:
   - **Weight Clipping**: L2 norm clipping (max norm: 1.5) prevents gradient explosion attacks
   - **Gaussian Noise Addition**: Random noise (σ=0.1) added to model weights before transmission
   - **Random Subsetting**: Only 90% of weights transmitted (10% zeroed out) for additional privacy
2. **Client Weight Vector Storage**: User preference vectors (16-dimensional embeddings) kept locally
3. **Recommendation Randomness**: 20% of recommendations are randomly selected to prevent filter bubbles and enhance exploration

### Video Understanding
1. **Content Extraction**: CLIP embeddings capture video semantic content
2. **User Profiling**: Implicit feedback from likes/dislikes builds preference vectors
3. **Similarity Matching**: Cosine similarity between user and video embeddings
4. **Dynamic Updates**: Real-time model updates based on user interactions

### Trust Graph Analytics
1. **Network Construction**: Dynamic graph creation with clients as nodes and trust relationships as edges
2. **Trust Score Evolution**: Continuous updates based on validation accuracy and model contribution quality
3. **Graph Visualization**: Real-time SVG-based network visualization showing trust relationships
4. **Anomaly Detection**: Identification of outlier clients through graph-based analysis

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Python 3.9+
- Expo CLI
- iOS Simulator (for iOS development) or Android Studio (for Android)

### Frontend Setup
```bash
cd Frontend
npm install
expo start
```

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Video Processing Setup
```bash
cd videovector
pip install -r requirements.txt
python vector.py
```

## Testing Checklist
- [ ] Auto-play on launch
- [ ] Snap paging (swipe up/down)  
- [ ] Double-tap like with heart burst
- [ ] Comments sheet open/close
- [ ] Only current video plays
- [ ] Smooth 60fps performance
- [ ] ML recommendations update after interactions
- [ ] Trust graph visualization displays client relationships
- [ ] Embedding graph shows video similarity clustering
- [ ] Real-time trust scores update in analytics dashboard

This comprehensive platform demonstrates the practical application of advanced federated learning with trust management in content recommendation systems, showcasing cutting-edge distributed ML techniques while maintaining a polished, production-ready user experience that rivals commercial social media applications.