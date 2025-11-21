import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { ServiceControl } from './ServiceControl';
import { FlowVisualizer } from './FlowVisualizer';
import type { UDSMessage } from '../types';

interface UDSTesterProps {
    socket: Socket | null;
}

export const UDSTester: React.FC<UDSTesterProps> = ({ socket }) => {
    const [messages, setMessages] = useState<UDSMessage[]>([]);
    const [lastSeed, setLastSeed] = useState<number | null>(null);

    useEffect(() => {
        if (!socket) return;

        const handleResponse = (response: any) => {
            const { serviceId, data } = response;
            const isError = serviceId === 0x7F;

            const msg: UDSMessage = {
                type: isError ? 'error' : 'response',
                serviceId: serviceId,
                data: data,
                timestamp: Date.now(),
                description: isError ? `NRC: 0x${data[1].toString(16).toUpperCase()}` : 'Positive Response'
            };

            setMessages(prev => [...prev, msg]);

            // Handle Seed extraction for auto-key calculation
            if (serviceId === 0x67 && data[0] === 0x01) { // 0x67 = 0x27 + 0x40 (Response to Security Access)
                const seedVal = (data[1] << 8) | data[2];
                setLastSeed(seedVal);
            }
        };

        socket.on('uds-response', handleResponse);

        return () => {
            socket.off('uds-response', handleResponse);
        };
    }, [socket]);

    const handleSendRequest = (serviceId: number, subFunction?: number, payload?: number[]) => {
        if (!socket) return;

        // Auto-calculate key if sending key and we have a seed
        let finalPayload = payload;
        if (serviceId === 0x27 && subFunction === 0x02 && lastSeed !== null) {
            const key = (lastSeed + 1) & 0xFFFF; // Simple algo
            finalPayload = [(key >> 8) & 0xFF, key & 0xFF];
            setLastSeed(null); // Reset seed
        }

        const msg: UDSMessage = {
            type: 'request',
            serviceId: serviceId,
            subFunction: subFunction,
            data: finalPayload,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, msg]);

        socket.emit('uds-request', {
            serviceId,
            subFunction,
            payload: finalPayload
        });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[600px]">
            <ServiceControl onSendRequest={handleSendRequest} />
            <FlowVisualizer messages={messages} />
        </div>
    );
};
