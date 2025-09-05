import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface ApiSummary {
  success: boolean;
  timestamp: string;
  userQuestion: string;
  assistantAnswer: string;
  errors: { message: string; detail?: string }[];
  reasoning?: string;
  actions?: { name: string; status: 'ok' | 'fail' }[];
  rawJson: unknown;
}

export function ApiResponseCard({ summary }: { summary: ApiSummary }) {
  const [expanded, setExpanded] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [showError, setShowError] = useState<number | null>(null);

  return (
    <div className="api-response-card">
      {/* --- Quick View --- */}
      <div className="quick-view">
        <div>
          <b>{summary.success ? '✅ Success' : '❌ Failure'}</b>
          <span style={{ marginLeft: 12 }}>🕒 {summary.timestamp}</span>
        </div>
        <div style={{ margin: '8px 0' }}>
          <b>📝 Question:</b> <span>{summary.userQuestion}</span>
        </div>
        <div>
          <b>🟢 Réponse:</b> <span>{summary.assistantAnswer}</span>
        </div>
        <div>
          <b>⚠️ Erreurs:</b> {summary.errors.length}
        </div>
        <button className="expand-btn" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Masquer les détails ▲' : 'Détail & Raisonnement ▼'}
        </button>
      </div>

      {/* --- Detailed View --- */}
      {expanded && (
        <div className="detailed-view" style={{ marginTop: 16 }}>
          {/* Raisonnement */}
          {summary.reasoning && (
            <div style={{ marginBottom: 12 }}>
              <b>🧠 Raisonnement :</b>
              <div className="reasoning-markdown">
                <ReactMarkdown>{summary.reasoning}</ReactMarkdown>
              </div>
            </div>
          )}
          {/* Actions internes */}
          {summary.actions && summary.actions.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <b>🛠️ Actions internes :</b>
              <ul>
                {summary.actions.map((act, i) => (
                  <li key={i}>
                    {act.name} {act.status === 'ok' ? '✅' : '❌'}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Erreurs détaillées */}
          <div style={{ marginBottom: 12 }}>
            <b>🚨 Erreurs détaillées :</b>
            {summary.errors.map((err, idx) => (
              <div key={idx}>
                <button
                  onClick={() => setShowError(showError === idx ? null : idx)}
                >
                  {showError === idx ? '▼' : '▶'} Erreur #{idx + 1}
                </button>
                {showError === idx && (
                  <div className="error-detail">
                    <pre>{err.message}</pre>
                    {err.detail && <pre>{err.detail}</pre>}
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* JSON brut */}
          <div>
            <button onClick={() => setShowRaw((v) => !v)}>
              {showRaw ? 'Masquer JSON ▲' : 'Afficher JSON ▼'}
            </button>
            {showRaw && (
              <pre className="raw-json">
                {JSON.stringify(summary.rawJson, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
