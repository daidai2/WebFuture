/*
Route Naming Modal
*/
import React, { useState } from 'react';

interface RouteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newName: string) => void;
}

const RouteModal: React.FC<RouteModalProps> = ({ isOpen, onClose, onSave }) => {
    const [inputValue, setInputValue] = useState('');

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000
        }}>
            <div style={{
                padding: 20, backgroundColor: 'white', borderRadius: 5,
                display: 'flex', flexDirection: 'column', gap: 10
            }}>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Enter the File Route"
                    style={{ padding: 10 }}
                />
                <button onClick={() => onSave(inputValue)}>Confirm</button>
                <button onClick={onClose}>Cancel</button>
            </div>
        </div>
    );
};

export default RouteModal;