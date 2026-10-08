// components/tournament/RegistrationStepper.tsx
// แถบขั้นตอนการสมัคร 3 ขั้น (ดีไซน์ Tournament Registration Flow) · server component ไม่มี state
import { REGISTRATION_STEPS, type StepStates, type StepState } from '@/lib/tournament/registrationSteps';

function StepCircle({ state, index }: { state: StepState; index: number }) {
  if (state === 'DONE') {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#9184d9] bg-[#9184d9]/15">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <polyline points="3,8 6.5,12 13,4" fill="none" stroke="#9184d9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  if (state === 'ACTIVE') {
    return (
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#E8B429] bg-[#E8B429]/10 shadow-[0_0_16px_rgba(232,180,41,0.3)]"
        style={{ animation: 'za-step-pulse 2s infinite' }}
      >
        <span className="text-base font-extrabold text-[#E8B429]">{index + 1}</span>
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/15 bg-white/[0.04] text-white/60">
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <rect x="2" y="6" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function RegistrationStepper({ states }: { states: StepStates }) {
  return (
    <nav aria-label="ขั้นตอนการสมัคร" className="mb-8" data-testid="registration-stepper">
      <style>{`@keyframes za-step-pulse{0%,100%{box-shadow:0 0 0 0 rgba(232,180,41,0.4)}50%{box-shadow:0 0 0 8px rgba(232,180,41,0)}}`}</style>
      <ol className="flex items-start justify-center">
        {REGISTRATION_STEPS.map((step, i) => {
          const state = states[i];
          const prev = i > 0 ? states[i - 1] : null;
          return (
            <li key={step.id} className="flex items-start">
              {i > 0 && (
                <div
                  aria-hidden="true"
                  className={`mt-5 h-px w-12 sm:w-20 ${
                    prev === 'DONE' && state !== 'LOCKED'
                      ? 'bg-gradient-to-r from-[#9184d9]/50 to-[#E8B429]/50'
                      : 'bg-white/10'
                  }`}
                />
              )}
              <div
                className={`flex w-28 flex-col items-center gap-2 sm:w-36 ${state === 'LOCKED' ? 'opacity-50' : ''}`}
                aria-current={state === 'ACTIVE' ? 'step' : undefined}
                data-step={step.id}
                data-state={state}
              >
                <StepCircle state={state} index={i} />
                <div className="text-center">
                  <div
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      state === 'ACTIVE' ? 'text-[#E8B429]' : state === 'DONE' ? 'text-[#9184d9]' : 'text-[#9397ab]'
                    }`}
                  >
                    {step.th}
                  </div>
                  <div
                    className={`text-[9px] font-semibold uppercase tracking-[0.12em] ${
                      state === 'ACTIVE' ? 'text-[#E8B429]/70' : 'text-[#75798c]'
                    }`}
                  >
                    {step.en}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
