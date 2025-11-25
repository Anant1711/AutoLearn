// UDS Constants
const SERVICES = {
    DIAGNOSTIC_SESSION_CONTROL: 0x10,
    CLEAR_DIAGNOSTIC_INFORMATION: 0x14,
    READ_DTC_INFORMATION: 0x19,
    READ_DATA_BY_IDENTIFIER: 0x22,
    SECURITY_ACCESS: 0x27,
};

const NR_CODES = {
    SUB_FUNCTION_NOT_SUPPORTED: 0x12,
    INCORRECT_MESSAGE_LENGTH: 0x13,
    CONDITIONS_NOT_CORRECT: 0x22,
    REQUEST_SEQUENCE_ERROR: 0x24,
    INVALID_KEY: 0x35,
    EXCEEDED_NUMBER_OF_ATTEMPTS: 0x36,
};

// State
let session = 0x01; // 0x01: Default, 0x02: Programming, 0x03: Extended
let securityLevel = 0x00; // 0x00: Locked, 0x01: Unlocked
let seed = 0x0000;
let expectedKey = 0x0000;

// Dummy Data
// DTC Status Byte:
// Bit 0: TestFailed
// Bit 1: TestFailedThisOperationCycle
// Bit 2: PendingDTC
// Bit 3: ConfirmedDTC
// Bit 4: TestNotCompletedSinceLastClear
// Bit 5: TestFailedSinceLastClear
// Bit 6: TestNotCompletedThisOperationCycle
// Bit 7: WarningIndicatorRequested

const DTCS = [
    // Active/Confirmed DTCs (bit 3 set = 0x08, bit 0 set = 0x01, bit 7 set = 0x80)
    { code: 'P0301', status: 0x8F, description: 'Cylinder 1 Misfire Detected', system: 'Engine' },
    { code: 'U0100', status: 0x8F, description: 'Lost Communication With ECM/PCM A', system: 'Network' },
    { code: 'C0035', status: 0x89, description: 'Left Front Wheel Speed Sensor Circuit', system: 'ABS' },

    // Pending DTCs (bit 2 set = 0x04, bit 1 set = 0x02)
    { code: 'P0420', status: 0x06, description: 'Catalyst System Efficiency Below Threshold', system: 'Emissions' },
    { code: 'P0171', status: 0x04, description: 'System Too Lean (Bank 1)', system: 'Fuel' },

    // Permanent DTCs (emissions-related, bit 3 + bit 5 = 0x28)
    { code: 'P0442', status: 0x28, description: 'EVAP System Leak Detected (Small Leak)', system: 'Emissions' },

    // Historical DTCs (not currently active, bit 5 set = 0x20)
    { code: 'P0128', status: 0x20, description: 'Coolant Thermostat (Coolant Temp Below Thermostat Regulating Temp)', system: 'Cooling' },
    { code: 'B0001', status: 0x20, description: 'Driver Airbag Circuit Short to Ground', system: 'Airbag' },
];

// Healthy Systems (no DTCs)
const HEALTHY_SYSTEMS = [
    'Transmission Control Module',
    'Body Control Module',
    'Climate Control System',
    'Instrument Cluster',
    'Power Steering Control',
    'Tire Pressure Monitoring System',
    'Parking Assist System'
];

const DIDS = {
    0xF190: { name: 'VIN', value: [0x57, 0x42, 0x41, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x30, 0x31, 0x32, 0x33, 0x34] }, // WBA12345678901234
    0xF187: { name: 'ECU Part Number', value: [0x31, 0x32, 0x33, 0x2D, 0x34, 0x35, 0x36] }, // 123-456
};

function handleUDSRequest(socket, data) {
    const { serviceId, subFunction, payload } = data;
    let response = { serviceId: serviceId + 0x40, data: [] };

    console.log(`[UDS] Req: ${serviceId.toString(16)} Sub: ${subFunction ? subFunction.toString(16) : 'N/A'}`);

    try {
        switch (serviceId) {
            case SERVICES.DIAGNOSTIC_SESSION_CONTROL:
                handleSessionControl(subFunction, response);
                break;

            case SERVICES.CLEAR_DIAGNOSTIC_INFORMATION:
                handleClearDTC(response);
                break;

            case SERVICES.READ_DTC_INFORMATION:
                handleReadDTC(subFunction, payload, response);
                break;

            case SERVICES.READ_DATA_BY_IDENTIFIER:
                handleReadData(payload, response);
                break;

            case SERVICES.SECURITY_ACCESS:
                handleSecurityAccess(subFunction, payload, response);
                break;

            default:
                sendNRC(socket, serviceId, 0x11); // Service Not Supported
                return;
        }

        // Simulate processing delay
        setTimeout(() => {
            socket.emit('uds-response', response);
        }, 50 + Math.random() * 100);

    } catch (error) {
        if (error.nrc) {
            sendNRC(socket, serviceId, error.nrc);
        } else {
            console.error(error);
        }
    }
}

