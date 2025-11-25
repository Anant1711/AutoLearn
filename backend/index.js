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
    braking: false,
    steering: 0, // -100 (full left) to +100 (full right)
    gear: 'P', // P, R, N, D
    headlights: 'off', // off, on, high
    turnSignals: 'off', // off, left, right, hazard
    odometer: 12345, // km
    fuelLevel: 75 // percentage
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
        rawValue: vehicleState.speed
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

    // Steering Angle (ID: 0x789)
    io.emit('can-message', {
        id: 0x789,
        name: 'Steering_Angle',
        timestamp: Date.now(),
        data: {
            angle: vehicleState.steering
        },
        rawValue: vehicleState.steering
    });

    // Gear Position (ID: 0xABC)
    const gearMap = { 'P': 0, 'R': 1, 'N': 2, 'D': 3 };
    io.emit('can-message', {
        id: 0xABC,
        name: 'Gear_Position',
        timestamp: Date.now(),
        data: {
            gear: vehicleState.gear
        },
        rawValue: gearMap[vehicleState.gear] || 0
    });

    // Lights Status (ID: 0xDEF)
    const lightsMap = { 'off': 0, 'on': 1, 'high': 2 };
    io.emit('can-message', {
        id: 0xDEF,
        name: 'Lights_Status',
        timestamp: Date.now(),
        data: {
            headlights: vehicleState.headlights
        },
        rawValue: lightsMap[vehicleState.headlights] || 0
    });

    // Turn Signals (ID: 0x321)
    const signalsMap = { 'off': 0, 'left': 1, 'right': 2, 'hazard': 3 };
    io.emit('can-message', {
        id: 0x321,
        name: 'Turn_Signals',
        timestamp: Date.now(),
        data: {
            signals: vehicleState.turnSignals
        },
        rawValue: signalsMap[vehicleState.turnSignals] || 0
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
        } else if (data.action === 'steer') {
            vehicleState.steering = data.value; // -100 to +100
        } else if (data.action === 'gear') {
            vehicleState.gear = data.value; // P, R, N, D
        } else if (data.action === 'headlights') {
            vehicleState.headlights = data.value; // off, on, high
        } else if (data.action === 'turnSignals') {
            vehicleState.turnSignals = data.value; // off, left, right, hazard
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
