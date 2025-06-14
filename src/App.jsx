import React, { useEffect, useState } from "react";
import Tabs from "./components/Tabs";
import { Toaster } from "react-hot-toast";

export default function App() {
  const [inputName, setInputName] = useState(""); // typing box
  const [userName, setUserName] = useState("");    // final confirmed user name

  useEffect(() => {
    const savedName = sessionStorage.getItem("userName");
    if (savedName) {
      setUserName(savedName);
    }
  }, []);

  const handleSaveName = () => {
    if (inputName.trim() !== "") {
      setUserName(inputName.trim());
      sessionStorage.setItem("userName", inputName.trim());
    }
  };

  if (!userName) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-lg shadow-lg space-y-4">
          <h2 className="text-2xl font-bold text-indigo-700 text-center">
            Welcome! Please Enter Your Name
          </h2>
          <input
            type="text"
            className="w-full border rounded px-4 py-2 focus:outline-none focus:ring"
            placeholder="Enter your name"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
          />
          <button
            onClick={handleSaveName}
            className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1f2937",
            color: "#fff",
            fontSize: "0.875rem",
            borderRadius: "6px",
            padding: "10px 16px",
          },
          success: {
            style: { background: "#16a34a" },
            iconTheme: {
              primary: "#ffffff",
              secondary: "#16a34a",
            },
          },
          error: {
            style: { background: "#dc2626" },
            iconTheme: {
              primary: "#ffffff",
              secondary: "#dc2626",
            },
          },
        }}
      />

      <h1 className="text-4xl font-bold text-center text-indigo-700 mb-8">
        🙌 Worship Ready
      </h1>

      <Tabs userName={userName} />
    </div>
  );
}
