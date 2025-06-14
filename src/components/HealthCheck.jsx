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

const STATUS = {
  loading: "loading",
  success: "success",
  error: "error",
};

const HealthCheck = () => {
  const [statuses, setStatuses] = useState({
    glitch: STATUS.loading,
    psalms: STATUS.loading,
    songs: STATUS.loading,
    presentations: STATUS.loading,
  });

  const [lastChecked, setLastChecked] = useState(null);

  const checkEndpoint = async (label, url) => {
    try {
      const res = await fetch(url);
      setStatuses((prev) => ({
        ...prev,
        [label]: res.ok ? STATUS.success : STATUS.error,
      }));
    } catch {
      setStatuses((prev) => ({ ...prev, [label]: STATUS.error }));
    }
  };

  const runChecks = () => {
    setStatuses({
      glitch: STATUS.loading,
      psalms: STATUS.loading,
      songs: STATUS.loading,
      presentations: STATUS.loading,
    });

    checkEndpoint("glitch", "https://grey-gratis-ice.onrender.com/ping");
    checkEndpoint("psalms", "https://grey-gratis-ice.onrender.com/psalms/1");
    checkEndpoint("songs", "https://grey-gratis-ice.onrender.com/songs");
    checkEndpoint(
      "presentations",
      "https://grey-gratis-ice.onrender.com/presentations/SamplePresentation/slides"
    );

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

  const healthCards = [
    {
      label: "Glitch API",
      icon: <FiActivity size={28} className="text-indigo-600" />,
      statusKey: "glitch",
    },
    {
      label: "Psalms API",
      icon: <FiBookOpen size={28} className="text-indigo-600" />,
      statusKey: "psalms",
    },
    {
      label: "Songs API",
      icon: <FiMusic size={28} className="text-indigo-600" />,
      statusKey: "songs",
    },
    {
      label: "Presentations API",
      icon: <FiSliders size={28} className="text-indigo-600" />,
      statusKey: "presentations",
    },
  ];

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