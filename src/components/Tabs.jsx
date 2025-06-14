import React, { useState } from "react";
import Songs from "./Songs";
import Psalms from "./Psalms";
import SlideComposer from "./SlideComposer";
import HealthCheck from "./HealthCheck";
import useKeepAlive from "../hooks/useKeepAlive";
import { FiActivity } from "react-icons/fi";
import { RiQuillPenFill } from "react-icons/ri"; // ✍️ Correct pen icon!

const tabs = ["Songs", "Psalms", "Slide Composer", "Health Check"];

export default function Tabs({ userName }) {
  const [active, setActive] = useState("Songs");

  const shouldPing = true; // Always ping on any tab now
  const pinging = useKeepAlive("https://grey-gratis-ice.glitch.me/ping", shouldPing, 180000);

  return (
    <div className="max-w-7xl mx-auto mt-6">
      {/* Tab headers */}
      <div className="flex items-center justify-between mb-6 border-b pb-2">
        <div className="flex space-x-4">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`px-4 py-2 rounded-t-md font-medium ${
                active === tab
                  ? "bg-indigo-200 text-indigo-800"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => setActive(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Right side */}
        <div className="flex flex-col items-end pr-4 text-sm text-green-600">
          {/* Keeping backend awake */}
          <div className="flex items-center gap-2">
            <div
              className={`relative w-3 h-3 rounded-full bg-green-500 ${
                pinging ? "animate-ping-slow" : ""
              }`}
              title="Keeping backend awake"
            />
            <FiActivity />
            <span className="hidden sm:inline">Keeping backend awake</span>
          </div>

          {/* Pen writing Working as */}
          <div className="flex items-center gap-2 mt-2">
            <RiQuillPenFill className="text-indigo-600 animate-working-pen" size={20} />
            <div className="text-sm text-gray-600 typewriter-text">
              Working as <span className="font-semibold">{userName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab panels */}
      <div className="bg-white p-6 rounded shadow relative">
        {active === "Songs" && <Songs />}
        {active === "Psalms" && <Psalms />}
        {active === "Slide Composer" && <SlideComposer />}
        {active === "Health Check" && <HealthCheck />}
      </div>
    </div>
  );
}