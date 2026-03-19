import { useState } from 'react';
import ScreenLayout from '../components/ui/ScreenLayout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Toggle from '../components/ui/Toggle';

export default function Sandbox() {
  const [modalOpen, setModalOpen] = useState(false);
  const [toggleValue, setToggleValue] = useState('Remote');

  return (
    <ScreenLayout>
      <h1 className="text-2xl font-bold text-white mb-6">UI Sandbox</h1>

      {/* Buttons */}
      <section className="mb-6">
        <h2 className="text-lg text-neutral-300 mb-3">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      {/* Card */}
      <section className="mb-6">
        <h2 className="text-lg text-neutral-300 mb-3">Card</h2>
        <Card>
          <p className="text-neutral-700">This is a card component with shadow and rounded corners.</p>
        </Card>
      </section>

      {/* Input */}
      <section className="mb-6">
        <h2 className="text-lg text-neutral-300 mb-3">Input</h2>
        <Input label="Display Name" placeholder="Enter your name..." id="sandbox-name" />
      </section>

      {/* Badges */}
      <section className="mb-6">
        <h2 className="text-lg text-neutral-300 mb-3">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="success">Connected</Badge>
          <Badge variant="error">Disconnected</Badge>
          <Badge variant="accent">Your Turn</Badge>
        </div>
      </section>

      {/* Toggle */}
      <section className="mb-6">
        <h2 className="text-lg text-neutral-300 mb-3">Toggle</h2>
        <Toggle options={['Remote', 'In-Person']} value={toggleValue} onChange={setToggleValue} />
        <p className="text-neutral-400 text-sm mt-2">Selected: {toggleValue}</p>
      </section>

      {/* Loading Spinner */}
      <section className="mb-6">
        <h2 className="text-lg text-neutral-300 mb-3">Loading Spinners</h2>
        <div className="flex items-center gap-4">
          <LoadingSpinner size="sm" />
          <LoadingSpinner size="md" />
          <LoadingSpinner size="lg" />
        </div>
      </section>

      {/* Modal */}
      <section className="mb-6">
        <h2 className="text-lg text-neutral-300 mb-3">Modal</h2>
        <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
          <h2 className="text-xl font-bold text-white mb-3">Modal Title</h2>
          <p className="text-neutral-300 mb-4">This is a modal with backdrop blur and slide-up animation on mobile.</p>
          <Button onClick={() => setModalOpen(false)}>Close</Button>
        </Modal>
      </section>
    </ScreenLayout>
  );
}
