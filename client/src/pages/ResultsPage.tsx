import { useParams } from 'react-router-dom';
import ScreenLayout from '../components/ui/ScreenLayout';
import MuteButton from '../components/ui/MuteButton';

export default function ResultsPage() {
  const { roomCode } = useParams();

  return (
    <ScreenLayout className="items-center justify-center">
      <div className="absolute top-4 right-4">
        <MuteButton />
      </div>
      <h1 className="text-4xl font-bold text-white font-heading">Results</h1>
      <p className="text-neutral-300 mt-2">Room: {roomCode}</p>
    </ScreenLayout>
  );
}
