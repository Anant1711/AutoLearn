export interface CANMessage {
    id: number;
    name: string;
    timestamp: number;
    data: Record<string, number>;
    rawValue: number;
}

export interface VehicleState {
    speed: number;
    rpm: number;
    accelerating: boolean;
    braking: boolean;
}

export interface UDSMessage {
    type: 'request' | 'response' | 'error';
    serviceId: number;
    subFunction?: number;
    data?: number[];
    timestamp: number;
    description?: string;
}

