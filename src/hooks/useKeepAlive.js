// src/hooks/useKeepAlive.js
import { useEffect, useState } from "react";

const useKeepAlive = (url, active, interval = 180000) => {
  const [pinging, setPinging] = useState(false);

  useEffect(() => {
    if (!active) return;

    const ping = () => {
      setPinging(true);
      fetch(url)
        .then(() => console.log(`[keep-alive] Pinged ${url}`))
        .catch((err) => console.warn(`[keep-alive] Ping failed`, err))
        .finally(() => setTimeout(() => setPinging(false), 1000));
    };

    ping(); // immediate ping
    const id = setInterval(ping, interval);
    return () => clearInterval(id);
  }, [url, active, interval]);

  return pinging;
};

export default useKeepAlive;