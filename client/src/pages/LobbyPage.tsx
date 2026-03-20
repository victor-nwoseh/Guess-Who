import { useParams } from 'react-router-dom';
import ScreenLayout from '../components/ui/ScreenLayout';

export default function LobbyPage() {
  const { roomCode } = useParams();

  return (
    <ScreenLayout className="items-center justify-center">
      <h1 className="text-4xl font-bold text-white font-heading">Lobby</h1>
      <p className="text-neutral-300 mt-2">Room: {roomCode}</p>
    </ScreenLayout>
  );
}
