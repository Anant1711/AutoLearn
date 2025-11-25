# AutoLearn Studio 🚗💻

**AutoLearn Studio** is an interactive, web-based platform designed to teach automotive protocols (CAN, UDS, LIN) through hands-on simulation. It provides a realistic environment to explore vehicle architectures, diagnose simulated faults, and understand network communication without needing physical hardware.

## 🌐 Live Demo

**Frontend**: [https://anant1711.github.io/AutoLearn/](https://anant1711.github.io/AutoLearn/)  
**Backend**: [https://autolearn-cwhp.onrender.com](https://autolearn-cwhp.onrender.com)

> **Note**: The backend is hosted on Render's free tier and may take 30-60 seconds to wake up on first connection.

---

## 🌟 Features

### 1. Interactive CAN Bus Simulator
-   **Virtual Cockpit**: Real-time Speedometer and RPM gauges.
-   **Physics Engine**: Simulate vehicle acceleration and braking dynamics.
-   **Traffic Monitor**: Watch raw CAN frames (ID, DLC, Data) stream in real-time.

### 2. UDS Diagnostics Playground
-   **Service Control**: Send standard UDS requests (ISO 14229).
    -   `0x10` Diagnostic Session Control
    -   `0x19` Read DTC Information
    -   `0x22` Read Data By Identifier (DID)
    -   `0x27` Security Access (Seed & Key)
-   **Flow Visualizer**: Chat-style interface to view Request/Response pairs and Negative Response Codes (NRCs).

### 3. Vehicle Architecture Explorer
-   **Visual Topology**: Interactive map of a modern vehicle network.
-   **Multi-Domain Support**: Powertrain, Chassis, Body, Infotainment, and ADAS.
-   **ECU Inspector**: Click on any node (e.g., ECM, BCM, Radar) to view its function and signals.

### 4. Educational Hub
-   **Tutorials**: Step-by-step guides on automotive protocols.
-   **Community**: Share scenarios and DBC files (Coming Soon).

---

## 🛠️ Tech Stack

-   **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Framer Motion.
-   **Backend**: Node.js, Express, Socket.io.
-   **Communication**: WebSocket (Real-time full-duplex communication).
-   **Deployment**: GitHub Pages (Frontend) + Render (Backend).

---

## 🚀 Getting Started

### Prerequisites
-   **Node.js** (v16 or higher)
-   **npm** (v8 or higher)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Anant1711/AutoLearn.git
    cd AutoLearn
    ```

2.  **Install Backend Dependencies**
    ```bash
    cd backend
    npm install
    ```

3.  **Install Frontend Dependencies**
    ```bash
    cd ../frontend
    npm install
    ```

### Running Locally

1.  **Start the Backend Server**
    ```bash
    cd backend
    npm start
    ```
    *Server runs on `http://localhost:3000`*

2.  **Start the Frontend Client** (in a new terminal)
    ```bash
    cd frontend
    npm run dev
    ```
    *Client runs on `http://localhost:5173`*

3.  **Open in Browser**
    Navigate to [http://localhost:5173](http://localhost:5173) to start learning!

---

## 📚 Usage Guide

### Simulator Tab
-   Use the **Accelerate** and **Brake** buttons to control the virtual car.
-   Observe the gauges and the scrolling **CAN Log** to see how user input translates to network data.

### Diagnostics Tab
-   Select a service (e.g., **Session**).
-   Click a sub-function (e.g., **Extended Session**).
-   Watch the **Diagnostic Flow** to see the `TX` (Transmit) and `RX` (Receive) messages.
-   Try **Security Access**: Request a Seed, then calculate and send the Key to unlock the ECU.

### Architecture Tab
-   Pan and zoom around the vehicle topology.
-   Identify different bus types by color (Red = High Speed CAN, Blue = Low Speed CAN).
-   Select an ECU to learn about its role in the vehicle.

---

## 🌐 Deployment

This project is deployed using a split architecture:
- **Frontend**: GitHub Pages (static hosting)
- **Backend**: Render (Node.js hosting)

For detailed deployment instructions, see:
- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- [QUICK_DEPLOY.md](QUICK_DEPLOY.md) - Quick reference for deployment

### Deploy Your Own Instance

1. Fork this repository
2. Deploy the backend to [Render](https://render.com) (free tier available)
3. Enable GitHub Pages in your repository settings
4. Add your backend URL as a GitHub secret (`VITE_SOCKET_URL`)
5. Push to `main` branch to trigger automatic deployment

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- Built with modern web technologies for automotive education
- Inspired by real-world automotive diagnostic tools
- Designed for students, engineers, and automotive enthusiasts

---

**Made with ❤️ for the automotive community**
