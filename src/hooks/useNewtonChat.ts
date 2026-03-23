import { useState, useEffect, useCallback } from 'react';

export interface ChatMessage {
  role: 'user' | 'newton';
  text: string;
}

export function useNewtonChat() {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    fetch('/api/newton/status')
      .then((r) => r.json())
      .then((d) => setAvailable(d.available))
      .catch(() => setAvailable(false));
  }, []);

  const askNewton = useCallback(async (question: string, chartImage: string | null, vehicleContext?: string) => {
    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setLoading(true);

    try {
      const res = await fetch('/api/newton/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, chartImage: chartImage ?? '', vehicleContext: vehicleContext ?? '' }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [...prev, { role: 'newton', text: `Error: ${data.error}` }]);
      } else {
        setMessages((prev) => [...prev, { role: 'newton', text: data.response }]);
      }
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'newton', text: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { available, loading, messages, askNewton };
}
