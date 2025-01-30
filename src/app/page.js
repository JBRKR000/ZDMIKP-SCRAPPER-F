"use client"
import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { FaBus, FaTram, FaTrain } from 'react-icons/fa';

const stopIds = {
    "Akademicka / Kaliskiego": ["8084", "8060", "8083", "8095", "8096"],
    "Kaliskiego / Politechnika": ["8062", "8063"],
    "Dworzec Politechnika": ["7028", "7027", "8062", "8063"]
};

const convertToFullDate = (time) => {
    const today = new Date();
    if (time === ">>") {
        return today;
    } else if (time.endsWith('min')) {
        const minutes = parseInt(time.replace('min', ''), 10);
        today.setMinutes(today.getMinutes() + minutes);
    } else {
        const [hours, minutes] = time.split(':');
        today.setHours(hours, minutes, 0, 0);
    }
    return today;
};

export default function Home() {
    const [departures, setDepartures] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentStopIndex, setCurrentStopIndex] = useState(0);
    const [currentDestinationIndex, setCurrentDestinationIndex] = useState(0);

    const fetchDepartures = async () => {
        try {
            const allDepartures = {};
            for (const [stopName, ids] of Object.entries(stopIds)) {
                allDepartures[stopName] = [];
                for (const id of ids) {
                    const response = await axios.get(`http://localhost:8080/departures?stopId=${id}`);
                    allDepartures[stopName].push(...response.data.map(departure => ({
                        ...departure,
                        departureTime: convertToFullDate(departure.departureTime)
                    })));
                }
                allDepartures[stopName].sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));
            }

            // Fetch train departures for Bydgoszcz-Politechnika-Pociąg
            const politechnikaResponse = await axios.get(`http://localhost:8080/train/departures?station=5100641`);
            allDepartures["Bydgoszcz-Politechnika-Pociąg"] = politechnikaResponse.data.map(departure => ({
                ...departure,
                departureTime: convertToFullDate(departure.departureTime),
                type: 'train'
            }));

            // Fetch train departures for Bydgoszcz Wschód
            const wschodResponse = await axios.get(`http://localhost:8080/train/departures?station=5100648`);
            allDepartures["Bydgoszcz Wschód"] = wschodResponse.data.map(departure => ({
                ...departure,
                departureTime: convertToFullDate(departure.departureTime),
                type: 'train'
            }));

            setDepartures(allDepartures);
            setLoading(false);
        } catch (error) {
            setError(error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepartures();
        const interval = setInterval(fetchDepartures, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const stopInterval = setInterval(() => {
            setCurrentStopIndex((prevIndex) => (prevIndex + 1) % Object.keys(departures).length);
            setCurrentDestinationIndex(0);
        }, 10000);
        return () => clearInterval(stopInterval);
    }, [departures]);

    useEffect(() => {
        const destinationInterval = setInterval(() => {
            const currentStopName = Object.keys(departures)[currentStopIndex];
            if (currentStopName) {
                const destinations = Object.keys(
                    departures[currentStopName]?.reduce((acc, departure) => {
                        if (!acc[departure.destination]) {
                            acc[departure.destination] = [];
                        }
                        acc[departure.destination].push(departure);
                        return acc;
                    }, {}) || {}
                );
                setCurrentDestinationIndex((prevIndex) => (prevIndex + 1) % destinations.length);
            }
        }, 5000);
        return () => clearInterval(destinationInterval);
    }, [departures, currentStopIndex]);

    if (loading) return <p className="text-center text-lg text-primary mt-20">Ładowanie danych...</p>;
    if (error) return <p className="text-center text-lg text-red-600 mt-20">Błąd podczas ładowania danych</p>;

    const stopNames = Object.keys(departures);
    const currentStopName = stopNames[currentStopIndex];

    if (!currentStopName) return null;

    const groupedDepartures = departures[currentStopName]?.reduce((acc, departure) => {
        if (!acc[departure.destination]) {
            acc[departure.destination] = [];
        }
        acc[departure.destination].push(departure);
        return acc;
    }, {});

    const destinations = Object.keys(groupedDepartures || {});
    const currentDestination = destinations[currentDestinationIndex];

    return (
        <div className="min-h-screen bg-black text-yellow-300 p-4 font-mono">
            <header className="text-center mb-4">
                <h1 className="text-4xl font-bold">Rozkład Odjazdów</h1>
            </header>

            {currentStopName && currentDestination && (
                <motion.div
                    key={currentDestination}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-4 bg-gray-900 rounded-lg shadow-lg overflow-hidden text-yellow-200"
                >
                    <h2 className="text-xl font-bold bg-yellow-600 text-black p-2">{currentStopName}</h2>
                    <h3 className="text-lg font-semibold bg-gray-800 text-yellow-300 p-2 rounded-t-lg">{currentDestination}</h3>
                    <table className="w-full text-left border border-gray-700 text-xl">
                        <thead className="bg-gray-700 border-b border-yellow-400">
                        <tr>
                            <th className="py-2 px-2 text-sm font-semibold">Linia</th>
                            <th className="py-2 px-2 text-sm font-semibold">Odjazd</th>
                        </tr>
                        </thead>
                        <tbody>
                        {groupedDepartures[currentDestination]?.map((departure, idx) => (
                            <tr key={idx} className="hover:bg-gray-600 transition duration-200">
                                <td className="py-2 px-2 border-t border-yellow-400 font-bold text-2xl flex items-center">
                                    {departure.type === 'train' ? <FaTrain className="mr-2" /> : parseInt(departure.line, 10) <= 15 ? <FaTram className="mr-2" /> : <FaBus className="mr-2" />}
                                    {departure.line || departure.trainNumber}
                                </td>
                                <td className="py-2 px-2 border-t border-yellow-400 text-2xl">
                                    {new Date(departure.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </motion.div>
            )}

            <footer className="text-center mt-10 text-xs text-gray-400">
                © {new Date().getFullYear()} Rozkład Odjazdów
            </footer>
        </div>
    );
}