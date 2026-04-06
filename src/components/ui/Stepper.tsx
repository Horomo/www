import { cn } from './utils';

type Step = {
  id: string;
  label: string;
  detail: string;
};

type StepperProps = {
  steps: Step[];
  currentStep: number;
  onStepClick?: (index: number) => void;
};

export default function Stepper({ steps, currentStep, onStepClick }: StepperProps) {
  return (
    <div className="space-y-4">
      <div
        className="relative h-2 overflow-hidden rounded-full bg-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#006a62,#40e0d0_55%,#ffb7c2)] shadow-[0_0_18px_rgba(64,224,208,0.25)] transition-[width] duration-500"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>
      <ol className="grid gap-3 sm:grid-cols-4">
        {steps.map((step, index) => {
          const isCurrent = index === currentStep;
          const isComplete = index < currentStep;

          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => onStepClick?.(index)}
                className={cn(
                  'group flex w-full items-start gap-3 rounded-[1.6rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(255,255,255,0.52))] px-3 py-3 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#40e0d0]/40',
                  isCurrent
                    ? 'shadow-[inset_0_0_0_1px_rgba(64,224,208,0.28),0_16px_34px_rgba(64,224,208,0.14)]'
                    : 'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.52)] hover:brightness-[1.02] hover:shadow-[inset_0_0_0_1px_rgba(64,224,208,0.16),0_16px_34px_rgba(0,106,98,0.08)]',
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    isComplete
                      ? 'bg-[linear-gradient(135deg,#006a62,#40e0d0)] text-white shadow-[0_10px_24px_rgba(64,224,208,0.22)]'
                      : isCurrent
                        ? 'bg-[linear-gradient(135deg,rgba(64,224,208,0.18),rgba(255,255,255,0.88))] text-[#006a62] shadow-[inset_0_0_0_1px_rgba(64,224,208,0.28)]'
                        : 'bg-white/54 text-[#151d22]/64 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]',
                  )}
                >
                  {isComplete ? '✓' : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[#151d22]">{step.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-[#151d22]/56">{step.detail}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
