import React, { useState, useEffect } from 'react';

const Countdown = ({ targetDate }) => {
    const [timeLeft, setTimeLeft] = useState({});
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient) return;

        const calculateTimeLeft = () => {
            const difference = +new Date(targetDate) - +new Date();
            let timeLeft = {};

            if (difference > 0) {
                timeLeft = {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60)
                };
            }
            return timeLeft;
        };

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        // Set initial value
        setTimeLeft(calculateTimeLeft());

        return () => clearInterval(timer);
    }, [targetDate, isClient]);

    if (!isClient) {
        return null;
    }

    const timerComponents = [];
    
    Object.keys(timeLeft).forEach((interval) => {
        if (!timeLeft[interval]) {
            return;
        }

        timerComponents.push(
            <div key={interval} className="flex flex-col items-center">
                <span className="text-lg font-bold text-green-600">
                    {timeLeft[interval].toString().padStart(2, '0')}
                </span>
                <span className="text-[10px] uppercase text-gray-500 font-medium">
                    {interval}
                </span>
            </div>
        );
    });

    if (timerComponents.length === 0) {
        return (
            <div className="text-sm font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                Event has started
            </div>
        );
    }

    return (
        <div className="bg-gray-50 p-3 rounded-lg border">
            <div className="text-xs text-gray-600 mb-1 text-center font-medium">Event starts in:</div>
            <div className="flex items-center justify-center gap-3">
                {timerComponents.map((component, index) => (
                    <React.Fragment key={index}>
                        {component}
                        {index < timerComponents.length - 1 && (
                            <span className="text-lg font-bold text-gray-400 pb-4">:</span>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default Countdown;