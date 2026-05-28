import container from '@/ui/appContainer.module.css';
import { PinForm } from './PinForm';

export function CreatePinPage() {
  return (
    <section data-testid="create-page" className={container.appContainer} aria-labelledby="create-page-heading">
      <h1 id="create-page-heading">Create a pin</h1>
      <PinForm />
    </section>
  );
}
