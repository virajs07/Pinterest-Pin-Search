import container from '@/ui/appContainer.module.css';
import { PinForm } from './PinForm';

export function CreatePinPage() {
  return (
    <section data-testid="create-page" className={container.appContainer}>
      <h2>Create a pin</h2>
      <PinForm />
    </section>
  );
}
