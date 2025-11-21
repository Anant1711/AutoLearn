// UDS Constants
const SERVICES = {
    DIAGNOSTIC_SESSION_CONTROL: 0x10,
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
const DTCS = [
    { code: 'P0301', status: 0x2F, description: 'Cylinder 1 Misfire Detected' },
    { code: 'P0420', status: 0x09, description: 'Catalyst System Efficiency Below Threshold' },
    { code: 'U0100', status: 0x2F, description: 'Lost Communication With ECM/PCM A' },
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

            case SERVICES.READ_DTC_INFORMATION:
                handleReadDTC(subFunction, response);
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

function handleReadDTC(subFunction, response) {
    if (subFunction === 0x02) { // Report DTC by Status Mask
        response.data = [0x02]; // Echo subfunction
        DTCS.forEach(dtc => {
            // Simplified: Just sending raw bytes for code + status
            // P0301 -> 0x0301 (simplified hex representation for demo)
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
