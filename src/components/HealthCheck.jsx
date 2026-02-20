import React, { useEffect, useState } from "react";
import {
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiActivity,
  FiMusic,
  FiBookOpen,
  FiSliders,
} from "react-icons/fi";

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const PRES_API = import.meta.env.VITE_PRESENTATION_API;

const STATUS = {
  loading: "loading",
  success: "success",
  error: "error",
};

// Each card now carries its own url so the render loop can display it and
// runChecks can read it directly — previously url was missing from every card,
// causing the display to always show undefined.
const healthCards = [
  {
    label: "API (ping)",
    url: `${API_BASE}/ping`,
    icon: <FiActivity size={28} className="text-indigo-600" />,
    statusKey: "ping",
  },
  {
    label: "Psalms API",
    url: `${API_BASE}/psalms/1`,
    icon: <FiBookOpen size={28} className="text-indigo-600" />,
    statusKey: "psalms",
  },
  {
    label: "Songs API",
    url: `${API_BASE}/songs`,
    icon: <FiMusic size={28} className="text-indigo-600" />,
    statusKey: "songs",
  },
  {
    label: "Presentations API",
    url: `${PRES_API}/presentations/SamplePresentation/slides`,
    icon: <FiSliders size={28} className="text-indigo-600" />,
    statusKey: "presentations",
  },
];

const HealthCheck = () => {
  const initialStatuses = Object.fromEntries(
    healthCards.map(({ statusKey }) => [statusKey, STATUS.loading])
  );

  const [statuses, setStatuses] = useState(initialStatuses);
  const [lastChecked, setLastChecked] = useState(null);

  const checkEndpoint = async (statusKey, url) => {
    try {
      const res = await fetch(url);
      setStatuses((prev) => ({
        ...prev,
        [statusKey]: res.ok ? STATUS.success : STATUS.error,
      }));
    } catch {
      setStatuses((prev) => ({ ...prev, [statusKey]: STATUS.error }));
    }
  };

  const runChecks = () => {
    setStatuses(
      Object.fromEntries(healthCards.map(({ statusKey }) => [statusKey, STATUS.loading]))
    );
    healthCards.forEach(({ statusKey, url }) => checkEndpoint(statusKey, url));
    setLastChecked(new Date());
  };

  useEffect(() => {
    runChecks();
  }, []);

  const renderStatusIcon = (status) => {
    if (status === STATUS.loading)
      return <FiRefreshCw className="animate-spin text-yellow-500" />;
    if (status === STATUS.success)
      return <FiCheckCircle className="text-green-600" />;
    return <FiXCircle className="text-red-600" />;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-700">System Health Check</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {healthCards.map(({ label, url, icon, statusKey }) => (
          <div
            key={statusKey}
            className="flex items-center gap-4 p-4 border rounded shadow-sm bg-white"
          >
            {icon}
            <div className="flex-1">
              <p className="font-medium text-gray-800">{label}</p>
              <p className="text-sm text-gray-500 truncate">{url}</p>
            </div>
            {renderStatusIcon(statuses[statusKey])}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-6">
        <button
          onClick={runChecks}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          <FiRefreshCw />
          Recheck
        </button>
        {lastChecked && (
          <span className="text-sm text-gray-600">
            Last checked at: <strong>{lastChecked.toLocaleString()}</strong>
          </span>
        )}
      </div>
    </div>
  );
};

export default HealthCheck;