function handleSessionControl(subFunction, response) {
    if (![0x01, 0x02, 0x03].includes(subFunction)) {
        throw { nrc: NR_CODES.SUB_FUNCTION_NOT_SUPPORTED };
    }
    session = subFunction;
    // Reset security on session change (simplified)
    if (session === 0x01) securityLevel = 0x00;

    response.data = [subFunction, 0x00, 0x32, 0x01, 0xF4]; // P2/P2* timings
}

function handleClearDTC(response) {
    // In a real ECU, this would clear stored DTCs
    // For simulation, we'll just acknowledge
    response.data = [0x00]; // Positive response
}

function handleReadDTC(subFunction, payload, response) {
    response.data = [subFunction]; // Echo subfunction

    if (subFunction === 0x02) { // Report DTC by Status Mask
        const statusMask = payload ? payload[0] : 0xFF; // Default to all

        DTCS.forEach(dtc => {
            // Filter by status mask
            if ((dtc.status & statusMask) !== 0) {
                const codeBytes = parseInt(dtc.code.substring(1), 16);
                response.data.push((codeBytes >> 8) & 0xFF, codeBytes & 0xFF, dtc.status);
            }
        });
    } else if (subFunction === 0x04) { // Report DTC Snapshot/Freeze Frame
        // Return freeze frame data for first DTC
        if (DTCS.length > 0) {
            const dtc = DTCS[0];
            const codeBytes = parseInt(dtc.code.substring(1), 16);
            response.data.push((codeBytes >> 8) & 0xFF, codeBytes & 0xFF);
            // Add freeze frame data (simplified: RPM, Speed, Coolant Temp)
            response.data.push(0x01, 0x0C, 0x10, 0x00); // RPM = 4096
            response.data.push(0x01, 0x0D, 0x3C); // Speed = 60 km/h
            response.data.push(0x01, 0x05, 0x50); // Coolant = 80°C
        }
    } else if (subFunction === 0x0A) { // Report Supported DTC
        // Return all DTCs
        DTCS.forEach(dtc => {
            const codeBytes = parseInt(dtc.code.substring(1), 16);
            response.data.push((codeBytes >> 8) & 0xFF, codeBytes & 0xFF, dtc.status);
        });
    } else {
        throw { nrc: NR_CODES.SUB_FUNCTION_NOT_SUPPORTED };
    }
}

function handleReadData(payload, response) {
    const did = (payload[0] << 8) | payload[1];
    if (DIDS[did]) {
        response.data = [payload[0], payload[1], ...DIDS[did].value];
    } else {
        throw { nrc: 0x31 }; // Request Out Of Range
    }
}

function handleSecurityAccess(subFunction, payload, response) {
    if (subFunction === 0x01) { // Request Seed
        seed = Math.floor(Math.random() * 0xFFFF);
        expectedKey = (seed + 1) & 0xFFFF; // Simple Algo: Key = Seed + 1
        response.data = [0x01, (seed >> 8) & 0xFF, seed & 0xFF];
    } else if (subFunction === 0x02) { // Send Key
        if (seed === 0x0000) throw { nrc: NR_CODES.REQUEST_SEQUENCE_ERROR };

        const key = (payload[0] << 8) | payload[1];
        if (key === expectedKey) {
            securityLevel = 0x01;
            seed = 0x0000; // Reset seed
            response.data = [0x02]; // Security Unlocked
        } else {
            throw { nrc: NR_CODES.INVALID_KEY };
        }
    } else {
        throw { nrc: NR_CODES.SUB_FUNCTION_NOT_SUPPORTED };
    }
}

function sendNRC(socket, serviceId, nrc) {
    setTimeout(() => {
        socket.emit('uds-response', {
            serviceId: 0x7F,
            data: [serviceId, nrc]
        });
    }, 50);
}

module.exports = { handleUDSRequest };
