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
        className="relative h-2 overflow-hidden rounded-full border border-white/10 bg-white/5"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,rgba(56,189,248,0.95),rgba(168,85,247,0.95),rgba(244,114,182,0.95))] shadow-[0_0_20px_rgba(56,189,248,0.35)] transition-[width] duration-500"
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
                  'group flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50',
                  isCurrent
                    ? 'border-cyan-300/40 bg-cyan-400/10 shadow-[0_0_25px_rgba(34,211,238,0.18)]'
                    : 'border-white/10 bg-white/5 hover:border-white/18 hover:bg-white/8',
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                    isComplete
                      ? 'border-cyan-200/60 bg-cyan-300/20 text-cyan-50'
                      : isCurrent
                        ? 'border-cyan-200/70 bg-cyan-300/20 text-cyan-50'
                        : 'border-white/12 bg-white/6 text-slate-300',
                  )}
                >
                  {isComplete ? '✓' : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white">{step.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-400">{step.detail}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
