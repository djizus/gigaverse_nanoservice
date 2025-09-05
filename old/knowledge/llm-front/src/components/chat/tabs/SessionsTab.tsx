import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Session {
  id: string;
  name: string;
  createdAt: number;
}

interface SessionsTabProps {
  sessions: Session[];
  selectedSession: Session | null;
  onSelectSession: (session: Session) => void;
  onCreateSession: (name: string) => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
}

export function SessionsTab({
  sessions,
  selectedSession,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
}: SessionsTabProps) {
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');

  const handleCreateSession = () => {
    onCreateSession(newSessionName);
    setShowNewSessionForm(false);
    setNewSessionName('');
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Sessions</h2>
        <Button
          variant="outline"
          size="lg"
          onClick={() => setShowNewSessionForm(true)}
          className="px-6"
        >
          Nouvelle session
        </Button>
      </div>

      {showNewSessionForm && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-xl mb-4 font-medium">
              Créer une nouvelle session
            </h3>
            <Input
              type="text"
              placeholder="Nom de la session"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateSession()}
              className="mb-4 text-lg h-12"
            />
            <div className="flex gap-4">
              <Button size="lg" onClick={handleCreateSession} className="px-6">
                Créer
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setShowNewSessionForm(false)}
                className="px-6"
              >
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ScrollArea className="flex-1">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`flex items-center justify-between p-3 rounded-lg mb-3 cursor-pointer text-lg ${
              selectedSession?.id === session.id
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent'
            }`}
            onClick={() => onSelectSession(session)}
          >
            <span className="truncate">{session.name}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => onDeleteSession(session.id, e)}
              className="ml-2 flex-shrink-0"
            >
              ×
            </Button>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}
