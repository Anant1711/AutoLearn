const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for now
        methods: ["GET", "POST"]
    }
});

// Simulation State
let vehicleState = {
    speed: 0,
    rpm: 800,
    accelerating: false,
    braking: false
};

// Simulation Loop
setInterval(() => {
    if (vehicleState.accelerating) {
        vehicleState.speed = Math.min(vehicleState.speed + 2, 200);
        vehicleState.rpm = Math.min(vehicleState.rpm + 100, 7000);
    } else if (vehicleState.braking) {
        vehicleState.speed = Math.max(vehicleState.speed - 5, 0);
        vehicleState.rpm = Math.max(vehicleState.rpm - 200, 800);
    } else {
        // Coasting
        vehicleState.speed = Math.max(vehicleState.speed - 0.5, 0);
        vehicleState.rpm = Math.max(vehicleState.rpm - 50, 800);
    }

    // Broadcast CAN Messages
    // Speed (ID: 0x123)
    io.emit('can-message', {
        id: 0x123,
        name: 'Engine_Speed',
        timestamp: Date.now(),
        data: {
            speed: vehicleState.speed
        },
        rawValue: vehicleState.speed // Simplified for MVP
    });

    // RPM (ID: 0x456)
    io.emit('can-message', {
        id: 0x456,
        name: 'Engine_RPM',
        timestamp: Date.now(),
        data: {
            rpm: vehicleState.rpm
        },
        rawValue: vehicleState.rpm
    });

}, 100); // 10Hz update

const { handleUDSRequest } = require('./udsHandler');

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('control', (data) => {
        console.log('Control received:', data);
        if (data.action === 'accelerate') {
            vehicleState.accelerating = data.pressed;
        } else if (data.action === 'brake') {
            vehicleState.braking = data.pressed;
        }
    });

    socket.on('uds-request', (data) => {
        handleUDSRequest(socket, data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
